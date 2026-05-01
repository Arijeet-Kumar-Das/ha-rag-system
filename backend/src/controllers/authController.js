import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

/**
 * POST /api/auth/register
 */
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Name, email, and password are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: "An account with this email already exists" });
        }

        const user = await User.create({ name, email, password });
        const token = generateToken(user._id);

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("[REGISTER ERROR]", error);
        res.status(500).json({ error: "Registration failed" });
    }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("[LOGIN ERROR]", error);
        res.status(500).json({ error: "Login failed" });
    }
};

/**
 * POST /api/auth/demo
 * One-click demo login for recruiters — creates or finds a demo account.
 */
export const demoLogin = async (req, res) => {
    try {
        const DEMO_EMAIL = "demo@ha-rag.dev";
        const DEMO_NAME = "Demo Recruiter";
        const DEMO_PASS = "demo_recruiter_2026_secure";

        let user = await User.findOne({ email: DEMO_EMAIL });

        if (!user) {
            user = await User.create({
                name: DEMO_NAME,
                email: DEMO_EMAIL,
                password: DEMO_PASS,
                role: "demo",
            });
        }

        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("[DEMO LOGIN ERROR]", error);
        res.status(500).json({ error: "Demo login failed" });
    }
};

/**
 * GET /api/auth/me
 * Returns current authenticated user info.
 */
export const getMe = async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
            },
        });
    } catch (error) {
        console.error("[GET ME ERROR]", error);
        res.status(500).json({ error: "Failed to get user info" });
    }
};
