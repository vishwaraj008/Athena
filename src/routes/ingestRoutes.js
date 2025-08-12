const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const {ingestDocuments} = require('../controllers/ingestController');

router.post('/',upload.single('file'), ingestDocuments);

module.exports = router;
