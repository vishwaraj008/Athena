// models/documentsModel.js
const pool = require('../config/db');
const { AppError } = require('../utils/errors');

/**
 * Insert a document into the documents table
 * @param {Object} docData
 * @returns {Promise<number>} Inserted doc_id
 */
async function insertDocument(docData) {
  const sql = `
    INSERT INTO documents 
      (tenant_id, title, source_type, source_path, description, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;

  const params = [
    docData.tenant_id || null,
    docData.title,
    docData.source_type,
    docData.source_path,
    docData.description || null,
    docData.tags || null,
  ];

  try {
    const [result] = await pool.execute(sql, params);
    if (!result.insertId) {
      throw new AppError('Failed to insert document', 500, true, {
        model: 'documents.model.insertDocument',
      });
    }
    return result.insertId;
  } catch (err) {
    throw new AppError('Database error during insertDocument', 500, true, {
      model: 'documents.model.insertDocument',
      raw: err,
    });
  }
}

/**
 * Insert chunks for a document
 * @param {number} docId
 * @param {Array} chunks - array of chunk metadata (should match text array length)
 * @param {Array} texts - array of chunk text strings
 * @param {Array} vectors - array of embedding vectors (UUID from Qdrant handled in service)
 */
async function insertChunks(docId, chunks, texts, vectors) {
  if (!docId || !Array.isArray(chunks) || !Array.isArray(texts) || !Array.isArray(vectors)) {
    throw new AppError('Invalid input to insertChunks', 400, true, {
      model: 'documents.model.insertChunks',
    });
  }

  const sql = `
    INSERT INTO chunks 
      (doc_id, chunk_text, qdrant_id, position, created_at)
    VALUES (?, ?, ?, ?, NOW())
  `;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (let i = 0; i < chunks.length; i++) {
      const params = [
        docId,
        texts[i] || '',
        `${docId}-${i}`, // qdrant_id (matches your service's points[i].id)
        i, // position
      ];
      await connection.execute(sql, params);
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw new AppError('Failed to insert document chunks', 500, true, {
      model: 'documents.model.insertChunks',
      raw: err,
    });
  } finally {
    connection.release();
  }
}

/**
 * Get documents by IDs
 * @param {number[]} docIds
 */
async function getDocumentsByIds(docIds) {
  if (!Array.isArray(docIds) || docIds.length === 0) return [];

  const placeholders = docIds.map(() => '?').join(',');
  const sql = `
    SELECT doc_id, tenant_id, title, source_type, source_path, description, tags, created_at
    FROM documents 
    WHERE doc_id IN (${placeholders})
  `;

  try {
    const [rows] = await pool.execute(sql, docIds);
    return rows;
  } catch (err) {
    throw new AppError('Database error during getDocumentsByIds', 500, true, {
      model: 'documents.model.getDocumentsByIds',
      raw: err,
    });
  }
}

module.exports = {
  insertDocument,
  insertChunks,
  getDocumentsByIds,
};
