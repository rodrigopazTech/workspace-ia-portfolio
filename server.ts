import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { handleApiRequest } from './src/server/api';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// API routes handled by API handler
app.use((req, res, next) => {
  if (req.url && req.url.startsWith('/api')) {
    handleApiRequest(req, res, next);
  } else {
    next();
  }
});

// Serve production static assets from dist
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
