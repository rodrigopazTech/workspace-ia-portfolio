import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleApiRequest } from './src/server/api';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const distPath = fs.existsSync(path.resolve(__dirname, 'dist'))
  ? path.resolve(__dirname, 'dist')
  : path.resolve(process.cwd(), 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).send('Workspace Copilot is starting up...');
    }
  });
} else {
  app.get('*', (_req, res) => {
    res.status(200).send('Workspace Copilot server running. Build static assets with npm run build.');
  });
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
