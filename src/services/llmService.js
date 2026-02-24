const { AppError } = require('../utils/errors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Use the same environment variable as your ingest service
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  throw new AppError(
    'GOOGLE_API_KEY is not set in environment variables',
    500,
    true,
    { service: 'llm.service.initialization' }
  );
}

// Initialize SDK
const genAI = new GoogleGenerativeAI(apiKey);

// --- MODELS ---
// 1. Embedding Model: Must match what you used for Ingestion
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// 2. Chat Model: CHANGED to 'gemini-2.5-flash' (compatible with your account)
const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


async function embedQuery(text) {
  try {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new AppError(
        'Invalid input for embedding: text is required',
        400,
        true,
        { service: 'llm.service.embedQuery' }
      );
    }

    // gemini-embedding-001 format
    const result = await embeddingModel.embedContent({
      content: { parts: [{ text }] }
    });
    
    const vector = result.embedding.values;

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new AppError(
        'Received invalid embedding vector from Gemini',
        500,
        true,
        { service: 'llm.service.embedQuery' }
      );
    }

    return vector;
  } catch (err) {
    console.error('Gemini embedding error:', err);
    if (!(err instanceof AppError)) {
      throw new AppError(
        'Failed to generate embedding with Gemini',
        500,
        true,
        { service: 'llm.service.embedQuery', raw: err }
      );
    }
    throw err;
  }
}


async function generateAnswer(query, context) {
  try {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      throw new AppError(
        'Invalid query input',
        400,
        true,
        { service: 'llm.service.generateAnswer' }
      );
    }

    // Context is optional but should be a string if provided
    const safeContext = typeof context === 'string' ? context : '';

    const prompt = `You are a helpful assistant. Use the context below to answer the question accurately. If the answer is not in the context, say "I don't know based on the provided context."

Context:
${safeContext}

Question:
${query}

Answer:`;

    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    const output = response.text();

    if (!output) {
      throw new AppError(
        'Gemini returned empty answer text',
        500,
        true,
        { service: 'llm.service.generateAnswer' }
      );
    }

    return output.trim();

  } catch (err) {
    console.error('Gemini answer generation error:', err);
    if (!(err instanceof AppError)) {
      throw new AppError(
        'Failed to generate answer with Gemini',
        500,
        true,
        { service: 'llm.service.generateAnswer', raw: err }
      );
    }
    throw err;
  }
}

module.exports = {
  embedQuery,
  generateAnswer,
};