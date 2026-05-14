import mongoose from "mongoose";
import Workspace from "../models/Workspace.js";
import Document from "../models/Document.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

const serializeWorkspace = async (workspace, userId) => {
    const plain = workspace.toObject();
    const documentIds = (plain.documentIds || []).map(id => id.toString());
    const documents = documentIds.length
        ? await Document.find({ _id: { $in: documentIds }, userId })
            .select("_id fileName namespace uploadDate chunkCount")
        : [];
    const documentMap = new Map(documents.map(doc => [doc._id.toString(), doc.toObject()]));

    return {
        ...plain,
        documentIds,
        documents: documentIds
            .map(id => documentMap.get(id))
            .filter(Boolean)
    };
};

const normalizeDocumentIds = (documentIds = []) => {
    return [...new Set(documentIds.filter(Boolean).map(id => id.toString()))]
        .filter(id => mongoose.Types.ObjectId.isValid(id));
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getOwnedDocuments = async (documentIds, userId) => {
    const normalizedIds = normalizeDocumentIds(documentIds);
    if (normalizedIds.length === 0) return [];

    return Document.find({ _id: { $in: normalizedIds }, userId })
        .select("_id fileName namespace uploadDate chunkCount");
};

export const getWorkspaces = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const workspaces = await Workspace.find({ userId }).sort({ updatedAt: -1 });
        const serialized = await Promise.all(workspaces.map(workspace => serializeWorkspace(workspace, userId)));

        res.json(serialized);
    } catch (error) {
        console.error("[GET WORKSPACES ERROR]", error);
        res.status(500).json({ error: "Failed to fetch workspaces" });
    }
};

export const createWorkspace = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { name, documentIds = [] } = req.body;

        const trimmedName = (name || "").trim();
        if (!trimmedName) {
            return res.status(400).json({ error: "Workspace name is required" });
        }

        // Prevent duplicate workspace names per user
        const existing = await Workspace.findOne({
            userId,
            name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
        });
        if (existing) {
            return res.status(409).json({ error: `Workspace "${trimmedName}" already exists` });
        }

        const documents = await getOwnedDocuments(documentIds, userId);
        const workspace = await Workspace.create({
            name: trimmedName,
            userId,
            documentIds: documents.map(doc => doc._id)
        });

        res.status(201).json(await serializeWorkspace(workspace, userId));
    } catch (error) {
        console.error("[CREATE WORKSPACE ERROR]", error);
        res.status(500).json({ error: "Failed to create workspace" });
    }
};

export const updateWorkspace = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { workspaceId } = req.params;
        if (!isValidObjectId(workspaceId)) {
            return res.status(400).json({ error: "Invalid workspace ID" });
        }
        const { name, documentIds } = req.body;

        const workspace = await Workspace.findOne({ _id: workspaceId, userId });
        if (!workspace) {
            return res.status(404).json({ error: "Workspace not found" });
        }

        if (typeof name === "string" && name.trim()) {
            workspace.name = name.trim();
        }

        if (Array.isArray(documentIds)) {
            const documents = await getOwnedDocuments(documentIds, userId);
            workspace.documentIds = documents.map(doc => doc._id);
        }

        await workspace.save();
        res.json(await serializeWorkspace(workspace, userId));
    } catch (error) {
        console.error("[UPDATE WORKSPACE ERROR]", error);
        res.status(500).json({ error: "Failed to update workspace" });
    }
};

export const addWorkspaceDocuments = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { workspaceId } = req.params;
        if (!isValidObjectId(workspaceId)) {
            return res.status(400).json({ error: "Invalid workspace ID" });
        }
        const { documentIds = [] } = req.body;

        const workspace = await Workspace.findOne({ _id: workspaceId, userId });
        if (!workspace) {
            return res.status(404).json({ error: "Workspace not found" });
        }

        const documents = await getOwnedDocuments(documentIds, userId);
        const existing = new Set(workspace.documentIds.map(id => id.toString()));
        documents.forEach(doc => existing.add(doc._id.toString()));
        workspace.documentIds = Array.from(existing);
        await workspace.save();

        res.json(await serializeWorkspace(workspace, userId));
    } catch (error) {
        console.error("[ADD WORKSPACE DOCS ERROR]", error);
        res.status(500).json({ error: "Failed to add documents to workspace" });
    }
};

export const removeWorkspaceDocument = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { workspaceId, documentId } = req.params;
        if (!isValidObjectId(workspaceId)) {
            return res.status(400).json({ error: "Invalid workspace ID" });
        }

        const workspace = await Workspace.findOne({ _id: workspaceId, userId });
        if (!workspace) {
            return res.status(404).json({ error: "Workspace not found" });
        }

        workspace.documentIds = workspace.documentIds.filter(id => id.toString() !== documentId);
        await workspace.save();

        await Chat.updateMany(
            { workspaceId, userId },
            { $pull: { activeDocumentIds: documentId } }
        );

        res.json(await serializeWorkspace(workspace, userId));
    } catch (error) {
        console.error("[REMOVE WORKSPACE DOC ERROR]", error);
        res.status(500).json({ error: "Failed to remove document from workspace" });
    }
};

export const deleteWorkspace = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { workspaceId } = req.params;
        if (!isValidObjectId(workspaceId)) {
            return res.status(400).json({ error: "Invalid workspace ID" });
        }

        const workspace = await Workspace.findOne({ _id: workspaceId, userId });
        if (!workspace) {
            return res.status(404).json({ error: "Workspace not found" });
        }

        const chats = await Chat.find({ workspaceId, userId }).select("_id");
        await Message.deleteMany({ chatId: { $in: chats.map(chat => chat._id) } });
        await Chat.deleteMany({ workspaceId, userId });
        await Workspace.deleteOne({ _id: workspaceId, userId });

        res.json({ message: "Workspace deleted successfully", workspaceId });
    } catch (error) {
        console.error("[DELETE WORKSPACE ERROR]", error);
        res.status(500).json({ error: "Failed to delete workspace" });
    }
};
