import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";
import Button from "../components/ui/Button";
import useLogo from "../hooks/useLogo";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeUpScroll = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ── Feature cards data ──────────────────────────────────────────── */
const featureCards = [
  {
    title: "OCR Extraction",
    desc: "Automatically detects scanned pages and extracts text using Tesseract OCR. Works on image-based PDFs, photos of documents, and mixed-content files.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 8h4M7 12h10M7 16h7" />
        <path d="M17 8l2-2M19 8l-2-2" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    title: "Figure Understanding",
    desc: "Identifies charts, diagrams, and visual elements. Generates retrieval-optimized descriptions with trends, comparisons, and numerical insights.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <polyline points="7 14 10 10 13 13 17 8" />
        <circle cx="17" cy="8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: "Table Intelligence",
    desc: "Detects and understands tables. Extracts structure, headers, and data relationships. Generates semantic summaries for accurate retrieval.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    ),
  },
  {
    title: "Hybrid Search",
    desc: "Combines BM25 keyword matching with dense vector search using Reciprocal Rank Fusion for superior retrieval accuracy across all content types.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="8" y1="11" x2="14" y2="11" />
        <line x1="11" y1="8" x2="11" y2="14" />
      </svg>
    ),
  },
  {
    title: "Source Attribution",
    desc: "Every answer traces back to exact source paragraphs, figures, or tables. Extraction method and page numbers are preserved at the chunk level.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Research Workspaces",
    desc: "Organize papers into isolated workspaces. Query across multiple documents without cross-contamination. Built for systematic literature reviews.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
      </svg>
    ),
  },
];

/* ── Architecture decomposition data ─────────────────────────────── */
const decompositionLayers = [
  {
    title: "Text",
    desc: "Direct text extraction with page-level segmentation",
    badge: "PyMuPDF",
    dotColor: "#5b8def",
  },
  {
    title: "OCR",
    desc: "Tesseract-powered extraction for scanned content",
    badge: "Tesseract",
    dotColor: "#e8924a",
  },
  {
    title: "Figures",
    desc: "Vision AI descriptions of charts and diagrams",
    badge: "GPT-4o",
    dotColor: "#52b97b",
  },
  {
    title: "Tables",
    desc: "Structured analysis with trend and comparison insights",
    badge: "GPT-4o",
    dotColor: "#a578d6",
  },
];

