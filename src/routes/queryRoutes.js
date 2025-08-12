const express = require('express');
const router = express.Router();
const {runQuery} = require('../controllers/queryController');

// POST /query
// Accepts user queries for retrieval-augmented generation
router.post('/', runQuery);

module.exports = router;
