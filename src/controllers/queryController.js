const retrievalService = require('../services/queryService');
const { AppError, ValidationError } = require('../utils/errors');

async function runQuery(req, res, next) {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.trim() === '') {
      throw new ValidationError('Query text is required', {
        controller: 'query.controller.runQuery',
      });
    }

    const response = await retrievalService.runQuery(query);
    if (!response) {
      throw new AppError(
        'Failed to process query',
        500,
        true,
        { controller: 'query.controller.runQuery' }
      );
    }

    res.json({ success: true, data: response });
  } catch (err) {
    if (!(err instanceof Error)) {
      return next(
        new AppError(
          'Unhandled error during query processing',
          500,
          true,
          { controller: 'query.controller.runQuery', raw: err }
        )
      );
    }
    if (!(err instanceof AppError)) {
      return next(
        new AppError(
          'Unexpected error during query processing',
          500,
          true,
          { controller: 'query.controller.runQuery', raw: err }
        )
      );
    }
    return next(err);
  }
}

module.exports = {
  runQuery,
};
