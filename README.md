# Athena

Athena is a Retrieval-Augmented Generation (RAG) system combining vector search with large language models (LLMs) to provide accurate, context-aware answers from uploaded documents.

## Features

- Document ingestion: Supports PDF, DOCX, TXT files  
- Text extraction and chunking for efficient vectorization  
- Embedding generation with Google Gemini embeddings  
- Vector storage and similarity search using Qdrant  
- Question answering using context retrieval + LLM response generation  
- REST API with document upload and query endpoints  

## Setup

1. Clone the repo  
2. Create `.env` file with your keys and config (e.g., `GOOGLE_API_KEY`, `DOCS_PATH`)  
3. Install dependencies:  
   ```bash
   npm install
   nom run dev 

## API Endpoints

1. `POST /ingest` — Upload and ingest documents
2. `POST /query` — Ask questions with RAG-based answers

## LICENSE

Copyright (c) 2025 Vishwaraj Singh Chundawat. All rights reserved.

