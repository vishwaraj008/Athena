const express = require('express');
const router = express.Router();
const {runQuery} = require('../controllers/queryController');
const {apiValidator} = require('../middleware/apiKey');


router.post('/',apiValidator, runQuery);

module.exports = router;
