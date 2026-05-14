import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import Document from "../models/Document.js";
import Workspace from "../models/Workspace.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getChatsByDocument = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const { documentId } = req.params;
        if (!documentId || !isValidId(documentId)) return res.status(400).json({ error: "Valid documentId is required" });

        // Verify the document belongs to the current user
        const doc = await Document.findById(documentId);
        if (!doc || doc.userId !== req.user._id.toString()) {
            return res.status(403).json({ error: "Not authorized to access this document's chats" });
        }

        const chats = await Chat.find({ documentId, userId: req.user._id.toString() }).sort({ updatedAt: -1 }).limit(50);
        res.json(chats);
    } catch (err) {
        console.error("[GET CHATS ERROR]", err);
        res.status(500).json({ error: "Failed to fetch chats" });
    }
};

export const getChatsByWorkspace = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const { workspaceId } = req.params;
        if (!workspaceId || !isValidId(workspaceId)) return res.status(400).json({ error: "Valid workspaceId is required" });

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace || workspace.userId !== req.user._id.toString()) {
            return res.status(403).json({ error: "Not authorized to access this workspace's chats" });
        }

        const chats = await Chat.find({ workspaceId, userId: req.user._id.toString() })
            .sort({ updatedAt: -1 })
            .limit(50);
        res.json(chats);
    } catch (err) {
        console.error("[GET WORKSPACE CHATS ERROR]", err);
        res.status(500).json({ error: "Failed to fetch workspace chats" });
    }
};

export const getChatMessages = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const { chatId } = req.params;
        if (!chatId || !isValidId(chatId)) return res.status(400).json({ error: "Valid chatId is required" });

        // Verify the chat belongs to the current user
        const chat = await Chat.findById(chatId);
        if (!chat || chat.userId !== req.user._id.toString()) {
            return res.status(403).json({ error: "Not authorized to access this chat" });
        }

        const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        console.error("[GET MESSAGES ERROR]", err);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
};

export const deleteChat = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const { chatId } = req.params;
        if (!chatId || !isValidId(chatId)) return res.status(400).json({ error: "Valid chatId is required" });

        // Verify the chat belongs to the current user
        const chat = await Chat.findById(chatId);
        if (!chat || chat.userId !== req.user._id.toString()) {
            return res.status(403).json({ error: "Not authorized to delete this chat" });
        }

        await Message.deleteMany({ chatId });
        await Chat.findByIdAndDelete(chatId);

        res.json({ message: "Chat deleted successfully" });
    } catch (err) {
        console.error("[DELETE CHAT ERROR]", err);
        res.status(500).json({ error: "Failed to delete chat" });
    }
};
