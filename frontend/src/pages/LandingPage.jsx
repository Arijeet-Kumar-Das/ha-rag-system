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

const features = [
  {
    title: "Verified Citations",
    desc: "Every claim is traced back to the exact paragraph in your source PDF. No hallucinations.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Workspace Silos",
    desc: "Group related papers into isolated workspaces to prevent cross-contamination of sources.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    title: "Confidence Scoring",
    desc: "Every answer is graded on a confidence scale — green, amber, or red — so you know what to trust.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
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
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      label: "Source PDFs",
      sub: "Upload academic papers into a workspace",
      badge: null,
    },
    {
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      ),
      label: "Vector index",
      sub: "Chunks embedded into Pinecone",
      badge: "Pinecone",
    },
    {
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      label: "Semantic retrieval",
      sub: "Top-k chunks matched to your query",
      badge: "RAG",
    },
    {
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
      label: "Grounded answer",
      sub: "GPT-4 responds using only retrieved context",
      badge: "GPT-4",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: "100%", maxWidth: 340 }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 20,
        }}
      >
        How it works
      </div>

      {steps.map((step, i) => (
        <div key={i}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4 + i * 0.1 }}
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
              transition={{ delay: 0.5 + i * 0.1 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                paddingLeft: 17,
              }}
            >
              <div
                style={{ width: 1, height: 20, background: connectorColor }}
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
              <div style={{ height: 4 }} />
            </motion.div>
          )}
        </div>
      ))}

      {/* Grounded badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        style={{
          marginTop: 20,
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
    </motion.div>
  );
}

/* ── Main ────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const logo = useLogo();

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

      {/* ── Hero ── */}
      <main
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          maxWidth: 1160,
          margin: "0 auto",
          width: "100%",
          padding: "80px 48px 80px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 64,
          alignItems: "center",
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
              marginBottom: 24,
            }}
          >
            Academic OS 2.0
          </motion.p>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            style={{
              fontSize: "clamp(2.6rem, 4.5vw, 4rem)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "var(--text-primary)",
              lineHeight: 1.06,
              marginBottom: 24,
            }}
          >
            Research intelligence,{" "}
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
              grounded
            </span>{" "}
            in your documents.
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
              marginBottom: 36,
              maxWidth: 440,
            }}
          >
            Upload academic papers, build targeted workspaces, and query your
            research with verified, source-grounded answers. No hallucinations —
            just citations.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 52,
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

          {/* Divider before features */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4}
          >
            <div
              style={{
                height: 1,
                background: "var(--border-color)",
                marginBottom: 32,
                maxWidth: 440,
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {features.map((feat, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "flex-start", gap: 14 }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: "var(--accent-subtle)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {feat.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginBottom: 3,
                      }}
                    >
                      {feat.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        lineHeight: 1.65,
                      }}
                    >
                      {feat.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: pipeline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderLeft: "1px solid var(--border-color)",
            paddingLeft: 56,
            alignSelf: "stretch",
          }}
        >
          <PipelineVisual isDark={isDark} />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          position: "relative",
          zIndex: 1,
          padding: "24px 48px",
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
            style={{ height: 20, width: "auto", opacity: 0.5 }}
          />
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            © {new Date().getFullYear()} HA-RAG System
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {["OpenAI GPT-4", "Pinecone", "RAG", "SSE Streaming"].map(
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
    </div>
  );
}
