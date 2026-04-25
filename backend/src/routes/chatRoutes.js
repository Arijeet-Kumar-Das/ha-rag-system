import express from "express";
import { getChatsByDocument, getChatMessages, deleteChat } from "../controllers/chatController.js";

const router = express.Router();

router.get("/:documentId", getChatsByDocument);
router.get("/detail/:chatId", getChatMessages);
router.delete("/:chatId", deleteChat);

export default router;
