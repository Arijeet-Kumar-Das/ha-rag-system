import React from 'react'

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
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
    hoverBorder: 'hover:border-violet-500/25',
  },
  {
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    title: 'Ask Questions',
    desc: 'Get context-aware, grounded answers from your documents.',
    iconBg: 'bg-cyan-500/15',
    iconColor: 'text-cyan-400',
    hoverBorder: 'hover:border-cyan-500/25',
  },
  {
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        <path d="M11 8v6" /><path d="M8 11h6" />
      </svg>
    ),
    title: 'Inspect Sources',
    desc: 'See exactly which document chunks support each answer.',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    hoverBorder: 'hover:border-emerald-500/25',
  },
]

const quickPrompts = [
  { text: 'Summarize my document', icon: '📝' },
  { text: 'Explain key concepts', icon: '💡' },
  { text: 'Find important details', icon: '🔍' },
  { text: 'Create study notes', icon: '📚' },
]

const Home = ({ setMode, startChat }) => {
  return (
    <section className="relative flex h-full min-h-screen flex-1 flex-col items-center justify-center overflow-y-auto bg-[#09090f]">

      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute top-[15%] left-[10%] h-72 w-72 rounded-full bg-violet-600/[0.06] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[20%] right-[10%] h-64 w-64 rounded-full bg-cyan-500/[0.05] blur-[120px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1000px] flex-col items-center px-6 pt-24 pb-16">

        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">
            Academic RAG Assistant
          </span>
        </div>

        {/* Heading */}
        <h1 className="max-w-[700px] text-center text-[44px] font-bold leading-[1.08] tracking-tight text-white sm:text-[56px]">
          Chat with your{' '}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">documents</span>
          {' '}using AI
        </h1>

        {/* Subheading */}
        <p className="mt-5 max-w-[560px] text-center text-[17px] leading-7 text-white/45">
          Upload PDFs and get instant, grounded answers with full source transparency. No hallucinations, just facts.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={() => startChat('')}
            className="flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 text-[14px] font-semibold text-white shadow-lg shadow-violet-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/30"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            Start Chatting
          </button>
          <button
            onClick={() => startChat('')}
            className="flex h-12 items-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.04] px-7 text-[14px] font-medium text-white/70 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Document
          </button>
        </div>

        {/* Feature Cards */}
        <div className="mt-16 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
          {featureCards.map((card) => (
            <button
              key={card.title}
              onClick={() => startChat('')}
              className={`group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-left backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-0.5 ${card.hoverBorder}`}
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor} transition-colors duration-200`}>
                {card.icon}
              </div>
              <h3 className="text-[15px] font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-[13px] leading-6 text-white/40">{card.desc}</p>
            </button>
          ))}
        </div>

        {/* Quick prompts */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {quickPrompts.map((item) => (
            <button
              key={item.text}
              onClick={() => startChat(item.text)}
              className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] px-4 py-2 text-[13px] text-white/45 backdrop-blur-sm transition-all duration-200 hover:border-white/15 hover:bg-white/[0.05] hover:text-white/80"
            >
              <span>{item.icon}</span>
              {item.text}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Home