import express from "express";
import { getChatsByDocument, getChatsByWorkspace, getChatMessages, deleteChat } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Static-prefix routes MUST come before the catch-all /:documentId
router.get("/workspace/:workspaceId", protect, getChatsByWorkspace);
router.get("/detail/:chatId", protect, getChatMessages);
router.get("/:documentId", protect, getChatsByDocument);
router.delete("/:chatId", protect, deleteChat);

export default router;
