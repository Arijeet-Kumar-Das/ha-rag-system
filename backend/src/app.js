import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js"
import askRoutes from "./routes/askRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { protect } from "./middleware/authMiddleware.js";

const app = express();

app.use(cors({
    origin: "*",
}));
app.use(express.json());

// Public routes
app.use("/api/auth", authRoutes);

// Protected routes — require JWT
app.use("/api/upload", protect, uploadRoutes);
app.use("/api/ask", protect, askRoutes);
app.use("/api/document", protect, documentRoutes);
app.use("/api/chat", protect, chatRoutes);

app.get("/", (req, res) => {
    res.send("HA-RAG API Running 🚀");
});

export default app;