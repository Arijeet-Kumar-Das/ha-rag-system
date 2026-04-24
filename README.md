# 🧠 HA-RAG Academic Assistant

A production-grade AI academic assistant built using a **Hybrid Adaptive Retrieval-Augmented Generation (HA-RAG)** architecture.

This system combines **semantic search (Pinecone)** and **keyword-based retrieval (MongoDB)** with **LLM reasoning (OpenAI)** to provide accurate, context-aware answers from academic documents.

---

## 🚀 Features

* 🔍 **Hybrid Retrieval** (Semantic + Keyword search)
* 📄 **PDF Ingestion Pipeline** (Parsing → Chunking → Embeddings)
* ⚡ **Streaming Responses** (ChatGPT-style real-time output)
* ✅ **Verification Layer** (prevents hallucinations)
* ⚡ **In-Memory Caching** (TTL-based for fast responses)
* 🧠 **Query Classification** (RAG vs Database queries)
* 📚 **Source Attribution** (chunk-level references)
* 🧩 **Modular Backend Architecture** (scalable design)

---

## 🧱 Tech Stack

### Frontend

* React (Vite)
* Tailwind CSS

### Backend

* Node.js
* Express

### Database

* MongoDB Atlas

### Vector Database

* Pinecone

### AI / LLM

* OpenAI (GPT-4o-mini)
* OpenAI Embeddings

---

## ⚙️ System Architecture

```
User Query
   ↓
Query Classification (RAG / DB)
   ↓
Hybrid Retrieval (Pinecone + MongoDB)
   ↓
Context Construction
   ↓
LLM Response (Streaming)
   ↓
Verification Layer
   ↓
Final Answer + Sources
```

---

## 📦 Project Structure

```
ha-rag-academic-assistant/
│
├── frontend/       # React + Vite frontend
├── backend/        # Node.js + Express backend
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── models/
│   ├── utils/
│   └── middleware/
│
├── README.md
└── .gitignore
```

---

## ⚙️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-username/ha-rag-academic-assistant.git
cd ha-rag-academic-assistant
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```env
OPENAI_API_KEY=your_openai_key
PINECONE_API_KEY=your_pinecone_key
MONGO_URI=your_mongodb_uri
PORT=5000
```

Run backend:

```bash
npm run dev
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 API Endpoints

### Upload PDF

```
POST /api/upload
```

### Ask Question

```
POST /api/ask
```

### Get Chat History (optional)

```
GET /api/history
```

---

## 🧠 Key Concepts Implemented

### 🔹 Hybrid Retrieval

Combines:

* **Semantic similarity (Pinecone)**
* **Keyword relevance (MongoDB)**

Final score:

```
0.7 * semantic + 0.3 * keyword
```

---

### 🔹 Chunking Strategy

* Sentence-aware chunking
* Overlapping context (to prevent data loss)
* Maintains logical structure (lists, sections)

---

### 🔹 Verification Layer

* Ensures answer is grounded in retrieved context
* Rejects hallucinated responses

---

### 🔹 Streaming Responses

* Token-by-token output
* Improves perceived latency and UX

---

### 🔹 Caching

* In-memory cache with TTL
* Reduces redundant API calls

---

## 🚀 Performance Optimizations

* Parallel embedding generation
* Context size limiting
* Retrieval normalization
* Deduplication of chunks
* Efficient query routing

---

## 📌 Future Improvements

* 🔐 User Authentication (JWT)
* 👤 Personalization (user-based retrieval)
* ⚡ Redis caching (instead of in-memory)
* 🧠 Agentic workflows (LangGraph)
* ☁️ Deployment scaling (multi-instance)

---

## 🚀 Deployment

| Component | Platform      |
| --------- | ------------- |
| Frontend  | Vercel        |
| Backend   | Railway       |
| Database  | MongoDB Atlas |
| Vector DB | Pinecone      |

---

## 💼 Resume Value

This project demonstrates:

* Full-stack development (MERN)
* AI system design (RAG architecture)
* Performance optimization
* Scalable backend architecture
* Real-world AI application engineering

---

## 🧑‍💻 Author

**Arijeet Das**

---

## 📜 License

MIT License

Copyright (c) 2026 Arijeet Kumar Das

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

```
```
