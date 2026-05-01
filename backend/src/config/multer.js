import multer from "multer";

/**
 * Multer configured with memoryStorage.
 *
 * The file is held entirely in memory as a Buffer (req.file.buffer).
 * This avoids any filesystem dependency and allows immediate in-memory
 * processing before optionally uploading to Cloudinary for archival.
 *
 * No CloudinaryStorage — we upload to Cloudinary manually AFTER processing.
 */
const storage = multer.memoryStorage();

/**
 * File filter — only accept application/pdf MIME type.
 */
const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        cb(null, true);
    } else {
        cb(new Error("Only PDF files are allowed"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

export default upload;
