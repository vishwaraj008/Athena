const { AppError } = require('../utils/errors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new AppError(
    'GEMINI_API_KEY is not set in environment variables',
    500,
    true,
    { service: 'llm.service.initialization' }
  );
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

// Embedding model instance
const embeddingModel = genAI.getGenerativeModel({ model: 'models/embedding-001' });

// Text generation model instance
const textModel = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });

/**
 * Generate an embedding vector for a given text using Gemini embeddings.
 */
async function embedQuery(text) {
  try {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new AppError(
        'Invalid input for embedding: text is required and must be a non-empty string',
        400,
        true,
        { service: 'llm.service.embedQuery' }
      );
    }

    const result = await embeddingModel.embedContent(text);
    const vector = result?.embedding?.values;

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
    console.log('Gemini embedding error:', err);
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

/**
 * Generate a text answer from a query and contextual information using Gemini text generation.
 */
async function generateAnswer(query, context) {
  try {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      throw new AppError(
        'Invalid query input: query is required and must be a non-empty string',
        400,
        true,
        { service: 'llm.service.generateAnswer' }
      );
    }

    if (typeof context !== 'string') {
      throw new AppError(
        'Invalid context input: context must be a string',
        400,
        true,
        { service: 'llm.service.generateAnswer' }
      );
    }

    const prompt = `You are a helpful assistant. Use the context below to answer the question accurately.

Context:
${context}

Question:
${query}

Answer:`;

    const result = await textModel.generateContent(prompt);
    const output = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!output) {
      throw new AppError(
        'Gemini returned empty answer text',
        500,
        true,
        { service: 'llm.service.generateAnswer' }
      );
    }

    return output;
  } catch (err) {
    if (!(err instanceof AppError)) {
      console.log('Gemini answer generation error:', err);
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
