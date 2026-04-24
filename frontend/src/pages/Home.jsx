import React from 'react'

const featureCards = [
    {
        title: 'Upload documents',
        desc: 'Add PDFs and use them as grounded knowledge for your conversations.',
    },
    {
        title: 'Ask academic questions',
        desc: 'Get context-aware answers for topics, summaries, and explanations.',
    },
    {
        title: 'See supporting sources',
        desc: 'Review matched chunks and inspect where answers are coming from.',
    },
]

const quickPrompts = [
    'Summarize my uploaded file',
    'Explain this topic simply',
    'Find key points from my PDF',
    'Create short study notes',
]

const Home = ({ setMode }) => {
    return (
        <section className="flex flex-1 flex-col overflow-y-auto px-6 py-10 lg:px-8">
            <div className="mx-auto my-auto flex w-full max-w-[980px] flex-col items-center">
                <div className="max-w-[760px] text-center">
                    <span className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.24em] text-white/35">
                        Academic RAG Assistant
                    </span>

                    <h1 className="mt-6 text-[48px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[58px]">
                        Clean answers from your documents, not just generic AI text.
                    </h1>

                    <p className="mx-auto mt-5 max-w-[650px] text-lg leading-8 text-white/50">
                        Upload PDFs, ask focused questions, and explore responses with supporting context.
                    </p>
                </div>

                <div className="mt-12 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
                    {featureCards.map((card) => (
                        <div
                            key={card.title}
                            role="button"
                            tabIndex={0}
                            onClick={() => setMode('chat')}
                            className="flex h-full w-full cursor-pointer flex-col items-start rounded-2xl border border-white/6 bg-white/[0.03] p-6 text-left transition-colors hover:bg-white/[0.05]"
                        >
                            <div className="mb-4 h-10 w-10 shrink-0 rounded-xl bg-white/[0.06]" />
                            <h3 className="text-[17px] font-semibold text-white">{card.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-white/50">{card.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    {quickPrompts.map((item) => (
                        <button
                            key={item}
                            onClick={() => setMode('chat')}
                            className="whitespace-nowrap rounded-full border border-white/8 px-4 py-2 text-sm text-white/55 transition-colors hover:border-white/15 hover:bg-white/[0.04] hover:text-white"
                        >
                            {item}
                        </button>
                    ))}
                </div>

                <div className="mt-8 w-full max-w-[760px] rounded-2xl border border-white/6 bg-[#141821] p-2">
                    <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-3">
                        <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M12 5v14" />
                                <path d="M5 12h14" />
                            </svg>
                        </button>

                        <button
                            onClick={() => setMode('chat')}
                            className="flex-1 text-left text-[15px] text-white/35 transition-colors hover:text-white/55"
                        >
                            Ask anything about your uploaded documents...
                        </button>

                        <button
                            onClick={() => setMode('chat')}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-white/90"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M12 19V5" />
                                <path d="m5 12 7-7 7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between px-2">
                        <span className="text-sm text-white/40">Saved prompts</span>
                        <span className="text-sm text-white/35">Attach content</span>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Home