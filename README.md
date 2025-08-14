# Athena

>Athena is a Retrieval-Augmented Generation (RAG) system that combines vector search with large language models (LLMs) to provide accurate, context-aware answers from your uploaded documents. Built with Node.js, Express, MySQL, and Qdrant, Athena enables secure document ingestion, semantic search, and LLM-powered Q&A via a simple REST API.

---

## Features

- **Document Ingestion:** Upload and process PDF, DOCX, and TXT files
- **Text Extraction & Chunking:** Efficiently splits documents for vectorization
- **Embeddings:** Uses Google Gemini (or OpenAI) for vector embeddings
- **Vector Storage:** Stores and searches vectors in Qdrant
- **Semantic Search & RAG:** Retrieves relevant context and generates answers using LLMs
- **API Key Security:** Protects endpoints with API key middleware
- **Extensible:** Easily switch between Gemini and OpenAI as LLM providers

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/vishwaraj008/Athena.git
cd Athena
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Required variables:**
- MySQL connection (MYSQL_HOST, MYSQL_USER, ...)
- Qdrant connection (QDRANT_URL, QDRANT_API_KEY)
- LLM API keys (GOOGLE_API_KEY or OPENAI_API_KEY)
- API_KEY for securing endpoints
- DOCS_PATH for file storage

### 4. Start the Server

```bash
npm run dev

npm start
```

The API will be available at `http://localhost:8000/` (or your configured port).

---

## API Endpoints

### 1. Ingest Documents

**POST** `/athena/ingest`

**Headers:**
- `x-api-key: <your_api_key>`

**Body (form-data):**
- `file`: (PDF, DOCX, or TXT file)

**Response:**
```json
{
  "message": "Document ingested successfully",
  "documentId": "..."
}
```

---

### 2. Query Documents
**POST** `/athena/query`

**Headers:**
- `x-api-key: <your_api_key>`

**Body (JSON):**
```json
{
  "prompt": "What is Athena?"
}
```

**Response:**
```json
{
  "answer": "Athena is a Retrieval-Augmented Generation system...",
  "context": ["Relevant chunk 1", "Relevant chunk 2", ...]
}
```

---

## Environment Variables

See `.env.example` for all options. Key variables:

- `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`: MySQL config
- `QDRANT_URL`, `QDRANT_API_KEY`: Qdrant vector DB config
- `GOOGLE_API_KEY` or `OPENAI_API_KEY`: LLM provider keys
- `DEFAULT_LLM`: `gemini` or `openai`
- `API_KEY`: API key for endpoint protection
- `DOCS_PATH`: Path to store uploaded documents

---

## Project Structure

```
src/
  app.js              # Main Express app
  config/             # DB, multer, and other configs
  controllers/        # Route controllers
  middleware/         # API key middleware
  models/             # DB models
  routes/             # API route definitions
  services/           # Business logic (ingest, query, LLM)
  utils/              # Utilities (document loader, errors, Qdrant client)
```

---

## License

Copyright (c) 2025 Vishwaraj Singh Chundawat. All rights reserved.

