import React from 'react'
import Sidebar from '../components/sidebar/Sidebar'

const MainLayout = ({
  children, mode, setMode, startChat,
  documents, selectedDocumentId, setSelectedDocumentId,
  chats, selectedChatId, setSelectedChatId,
  onNewChat, onDeleteChat, selectedDocName
}) => {
  const showSidebar = mode === 'chat'

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090f]">
      {/* Sidebar — only visible in chat mode */}
      {showSidebar && (
        <Sidebar
          mode={mode}
          setMode={setMode}
          startChat={startChat}
          documents={documents}
          selectedDocumentId={selectedDocumentId}
          setSelectedDocumentId={setSelectedDocumentId}
          chats={chats}
          selectedChatId={selectedChatId}
          setSelectedChatId={setSelectedChatId}
          onNewChat={onNewChat}
          onDeleteChat={onDeleteChat}
        />
      )}

      {/* Main content */}
      <main className={`relative flex flex-1 flex-col overflow-hidden ${showSidebar ? 'ml-0' : ''}`}>
        {children}
      </main>
    </div>
  )
}

export default MainLayout