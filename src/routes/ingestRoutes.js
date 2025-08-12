const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const {ingestDocuments} = require('../controllers/ingestController');
const {apiValidator} = require('../middleware/apiKey');

router.post('/',apiValidator,upload.single('file'), ingestDocuments);

module.exports = router;
