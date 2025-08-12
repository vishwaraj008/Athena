const multer = require('multer');
const path = require('path');
const fs = require('fs');

const DOCS_PATH = process.env.DOCS_PATH || path.join(__dirname, '../docs');

if (!fs.existsSync(DOCS_PATH)) {
    fs.mkdirSync(DOCS_PATH, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, DOCS_PATH);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

module.exports = upload;
