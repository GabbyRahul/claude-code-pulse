const express = require('express');
const path = require('path');
const { parseAllSessions } = require('./parser');
const { generateOptimizations } = require('./optimizer');

function createServer() {
  const app = express();

  app.use(express.static(path.join(__dirname, 'public')));

  let cachedData = null;

  app.get('/api/usage', async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === 'true';
      if (!cachedData || forceRefresh) {
        const data = await parseAllSessions(forceRefresh);
        data.optimizations = generateOptimizations(data);
        cachedData = data;
      }
      res.json(cachedData);
    } catch (err) {
      console.error('Error parsing sessions:', err.message);
      res.status(500).json({ error: 'Failed to parse session data' });
    }
  });

  return app;
}

module.exports = { createServer };
