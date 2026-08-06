#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── Config ────────────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set([
  'node_modules', '.git', '__pycache__', '.svelte-kit',
  'dist', 'build', '.next', '.nuxt', 'coverage', '.cache',
  '_viewer',
]);
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db']);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.pdf':  'application/pdf',
};

// ─── Root directory: cwd where the CLI is invoked ──────────────────────────────
const ROOT_DIR = process.cwd();

// ─── Helpers ───────────────────────────────────────────────────────────────────
function isUnderRoot(filePath) {
  const rel = path.relative(ROOT_DIR, filePath);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

function scanMarkdownFiles(dir, relBase = '') {
  const results = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }

  for (const entry of entries) {
    if (SKIP_FILES.has(entry.name)) continue;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const subRel = relBase ? `${relBase}/${entry.name}` : entry.name;
      results.push(...scanMarkdownFiles(path.join(dir, entry.name), subRel));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
      const absFilePath = path.join(dir, entry.name);
      let mtime = 0;
      try { mtime = fs.statSync(absFilePath).mtimeMs; } catch { /* skip unreadable */ }
      const parts = relPath.split('/');
      const stem = parts[parts.length - 1].replace(/\.md$/, '');
      const nameParts = [...parts.slice(0, -1), stem];
      const displayName = nameParts.join(' > ');
      results.push({ name: displayName, path: relPath, mtime });
    }
  }
  return results;
}

// ─── Static file from the package's own directory (index.html) ─────────────────
const PACKAGE_DIR = path.resolve(__dirname, '..');

function servePackageFile(relPath, res) {
  const abs = path.join(PACKAGE_DIR, relPath);
  if (!fs.existsSync(abs)) { res.writeHead(404); res.end('Not found'); return; }
  const ext = path.extname(abs);
  const ct = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': ct });
  fs.createReadStream(abs).pipe(res);
}

// ─── Request Handler ───────────────────────────────────────────────────────────
function handler(req, res) {
  const reqUrl = new URL(req.url, 'http://localhost');
  const p = reqUrl.pathname;
  const parsed = { query: Object.fromEntries(reqUrl.searchParams) };

  // CORS / no-cache
  res.setHeader('Access-Control-Allow-Origin', '*');

  // ── API: list all .md documents ─────────────────────────────────────────────
  if (p === '/api/documents') {
    const docs = scanMarkdownFiles(ROOT_DIR).sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(docs));
    return;
  }

  // ── API: read one document ───────────────────────────────────────────────────
  if (p === '/api/document') {
    const docPath = parsed.query.path;
    if (!docPath) { res.writeHead(400); res.end('Missing path'); return; }
    const abs = path.resolve(ROOT_DIR, docPath);
    if (!isUnderRoot(abs)) { res.writeHead(403); res.end('Forbidden'); return; }
    if (!fs.existsSync(abs)) { res.writeHead(404); res.end('Not found'); return; }
    const content = fs.readFileSync(abs, 'utf-8');
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-File-Mtime': String(fs.statSync(abs).mtimeMs),
      'Cache-Control': 'no-cache',
    });
    res.end(content);
    return;
  }

  // ── API: serve image / asset from the scanned repo ──────────────────────────
  if (p.startsWith('/api/image')) {
    const imgPath = parsed.query.path;
    if (!imgPath) { res.writeHead(400); res.end('Missing path'); return; }
    const abs = path.resolve(ROOT_DIR, imgPath);
    if (!isUnderRoot(abs)) { res.writeHead(403); res.end('Forbidden'); return; }
    if (!fs.existsSync(abs)) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(abs);
    const ct = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'public, max-age=3600' });
    fs.createReadStream(abs).pipe(res);
    return;
  }

  // ── Serve index.html for root ────────────────────────────────────────────────
  if (p === '/' || p === '/index.html') {
    servePackageFile('index.html', res);
    return;
  }

  // ── Fallback: serve static assets from package dir ──────────────────────────
  servePackageFile(p.replace(/^\//, ''), res);
}

// ─── Port finder ───────────────────────────────────────────────────────────────
function findFreePort(start, cb, attempt = 0) {
  if (attempt >= 10) { cb(null); return; }
  const port = start + attempt;
  const srv = http.createServer();
  srv.listen(port, () => { srv.close(() => cb(port)); });
  srv.on('error', () => findFreePort(start, cb, attempt + 1));
}

// ─── Launch ────────────────────────────────────────────────────────────────────
const preferredPort = parseInt(process.argv[2], 10) || 8080;

findFreePort(preferredPort, (port) => {
  if (!port) {
    console.error('❌  Could not find a free port.');
    process.exit(1);
  }

  if (port !== preferredPort) {
    console.warn(`⚠️  Port ${preferredPort} in use — using ${port} instead.`);
  }

  const server = http.createServer(handler);
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║  📚  Markdown Viewer                                     ║
║                                                          ║
║  Scanning: ${ROOT_DIR.padEnd(42)}  ║
║                                                          ║
║  → ${url.padEnd(51)}  ║
║                                                          ║
║  Press Ctrl+C to stop                                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);

    // Try to open in browser (best-effort, no hard dependency)
    const opener = process.platform === 'darwin' ? 'open'
      : process.platform === 'win32' ? 'start'
      : 'xdg-open';
    require('child_process').exec(`${opener} ${url}`);
  });

  process.on('SIGINT', () => {
    console.log('\n\n✓ Server stopped');
    server.close();
    process.exit(0);
  });
});
