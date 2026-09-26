// Static file server for the game folder. The game is native ES modules, so it has to be
// served over http — opening index.html from the filesystem fails on the import map.
//
// Used by tools/shoot.mjs, tools/tests/ and by hand ("node tools/serve.mjs 8971").
// Deliberately dependency-free: the repo has no build step and no runtime packages.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleStudioNote } from '../studio/notes-endpoint.mjs';   // D-42: the motion lab's notes (Claude's)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

export function serve(root, port = 0) {
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end('bad url');
      return;
    }
    if (req.method === 'POST' && pathname.startsWith('/__studio/')) { handleStudioNote(req, res, base, pathname); return; }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(base, '.' + pathname);
    // Never serve outside the root, however the path is spelled.
    if (file !== base && !file.startsWith(base + path.sep)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found: ' + pathname);
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': data.length,
        // The tools reload the same files over and over; a cached module would hide edits.
        'Cache-Control': 'no-store'
      });
      res.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const actual = server.address().port;
      resolve({
        port: actual,
        origin: `http://127.0.0.1:${actual}`,
        close: () => new Promise((done) => {
          let settled = false;
          const finish = () => { if (!settled) { settled = true; done(); } };
          if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
          server.close(finish);
          setTimeout(finish, 300);
        })
      });
    });
  });
}

// Run directly: node tools/serve.mjs [port]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const s = await serve(root, Number(process.argv[2]) || 8971);
  console.log(`serving ${root} on ${s.origin}`);
}
