import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { uploadPDF } from "../controllers/uploadController.js";

const router = express.Router();

router.post("/", upload.single("file"), uploadPDF);

export default router;