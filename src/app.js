const express = require('express');
const dotenv = require('dotenv');
const ingestRoutes = require('./routes/ingestRoutes');
const queryRoutes = require('./routes/queryRoutes');

dotenv.config();

const app = express();
app.use(express.json());

// Use routes
app.use('/athena/ingest', ingestRoutes);
app.use('/athena/query', queryRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Athena API running' });
});


const PORT = process.env.API_PORT || 8000;
app.listen(PORT, () => {
  console.log(`Athena server listening on port ${PORT}`);
});
