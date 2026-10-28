// tools/sweep/run.mjs — CL-255: run an in-page sweep script in the game (real three.js) and save what it returns.
//   node tools/sweep/run.mjs <script.js> [--out file.json] [--soft] [--match] [--show]
// The script is an async expression evaluated in the page after the title (window.TT up, the opening dismissed,
// tools/tests/lib.js loaded); with --match a hunt is started first (startMatch). Whatever it returns is written to
// --out as JSON (or printed); --prep starts a hunt and stops in its prep phase. One game instance, like every check (AGENTS.md rule 16): on Jerry's PC go through the slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../serve.mjs';
import { launch } from '../cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
const script = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1] === '--out'));
if (!script) { console.log('usage: node tools/sweep/run.mjs <script.js> [--out file.json] [--soft] [--match] [--show]'); process.exit(2); }
const soft = argv.includes('--soft'), show = argv.includes('--show'), match = argv.includes('--match'), prep = argv.includes('--prep');
// The page: index.html with one small module ahead of the game's that writes down, for every object added straight
// to the scene, the call stack that added it (userData.sweepSite): the builder's function, file and line. It sits on
// the import map's closing line, so the game's own line numbers don't move.
const PAGE = `.sweep-${process.pid}.html`;
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  // The game's module (CL-269: something now stands between it and the import map, so the patch goes at the end of
  // the line before the game's module, which keeps the line numbers).
  const tag = '\n  <script type="module">\n    import * as THREE from \'three\';';
  if (!html.includes(tag)) { console.error('sweep: the game module\'s first lines moved; update tools/sweep/run.mjs'); process.exit(2); }
  const patch = `<script type="module">import * as S from 'three'; const add = S.Object3D.prototype.add; S.Object3D.prototype.add = function (...o) { if (this.isScene) { const st = new Error().stack; for (const c of o) if (c && c.userData && !c.userData.sweepSite) c.userData.sweepSite = st; } return add.apply(this, o); };</script>`;
  fs.writeFileSync(path.join(ROOT, PAGE), html.replace(tag, patch + tag));
}
process.on('exit', () => { try { fs.unlinkSync(path.join(ROOT, PAGE)); } catch { /* gone */ } });
const server = await serve(ROOT, 0);
const browser = await launch({ headless: soft, args: soft ? [] : ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const page = await browser.newPage({ width: 1280, height: 720 });
if (!soft && !show) {
  try { const { windowId } = await page.send('Browser.getWindowForTarget', {}); await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } }); } catch { /* stays */ }
}
const t0 = Date.now();
let result, code = 0;
try {
  await page.goto(`${server.origin}/${PAGE}?debug=1&cull=0&raf=timer${soft ? '&renderer=webgl' : ''}`, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8'));
  if (match) await page.evaluate(`startMatch(window.TT, 'Sweep').then(() => true)`, 900000);
  // --prep: a hunt started and in its prep phase (the match-only props are up: the generator, the day missions'
  // pieces), without waiting out the insertion flight, which takes minutes on a software renderer.
  if (prep && !match) await page.evaluate(`(async () => { const T = window.TT, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const n = document.getElementById('playerName'); if (n) n.value = 'Sweep';
    const play = document.getElementById('modeHunt'); if (play) play.click();
    const fr = document.getElementById('firstRunCard'), pa = document.getElementById('firstRunPlay'); if (fr && !fr.hidden && pa) pa.click();
    for (let i = 0; i < 1200; i++) { await wait(250); if (T.getPhase && T.getPhase() === 'prep') break; }
    await wait(8000); return T.getPhase && T.getPhase(); })()`, 900000);
  const src = fs.readFileSync(path.resolve(script), 'utf8');
  result = await page.evaluate(src, 900000);
} catch (e) { result = { error: String(e.message || e) }; code = 1; }
const text = typeof result === 'string' ? result : JSON.stringify(result, null, 1);
if (opt('out')) { fs.writeFileSync(opt('out'), text); console.log(`wrote ${opt('out')} (${text.length} bytes) in ${((Date.now() - t0) / 1000).toFixed(0)} s`); }
else console.log(text);
if (page.errors && page.errors.length) console.log('page errors: ' + page.errors.slice(0, 3).join(' | '));
try { await page.send('Page.close', {}); } catch { /* gone */ }
await browser.close?.(); server.close?.();
process.exit(code);
