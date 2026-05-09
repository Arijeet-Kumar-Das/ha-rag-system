import express from "express";
import upload from "../config/multer.js";
import { uploadPDF } from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, upload.single("file"), uploadPDF);

export default router;