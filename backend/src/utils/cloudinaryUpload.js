import cloudinary from "../config/cloudinary.js";

/**
 * Uploads a PDF buffer to Cloudinary for archival/reference.
 * This runs AFTER the PDF has already been processed in memory.
 *
 * Uses upload_stream since we're working with a Buffer, not a file path.
 *
 * @param {Buffer} buffer   - The raw PDF bytes.
 * @param {string} fileName - Original filename (used to build the public_id).
 * @returns {Promise<{ url: string, publicId: string }>} Cloudinary result.
 */
export const uploadBufferToCloudinary = (buffer, fileName) => {
    return new Promise((resolve, reject) => {
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        const publicId = `${Date.now()}-${baseName}`;

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "ha-rag-uploads",
                resource_type: "raw",
                public_id: publicId,
                format: "pdf",
            },
            (error, result) => {
                if (error) {
                    console.error("[CLOUDINARY] ❌ Upload failed:", error.message);
                    return reject(error);
                }

                console.log(`[CLOUDINARY] ✅ Uploaded: ${result.secure_url}`);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        // Pipe the buffer into the upload stream
        uploadStream.end(buffer);
    });
};
