import React from 'react'
import Sidebar from '../components/sidebar/Sidebar'

const MainLayout = ({ children, setMode }) => {
    return (
        <div className="min-h-screen bg-[#0b0d12] text-white">
            <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 p-4">
                <Sidebar setMode={setMode} />

                <main className="flex min-h-[calc(100vh-32px)] flex-1 overflow-hidden rounded-2xl border border-white/6 bg-[#0f1117] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default MainLayout