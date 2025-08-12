const path = require('path');
const fs = require('fs');
const ingestionService = require('../services/ingestService');
const { AppError } = require('../utils/errors');

async function ingestDocuments(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError(
        'No document file uploaded',
        400,
        true,
        { controller: 'ingest.controller.ingestDocuments' }
      );
    }

    const { source_type, title } = req.body;
    if (!source_type || !title) {
      throw new AppError(
        'Both source_type and title are required',
        400,
        true,
        { controller: 'ingest.controller.ingestDocuments' }
      );
    }

    const result = await ingestionService.ingestDocuments(
      { source_type, title, description: req.body.description, tags: req.body.tags },
      req.file
    );

    res.status(201).json({ success: true, data: result });

  } catch (err) {
    if (!(err instanceof Error)) {
      return next(new AppError(
        'Unhandled error during document ingestion',
        500,
        true,
        { controller: 'ingest.controller.ingestDocuments', raw: err }
      ));
    }
    if (!(err instanceof AppError)) {
      return next(new AppError(
        'Unexpected error during document ingestion',
        500,
        true,
        { controller: 'ingest.controller.ingestDocuments', raw: err }
      ));
    }
    return next(err);
  }
}


module.exports = {
  ingestDocuments,
};
