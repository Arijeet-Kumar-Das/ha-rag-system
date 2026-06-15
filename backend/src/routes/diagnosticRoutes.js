import express from "express";
import { getOcrDiagnostics } from "../controllers/ocrDiagnosticsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/document/:documentId/ocr", protect, getOcrDiagnostics);

export default router;
