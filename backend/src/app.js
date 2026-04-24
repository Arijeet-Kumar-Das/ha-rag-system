import express from "express";
import cors from "cors";
import uploadRoutes from "./routes/uploadRoutes.js"
import askRoutes from "./routes/askRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/upload", uploadRoutes);
app.use("/api/ask", askRoutes);

app.get("/", (req, res) => {
    res.send("HA-RAG API Running 🚀");
});

export default app;