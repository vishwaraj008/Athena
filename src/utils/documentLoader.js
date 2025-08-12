const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { AppError } = require('../utils/errors');
const { Document } = require('langchain/document');

/**
 * Load PDF and return an array of LangChain Document objects
 * @param {string} filePath
 * @returns {Promise<Document[]>}
 */
async function loadPDF(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new AppError(`File not found: ${filePath}`, 404, true, { loader: 'loadPDF' });
    }
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text.trim();

    if (!text) {
      throw new AppError(`No text extracted from PDF: ${filePath}`, 400, true, { loader: 'loadPDF' });
    }

    return [new Document({ pageContent: text, metadata: { source: filePath, type: 'pdf' } })];
  } catch (err) {
    if (!(err instanceof AppError)) {
      throw new AppError(err.message || 'Error loading PDF document', 500, true, { loader: 'loadPDF', raw: err });
    }
    throw err;
  }
}

/**
 * Load DOCX and return an array of LangChain Document objects
 * @param {string} filePath
 * @returns {Promise<Document[]>}
 */
async function loadDocx(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new AppError(`File not found: ${filePath}`, 404, true, { loader: 'loadDocx' });
    }
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value.trim();

    if (!text) {
      throw new AppError(`No text extracted from DOCX: ${filePath}`, 400, true, { loader: 'loadDocx' });
    }

    return [new Document({ pageContent: text, metadata: { source: filePath, type: 'docx' } })];
  } catch (err) {
    if (!(err instanceof AppError)) {
      throw new AppError(err.message || 'Error loading DOCX document', 500, true, { loader: 'loadDocx', raw: err });
    }
    throw err;
  }
}

/**
 * Load TXT and return an array of LangChain Document objects
 * @param {string} filePath
 * @returns {Promise<Document[]>}
 */
async function loadTxt(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new AppError(`File not found: ${filePath}`, 404, true, { loader: 'loadTxt' });
    }
    const text = fs.readFileSync(filePath, 'utf8').trim();

    if (!text) {
      throw new AppError(`No text extracted from TXT: ${filePath}`, 400, true, { loader: 'loadTxt' });
    }

    return [new Document({ pageContent: text, metadata: { source: filePath, type: 'txt' } })];
  } catch (err) {
    if (!(err instanceof AppError)) {
      throw new AppError(err.message || 'Error loading TXT document', 500, true, { loader: 'loadTxt', raw: err });
    }
    throw err;
  }
}

module.exports = { loadPDF, loadDocx, loadTxt };
