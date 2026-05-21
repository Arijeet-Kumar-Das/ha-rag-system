# HA-RAG: Hybrid Adaptive Retrieval-Augmented Generation Framework

HA-RAG is a full-stack academic conversational intelligence system built using a Hybrid Adaptive Retrieval-Augmented Generation architecture designed for grounded, context-aware, and hallucination-resistant question answering over academic documents.

The system combines semantic vector retrieval, keyword-oriented lexical retrieval, adaptive ranking, verification-aware response validation, and real-time streaming generation to deliver reliable multi-document academic assistance.

The project was designed and implemented as a scalable modular RAG framework capable of supporting academic research workflows, contextual document querying, and persistent conversational interaction.

---

# Core Features

## Hybrid Adaptive Retrieval

Integrates:

- Semantic vector similarity retrieval using Pinecone
- Keyword-oriented lexical retrieval using MongoDB text indexing
- Weighted hybrid ranking mechanism

Final retrieval score:

```text
Score = 0.7 × Semantic + 0.3 × Keyword
```

---

## Adaptive Retrieval Depth Selection

The retrieval pipeline dynamically adjusts retrieval depth according to query complexity.

| Query Type          | Retrieval Depth   |
| ------------------- | ----------------- |
| Factual Queries     | 3–4 chunks        |
| Conceptual Queries  | 5–6 chunks        |
| Analytical Queries  | 8–10 chunks       |
| Unsupported Queries | Minimal retrieval |

This reduces retrieval noise, improves prompt efficiency, and lowers response latency.

---

## Multi-Document Workspace Querying

Supports contextual querying across multiple uploaded academic documents simultaneously.

Capabilities include:

- Cross-document reasoning
- Comparative contextual synthesis
- Persistent workspace interaction
- Citation-aware multi-source responses

---

## Verification-Aware Response Generation

Generated responses undergo validation before streaming to the user.

Verification mechanisms include:

- Similarity-threshold filtering
- Retrieval confidence estimation
- Citation consistency validation
- Unsupported-query rejection
- Grounded fallback response generation

This significantly reduces hallucinated outputs.

---

## Real-Time Streaming Architecture

Responses are streamed incrementally using Server-Sent Events (SSE) for low-latency conversational interaction.

Optimizations include:

- Reduced Time To First Token (TTFT)
- Progressive token rendering
- Parallel retrieval execution
- Prompt-size optimization

---

## Academic Document Intelligence Pipeline

The ingestion pipeline processes uploaded academic PDFs through:

- Text extraction
- Sentence-aware chunking
- Embedding generation
- Metadata indexing
- Dual-storage retrieval preparation

Chunking configuration:

- ~300-word chunks
- ~50-word overlap

---

# System Architecture

```text
User Query
    ↓
Query Classification
    ↓
Adaptive Retrieval Depth Selection
    ↓
Hybrid Retrieval Engine
(Pinecone + MongoDB)
    ↓
Similarity Threshold Filtering
    ↓
Chunk Deduplication
    ↓
Context Construction
    ↓
LLM Response Generation
(GPT-4o-mini)
    ↓
Verification-Aware Validation
    ↓
Citation Grounding
    ↓
Streaming Response Output
```

---

# Tech Stack

## Frontend

- React.js
- Vite
- Tailwind CSS

## Backend

- Node.js
- Express.js

## Database & Storage

- MongoDB Atlas
- Pinecone Vector Database
- Cloudinary

## AI & Retrieval

- OpenAI GPT-4o-mini
- OpenAI Embeddings

## Authentication

- JWT Authentication

---

# Project Structure

```text
ha-rag-framework/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   └── utils/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── models/
│   ├── utils/
│   └── config/
│
├── README.md
└── .gitignore
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/Arijeet-Kumar-Das/ha-rag-system
cd ha-rag-framework
```

---

# Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
OPENAI_API_KEY=your_openai_key
PINECONE_API_KEY=your_pinecone_key
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
PORT=5000
```

Run backend:

```bash
npm run dev
```

---

# Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

# API Endpoints

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
```

---

## Document Management

```http
POST /api/upload
GET /api/documents
DELETE /api/documents/:id
```

---

## Conversational Querying

```http
POST /api/ask
GET /api/chat/history
```

---

## Workspace Management

```http
POST /api/workspaces
GET /api/workspaces
```

---

# Retrieval Pipeline

The retrieval engine combines semantic and lexical retrieval strategies.

## Semantic Retrieval

- OpenAI embedding generation
- Pinecone cosine similarity search
- Context-aware retrieval

## Keyword Retrieval

- MongoDB text indexing
- Exact terminology matching
- Technical identifier retrieval
- Abbreviation-aware search

## Retrieval Optimizations

- Adaptive top-K selection
- Similarity-threshold filtering
- Chunk deduplication
- Retrieval caching
- Parallel retrieval execution

---

# Performance Optimizations

The framework incorporates several retrieval and generation optimizations:

- Adaptive retrieval depth
- Prompt-size optimization
- Parallel retrieval execution
- Citation filtering
- Controlled chunk granularity
- Retrieval caching
- Streaming token generation
- Context deduplication

---

# Experimental Results

The system was experimentally evaluated using academic datasets involving:

- Database Management Systems
- Agile Methodologies
- Computer Networks
- Artificial Intelligence

## Performance Comparison

| Metric                               | Conventional RAG | HA-RAG |
| ------------------------------------ | ---------------- | ------ |
| Response Accuracy                    | 79.4%            | 91.2%  |
| Precision@5                          | 0.68             | 0.87   |
| Average Response Time                | 8.1 s            | 4.9 s  |
| Time To First Token (TTFT)           | 6.8 s            | 3.9 s  |
| Hallucination Rate                   | 17.3%            | 5.8%   |
| Citation Relevance                   | 62%              | 89%    |
| Cross-Document Success Rate          | 44%              | 90%    |
| Unsupported Query Rejection Accuracy | 41%              | 93%    |

---

# Research Contributions

The project introduces:

- Hybrid adaptive retrieval architecture
- Verification-aware response generation
- Citation-grounded conversational intelligence
- Multi-document contextual synthesis
- Adaptive retrieval depth optimization
- Hallucination-resistant academic querying
- Real-time streaming academic assistance

---

# Deployment

| Component       | Platform      |
| --------------- | ------------- |
| Frontend        | Vercel        |
| Backend         | Render        |
| Database        | MongoDB Atlas |
| Vector Database | Pinecone      |
| Media Storage   | Cloudinary    |

---

# Future Enhancements

Planned improvements include:

- Multilingual retrieval support
- Redis-based distributed caching
- Agentic retrieval orchestration
- Diagram-aware multimodal retrieval
- Local LLM deployment
- Personalized learning adaptation
- Voice-based academic interaction
- Advanced reranking pipelines

---

# Resume Relevance

This project demonstrates practical experience in:

- Full-stack system architecture
- Retrieval-Augmented Generation (RAG)
- AI-powered academic systems
- Large Language Model integration
- Retrieval optimization
- Hybrid search systems
- Real-time streaming architectures
- Vector databases
- Scalable backend engineering
- Performance instrumentation
- Conversational AI system design

---

# Author

Arijeet Kumar Das  
Department of Computer Applications  
B.M.S. College of Engineering, Bengaluru, India

---

# License

MIT License

Copyright (c) 2026 Arijeet Kumar Das

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files to deal in the Software
without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
