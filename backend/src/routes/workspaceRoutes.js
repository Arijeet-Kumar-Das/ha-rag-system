import express from "express";
import {
    addWorkspaceDocuments,
    createWorkspace,
    deleteWorkspace,
    getWorkspaces,
    removeWorkspaceDocument,
    updateWorkspace
} from "../controllers/workspaceController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getWorkspaces);
router.post("/", protect, createWorkspace);
router.patch("/:workspaceId", protect, updateWorkspace);
router.post("/:workspaceId/documents", protect, addWorkspaceDocuments);
router.delete("/:workspaceId/documents/:documentId", protect, removeWorkspaceDocument);
router.delete("/:workspaceId", protect, deleteWorkspace);

export default router;
