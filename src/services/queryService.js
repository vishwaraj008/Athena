const { AppError } = require('../utils/errors');
const qdrantClient = require('../utils/qdrantClient');
const documentsModel = require('../models/documentsModel');
const queryLogModel = require('../models/queryModel'); 
const llmService = require('./llmService');

async function runQuery(queryText, userId = null) {
  try {
    if (!queryText || typeof queryText !== 'string' || queryText.trim() === '') {
      throw new AppError(
        'Query text is invalid or empty',
        400,
        true,
        { service: 'retrieval.service.runQuery' }
      );
    }

    
    const queryEmbedding = await llmService.embedQuery(queryText);

    const searchResult = await qdrantClient.search({
      collection_name: 'athena_docs',
      vector: queryEmbedding,
      limit: 5,
      with_payload: true,
    });

    if (!searchResult || searchResult.length === 0) {
      return {
        answer: "No relevant information found.",
        sources: [],
      };
    }

    const contextTexts = searchResult.map((res) => res.payload.text);
    const docIds = [...new Set(searchResult.map((res) => res.payload.doc_id))];

    const docsMeta = await documentsModel.getDocumentsByIds(docIds);

    const contextCombined = contextTexts.join('\n---\n');

    const modelUsed = 'gemini';
    const startTime = Date.now();
    const answer = await llmService.generateAnswer(queryText, contextCombined);
    const responseTimeMs = Date.now() - startTime;

    const resultsCount = searchResult.length;

    try {
      await queryLogModel.insertQueryLog({
        tenant_id: userId,
        query_text: queryText,
        results_count: resultsCount,
        model_used: modelUsed,
        response_time_ms: responseTimeMs,
      });
    } catch (logErr) {
      // Log error but do not break main flow
      console.error('Query log error:', logErr);
    }

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
