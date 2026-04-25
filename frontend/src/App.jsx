import React, { useState } from 'react'
import MainLayout from './layout/MainLayout'
import Home from './pages/Home'
import Chat from './components/Chat'
import { getDocuments, getChatsByDocument, deleteChat } from './api'

const App = () => {
  const [mode, setMode] = useState('home')
  const [pendingPrompt, setPendingPrompt] = useState('')
  const [documents, setDocuments] = useState([])
  const [selectedDocumentId, setSelectedDocumentId] = useState(null)
  const [chats, setChats] = useState([])
  const [selectedChatId, setSelectedChatId] = useState(null)

  const fetchDocs = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
      if (docs.length === 0) {
        setSelectedDocumentId(null);
        return;
      }

      const hasSelected = selectedDocumentId && docs.some((doc) => doc._id === selectedDocumentId);
      if (!hasSelected) {
        setSelectedDocumentId(docs[0]._id);
      }
    } catch (err) {
      console.error("Failed to load documents", err);
    }
  }

  React.useEffect(() => {
    fetchDocs();
  }, [])

  const fetchChats = async () => {
    if (!selectedDocumentId) {
      setChats([]);
      return;
    }
    try {
      const data = await getChatsByDocument(selectedDocumentId);
      setChats(data);
    } catch (err) {
      console.error(err);
    }
  }

  React.useEffect(() => {
    fetchChats();
    setSelectedChatId(null);
  }, [selectedDocumentId])

  const startChat = (prompt = '') => {
    setSelectedChatId(null)
    setPendingPrompt(prompt)
    setMode('chat')
  }

  const handleNewChat = () => {
    setSelectedChatId(null)
    setMode('chat')
  }

  const handleDeleteChat = async (chatId) => {
    try {
      await deleteChat(chatId);
      setChats(prev => prev.filter(c => c._id !== chatId));
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
      }
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  }

  // Find selected document name for display
  const selectedDocName = documents.find(d => d._id === selectedDocumentId)?.fileName || null

  return (
    <MainLayout
      mode={mode}
      setMode={setMode}
      startChat={startChat}
      documents={documents}
      selectedDocumentId={selectedDocumentId}
      setSelectedDocumentId={setSelectedDocumentId}
      chats={chats}
      selectedChatId={selectedChatId}
      setSelectedChatId={setSelectedChatId}
      onNewChat={handleNewChat}
      onDeleteChat={handleDeleteChat}
      selectedDocName={selectedDocName}
    >
      {mode === 'home' ? (
        <Home setMode={setMode} startChat={startChat} />
      ) : (
        <Chat
          pendingPrompt={pendingPrompt}
          clearPendingPrompt={() => setPendingPrompt('')}
          selectedDocumentId={selectedDocumentId}
          fetchDocs={fetchDocs}
          selectedChatId={selectedChatId}
          setSelectedChatId={setSelectedChatId}
          fetchChats={fetchChats}
          selectedDocName={selectedDocName}
        />
      )}
    </MainLayout>
  )
}

export default App