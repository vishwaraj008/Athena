const { AppError } = require('../utils/errors');
const qdrantClient = require('../utils/qdrantClient');
const documentsModel = require('../models/documentsModel');
const queryLogModel = require('../models/queryModel'); 
const llmService = require('./llmService');

async function runQuery(queryText, userId = null) {
  try {
    // --- 1. VALIDATION ---
    if (!queryText || typeof queryText !== 'string' || queryText.trim() === '') {
      throw new AppError(
        'Query text is invalid or empty',
        400,
        true,
        { service: 'retrieval.service.runQuery' }
      );
    }

    // --- 2. EMBED QUERY ---
    // Uses the new llmService with gemini-embedding-001
    const queryEmbedding = await llmService.embedQuery(queryText);

    // --- 3. VECTOR SEARCH ---
    const searchResult = await qdrantClient.search({
      collectionName: 'athena_docs', // Matches your ingestService
      vector: queryEmbedding,
      limit: 5,
      with_payload: true,
    });

    // Handle no results gracefully
    if (!searchResult || searchResult.length === 0) {
      return {
        answer: "I couldn't find any relevant information in the uploaded documents to answer your question.",
        sources: [],
      };
    }

    // --- 4. EXTRACT CONTEXT ---
    // Extract text from Qdrant payload
    const contextTexts = searchResult
      .map((res) => res.payload?.text) // Safety check with ?.
      .filter((text) => text); // Filter out undefined/null

    if (contextTexts.length === 0) {
       return {
        answer: "I found some documents, but they didn't contain readable text context.",
        sources: [],
      };
    }

    // Extract unique Document IDs to fetch metadata
    // We filter out null/undefined doc_ids just in case
    const docIds = [...new Set(searchResult.map((res) => res.payload?.doc_id).filter(id => id))];

    // Fetch document metadata (title, type, etc.)
    const docsMeta = await documentsModel.getDocumentsByIds(docIds);

    // Combine context for the LLM
    const contextCombined = contextTexts.join('\n---\n');

    // --- 5. GENERATE ANSWER ---
    const startTime = Date.now();
    
    // Uses the new llmService with gemini-1.5-flash
    const answer = await llmService.generateAnswer(queryText, contextCombined);
    
    const responseTimeMs = Date.now() - startTime;

    // --- 6. LOGGING (Non-blocking) ---
    try {
      if (queryLogModel && typeof queryLogModel.insertQueryLog === 'function') {
        await queryLogModel.insertQueryLog({
          tenant_id: userId,
          query_text: queryText,
          results_count: searchResult.length,
          model_used: 'gemini-1.5-flash',
          response_time_ms: responseTimeMs,
        });
      }
    } catch (logErr) {
      // Log error but do not break the main response flow
      console.error('Query log error (non-fatal):', logErr.message);
    }

    // --- 7. RETURN RESPONSE ---
    return {
      answer,
      sources: docsMeta.map((d) => ({
        id: d.id,
        title: d.title,
        source_type: d.source_type,
        source_path: d.source_path,
      })),
    };

  } catch (err) {
    console.error("Retrieval Service Error:", err);
    if (!(err instanceof AppError)) {
      throw new AppError(
        'Unexpected error in retrieval service',
        500,
        true,
        { service: 'retrieval.service.runQuery', raw: err }
      );
    }
    throw err;
  }
}

module.exports = {
  runQuery,
};