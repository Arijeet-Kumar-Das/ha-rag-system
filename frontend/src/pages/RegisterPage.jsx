import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import logo from '../assets/logo.png';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const { register, demoLogin } = useAuth();
  const { isDark, t } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setIsLoading(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemo = async () => {
    setError('');
    setIsDemoLoading(true);
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className={`relative flex min-h-screen items-center justify-center overflow-hidden ${t.bg}`}>
      {isDark ? (
        <>
          <div className="pointer-events-none absolute top-[10%] right-[20%] h-[400px] w-[400px] rounded-full bg-indigo-600/[0.07] blur-[150px]" />
          <div className="pointer-events-none absolute bottom-[20%] left-[15%] h-[350px] w-[350px] rounded-full bg-violet-500/[0.06] blur-[130px]" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute top-[10%] right-[20%] h-[400px] w-[400px] rounded-full bg-indigo-200/40 blur-[150px]" />
          <div className="pointer-events-none absolute bottom-[20%] left-[15%] h-[350px] w-[350px] rounded-full bg-blue-200/30 blur-[130px]" />
        </>
      )}

      <div className="absolute top-4 right-4 z-20 sm:top-5 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[420px] px-4 sm:px-6">
        <div className="mb-8 flex flex-col items-center">
          <img src={logo} alt="HA-RAG" className="mb-4 h-16 w-16 object-contain" />
          <h1 className={`text-2xl font-bold tracking-tight ${t.text}`}>Create your account</h1>
          <p className={`mt-1.5 text-sm ${t.textMuted}`}>Start chatting with your documents</p>
        </div>

        <div className={`rounded-2xl border ${t.border} ${isDark ? 'bg-white/[0.03]' : 'bg-white'} p-5 sm:p-7 ${t.shadow} backdrop-blur-xl`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-300/30 bg-red-500/[0.08] px-4 py-2.5 text-sm text-red-400">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="reg-name" className={`mb-1.5 block text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Full Name</label>
              <input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required
                className={`h-11 w-full rounded-lg border ${t.border} ${t.bgInput} px-4 text-sm ${t.text} outline-none transition-all ${isDark ? 'focus:bg-white/[0.06] focus:border-violet-500/30 placeholder:text-white/20' : 'focus:bg-white focus:border-indigo-400 placeholder:text-slate-300'}`}
              />
            </div>

            <div>
              <label htmlFor="reg-email" className={`mb-1.5 block text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Email</label>
              <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                className={`h-11 w-full rounded-lg border ${t.border} ${t.bgInput} px-4 text-sm ${t.text} outline-none transition-all ${isDark ? 'focus:bg-white/[0.06] focus:border-violet-500/30 placeholder:text-white/20' : 'focus:bg-white focus:border-indigo-400 placeholder:text-slate-300'}`}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="reg-pass" className={`mb-1.5 block text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Password</label>
                <input id="reg-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                  className={`h-11 w-full rounded-lg border ${t.border} ${t.bgInput} px-4 text-sm ${t.text} outline-none transition-all ${isDark ? 'focus:bg-white/[0.06] focus:border-violet-500/30 placeholder:text-white/20' : 'focus:bg-white focus:border-indigo-400 placeholder:text-slate-300'}`}
                />
              </div>
              <div>
                <label htmlFor="reg-confirm" className={`mb-1.5 block text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Confirm</label>
                <input id="reg-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required
                  className={`h-11 w-full rounded-lg border ${t.border} ${t.bgInput} px-4 text-sm ${t.text} outline-none transition-all ${isDark ? 'focus:bg-white/[0.06] focus:border-violet-500/30 placeholder:text-white/20' : 'focus:bg-white focus:border-indigo-400 placeholder:text-slate-300'}`}
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className={`flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r ${t.gradient} text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-4">
            <div className={`h-px flex-1 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`} />
            <span className={`text-[11px] font-medium uppercase tracking-wider ${t.textFaint}`}>or</span>
            <div className={`h-px flex-1 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`} />
          </div>

          <button onClick={handleDemo} disabled={isDemoLoading}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50
              ${isDark ? 'border-emerald-500/25 text-emerald-400 hover:border-emerald-400/40 hover:bg-emerald-500/[0.06]' : 'border-emerald-400/40 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50'}`}
          >
            {isDemoLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
                Setting up demo...
              </span>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                Try Demo — No Sign Up Required
              </>
            )}
          </button>
          <p className={`mt-2.5 text-center text-[11px] ${t.textFaint}`}>For recruiters and evaluators</p>
        </div>

        <p className={`mt-6 text-center text-sm ${t.textMuted}`}>
          Already have an account?{' '}
          <Link to="/login" className={`font-semibold ${t.accent} transition-opacity hover:opacity-80`}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
