import express from "express";
import { getChatsByDocument, getChatMessages, deleteChat } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:documentId", protect, getChatsByDocument);
router.get("/detail/:chatId", protect, getChatMessages);
router.delete("/:chatId", protect, deleteChat);

export default router;
