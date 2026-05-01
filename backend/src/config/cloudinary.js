import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify configuration on import
if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
) {
    console.warn(
        "[CLOUDINARY] ⚠️  Missing one or more Cloudinary environment variables. Uploads will fail."
    );
} else {
    console.log("[CLOUDINARY] ✅ Configured successfully.");
}

export default cloudinary;
