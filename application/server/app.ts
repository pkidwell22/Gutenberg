import express, { type ErrorRequestHandler, type Response } from 'express';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';
import { applicationRoot, repositoryRoot } from './corpus.js';
import { readLibrary } from './library.js';
import { readCommentaryCatalog, readCommentaryWork, searchCommentaries, validCommentaryId } from './commentaries.js';

interface AppOptions { port?: number; corpusRoot?: string; distRoot?: string }
const unavailable = (response: Response) => response.status(503).json({ error: 'Database unavailable' });
const notFound = (response: Response) => response.status(404).json({ error: 'Not found' });

/** Resolve symlinks as well as traversal before serving any file. Never list directories. */
async function containedFile(root: string, relative: string): Promise<string | null> {
  if (!relative || relative.includes('\\') || relative.includes('\0') ||
      relative.split('/').some(part => !part || part === '..' || part.startsWith('.'))) return null;
  try {
    const base = await realpath(root);
    const filename = await realpath(path.resolve(base, relative));
    if (!filename.startsWith(`${base}${path.sep}`) || !(await stat(filename)).isFile()) return null;
    return filename;
  } catch { return null; }
}

export function createApp(pool: Pool, options: AppOptions = {}) {
  const app = express();
  const corpusRoot = options.corpusRoot ?? repositoryRoot;
  const distRoot = options.distRoot ?? path.join(applicationRoot, 'dist');
  const ports = new Set([64817, 64818, 64819, options.port ?? 64819]);
  const hosts = new Set([...ports].flatMap(port => [`127.0.0.1:${port}`, `localhost:${port}`]));
  const origins = new Set([...hosts].map(host => `http://${host}`));
  app.disable('x-powered-by');
  app.disable('etag');
  app.use((request, response, next) => {
    response.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
    if (!hosts.has(request.headers.host ?? '') ||
        (request.headers.origin !== undefined && !origins.has(request.headers.origin)) ||
        request.headers['sec-fetch-site'] === 'cross-site') {
      response.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.set('Allow', 'GET, HEAD').status(405).json({ error: 'Method not allowed' });
      return;
    }
    next();
  });
  app.get('/api/health', async (_request, response) => {
    response.set('Cache-Control', 'no-store');
    try {
      // A working TCP connection alone is not readiness: verify the imported, readable schema.
      await readLibrary(pool);
      response.json({ ok: true, database: 'ready' });
    } catch { unavailable(response); }
  });
  app.get('/api/library', async (_request, response) => {
    response.set('Cache-Control', 'no-store');
    try { response.json(await readLibrary(pool)); }
    catch { unavailable(response); }
  });
  app.get('/api/commentaries', async (_request, response) => {
    response.set('Cache-Control', 'no-store');
    try { response.json(await readCommentaryCatalog(pool)); }
    catch { unavailable(response); }
  });
  app.get('/api/commentaries/search', async (request, response) => {
    response.set('Cache-Control', 'no-store');
    const query = request.query.q ?? '';
    const work = request.query.work;
    if (typeof query !== 'string' || query.length > 500 || query.includes('\0') || (work !== undefined && !validCommentaryId(work))) {
      response.status(400).json({ error: 'Invalid commentary search' }); return;
    }
    try { response.json(await searchCommentaries(pool, query, work)); }
    catch { unavailable(response); }
  });
  app.get('/api/commentaries/:workId', async (request, response) => {
    response.set('Cache-Control', 'no-store');
    if (!validCommentaryId(request.params.workId)) { response.status(400).json({ error: 'Invalid work ID' }); return; }
    try {
      const work = await readCommentaryWork(pool, request.params.workId);
      if (!work) { notFound(response); return; }
      response.json(work);
    } catch { unavailable(response); }
  });
  app.use(async (request, response) => {
    let relative: string;
    try { relative = decodeURIComponent(request.path).slice(1); }
    catch { notFound(response); return; }
    if (relative.startsWith('api/')) { notFound(response); return; }
    if (/^(raw|notes)(\/|$)/.test(relative)) {
      // The two corpora are independently available. Missing commentary tables must
      // never disable original source links, nor must unimported Scripture block works.
      const [libraryResult, commentaryResult] = await Promise.allSettled([readLibrary(pool), readCommentaryCatalog(pool)]);
      if (libraryResult.status === 'rejected' && commentaryResult.status === 'rejected') { unavailable(response); return; }
      const library = libraryResult.status === 'fulfilled' ? libraryResult.value : null;
      const catalog = commentaryResult.status === 'fulfilled' ? commentaryResult.value : null;
      const allowed = new Set([
        ...(library?.sources ?? []).flatMap(source => [source.localPath, source.metadataPath]).filter((p): p is string => typeof p === 'string' && p.startsWith('raw/')),
        ...(library?.notes ?? []).map(note => note.localPath).filter(p => p.startsWith('notes/')),
        ...(catalog?.works ?? []).map(work => work.localPath).filter(p => p.startsWith('raw/')),
      ]);
      if (!allowed.has(relative)) { notFound(response); return; }
      const [folder, ...rest] = relative.split('/');
      const filename = await containedFile(path.join(corpusRoot, folder), rest.join('/'));
      if (!filename) { notFound(response); return; }
      // Frozen third-party HTML metadata is evidence, not executable application content.
      response.set('Content-Security-Policy', "default-src 'none'; sandbox; frame-ancestors 'none'");
      response.sendFile(filename);
      return;
    }
    const filename = await containedFile(distRoot, relative || 'index.html');
    if (!filename) { notFound(response); return; }
    response.sendFile(filename);
  });
  const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
    if (response.headersSent) { response.destroy(); return; }
    if (error instanceof URIError && request.path.startsWith('/api/commentaries/')) {
      response.status(400).json({ error: 'Invalid commentary path' }); return;
    }
    response.status(500).json({ error: 'Request failed' });
  };
  app.use(errorHandler);
  return app;
}
