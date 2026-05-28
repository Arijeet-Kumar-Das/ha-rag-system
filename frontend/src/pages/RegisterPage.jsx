import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import useLogo from '../hooks/useLogo';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { register, demoLogin, loading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const logo = useLogo();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError('Passwords do not match');
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Demo login failed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse, rgba(201,165,90,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Theme toggle */}
      <div style={{ position: 'absolute', top: 'var(--space-5)', right: 'var(--space-5)', zIndex: 10 }}>
        <button
          onClick={toggleTheme}
          style={{
            width: 36, height: 36, borderRadius: 'var(--radius)',
            background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
            color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>
      </div>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: '100%', maxWidth: 420, padding: 'var(--space-10)',
            background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <Link to="/" style={{ display: 'block', margin: '0 auto var(--space-4)', width: 44 }}>
              <img src={logo} alt="HA-RAG" style={{ width: 44, height: 44 }} />
            </Link>
            <h1 style={{
              fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '-0.03em', marginBottom: 'var(--space-1)',
              fontFamily: 'var(--font-serif)',
            }}>
              Create an account
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Join the academic intelligence platform
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input label="Full Name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Input label="Confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>

            {error && (
              <div style={{
                padding: 'var(--space-3)', background: 'var(--danger-subtle)',
                color: 'var(--danger)', borderRadius: 'var(--radius)',
                fontSize: 'var(--text-sm)', textAlign: 'center', fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--space-6) 0', gap: 'var(--space-3)' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
          </div>

          <Button variant="secondary" onClick={handleDemoLogin} disabled={loading} style={{ width: '100%' }}>
            Try Demo — No Sign Up Required
          </Button>

          <p style={{
            textAlign: 'center', marginTop: 'var(--space-6)',
            fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
