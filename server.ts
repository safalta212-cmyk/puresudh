import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/api/serverApi';
import { applySecurityHeaders, sanitizeMiddleware } from './src/api/securityMiddleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Security Headers & Body Parsing
app.use(applySecurityHeaders);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeMiddleware);

// SEO: Explicit route for robots.txt
app.get('/robots.txt', (_req, res) => {
  const robotsPath = path.join(__dirname, 'public', 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(robotsPath);
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send("User-agent: *\nAllow: /\nSitemap: https://puresudh.com/sitemap.xml\n");
});

// SEO: Explicit route for sitemap.xml
app.get('/sitemap.xml', (_req, res) => {
  const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=43200');
    return res.sendFile(sitemapPath);
  }
  res.status(404).send('Not found');
});

// API endpoints with authoritative validation & rate limiting
app.use('/api', apiRouter);

// Serve static assets with long-term immutable caching for hashed bundles
app.use(
  '/assets',
  express.static(path.join(__dirname, 'dist', 'assets'), {
    maxAge: '1y',
    immutable: true,
  })
);

// Serve static frontend files
app.use(
  express.static(path.join(__dirname, 'dist'), {
    maxAge: '1h',
  })
);

// Fallback to index.html for SPA routing (with no-cache to ensure immediate fresh deployment updates)
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PURE SUDH Server running on http://0.0.0.0:${PORT}`);
});
