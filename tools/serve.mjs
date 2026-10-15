// Static file server for the game folder. The game is native ES modules, so it has to be
// served over http — opening index.html from the filesystem fails on the import map.
//
// Used by tools/shoot.mjs, tools/tests/ and by hand ("node tools/serve.mjs 8971").
// Deliberately dependency-free: the repo has no build step and no runtime packages.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { handleStudioNote, handleInspectNote } from '../studio/notes-endpoint.mjs';   // D-42: the motion lab's notes; CL-196: the inspector's (Claude's)
import { defaultGameTestSlot } from './game-test-slot.mjs';

// Computed once when these modules load: an old server must not claim to be today's code after an edit.
export const INSPECTOR_SERVER_FINGERPRINT = crypto.createHash('sha256')
  .update(fs.readFileSync(fileURLToPath(import.meta.url)))
  .update(fs.readFileSync(fileURLToPath(new URL('../studio/notes-endpoint.mjs', import.meta.url))))
  .digest('hex');

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
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.opus': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

// CL-148: Jerry's recorded zombie takes, relative to z-sounds/ with / separators (tools/zsounds-index.mjs uses it too).
const AUDIO = /\.(mp3|wav|ogg|oga|opus|m4a|aac|flac|webm)$/i;
export function listZSounds(root) {
  const base = path.join(root, 'z-sounds'), out = [];
  const walk = (dir, rel) => {
    let ents = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), r);
      else if (AUDIO.test(e.name) && !/^[._]/.test(e.name)) out.push(r);
    }
  };
  walk(base, '');
  return out.sort();
}

export function serve(root, port = 0) {
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    let pathname, requestUrl;
    try {
      requestUrl = new URL(req.url, 'http://localhost');
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      res.writeHead(400).end('bad url');
      return;
    }
    if (req.method === 'POST' && pathname === '/__studio/note') { handleStudioNote(req, res, base); return; }
    if (req.method === 'POST' && pathname === '/__inspect/note') { handleInspectNote(req, res, base); return; }
    // GP-19919: launchers probe this identity before reusing a port. A foreign listener is never killed.
    if (req.method === 'GET' && pathname === '/__inspect/health') {
      const body = JSON.stringify({ ok: true, service: 'dead-wave-inspector', version: 1, root: base, pid: process.pid, fingerprint: INSPECTOR_SERVER_FINGERPRINT });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(body);
      return;
    }
    if (req.method === 'GET' && pathname === '/__game-test-slot') {
      defaultGameTestSlot.status().then(state => {
        if (res.destroyed) return;
        const body = JSON.stringify({ ok: true, automatic: true, ...state });
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        }).end(body);
      }, error => {
        if (!res.destroyed) {
          res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' })
            .end(JSON.stringify({ ok: false, error: error.message }));
        }
      });
      return;
    }
    if (pathname === '/__zsounds') {   // CL-148: the audio files under z-sounds/ (core/takes.js)
      const body = JSON.stringify({ root: 'z-sounds', files: listZSounds(base) });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(body);
      return;
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const gameBackedHtml =
      pathname === '/index.html' ||
      /^\/tools\/tests\/test(?:-\d+)?\.html$/i.test(pathname) ||
      /^\/studio\/(?:inspector|motion(?:-lab)?)\/.*\.html$/i.test(pathname);
    if (req.method === 'GET' && gameBackedHtml) {
      const token = requestUrl.searchParams.get('__gameTestToken');
      defaultGameTestSlot.assertHeld(token).then(
        () => serveStaticFile(),
        error => {
          if (!res.destroyed) {
            res.writeHead(423, {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-store',
            }).end(`${error.message}\n`);
          }
        },
      );
      return;
    }
    serveStaticFile();

    function serveStaticFile() {
    const file = path.resolve(base, '.' + pathname);
    // Never serve outside the root, however the path is spelled.
    if (file !== base && !file.startsWith(base + path.sep)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    // GP-19919: stream files with byte ranges. Full buffered video responses kept the browser's six
    // HTTP/1 sockets occupied during concurrent preloads, leaving test/inspector modules at Connecting.
    fs.stat(file, (err, stat) => {
      if (res.destroyed) return;
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found: ' + pathname);
        return;
      }
      let start = 0, end = stat.size - 1, status = 200;
      const range = req.method === 'GET' ? req.headers.range : null;
      if (range) {
        const m = /^bytes=(\d*)-(\d*)$/i.exec(String(range).trim());
        let valid = !!m && (m[1] !== '' || m[2] !== '') && stat.size > 0;
        if (valid && m[1] === '') {
          const suffix = Number(m[2]); valid = Number.isSafeInteger(suffix) && suffix > 0;
          if (valid) start = Math.max(0, stat.size - suffix);
        } else if (valid) {
          start = Number(m[1]); end = m[2] === '' ? end : Number(m[2]);
          valid = Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < stat.size;
          if (valid) end = Math.min(end, stat.size - 1);
        }
        if (!valid) { res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', 'Content-Length': 0 }).end(); return; }
        status = 206;
      }
      const headers = {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': Math.max(0, end - start + 1),
        'Accept-Ranges': 'bytes',
        // The tools reload the same files over and over; a cached module would hide edits.
        'Cache-Control': 'no-store'
      };
      if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      res.writeHead(status, headers);
      if (req.method === 'HEAD' || !stat.size) { res.end(); return; }
      const stream = fs.createReadStream(file, { start, end, highWaterMark: 64 * 1024 });
      stream.on('error', (error) => res.destroy(error));
      res.on('close', () => stream.destroy());
      stream.pipe(res);
    });
    }
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
