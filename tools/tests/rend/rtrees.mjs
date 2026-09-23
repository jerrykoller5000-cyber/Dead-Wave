import { chromium } from 'playwright';
import fs from 'fs';
const out = process.argv[2] || 't';
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message, e.stack));
p.on('console', m => { if (/^\[R\]/.test(m.text())) console.log(m.text()); });
await p.goto('http://localhost:' + (process.env.PORT || 8793) + '/' + (process.env.PAGE || 'test.html') + '?debug=1&raf=timer', { waitUntil: 'load' });
for (let i = 0; i < 80; i++) { if (await p.evaluate('!!window.TT')) break; await p.waitForTimeout(500); }
await p.addScriptTag({ content: fs.readFileSync(new URL('./renderer.js', import.meta.url), 'utf8') });
await p.addScriptTag({ content: fs.readFileSync(new URL('./detail.js', import.meta.url), 'utf8') });
if (process.env.SETUP) await p.addScriptTag({ content: fs.readFileSync(process.env.SETUP, 'utf8') });
const only = process.env.ONLY || '';
const res = await p.evaluate(async (only) => {
  const T = window.TT; const shots = {};
  const sky = [0.53, 0.72, 1.0];
  const O = { physical: true, fog: [0.24, 0.47, 1.0, 190, 640], shade: window.__shade || null, shadeTree: window.__shadeTree || null };
  const want = (k) => !only || only.split(',').includes(k);
  const R = (k, roots, cam, w, h, o2) => { if (!want(k)) return; window.__camK = 2 * Math.tan((cam.fov || 30) * Math.PI / 360) / h; shots[k] = window.__render(roots, cam, w, h, sky, Object.assign({}, O, o2 || {})).url; };
  // pick one living tree of each kind, medium scale, near spawn
  const kinds = ['pine', 'oak', 'birch', 'autumn'];
  const pick = {};
  for (const k of kinds) {
    const c = T.trees.filter(t => t.kind === k && t.alive && t.scale > 0.95 && t.scale < 1.4).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
    pick[k] = c[0];
  }
  // line them up: render each alone with ground
  for (const k of kinds) {
    const t = pick[k]; if (!t) continue;
    const gy = t.group.position.y, H = t.canopyTop;
    R('tree_' + k, [T.ground, t.group], { pos: [t.x + H * 1.25, gy + H * 0.55, t.z + H * 1.25], target: [t.x, gy + H * 0.48, t.z], fov: 45 }, 520, 620);
  }
  { const t = pick.oak; if (t) { const gy = t.group.position.y; R('close_oak', [T.ground, t.group], { pos: [t.x + 3.2, gy + 2.6, t.z + 3.6], target: [t.x, gy + 3.2, t.z], fov: 60 }, 700, 520); } }
  { const t = pick.birch; if (t) { const gy = t.group.position.y; R('close_birch', [T.ground, t.group], { pos: [t.x + 2.2, gy + 1.8, t.z + 2.6], target: [t.x, gy + 2.2, t.z], fov: 60 }, 700, 520); } }
  // forest vista: all trees within 70m of a wooded spot
  let best = null, bestN = 0;
  for (const t of T.trees) { const n = T.trees.filter(o => Math.hypot(o.x - t.x, o.z - t.z) < 25).length; if (n > bestN && Math.hypot(t.x, t.z) < 150) { bestN = n; best = t; } }
  if (best) {
    const near = T.trees.filter(o => Math.hypot(o.x - best.x, o.z - best.z) < 80).map(o => o.group);
    const gy = T.sampleHeight(best.x + 30, best.z + 30);
    R('forest', [T.ground, ...near], { pos: [best.x + 32, gy + 9, best.z + 32], target: [best.x, T.sampleHeight(best.x, best.z) + 3, best.z], fov: 55 }, 900, 520);
    const all = T.trees.map(o => o.group);
    R('vista', [T.ground, ...all], { pos: [best.x + 60, gy + 30, best.z + 60], target: [best.x, T.sampleHeight(best.x, best.z), best.z], fov: 55 }, 900, 520);
  }
  window.__pick = pick;
  return { shots, bestN, kinds: Object.fromEntries(kinds.map(k => [k, pick[k] ? [pick[k].x.toFixed(1), pick[k].z.toFixed(1), pick[k].scale.toFixed(2)] : null])) };
}, only);
for (const [k, url] of Object.entries(res.shots)) fs.writeFileSync(`${out}_${k}.png`, Buffer.from(url.split(',')[1], 'base64'));
console.log(JSON.stringify({ bestN: res.bestN, kinds: res.kinds }));
await b.close();
