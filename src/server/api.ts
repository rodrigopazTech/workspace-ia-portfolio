import type { IncomingMessage, ServerResponse } from 'http';
import { processWorkspaceChat } from './gemini';

// Helper to parse JSON body from incoming HTTP request
const parseBody = (req: IncomingMessage): Promise<any> => {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
};

// Express/Vite connect middleware handler for /api/*
export const handleApiRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  next?: () => void
) => {
  const url = req.url || '';

  // Only handle /api routes
  if (!url.startsWith('/api')) {
    if (next) return next();
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  // Set CORS and JSON headers
  res.setHeader('Content-Type', 'application/json');

  if (url === '/api/health' && req.method === 'GET') {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        status: 'ok',
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
        time: new Date().toISOString(),
      })
    );
    return;
  }

  if (url.startsWith('/api/chat') && req.method === 'POST') {
    try {
      const authHeader = req.headers['authorization'] || '';
      const bearerToken = authHeader.startsWith('Bearer ')
        ? authHeader.substring(7).trim()
        : '';

      const body = await parseBody(req);
      const accessToken = bearerToken || body.accessToken || 'demo-token';
      const isDemo = body.isDemo || accessToken === 'demo-token' || !bearerToken;

      if (!process.env.GEMINI_API_KEY) {
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            error:
              'GEMINI_API_KEY is not configured on the server. Please check the AI Studio Secrets panel.',
          })
        );
        return;
      }

      const result = await processWorkspaceChat({
        messages: body.messages || [],
        accessToken,
        userContext: body.userContext,
        isDemo,
      });

      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return;
    } catch (err: any) {
      console.error('Chat API error:', err);
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          error: err.message || 'An unexpected error occurred while processing the request.',
        })
      );
      return;
    }
  }

  // Not matched
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
};
