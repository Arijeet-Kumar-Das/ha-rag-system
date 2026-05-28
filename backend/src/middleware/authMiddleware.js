import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Simple user cache to avoid DB lookup on every request
const userCache = new Map();
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedUser = (userId) => {
    const entry = userCache.get(userId);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > USER_CACHE_TTL) {
        userCache.delete(userId);
        return null;
    }
    return entry.user;
};

const setCachedUser = (userId, user) => {
    userCache.set(userId, { user, timestamp: Date.now() });
    // Evict old entries if cache grows too large
    if (userCache.size > 200) {
        const oldest = userCache.keys().next().value;
        userCache.delete(oldest);
    }
};

export const protect = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res
                .status(401)
                .json({ error: "Not authorized — no token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check cache first
        let user = getCachedUser(decoded.id);
        if (!user) {
            user = await User.findById(decoded.id).select("-password").lean();
            if (user) setCachedUser(decoded.id, user);
        }

        if (!user) {
            return res.status(401).json({ error: "Not authorized — user not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("[AUTH MIDDLEWARE]", error.message);
        return res.status(401).json({ error: "Not authorized — invalid token" });
    }
};
