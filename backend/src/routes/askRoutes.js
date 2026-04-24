import express from "express";
import { askQuestion } from "../controllers/askController.js";

const router = express.Router();

router.post("/", askQuestion);

export default router;