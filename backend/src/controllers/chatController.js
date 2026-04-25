import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

export const getChatsByDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        if (!documentId) return res.status(400).json({ error: "documentId is required" });

        const chats = await Chat.find({ documentId }).sort({ updatedAt: -1 }).limit(50);
        res.json(chats);
    } catch (err) {
        console.error("[GET CHATS ERROR]", err);
        res.status(500).json({ error: "Failed to fetch chats" });
    }
};

export const getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        if (!chatId) return res.status(400).json({ error: "chatId is required" });

        const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        console.error("[GET MESSAGES ERROR]", err);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
};

export const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        if (!chatId) return res.status(400).json({ error: "chatId is required" });

        await Message.deleteMany({ chatId });
        await Chat.findByIdAndDelete(chatId);

        res.json({ message: "Chat deleted successfully" });
    } catch (err) {
        console.error("[DELETE CHAT ERROR]", err);
        res.status(500).json({ error: "Failed to delete chat" });
    }
};
