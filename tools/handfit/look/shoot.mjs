// node shoot.mjs <export.json under /home/claude> <out.png> [views comma]  -> a 3x? sheet of views
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright'); import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = '/home/claude';
const srv = http.createServer((q, s) => { const p = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname)); try { const b = fs.readFileSync(p); s.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/json' }); s.end(b); } catch { s.writeHead(404); s.end(); } }).listen(0);
const port = srv.address().port;
const [f, out, vs, hl] = process.argv.slice(2); const views = (vs || 'eye,front,below,left,fl,br').split(',');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 900, height: 900 } }); pg.on('pageerror', (e) => console.log('ERR', String(e)));
await pg.goto(`http://127.0.0.1:${port}/look/v/view.html?f=/${path.relative(ROOT, f)}&hl=${hl || ''}&focus=${process.env.FOCUS || ''}&zoom=${process.env.ZOOM || 1}&nogun=${process.env.NOGUN || ''}&dbl=${process.env.DBL || ''}`); await pg.waitForFunction(() => window.ready, null, { timeout: 60000 });
const files = [];
for (const v of views) { await pg.evaluate((v) => window.shot(v), v); const fn = out.replace(/\.png$/, '') + '-' + v + '.png'; await pg.screenshot({ path: fn }); files.push(fn); }
await b.close(); srv.close(); console.log(files.join(' '));
