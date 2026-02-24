const fs = require('fs');
require('dotenv').config();
const { AppError } = require('../utils/errors');
const qdrantClient = require('../utils/qdrantClient');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { loadPDF, loadDocx, loadTxt } = require('../utils/documentLoader');
const documentsModel = require('../models/documentsModel');
const { v4: uuidv4 } = require('uuid');

// --- INITIALIZE WITH EXACT MODEL NAME ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// We use the exact name found in your test script
const MODEL_NAME = "gemini-embedding-001";
const embeddingModel = genAI.getGenerativeModel({ model: MODEL_NAME });

// Helper: Sleep to prevent hitting rate limits
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ingestDocuments(payload, uploadedFile) {
  try {
    // --- 1. VALIDATION ---
    if (!payload.title || !payload.source_type) {
      throw new AppError('Missing required fields', 400, true, { service: 'ingestion' });
    }

    if (!uploadedFile || !uploadedFile.path || !fs.existsSync(uploadedFile.path)) {
      throw new AppError('File not found', 400, true, { service: 'ingestion' });
    }

    // --- 2. LOAD DOCUMENT ---
    let documents;
    const docFilePath = uploadedFile.path;
    
    switch (payload.source_type.toLowerCase()) {
      case 'pdf': documents = await loadPDF(docFilePath); break;
      case 'docx': documents = await loadDocx(docFilePath); break;
      case 'txt': documents = await loadTxt(docFilePath); break;
      default: throw new AppError(`Unsupported type: ${payload.source_type}`, 400, true);
    }

    if (!documents?.length) throw new AppError('No text extracted', 500, true);

    // --- 3. SPLIT TEXT ---
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });
    const chunks = await splitter.splitDocuments(documents);

    // Filter empty chunks
    const texts = [];
    const validChunks = [];
    for (const chunk of chunks) {
      const txt = chunk.pageContent || chunk.text || '';
      if (txt.trim().length > 0) {
        texts.push(txt);
        validChunks.push(chunk);
      }
    }

    if (texts.length === 0) throw new AppError('All chunks empty', 500, true);

    // --- 4. GENERATE EMBEDDINGS ---
    console.log(`Generating embeddings for ${texts.length} chunks using ${MODEL_NAME}...`);
    const vectors = [];

    for (let i = 0; i < texts.length; i++) {
      try {
        // gemini-embedding-001 does NOT support taskType or title
        // We use the simplest possible request format
        const result = await embeddingModel.embedContent({
            content: { parts: [{ text: texts[i] }] }
        });

        const vector = result.embedding.values;
        if (!vector || vector.length === 0) {
            throw new Error("API returned empty vector");
        }
        
        vectors.push(vector);

        // Sleep 100ms every 10 requests to respect rate limits
        if (i % 10 === 0) await sleep(100);

      } catch (err) {
        console.error(`Embedding error at index ${i}:`, err.message);
        throw new AppError(`Failed to embed chunk ${i}`, 500, true, { raw: err });
      }
    }

    // --- 5. VERIFY ---
    if (vectors.length !== texts.length) throw new AppError('Vector count mismatch', 500, true);

    console.log(`Successfully generated ${vectors.length} vectors.`);

    // --- 6. SAVE TO DB ---
    const docId = await documentsModel.insertDocument({
      title: payload.title,
      source_type: payload.source_type,
      source_path: uploadedFile.originalname,
      description: payload.description || null,
      tags: payload.tags || null,
    });

    await documentsModel.insertChunks(docId, validChunks, texts, vectors);

    // --- 7. UPSERT TO QDRANT ---
    const points = validChunks.map((chunk, i) => ({
      id: uuidv4(),
      vector: vectors[i],
      payload: { doc_id: docId, text: texts[i], position: i },
    }));

    await qdrantClient.upsert({ collectionName: 'athena_docs', points });

    return { docId, chunksCount: validChunks.length };

  } catch (err) {
    console.error('Ingestion Service Error:', err);
    if (err instanceof AppError) throw err;
    throw new AppError('Ingestion failed', 500, true, { raw: err });
  }
}

module.exports = { ingestDocuments };