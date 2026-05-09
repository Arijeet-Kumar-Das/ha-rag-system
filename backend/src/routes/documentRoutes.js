import express from "express";
import { deleteDocument, getDocuments } from "../controllers/documentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getDocuments);
router.delete("/:id", protect, deleteDocument);

export default router;
