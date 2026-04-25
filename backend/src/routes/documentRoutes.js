import express from "express";
import { deleteDocument, getDocuments } from "../controllers/documentController.js";

const router = express.Router();

router.get("/", getDocuments);
router.delete("/:id", deleteDocument);

export default router;
