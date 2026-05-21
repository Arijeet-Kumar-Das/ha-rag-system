import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";
import { useState, useEffect, useRef } from "react";
import logo from "../assets/logo.png";

/* ─────────────────────────────────────────
   Feature card data
───────────────────────────────────────── */
const featureCards = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ width: 22, height: 22 }}
      >
        <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    number: "01",
    title: "Upload Documents",
    desc: "Drop your PDFs and let AI index them for instant, semantic retrieval.",
    tag: "Ingest",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ width: 22, height: 22 }}
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    number: "02",
    title: "Ask Questions",
    desc: "Get context-aware, grounded answers drawn directly from your documents.",
    tag: "Query",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ width: 22, height: 22 }}
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    number: "03",
    title: "Verified Answers",
    desc: "Every response is cross-checked against source documents for accuracy.",
    tag: "Verify",
  },
];

/* ─────────────────────────────────────────
   Intersection-observer reveal hook
───────────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
const LandingPage = () => {
  const { isAuthenticated, demoLogin } = useAuth();
  const { isDark, t } = useTheme();
  const navigate = useNavigate();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [featRef, featVisible] = useReveal();
  const [statsRef, statsVisible] = useReveal(0.2);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(id);
  }, []);

  const handleDemo = async () => {
    setIsDemoLoading(true);
    try {
      await demoLogin();
      navigate("/dashboard");
    } catch {
    } finally {
      setIsDemoLoading(false);
    }
  };

  /* ── colour tokens ── */
  const bg = isDark ? "#0a0a0f" : "#fafbff";
  const surface = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.85)";
  const surfaceH = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,1)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.09)";
  const borderH = isDark ? "rgba(99,102,241,0.5)" : "rgba(79,70,229,0.35)";
  const txt = isDark ? "#f8fafc" : "#0f172a";
  const txtSub = isDark ? "#8892a4" : "#4b5563";
  const txtFaint = isDark ? "#374151" : "#9ca3af";
  const gridCol = isDark ? "rgba(255,255,255,0.028)" : "rgba(15,23,42,0.038)";

  /* gradient strings used in CSS classes (not inline) */
  const gradA = isDark ? "#6366f1" : "#4f46e5";
  const gradB = isDark ? "#8b5cf6" : "#7c3aed";
  const gradBtn = `linear-gradient(135deg, ${gradA} 0%, ${gradB} 100%)`;

  /* card accent palettes */
  const palettes = isDark
    ? [
        {
          bg: "rgba(139,92,246,0.12)",
          fg: "#a78bfa",
          tag: "rgba(139,92,246,0.2)",
        },
        {
          bg: "rgba(6,182,212,0.12)",
          fg: "#22d3ee",
          tag: "rgba(6,182,212,0.2)",
        },
        {
          bg: "rgba(52,211,153,0.12)",
          fg: "#34d399",
          tag: "rgba(52,211,153,0.2)",
        },
      ]
    : [
        {
          bg: "rgba(99,102,241,0.09)",
          fg: "#4f46e5",
          tag: "rgba(99,102,241,0.12)",
        },
        {
          bg: "rgba(14,165,233,0.09)",
          fg: "#0284c7",
          tag: "rgba(14,165,233,0.12)",
        },
        {
          bg: "rgba(16,185,129,0.09)",
          fg: "#059669",
          tag: "rgba(16,185,129,0.12)",
        },
      ];

  /* ── hero words for staggered reveal ── */
  const heroWords = [
    { text: "Chat", gradient: false },
    { text: "with", gradient: false },
    { text: "your", gradient: false },
    { text: "documents", gradient: true },
    { text: "using", gradient: false },
    { text: "AI", gradient: false },
  ];

  return (
    <div
      style={{
        background: bg,
        minHeight: "100vh",
        overflowX: "hidden",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ═══════════════ GLOBAL STYLES ═══════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── gradient text utility ── */
        .ha-grad-text {
          background: linear-gradient(135deg, ${gradA} 0%, ${gradB} 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          display: inline-block;
        }        /* ── hero word entrance ── */
        .ha-word {
          display: inline-block;
          margin-right: 0.2em;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.55s cubic-bezier(.22,1,.36,1), transform 0.55s cubic-bezier(.22,1,.36,1);
        }
        .ha-word.in { opacity: 1; transform: translateY(0); }

        /* ── fade-up utility ── */
        .ha-fade { opacity: 0; transform: translateY(14px); transition: opacity 0.65s ease, transform 0.65s ease; }
        .ha-fade.in { opacity: 1; transform: translateY(0); }

        /* ── buttons ── */
        .ha-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          height: 50px; padding: 0 28px; border-radius: 10px;
          font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600;
          color: #fff; text-decoration: none; border: none; cursor: pointer;
          background: ${gradBtn};
          box-shadow: 0 4px 20px ${isDark ? "rgba(99,102,241,0.4)" : "rgba(79,70,229,0.3)"};
          position: relative; overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          letter-spacing: -0.01em;
        }
        .ha-btn-primary::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 55%);
          opacity: 0; transition: opacity 0.2s;
        }
        .ha-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px ${isDark ? "rgba(99,102,241,0.5)" : "rgba(79,70,229,0.42)"}; }
        .ha-btn-primary:hover::before { opacity: 1; }
        .ha-btn-primary:active { transform: translateY(0); }

        .ha-btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          height: 50px; padding: 0 28px; border-radius: 10px;
          font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600;
          text-decoration: none; cursor: pointer; background: transparent;
          border: 1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.14)"};
          color: ${isDark ? "#e2e8f0" : "#334155"};
          transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
          letter-spacing: -0.01em;
        }
        .ha-btn-ghost:hover { transform: translateY(-2px); background: ${isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)"}; border-color: ${isDark ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.25)"}; }
        .ha-btn-ghost:active { transform: translateY(0); }
        .ha-btn-ghost:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ── nav link ── */
        .ha-nav-link {
          display: inline-flex; align-items: center; height: 38px; padding: 0 14px;
          border-radius: 8px; font-size: 13px; font-weight: 500; text-decoration: none;
          color: ${txtSub}; font-family: 'Inter', sans-serif;
          transition: color 0.2s, background 0.2s;
        }
        .ha-nav-link:hover { color: ${txt}; background: ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}; }

        /* ── spinning ring ── */
        .ha-ring { animation: ha-spin 14s linear infinite; }
        @keyframes ha-spin { to { transform: rotate(360deg); } }

        /* ── badge dot pulse ── */
        .ha-dot { animation: ha-dotpulse 2.2s ease-in-out infinite; }
        @keyframes ha-dotpulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
          50%      { box-shadow: 0 0 0 6px rgba(52,211,153,0); }
        }

        /* ── ticker ── */
        .ha-ticker-wrap { overflow: hidden; }
        .ha-ticker-track {
          display: flex; gap: 0; width: max-content;
          animation: ha-scroll 22s linear infinite;
        }
        @keyframes ha-scroll { to { transform: translateX(-50%); } }

        /* ── feature card ── */
        .ha-card {
          position: relative; overflow: hidden;
          transition: transform 0.32s cubic-bezier(.22,1,.36,1),
                      box-shadow 0.32s ease, border-color 0.22s ease, background 0.22s ease;
        }
        .ha-card:hover { transform: translateY(-6px); }

        /* ── loader spin ── */
        .ha-spin-sm { animation: ha-spin 0.7s linear infinite; }

        /* ── noise texture overlay ── */
        .ha-noise {
          position: fixed; inset: 0; pointer-events: none; z-index: 999; opacity: ${isDark ? "0.025" : "0.018"};
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 180px 180px;
        }

        /* ── diagonal accent line ── */
        .ha-diag {
          position: absolute; pointer-events: none;
          width: 2px; height: 220px;
          background: linear-gradient(180deg, transparent, ${isDark ? "rgba(139,92,246,0.25)" : "rgba(99,102,241,0.18)"}, transparent);
          transform: rotate(25deg); border-radius: 2px;
        }

        /* ── grid ── */
        .ha-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(${gridCol} 1px, transparent 1px),
            linear-gradient(90deg, ${gridCol} 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse 85% 65% at 50% 0%, black 0%, transparent 100%);
        }

        /* ── glow orb ── */
        .ha-orb {
          position: absolute; border-radius: 50%; pointer-events: none;
          filter: blur(110px);
        }
      `}</style>

      {/* Noise grain */}
      <div className="ha-noise" />

      {/* ═══════════════ BACKGROUND ═══════════════ */}
      <div
        className="ha-orb"
        style={{
          width: 600,
          height: 600,
          top: "-15%",
          left: "-12%",
          background: isDark
            ? "rgba(99,102,241,0.07)"
            : "rgba(99,102,241,0.05)",
          zIndex: 0,
        }}
      />
      <div
        className="ha-orb"
        style={{
          width: 500,
          height: 500,
          top: "30%",
          right: "-8%",
          background: isDark ? "rgba(6,182,212,0.05)" : "rgba(14,165,233,0.05)",
          zIndex: 0,
        }}
      />
      <div
        className="ha-orb"
        style={{
          width: 300,
          height: 300,
          bottom: "8%",
          left: "25%",
          background: isDark
            ? "rgba(52,211,153,0.04)"
            : "rgba(16,185,129,0.04)",
          zIndex: 0,
        }}
      />

      <div className="ha-grid" style={{ zIndex: 1 }} />

      {/* diagonal accents */}
      <div
        className="ha-diag"
        style={{ top: "12%", right: "18%", zIndex: 1 }}
      />
      <div
        className="ha-diag"
        style={{
          top: "55%",
          left: "8%",
          zIndex: 1,
          transform: "rotate(-20deg)",
        }}
      />

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <nav
        style={{
          position: "relative",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          height: 64,
          borderBottom: `1px solid ${border}`,
          backdropFilter: "blur(20px)",
          background: isDark ? "rgba(10,10,15,0.7)" : "rgba(250,251,255,0.8)",
        }}
      >
        {/* Logo mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={logo}
            alt="HA-RAG"
            style={{ width: 36, height: 36, objectFit: "contain" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 15,
                fontWeight: 700,
                color: txt,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              HA-RAG
            </span>
            <span
              style={{
                fontSize: 9,
                color: txtFaint,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginTop: 2,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              System v2.0
            </span>
          </div>
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="ha-btn-primary"
              style={{ height: 38, padding: "0 18px", fontSize: 13 }}
            >
              Dashboard
              <svg
                style={{ width: 13, height: 13 }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <>
              <Link to="/login" className="ha-nav-link">
                Sign In
              </Link>
              <Link
                to="/register"
                className="ha-btn-primary"
                style={{ height: 38, padding: "0 18px", fontSize: 13 }}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "88px 32px 72px",
          fontFamily: "'Geist', sans-serif",
        }}
      >
        {/* Pill badge */}
        <div
          className={`ha-fade${mounted ? " in" : ""}`}
          style={{
            transitionDelay: "0ms",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: `1px solid ${isDark ? "rgba(139,92,246,0.28)" : "rgba(99,102,241,0.22)"}`,
            borderRadius: 100,
            padding: "6px 16px",
            marginBottom: 40,
            background: isDark
              ? "rgba(139,92,246,0.08)"
              : "rgba(99,102,241,0.06)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span
            className="ha-dot"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#34d399",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: txtSub,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            AI-Powered Academic Assistant
          </span>
        </div>

        {/* ── BIG headline ── */}
        <h1
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "clamp(44px, 6vw, 80px)",
            fontWeight: 800,
            lineHeight: 1.06,
            letterSpacing: "-0.035em",
            textAlign: "center",
            maxWidth: 860,
            color: txt,
            margin: "0 0 28px",
          }}
        >
          {heroWords.map((w, i) =>
            w.gradient ? (
              /* Fix: gradient text via CSS class, not inline style */
              <span
                key={i}
                className={`ha-word ha-grad-text${mounted ? " in" : ""}`}
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                {w.text}
              </span>
            ) : (
              <span
                key={i}
                className={`ha-word${mounted ? " in" : ""}`}
                style={{ transitionDelay: `${i * 90}ms`, color: txt }}
              >
                {w.text}
              </span>
            ),
          )}
        </h1>

        {/* Sub */}
        <p
          className={`ha-fade${mounted ? " in" : ""}`}
          style={{
            transitionDelay: "560ms",
            maxWidth: 500,
            textAlign: "center",
            fontSize: 17,
            lineHeight: 1.75,
            color: txtSub,
            margin: "0 0 44px",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
          }}
        >
          Upload PDFs and get instant, grounded answers with full source
          transparency.{" "}
          <span
            style={{ color: isDark ? "#818cf8" : "#4f46e5", fontWeight: 600 }}
          >
            No hallucinations
          </span>{" "}
          — just facts backed by your documents.
        </p>

        {/* CTAs */}
        <div
          className={`ha-fade${mounted ? " in" : ""}`}
          style={{
            transitionDelay: "680ms",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "center",
          }}
        >
          <Link
            to={isAuthenticated ? "/dashboard" : "/register"}
            className="ha-btn-primary"
          >
            {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
            <svg
              style={{ width: 15, height: 15 }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>

          <button
            onClick={handleDemo}
            disabled={isDemoLoading}
            className="ha-btn-ghost"
          >
            {isDemoLoading ? (
              <>
                <span
                  className="ha-spin-sm"
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: "50%",
                    border: "2px solid currentColor",
                    borderTopColor: "transparent",
                    display: "inline-block",
                  }}
                />
                Loading…
              </>
            ) : (
              <>
                <svg
                  style={{ width: 15, height: 15 }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                Recruiter Demo
              </>
            )}
          </button>
        </div>

        {/* ── Stats strip ── */}
        <div
          ref={statsRef}
          style={{
            marginTop: 70,
            width: "100%",
            maxWidth: 700,
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            border: `1px solid ${border}`,
            borderRadius: 16,
            background: surface,
            backdropFilter: "blur(16px)",
            overflow: "hidden",
            opacity: statsVisible ? 1 : 0,
            transform: statsVisible ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {[
            { val: "RAG", sub: "Architecture" },
            { val: "GPT-4", sub: "Engine" },
            { val: "100%", sub: "Grounded" },
            { val: "Live", sub: "Streaming" },
          ].map((s, i) => (
            <div
              key={s.sub}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "20px 8px",
                borderRight: i < 3 ? `1px solid ${border}` : "none",
              }}
            >
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: 20,
                  color: txt,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                {s.val}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: txtFaint,
                  marginTop: 5,
                }}
              >
                {s.sub}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ TICKER ═══════════════ */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          borderTop: `1px solid ${border}`,
          borderBottom: `1px solid ${border}`,
          padding: "13px 0",
          margin: "0 0 88px",
          background: isDark
            ? "rgba(255,255,255,0.012)"
            : "rgba(15,23,42,0.025)",
          overflow: "hidden",
        }}
      >
        {/* fade edges */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 80,
            background: `linear-gradient(90deg, ${bg}, transparent)`,
            zIndex: 2,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 80,
            background: `linear-gradient(270deg, ${bg}, transparent)`,
            zIndex: 2,
            pointerEvents: "none",
          }}
        />
        <div className="ha-ticker-wrap">
          <div className="ha-ticker-track">
            {[...Array(2)].flatMap(() =>
              [
                "RAG Architecture",
                "Pinecone Vector DB",
                "OpenAI GPT-4",
                "PDF Parsing",
                "Semantic Search",
                "Live Streaming",
                "Source Citations",
                "Zero Hallucinations",
              ].map((item, j) => (
                <span
                  key={item + j}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 14,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: txtFaint,
                    padding: "0 28px",
                    fontFamily: "'Geist', sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: "50%",
                      background: isDark ? "#6366f1" : "#4f46e5",
                      flexShrink: 0,
                    }}
                  />
                  {item}
                </span>
              )),
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section
        ref={featRef}
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 1060,
          margin: "0 auto",
          padding: "0 32px 100px",
        }}
      >
        {/* Section divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 52,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${border} 60%)`,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: txtFaint,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            How it works
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: `linear-gradient(90deg, ${border} 40%, transparent)`,
            }}
          />
        </div>

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {featureCards.map((card, i) => {
            const pal = palettes[i];
            return (
              <div
                key={card.title}
                className="ha-card"
                style={{
                  border: `1px solid ${border}`,
                  borderRadius: 18,
                  background: surface,
                  backdropFilter: "blur(12px)",
                  padding: "30px 26px 26px",
                  opacity: featVisible ? 1 : 0,
                  transform: featVisible ? "translateY(0)" : "translateY(28px)",
                  transition: `opacity 0.6s ease ${i * 130}ms, transform 0.6s cubic-bezier(.22,1,.36,1) ${i * 130}ms`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = surfaceH;
                  e.currentTarget.style.borderColor = borderH;
                  e.currentTarget.style.boxShadow = isDark
                    ? "0 16px 48px rgba(99,102,241,0.12)"
                    : "0 16px 48px rgba(99,102,241,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = surface;
                  e.currentTarget.style.borderColor = border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Top row: icon + number */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 22,
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: pal.bg,
                      color: pal.fg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </div>
                  {/* Tag pill */}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      padding: "4px 10px",
                      borderRadius: 100,
                      background: pal.tag,
                      color: pal.fg,
                    }}
                  >
                    {card.tag}
                  </span>
                </div>

                {/* Big number watermark */}
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 900,
                    fontSize: 80,
                    lineHeight: 1,
                    color: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.045)",
                    position: "absolute",
                    right: 18,
                    bottom: 14,
                    letterSpacing: "-0.06em",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {card.number}
                </div>

                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: txt,
                    marginBottom: 10,
                    letterSpacing: "-0.02em",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {card.title}
                </h3>
                <p
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.7,
                    color: txtSub,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {card.desc}
                </p>

                {/* Bottom accent line */}
                <div
                  style={{
                    height: 2,
                    borderRadius: 2,
                    marginTop: 26,
                    background: `linear-gradient(90deg, ${pal.fg}50, transparent)`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          borderTop: `1px solid ${border}`,
          padding: "18px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          background: isDark ? "rgba(10,10,15,0.7)" : "rgba(250,251,255,0.8)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={logo}
            alt="HA-RAG"
            style={{ width: 20, height: 20, objectFit: "contain" }}
          />
          <span style={{ fontSize: 12, color: txtFaint, fontWeight: 500 }}>
            HA-RAG System v2.0
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {["Built with RAG", "OpenAI", "Pinecone"].map((s, i) => (
            <span
              key={s}
              style={{
                fontSize: 11,
                color: txtFaint,
                fontWeight: 500,
                letterSpacing: "0.06em",
                paddingLeft: i > 0 ? 20 : 0,
                borderLeft: i > 0 ? `1px solid ${border}` : "none",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
