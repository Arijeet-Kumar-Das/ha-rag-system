import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/db.js";

// Environment validation
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'OPENAI_API_KEY',
  'PINECONE_API_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
  console.error('\n📝 Please check your .env file and ensure all required variables are set.');
  console.error('💡 Refer to .env.example for the required format.');
  process.exit(1);
}

// Global Error Handlers
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    const BACKEND_URL = process.env.BACKEND_URL;
    if (BACKEND_URL) {
      const INTERVAL_MS = 14 * 60 * 1000; // 14 minutes
      setInterval(async () => {
        try {
          const res = await fetch(BACKEND_URL);
          console.log(`[keep-alive] pinged ${BACKEND_URL} — ${res.status}`);
        } catch (err) {
          console.error(`[keep-alive] ping failed:`, err.message);
        }
      }, INTERVAL_MS);
      console.log(
        `[keep-alive] self-ping enabled every 14 min → ${BACKEND_URL}`,
      );
    } else {
      console.warn("[keep-alive] BACKEND_URL not set — self-ping disabled");
    }
  });
};

startServer();
