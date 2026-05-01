import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { useState } from 'react';
import logo from '../assets/logo.png';

const featureCards = [
  {
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: 'Upload Documents',
    desc: 'Drop your PDFs and let AI index them for instant retrieval.',
  },
  {
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    title: 'Ask Questions',
    desc: 'Get context-aware, grounded answers from your documents.',
  },
  {
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: 'Verified Answers',
    desc: 'Cross-checked against source documents for accuracy.',
  },
];

const LandingPage = () => {
  const { isAuthenticated, demoLogin } = useAuth();
  const { isDark, t } = useTheme();
  const navigate = useNavigate();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleDemo = async () => {
    setIsDemoLoading(true);
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch {} finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen overflow-hidden ${t.bg}`}>
      {/* Decorative blurs */}
      {isDark ? (
        <>
          <div className="pointer-events-none absolute top-[10%] left-[10%] h-[500px] w-[500px] rounded-full bg-violet-600/[0.06] blur-[180px]" />
          <div className="pointer-events-none absolute top-[40%] right-[5%] h-[450px] w-[450px] rounded-full bg-indigo-500/[0.05] blur-[160px]" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute top-[10%] left-[10%] h-[500px] w-[500px] rounded-full bg-indigo-200/40 blur-[180px]" />
          <div className="pointer-events-none absolute top-[40%] right-[5%] h-[450px] w-[450px] rounded-full bg-blue-200/30 blur-[160px]" />
        </>
      )}

      {/* ── Navbar ── */}
      <nav className="relative z-20 flex items-center justify-between px-4 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center gap-3">
          <img src={logo} alt="HA-RAG" className="h-10 w-10 object-contain" />
          <span className={`text-lg font-bold tracking-tight ${t.text}`}>HA-RAG</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className={`ml-2 flex h-10 items-center rounded-lg bg-gradient-to-r ${t.gradient} px-5 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90`}
            >
              Dashboard →
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={`flex h-10 items-center rounded-lg px-4 text-sm font-medium ${t.textSub} transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className={`flex h-10 items-center rounded-lg bg-gradient-to-r ${t.gradient} px-5 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90`}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-col items-center px-6 pt-20 pb-16">
        <div className={`mb-8 inline-flex items-center gap-2 rounded-full border ${t.border} ${isDark ? 'bg-white/[0.03]' : 'bg-white/70'} px-4 py-1.5 backdrop-blur-sm`}>
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span className={`text-[11px] font-medium uppercase tracking-[0.2em] ${t.textMuted}`}>
            AI-Powered Academic Assistant
          </span>
        </div>

        <h1 className={`max-w-[800px] text-center text-4xl font-bold leading-[1.1] tracking-tight ${t.text} sm:text-[48px] md:text-[64px]`}>
          Chat with your{' '}
          <span className={`bg-gradient-to-r ${t.gradientText} bg-clip-text text-transparent`}>
            documents
          </span>
          {' '}using AI
        </h1>

        <p className={`mt-6 max-w-[560px] text-center text-[17px] leading-7 ${t.textSub}`}>
          Upload PDFs and get instant, grounded answers with full source transparency.
          No hallucinations — just facts backed by your documents.
        </p>

        {/* CTA — redesigned for a more human feel */}
        <div className="mt-8 flex w-full flex-col items-center gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:gap-4">
          <Link
            to={isAuthenticated ? '/dashboard' : '/register'}
            className={`group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r ${t.gradient} px-7 text-[15px] font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] sm:w-auto`}
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </Link>

          <button
            onClick={handleDemo}
            disabled={isDemoLoading}
            className={`group flex h-12 w-full items-center justify-center gap-2 rounded-lg border-2 px-7 text-[15px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 sm:w-auto
              ${isDark
                ? 'border-emerald-500/30 text-emerald-400 hover:border-emerald-400/50 hover:bg-emerald-500/[0.08]'
                : 'border-emerald-500/40 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50'
              }`}
          >
            {isDemoLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
                Loading...
              </span>
            ) : (
              <>
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                Recruiter Demo
              </>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className={`mt-16 grid w-full max-w-[600px] grid-cols-2 gap-4 rounded-xl border ${t.border} ${isDark ? 'bg-white/[0.02]' : 'bg-white/60'} px-4 py-5 backdrop-blur-sm sm:mt-20 sm:grid-cols-4 sm:gap-6 sm:px-6`}>
          {[
            { value: 'RAG', label: 'Powered' },
            { value: 'GPT-4', label: 'Engine' },
            { value: '100%', label: 'Grounded' },
            { value: 'Live', label: 'Streaming' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className={`text-lg font-bold ${t.text}`}>{stat.value}</span>
              <span className={`mt-0.5 text-[10px] font-medium uppercase tracking-wider ${t.textFaint}`}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 mx-auto max-w-[900px] px-6 py-12">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {featureCards.map((card, i) => {
            const colors = isDark
              ? ['text-violet-400 bg-violet-500/15', 'text-cyan-400 bg-cyan-500/15', 'text-emerald-400 bg-emerald-500/15']
              : ['text-indigo-600 bg-indigo-100', 'text-blue-600 bg-blue-100', 'text-emerald-600 bg-emerald-100'];
            return (
              <div
                key={card.title}
                className={`group rounded-xl border ${t.border} ${isDark ? 'bg-white/[0.02]' : 'bg-white/70'} p-6 backdrop-blur-sm transition-all duration-300 ${t.borderHover} hover:-translate-y-1 ${t.cardShadow}`}
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${colors[i]}`}>
                  {card.icon}
                </div>
                <h3 className={`text-[15px] font-semibold ${t.text}`}>{card.title}</h3>
                <p className={`mt-2 text-[13px] leading-6 ${t.textMuted}`}>{card.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={`relative z-10 flex flex-col items-center justify-between gap-4 border-t ${t.border} px-4 py-6 sm:flex-row sm:px-8`}>
        <div className="flex items-center gap-2">
            <img src={logo} alt="HA-RAG" className="h-5 w-5 object-contain" />
            <span className={`text-xs ${t.textFaint}`}>HA-RAG System v2.0</span>
          </div>
          <span className={`text-xs ${t.textFaint}`}>Built with RAG + OpenAI + Pinecone</span>
      </footer>
    </div>
  );
};

export default LandingPage;
