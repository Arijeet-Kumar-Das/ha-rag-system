import express from "express";
import { askQuestion } from "../controllers/askController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, askQuestion);

export default router;