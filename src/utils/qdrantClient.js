const { QdrantClient } = require('@qdrant/js-client-rest');
const { AppError } = require('../utils/errors');

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false,
});

async function createCollectionIfNotExists(collectionName, vectorSize) {
  try {
    const collections = await qdrant.getCollections();
    if (!collections.collections.some(c => c.name === collectionName)) {
      await qdrant.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine', 
        },
      });
      console.log(`Created collection '${collectionName}'`);
    } 
  } catch (err) {
    throw new AppError(
      'Qdrant createCollection operation failed',
      500,
      true,
      { util: 'qdrantClient.createCollectionIfNotExists', raw: err }
    );
  }
}

async function upsert({ collectionName, collection_name, points }) {
  try {
    const collection = collectionName || collection_name;
    if (!collection || !Array.isArray(points) || points.length === 0) {
      throw new AppError(
        'Invalid parameters for Qdrant upsert',
        400,
        true,
        { util: 'qdrantClient.upsert' }
      );
    }

    // Dynamically get vector size from first point
    const vectorSize = points[0]?.vector?.length;
    if (!vectorSize) {
      throw new AppError(
        'Points must have vectors with length > 0',
        400,
        true,
        { util: 'qdrantClient.upsert' }
      );
    }

    await createCollectionIfNotExists(collection, vectorSize);

    // Validate vector size matches collection config
    const info = await qdrant.getCollection(collection);
    const expectedSize = info.vectors?.size || info.config?.params?.vectors?.size;

    if (expectedSize && points.some(p => p.vector?.length !== expectedSize)) {
      throw new AppError(
        `Vector size mismatch: expected ${expectedSize}, got ${points[0].vector?.length}`,
        400,
        true,
        { util: 'qdrantClient.upsert' }
      );
    }

    return await qdrant.upsert(collection, {
      wait: true,
      points,
    });

  } catch (err) {
    console.log('Qdrant upsert error:', err);
    throw new AppError(
      'Qdrant upsert operation failed',
      500,
      true,
      { util: 'qdrantClient.upsert', raw: err }
    );
  }
}

async function search({ collectionName, collection_name, vector, limit = 5, with_payload = true }) {
  try {
    const collection = collectionName || collection_name;
    if (!collection || !vector) {
      throw new AppError(
        'Invalid parameters for Qdrant search',
        400,
        true,
        { util: 'qdrantClient.search' }
      );
    }

    const result = await qdrant.search(collection, {
      vector,
      limit,
      with_payload,
    });

    return result;
  } catch (err) {
    throw new AppError(
      'Qdrant search operation failed',
      500,
      true,
      { util: 'qdrantClient.search', raw: err }
    );
  }
}

async function health() {
  try {
    return await qdrant.getCollections();
  } catch (err) {
    throw new AppError('Qdrant health check failed', 500, true, { util: 'qdrantClient.health', raw: err });
  }
}

module.exports = {
  upsert,
  search,
  health,
  createCollectionIfNotExists,
};
