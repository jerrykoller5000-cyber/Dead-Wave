// tools/tests/cb360-sheet-tiles.mjs (Claude 2, CB-360): camera.mjs check reads each subject's tile back off its sheet and fails a blank
// one. This makes a sheet as DWInspect.contactSheet does (dark #111 ground, a label strip under each tile) with four tiles: a
// picture, a dark night picture, one never drawn, one black copy; and runs camera.mjs's own SHEET_TILES_JS on it in Chrome.
// Expect: the two pictures pass, the two blanks fail. No game is loaded (not a game test): node tools/tests/cb360-sheet-tiles.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = fs.readFileSync(path.join(ROOT, 'tools', 'camera.mjs'), 'utf8');
const m = src.match(/const SHEET_TILES_JS = `([\s\S]*?)`;\n/); if (!m) { console.log('FAIL SHEET_TILES_JS not found in tools/camera.mjs'); process.exit(1); }
const blankRule = (t) => !t ? 'unread' : t.max <= 8 ? 'black' : t.spread < 1.5 ? 'flat' : null;   // as camera.mjs check
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools', 'cdp.mjs')).href);
const browser = await launch({ headless: true }), page = await browser.newPage({ width: 800, height: 600 });
await page.goto('about:blank');
const make = `(() => { const cols = 4, tile = 200, th = 112, c = document.createElement('canvas'); c.width = cols * tile; c.height = th + 30; const g = c.getContext('2d');
  g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
  const draw = (i, f) => { const x = i * tile, y = 30; f(x, y); g.fillStyle = '#000b'; g.fillRect(x, y + th - 22, tile, 22); g.fillStyle = '#f4ecd0'; g.font = '600 12px Arial'; g.fillText('subject ' + i, x + 6, y + th - 7); };
  draw(0, (x, y) => { const gr = g.createLinearGradient(x, y, x + tile, y + th); gr.addColorStop(0, '#6a7f95'); gr.addColorStop(1, '#c9b48a'); g.fillStyle = gr; g.fillRect(x, y, tile, th); g.fillStyle = '#3b2f2a'; g.beginPath(); g.ellipse(x + 100, y + 50, 30, 40, 0, 0, 7); g.fill(); });
  draw(1, (x, y) => { g.fillStyle = '#05070a'; g.fillRect(x, y, tile, th); g.fillStyle = '#1c2230'; g.beginPath(); g.ellipse(x + 100, y + 50, 30, 40, 0, 0, 7); g.fill(); g.fillStyle = '#9fe870'; g.fillRect(x + 92, y + 35, 4, 3); g.fillRect(x + 104, y + 35, 4, 3); });
  draw(2, () => {});   /* never drawn: the sheet's ground */
  draw(3, (x, y) => { g.fillStyle = '#000'; g.fillRect(x, y, tile, th); });
  return c.toDataURL('image/jpeg', 0.86); })()`;
const data = await page.evaluate(make);
const tiles = await page.evaluate(`${m[1]}(${JSON.stringify(data)}, 4, 4, 200)`);
const want = [null, null, 'flat', 'black|flat'], out = []; let bad = 0;
tiles.forEach((t, i) => { const got = blankRule(t), good = want[i] === null ? got === null : !!got && want[i].split('|').includes(got); if (!good) bad++; out.push(`${good ? 'PASS' : 'FAIL'} tile ${i}: ${JSON.stringify(t)} -> ${got || 'a picture'} (want ${want[i] || 'a picture'})`); });
console.log(out.join('\n')); console.log(bad ? `${bad} wrong` : 'every tile judged right');
await browser.close?.(); process.exit(bad ? 1 : 0);