/* ── RAG Pipeline Visual ─────────────────────────────────────────── */
function PipelineVisual({ isDark }) {
  const accent = "#c9a55a";
  const accentFaint = isDark
    ? "rgba(201,165,90,0.12)"
    : "rgba(201,165,90,0.08)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const surface = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const textPrimary = isDark ? "rgba(255,255,255,0.88)" : "#1a1a1a";
  const textSecondary = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const connectorColor = isDark
    ? "rgba(201,165,90,0.3)"
    : "rgba(201,165,90,0.35)";

  const nodeStyle = {
    background: surface,
    border: `1px solid ${border}`,
    borderRadius: 10,
    padding: "14px 16px",
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  };

  const iconBoxStyle = {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: accentFaint,
    border: `1px solid rgba(201,165,90,0.2)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: accent,
  };

  const steps = [
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
      label: "Document Upload",
      sub: "Upload PDFs into isolated workspaces",
      badge: null,
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      label: "Text Extraction + OCR",
      sub: "Native text and scanned page extraction",
      badge: "Tesseract",
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <polyline points="7 14 10 10 13 13 17 8" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="15" x2="9" y2="21" />
        </svg>
      ),
      label: "Figure & Table Analysis",
      sub: "Vision AI interprets charts, diagrams, and tables",
      badge: "GPT-4o",
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
      label: "Semantic Chunking",
      sub: "Context-aware segmentation with metadata",
      badge: null,
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      label: "Hybrid Retrieval",
      sub: "Dual-path search with rank fusion",
      badge: "BM25 + Vector",
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
      label: "Grounded Answer",
      sub: "LLM responds using only retrieved context",
      badge: "GPT-4",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: "100%" }}
    >
      {/* Section label */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 16,
        }}
      >
        How it works
      </div>

      {/* Pipeline steps */}
      {steps.map((step, i) => (
        <div key={i}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4 + i * 0.08 }}
            style={nodeStyle}
          >
            <div style={iconBoxStyle}>{step.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 3,
                }}
              >
                <span
                  style={{ fontSize: 13, fontWeight: 500, color: textPrimary }}
                >
                  {step.label}
                </span>
                {step.badge && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: accentFaint,
                      border: `1px solid rgba(201,165,90,0.2)`,
                      color: accent,
                      letterSpacing: "0.03em",
                    }}
                  >
                    {step.badge}
                  </span>
                )}
              </div>
              <div
                style={{ fontSize: 12, color: textSecondary, lineHeight: 1.5 }}
              >
                {step.sub}
              </div>
            </div>
          </motion.div>

          {i < steps.length - 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                paddingLeft: 17,
              }}
            >
              <div
                style={{ width: 1, height: 14, background: connectorColor }}
              />
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: accent,
                  marginLeft: -2,
                }}
              />
              <div style={{ height: 2 }} />
            </motion.div>
          )}
        </div>
      ))}

      {/* Grounded badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        style={{
          marginTop: 14,
          padding: "10px 14px",
          borderRadius: 8,
          background: isDark
            ? "rgba(82,185,123,0.08)"
            : "rgba(82,185,123,0.07)",
          border: `1px solid ${isDark ? "rgba(82,185,123,0.18)" : "rgba(82,185,123,0.2)"}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#52b97b"
          strokeWidth="2"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span
          style={{
            fontSize: 12,
            color: isDark ? "#7dcf9e" : "#2d7a50",
            fontWeight: 500,
          }}
        >
          Every answer is grounded — no hallucinations
        </span>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.4 }}
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 1,
          borderRadius: 10,
          overflow: "hidden",
          border: `1px solid ${border}`,
        }}
      >
        {[
          { value: "5-Stage", label: "Pipeline" },
          { value: "Multimodal", label: "Analysis" },
          { value: "100%", label: "Grounded" },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              background: surface,
              padding: "14px 12px",
              textAlign: "center",
              borderRight: i < 2 ? `1px solid ${border}` : "none",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: accent,
                letterSpacing: "-0.02em",
                fontFamily: "var(--font-serif)",
                marginBottom: 3,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 10,
                color: textSecondary,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ── Main ────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const logo = useLogo();

  const capabilityPills = ["OCR", "Figure AI", "Table AI", "Hybrid Search"];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "-5%",
          width: 700,
          height: 600,
          background:
            "radial-gradient(ellipse, rgba(201,165,90,0.05) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── Navbar ── */}
      <nav
        style={{
          position: "relative",
          zIndex: 10,
          padding: "0 48px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <img src={logo} alt="HA-RAG" style={{ height: 32, width: "auto" }} />
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
            }}
          >
            HA-RAG
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button
            onClick={toggleTheme}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              padding: 6,
              display: "flex",
              borderRadius: 6,
            }}
          >
            {isDark ? (
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          {user ? (
            <Link to="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Sign in
              </Link>
              <Link to="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section
        className="harag-hero-grid"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1160,
          margin: "0 auto",
          width: "100%",
          padding: "56px 48px 64px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 64,
          alignItems: "start",
        }}
      >
        {/* Left */}
        <div>
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 20,
            }}
          >
            Multimodal Document Intelligence
          </motion.p>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            style={{
              fontSize: "clamp(2.2rem, 4vw, 3.4rem)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "var(--text-primary)",
              lineHeight: 1.08,
              marginBottom: 22,
            }}
          >
            Ask Questions Across Text,{" "}
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontWeight: 500,
                background:
                  "linear-gradient(135deg, var(--accent) 0%, #e8c96a 50%, var(--accent) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Tables, Charts
            </span>
            , and Scanned Documents.
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            style={{
              fontSize: 16,
              color: "var(--text-secondary)",
              lineHeight: 1.75,
              marginBottom: 32,
              maxWidth: 460,
            }}
          >
            Upload research papers — HA-RAG extracts text, reads scanned pages,
            understands figures, and analyzes tables. Ask anything and get
            verified, source-grounded answers.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 28,
            }}
          >
            <Link to={user ? "/dashboard" : "/register"}>
              <Button size="lg">
                {user ? "Open workspace" : "Start researching"}
              </Button>
            </Link>
            {!user && (
              <Link to="/login">
                <Button variant="secondary" size="lg">
                  View demo
                </Button>
              </Link>
            )}
          </motion.div>

          {/* Capability pills */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 0,
            }}
          >
            {capabilityPills.map((pill, i) => (
              <span
                key={i}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 14px",
                  borderRadius: 20,
                  background: "var(--accent-subtle)",
                  border: "1px solid var(--accent-muted)",
                  color: "var(--accent)",
                  letterSpacing: "0.02em",
                }}
              >
                {pill}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Right: pipeline */}
        <div
          style={{
            borderLeft: "1px solid var(--border-color)",
            paddingLeft: 56,
            paddingTop: 4,
          }}
        >
          <PipelineVisual isDark={isDark} />
        </div>
      </section>

      {/* ── Feature Cards Section ── */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid var(--border-color)",
        }}
      >
        <div
          className="harag-section-inner"
          style={{
            maxWidth: 1160,
            margin: "0 auto",
            width: "100%",
            padding: "80px 48px",
          }}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUpScroll}
            style={{ textAlign: "center", marginBottom: 48 }}
          >
            <h2
              style={{
                fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                marginBottom: 12,
              }}
            >
              Built for Every Layer of Your Documents
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                maxWidth: 560,
                margin: "0 auto",
              }}
            >
              From scanned pages to complex data tables, HA-RAG extracts,
              understands, and indexes every element for precise retrieval.
            </p>
          </motion.div>

          <div
            className="harag-features-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 18,
            }}
          >
            {featureCards.map((card, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.45,
                      delay: i * 0.07,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  },
                }}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: "var(--accent-subtle)",
                    border: "1px solid var(--accent-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent)",
                    marginBottom: 14,
                  }}
                >
                  {card.icon}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 8,
                  }}
                >
                  {card.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.65,
                  }}
                >
                  {card.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture Decomposition Section ── */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid var(--border-color)",
        }}
      >
        <div
          className="harag-section-inner"
          style={{
            maxWidth: 1160,
            margin: "0 auto",
            width: "100%",
            padding: "80px 48px",
          }}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUpScroll}
            style={{ textAlign: "center", marginBottom: 48 }}
          >
            <h2
              style={{
                fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                marginBottom: 12,
              }}
            >
              Every Document, Fully Understood
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                maxWidth: 560,
                margin: "0 auto",
              }}
            >
              HA-RAG decomposes documents into four semantic layers, each
              optimized for retrieval.
            </p>
          </motion.div>

          {/* 4 decomposition cards */}
          <div
            className="harag-arch-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {decompositionLayers.map((layer, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.45,
                      delay: i * 0.08,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  },
                }}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 12,
                  padding: 22,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: layer.dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {layer.title}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    flex: 1,
                  }}
                >
                  {layer.desc}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 20,
                    background: isDark
                      ? "rgba(201,165,90,0.1)"
                      : "rgba(201,165,90,0.08)",
                    border: "1px solid rgba(201,165,90,0.2)",
                    color: "#c9a55a",
                    alignSelf: "flex-start",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                  }}
                >
                  {layer.badge}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Connector arrow */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpScroll}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 1,
                height: 24,
                background: isDark
                  ? "rgba(201,165,90,0.3)"
                  : "rgba(201,165,90,0.35)",
              }}
            />
            <svg
              width="12"
              height="8"
              viewBox="0 0 12 8"
              fill="none"
              style={{ display: "block" }}
            >
              <path
                d="M1 1L6 6L11 1"
                stroke="#c9a55a"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>

          {/* Unified pipeline card */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpScroll}
            style={{
              maxWidth: 480,
              margin: "0 auto",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-color)",
              borderRadius: 12,
              padding: "22px 28px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c9a55a"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                Unified Retrieval Pipeline
              </span>
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              All content types flow into a single BM25 + Vector search index
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          position: "relative",
          zIndex: 1,
          padding: "20px 48px",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={logo}
            alt="HA-RAG"
            style={{ height: 20, width: "auto", opacity: 0.45 }}
          />
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            © {new Date().getFullYear()} HA-RAG System
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {["GPT-4o", "Tesseract OCR", "Pinecone", "Hybrid RAG", "Vision AI"].map(
            (tech, i) => (
              <span
                key={i}
                style={{
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-color)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  fontWeight: 500,
                }}
              >
                {tech}
              </span>
            ),
          )}
        </div>
      </footer>

      {/* ── Responsive overrides ── */}
      <style>{`
        @media (max-width: 900px) {
          .harag-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
            padding: 40px 24px 48px !important;
          }
          .harag-hero-grid > div:last-child {
            border-left: none !important;
            padding-left: 0 !important;
            border-top: 1px solid var(--border-color) !important;
            padding-top: 32px !important;
          }
          .harag-features-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .harag-arch-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .harag-features-grid {
            grid-template-columns: 1fr !important;
          }
          .harag-arch-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 800px) {
          nav[style] {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
          footer[style] {
            padding-left: 20px !important;
            padding-right: 20px !important;
            flex-direction: column !important;
            gap: 12px !important;
            text-align: center !important;
          }
          .harag-section-inner {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
