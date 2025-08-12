const fs = require('fs');
require('dotenv').config();
const path = require('path');
const { AppError } = require('../utils/errors');
const qdrantClient = require('../utils/qdrantClient');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { loadPDF, loadDocx, loadTxt } = require('../utils/documentLoader');
const documentsModel = require('../models/documentsModel');
const { v4: uuidv4 } = require('uuid');


const embeddingModel = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY,
  model: 'embedding-001', 
});

async function ingestDocuments(payload, uploadedFile) {
  try {
    
    if (!payload.title || !payload.source_type) {
      throw new AppError(
        'Missing required fields: title, source_type',
        400,
        true,
        { service: 'ingestion.service.ingestDocuments' }
      );
    }

    if (!uploadedFile || !uploadedFile.path) {
      throw new AppError(
        'No file uploaded',
        400,
        true,
        { service: 'ingestion.service.ingestDocuments' }
      );
    }

    const docFilePath = uploadedFile.path;

    if (!fs.existsSync(docFilePath)) {
      throw new AppError(
        `Document file not found at path: ${docFilePath}`,
        400,
        true,
        { service: 'ingestion.service.ingestDocuments' }
      );
    }

    // Load document based on type
    let documents;
    switch (payload.source_type.toLowerCase()) {
      case 'pdf':
        documents = await loadPDF(docFilePath);
        break;
      case 'docx':
        documents = await loadDocx(docFilePath);
        break;
      case 'txt':
        documents = await loadTxt(docFilePath);
        break;
      default:
        throw new AppError(
          `Unsupported source_type: ${payload.source_type}`,
          400,
          true,
          { service: 'ingestion.service.ingestDocuments' }
        );
    }

    if (!documents || documents.length === 0) {
      throw new AppError(
        'No text extracted from document',
        500,
        true,
        { service: 'ingestion.service.ingestDocuments' }
      );
    }

    // Split into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });

    const chunks = await splitter.splitDocuments(documents);

    const texts = chunks.map(
      (chunk) =>
        chunk.pageContent ||
        chunk.page_content ||
        chunk.text ||
        chunk.content ||
        ''
    );

    // Embed chunks
    const vectors = await embeddingModel.embedDocuments(texts);

    
    const docId = await documentsModel.insertDocument({
      title: payload.title,
      source_type: payload.source_type,
      source_path: uploadedFile.originalname, 
      description: payload.description || null,
      tags: payload.tags || null,
    });

    await documentsModel.insertChunks(docId, chunks, texts, vectors);

    // Prepare Qdrant points
    const points = chunks.map((chunk, i) => ({
      id: uuidv4(),
      vector: vectors[i],
      payload: {
        doc_id: docId,
        text: texts[i],
        position: i,
      },
    }));

    // Upsert into Qdrant
    await qdrantClient.upsert({
      collectionName: 'athena_docs',
      points,
    });

    return { docId, chunksCount: chunks.length };
  } catch (err) {
    console.log('Ingestion error:', err);
    if (!(err instanceof AppError)) {
      throw new AppError(
        'Unexpected error in ingestion service',
        500,
        true,
        { service: 'ingestion.service.ingestDocuments', raw: err }
      );
    }
    throw err;
  }
}


module.exports = {
  ingestDocuments,
};
