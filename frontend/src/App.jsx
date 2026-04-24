import React, { useState } from 'react'
import MainLayout from './layout/MainLayout'
import Home from './pages/Home'
import Chat from './components/Chat'


const App = () => {
  const [mode, setMode] = useState('home')

  return (
    <div className="app-shell">
      <MainLayout setMode={setMode}>
        {mode === 'home' ? <Home setMode={setMode} /> : <Chat />}
      </MainLayout>
    </div>
  )
}

export default App