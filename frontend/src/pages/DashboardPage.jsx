import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { getDocuments, uploadFile } from '../api';
import logo from '../assets/logo.png';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { isDark, t } = useTheme();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fetchDocs = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') return;
    setIsUploading(true);
    setUploadProgress(`Processing ${file.name}...`);
    try {
      await uploadFile(file);
      setUploadProgress('');
      await fetchDocs();
    } catch (err) {
      setUploadProgress(`Error: ${err.message}`);
      setTimeout(() => setUploadProgress(''), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragActive(false); handleUpload(e.dataTransfer.files?.[0]); };
  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = () => setDragActive(false);
  const handleFileInput = (e) => { handleUpload(e.target.files?.[0]); e.target.value = ''; };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className={`relative min-h-screen ${t.bg}`}>
      {/* Background */}
      {isDark && (
        <>
          <div className="pointer-events-none absolute top-[5%] right-[10%] h-[400px] w-[400px] rounded-full bg-violet-600/[0.04] blur-[150px]" />
          <div className="pointer-events-none absolute bottom-[10%] left-[5%] h-[350px] w-[350px] rounded-full bg-indigo-500/[0.03] blur-[130px]" />
        </>
      )}

      {/* ── Header ── */}
      <header className={`sticky top-0 z-30 border-b ${t.border} ${isDark ? 'bg-[#08080e]/80' : 'bg-white/80'} backdrop-blur-xl`}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center gap-3">
            <img src={logo} alt="HA-RAG" className="h-9 w-9 object-contain" />
            <div>
              <h1 className={`text-[15px] font-semibold ${t.text}`}>HA-RAG</h1>
              <p className={`text-[11px] ${t.textMuted}`}>Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* User badge */}
            <div className={`hidden items-center gap-2.5 rounded-lg border ${t.border} ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'} px-3 py-2 sm:flex`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-violet-500/15' : 'bg-indigo-100'}`}>
                <svg className={`h-4 w-4 ${t.accent}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 10-16 0" />
                </svg>
              </div>
              <div>
                <p className={`text-sm font-medium ${t.text}`}>{user?.name}</p>
                <p className={`text-[10px] ${t.textMuted}`}>{user?.role === 'demo' ? 'Demo Account' : user?.email}</p>
              </div>
            </div>

            {/* Logout — bigger, clearly visible */}
            <button
              onClick={() => { logout(); navigate('/'); }}
              className={`flex h-10 w-10 sm:w-auto items-center justify-center sm:justify-start gap-2 rounded-lg border sm:px-4 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]
                ${isDark
                  ? 'border-red-500/20 bg-red-500/[0.06] text-red-400 hover:border-red-500/40 hover:bg-red-500/[0.12]'
                  : 'border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100'
                }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold ${t.text}`}>
            Welcome, <span className={`bg-gradient-to-r ${t.gradientText} bg-clip-text text-transparent`}>{user?.name?.split(' ')[0]}</span>
          </h2>
          <p className={`mt-1 text-sm ${t.textMuted}`}>Upload documents and start asking questions</p>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`group mb-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 sm:p-10 transition-all duration-300
            ${dragActive
              ? isDark ? 'border-violet-500/50 bg-violet-500/[0.06]' : 'border-indigo-400 bg-indigo-50'
              : `${isDark ? 'border-white/[0.1] bg-white/[0.02] hover:border-white/[0.2]' : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'}`
            }`}
        >
          <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-xl transition-all
            ${dragActive
              ? isDark ? 'bg-violet-500/20 text-violet-400 scale-110' : 'bg-indigo-200 text-indigo-600 scale-110'
              : isDark ? 'bg-white/[0.04] text-white/30' : 'bg-slate-100 text-slate-400'
            }`}>
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className={`text-sm font-medium ${t.textSub}`}>
            {isUploading ? uploadProgress : 'Drop your PDF here, or'}
          </p>
          {!isUploading && (
            <label className="mt-3 cursor-pointer">
              <span className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${isDark ? 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}>
                Browse files
              </span>
              <input type="file" accept="application/pdf" className="hidden" onChange={handleFileInput} disabled={isUploading} />
            </label>
          )}
          {isUploading && (
            <div className="mt-3 flex items-center gap-2">
              <span className={`h-4 w-4 animate-spin rounded-full border-2 ${isDark ? 'border-violet-400/30 border-t-violet-400' : 'border-indigo-300 border-t-indigo-600'}`} />
              <span className={`text-xs ${t.textMuted}`}>Processing document...</span>
            </div>
          )}
          <p className={`mt-3 text-[11px] ${t.textFaint}`}>PDF files only • Max 10 documents</p>
        </div>

        {/* Documents List */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className={`text-[15px] font-semibold ${t.text}`}>Your Documents</h3>
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${isDark ? 'bg-white/[0.06] text-white/30' : 'bg-slate-100 text-slate-400'}`}>
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className={`h-6 w-6 animate-spin rounded-full border-2 ${isDark ? 'border-violet-400/30 border-t-violet-400' : 'border-indigo-300 border-t-indigo-600'}`} />
          </div>
        ) : documents.length === 0 ? (
          <div className={`flex flex-col items-center justify-center rounded-xl border ${t.border} ${isDark ? 'bg-white/[0.02]' : 'bg-white'} py-16`}>
            <svg className={`h-12 w-12 ${t.textFaint}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className={`mt-4 text-sm ${t.textMuted}`}>No documents yet</p>
            <p className={`mt-1 text-xs ${t.textFaint}`}>Upload a PDF to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <button
                key={doc._id}
                onClick={() => navigate(`/chat/${doc._id}`)}
                className={`group flex flex-col rounded-xl border ${t.border} ${isDark ? 'bg-white/[0.02]' : 'bg-white'} p-5 text-left transition-all duration-300 hover:-translate-y-0.5 ${t.borderHover} ${t.cardShadow}`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-indigo-100 text-indigo-600'} transition-colors`}>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <svg className={`h-4 w-4 ${t.textFaint} transition-all group-hover:translate-x-0.5 ${isDark ? 'group-hover:text-violet-400' : 'group-hover:text-indigo-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                </div>
                <h4 className={`truncate text-[14px] font-medium ${t.textSub} ${isDark ? 'group-hover:text-white' : 'group-hover:text-slate-900'}`}>{doc.fileName}</h4>
                <div className={`mt-2.5 flex items-center gap-3 text-[11px] ${t.textMuted}`}>
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                    {doc.chunkCount} chunks
                  </span>
                  <span>{formatDate(doc.uploadDate)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
