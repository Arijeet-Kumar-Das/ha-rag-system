import express from "express";
import cors from "cors";
import uploadRoutes from "./routes/uploadRoutes.js"
import askRoutes from "./routes/askRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();

app.use(cors({
    origin: "*",
}));
app.use(express.json());

app.use("/api/upload", uploadRoutes);
app.use("/api/ask", askRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => {
    res.send("HA-RAG API Running 🚀");
});

export default app;