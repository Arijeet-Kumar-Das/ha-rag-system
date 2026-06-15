import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js"
import askRoutes from "./routes/askRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import diagnosticRoutes from "./routes/diagnosticRoutes.js";
import { protect } from "./middleware/authMiddleware.js";

const app = express();

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com'] // Replace with your actual frontend domain
        : ['http://localhost:3000', 'http://localhost:5173'], // Common dev ports for React/Vite
    credentials: true,
    exposedHeaders: ["X-Chat-Id"],
}));
app.use(express.json());

// Public routes
app.use("/api/auth", authRoutes);

// Protected routes — require JWT
app.use("/api/upload", protect, uploadRoutes);
app.use("/api/ask", protect, askRoutes);
app.use("/api/document", protect, documentRoutes);
app.use("/api/workspace", protect, workspaceRoutes);
app.use("/api/chat", protect, chatRoutes);
app.use("/api/diagnostics", protect, diagnosticRoutes);

app.get("/", (req, res) => {
    res.send("HA-RAG API Running 🚀");
});

export default app;
