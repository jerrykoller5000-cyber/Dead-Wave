// tools/package.mjs — CU-57 (P-89): the game as it ships. Copies exactly what the game loads into dist/dead-wave/
// (no qa/, review/, handoffs/, docs/, crew/, tools/, tests, browser checks, Jerry's WAV originals) and checks the copy by
// serving it and booting the title: it must come up with window.TT, no missing file and no page error.
//
//   node tools/package.mjs                 stage into dist/dead-wave and check it
//   node tools/package.mjs --no-check      stage only
//   node tools/package.mjs --out <dir>     somewhere else
//   node tools/package.mjs --list          the files that would go, with sizes by folder
//
// The desktop shell (desktop/, Tauri) takes dist/dead-wave as its frontend. The browser build stays as it is: the folder
// itself, run by "Play Dead-Wave.bat". The version is package.json's, written into dist/dead-wave/version.json and
// core/version.js reads it at boot (the title shows it).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const oi = argv.indexOf('--out');
const OUT = path.resolve(ROOT, oi >= 0 ? argv[oi + 1] : path.join('dist', 'dead-wave'));

// What goes: the entry page and the folders it imports from. Nothing else in the root.
const FILES = ['index.html'];
const DIRS = ['assets', 'core', 'game', 'studio', 'ui', 'vendor', 'world'];
// What stays behind inside those folders: tests and browser checks, scratch, and the soundtrack's originals.
const SKIP_FILE = [/\.test\.mjs$/i, /\.browser\.mjs$/i, /\.md$/i, /^\.tmp-/, /\.bak$/i, /\.wav$/i];
const SKIP_DIR = [/^incoming$/i, /^node_modules$/i, /^\.git$/i];

function walk(dir, rel, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel + '/' + e.name;
    if (e.isDirectory()) { if (!SKIP_DIR.some((re) => re.test(e.name))) walk(path.join(dir, e.name), r, out); }
    else if (!SKIP_FILE.some((re) => re.test(e.name))) out.push(r);
  }
}

const files = [...FILES];
for (const d of DIRS) { const p = path.join(ROOT, d); if (fs.existsSync(p)) walk(p, d, files); }
const size = (f) => fs.statSync(path.join(ROOT, f)).size;
const byDir = new Map();
let total = 0;
for (const f of files) { const d = f.includes('/') ? f.split('/')[0] : '(root)'; byDir.set(d, (byDir.get(d) || 0) + size(f)); total += size(f); }
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';

if (argv.includes('--list')) {
  for (const [d, n] of byDir) console.log(d.padEnd(10), mb(n));
  console.log('total'.padEnd(10), mb(total), `(${files.length} files)`);
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
fs.rmSync(OUT, { recursive: true, force: true });
for (const f of files) {
  const to = path.join(OUT, f);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(ROOT, f), to);
}
fs.writeFileSync(path.join(OUT, 'version.json'), JSON.stringify({ version: pkg.version, built: new Date().toISOString() }, null, 2) + '\n');
console.log(`package: ${files.length} files, ${mb(total)} -> ${path.relative(ROOT, OUT)} (version ${pkg.version})`);
for (const [d, n] of byDir) console.log('  ' + d.padEnd(10), mb(n));

if (argv.includes('--no-check')) process.exit(0);

// The check: serve the copy, boot it in headless Chrome, and see what it asked for that was not there.
const { serve } = await import('./serve.mjs');
const { launch } = await import('./cdp.mjs');
const server = await serve(OUT, 0);
const browser = await launch({ headless: true });
const page = await browser.newPage({ width: 1280, height: 720 });
let bad = 0;
try {
  const missing = [];
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`);
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  const up = await page.waitFor('!!window.TT', { timeout: 300000 });
  if (!up) throw new Error('window.TT never appeared in the packaged copy: ' + (page.errors[0] || 'no page error').split('\n')[0]);
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  // Into a match and a night: the scripts and sounds the title doesn't need.
  await page.evaluate(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'Package'; document.getElementById('modeHunt').click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 60000 });
  await page.evaluate('new Promise(r => setTimeout(r, 4000))');
  // Every file the page fetched, from the browser's own record.
  const urls = await page.evaluate(`performance.getEntriesByType('resource').map((e) => e.name)`);
  const paths = [...new Set(urls.map((u) => { try { return new URL(u).pathname.slice(1); } catch { return ''; } }).filter(Boolean))];
  for (const p of paths) if (!fs.existsSync(path.join(OUT, decodeURIComponent(p)))) missing.push(p);
  const version = await page.evaluate(`(document.getElementById('gameVersion') || {}).textContent || ''`);
  console.log(`check: title and a match came up from the copy; ${paths.length} files fetched; version on the title: ${JSON.stringify(version)}`);
  if (missing.length) { bad++; console.log('MISSING from the copy:\n  ' + missing.join('\n  ')); }
  if (page.errors.length) { bad++; console.log('page errors:\n  ' + page.errors.slice(0, 6).map((e) => e.split('\n')[0]).join('\n  ')); }
  if (!version.includes(pkg.version)) { bad++; console.log(`the title does not show the version ${pkg.version}`); }
} catch (e) {
  bad++;
  console.log('check failed: ' + (e && e.message || e));
} finally {
  await browser.close();
  await server.close();
}
console.log(bad ? 'package: CHECK FAILED' : 'package: ok');
process.exit(bad ? 1 : 0);
