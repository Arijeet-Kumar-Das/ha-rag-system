import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('ha_rag_theme');
    return saved ? saved === 'dark' : true; // default dark
  });

  useEffect(() => {
    localStorage.setItem('ha_rag_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark(prev => !prev), []);

  // Color tokens
  const t = isDark ? {
    // Dark mode — neon black
    bg: 'bg-[#08080e]',
    bgSub: 'bg-[#0a0c14]',
    bgCard: 'bg-[#0f1118]',
    bgInput: 'bg-[#12141e]',
    bgHover: 'hover:bg-white/[0.04]',
    bgActive: 'bg-white/[0.07]',
    border: 'border-white/[0.08]',
    borderHover: 'hover:border-white/[0.15]',
    borderActive: 'border-violet-500/30',
    text: 'text-white',
    textSub: 'text-white/60',
    textMuted: 'text-white/35',
    textFaint: 'text-white/20',
    accent: 'text-violet-400',
    accentBg: 'bg-violet-500/[0.12]',
    accentBorder: 'border-violet-500/20',
    shadow: 'shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
    cardShadow: 'shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
    gradient: 'from-violet-600 to-indigo-600',
    gradientText: 'from-violet-400 via-indigo-400 to-cyan-400',
  } : {
    // Light mode — clean blue-white
    bg: 'bg-[#f5f7fb]',
    bgSub: 'bg-white',
    bgCard: 'bg-white',
    bgInput: 'bg-[#f0f2f8]',
    bgHover: 'hover:bg-slate-100',
    bgActive: 'bg-slate-100',
    border: 'border-slate-200',
    borderHover: 'hover:border-slate-300',
    borderActive: 'border-indigo-400',
    text: 'text-slate-900',
    textSub: 'text-slate-600',
    textMuted: 'text-slate-400',
    textFaint: 'text-slate-300',
    accent: 'text-indigo-600',
    accentBg: 'bg-indigo-50',
    accentBorder: 'border-indigo-200',
    shadow: 'shadow-[0_8px_32px_rgba(30,58,95,0.08)]',
    cardShadow: 'shadow-[0_2px_12px_rgba(30,58,95,0.06)]',
    gradient: 'from-indigo-600 to-blue-600',
    gradientText: 'from-indigo-600 via-blue-600 to-cyan-600',
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, t }}>
      {children}
    </ThemeContext.Provider>
  );
};
