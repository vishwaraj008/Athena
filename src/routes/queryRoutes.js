const express = require('express');
const router = express.Router();
const {runQuery} = require('../controllers/queryController');
const {apiValidator} = require('../middleware/apiKey');
// Accepts user queries for retrieval-augmented generation
router.post('/',apiValidator, runQuery);

module.exports = router;
