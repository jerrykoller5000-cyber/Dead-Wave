import { chromium } from 'playwright';
import fs from 'fs';
const out = process.argv[2] || 'w';
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message, e.stack));
await p.goto('http://localhost:' + (process.env.PORT || 8793) + '/' + (process.env.PAGE || 'test.html') + '?debug=1&raf=timer', { waitUntil: 'load' });
for (let i = 0; i < 80; i++) { if (await p.evaluate('!!window.TT')) break; await p.waitForTimeout(500); }
await p.waitForTimeout(1500);
for (const f of ['renderer.js', 'detail.js', 'waterpreview.js']) await p.addScriptTag({ content: fs.readFileSync(new URL('./' + f, import.meta.url), 'utf8') });
const res = await p.evaluate((VIEWS) => {
  const T = window.TT; const shots = {};
  const sky = [0.53, 0.72, 1.0];
  const O = { physical: true, fog: [0.24, 0.47, 1.0, 190, 640], shade: window.__shade || null, shadeTree: window.__shadeTree || null, shadeWater: window.__shadeWater };
  const near = (x, z, r) => T.trees.filter(t => Math.hypot(t.x - x, t.z - z) < r).map(t => t.group);
  const fol = (x, z, r) => T.foliageChunks.filter(m => { m.geometry.computeBoundingSphere(); const b = m.geometry.boundingSphere; return b && Math.hypot(b.center.x - x, b.center.z - z) < b.radius + r; });
  window.__fishMeshes = () => T.fishes.map(f => f.mesh).filter(Boolean);
  const extras = [];
  T.scene.children.forEach(o => { if (o.userData && (o.userData.bedLife || o.userData.fishLike)) extras.push(o); });
  (window.__fishMeshes ? window.__fishMeshes() : []).forEach(m => extras.push(m));
  const R = (k, cam, w, h) => { const tx = cam.target[0], tz = cam.target[2]; const rr = Math.hypot(cam.pos[0] - tx, cam.pos[2] - tz) + 40; const roots = [T.ground, T.streamGroup, ...near(tx, tz, rr), ...fol(tx, tz, rr), ...extras]; window.__camK = 2 * Math.tan((cam.fov || 30) * Math.PI / 360) / h; shots[k] = window.__render(roots, cam, w, h, sky, O).url; };
  const views = VIEWS.split(',');
  const L = T.LAKE;
  const J = T.getRiverJoin();
  // join point
  const jp = (() => { const s = J; let best = null; return s; })();
  const info = { join: J };
  const pt = (s) => { // approximate river point from exported project: sample along
    return window.__riverPt(s);
  };
  if (views.includes('pond')) R('pond', { pos: [-40, 14, -30], target: [-62, -5, -55], fov: 55 }, 760, 520);
  if (views.includes('dock')) R('dock', { pos: [-70, 6, -55], target: [-92, -3.5, -70], fov: 60 }, 760, 520);
  if (views.includes('mouth')) R('mouth', { pos: [-72, 30, -10], target: [-121, -4, -62], fov: 55 }, 760, 520);
  if (views.includes('mouthlo')) R('mouthlo', { pos: [-100, 4, -40], target: [-124, -4, -72], fov: 55 }, 760, 520);
  if (views.includes('lake')) R('lake', { pos: [-60, 24, -60], target: [-138, -5, -104], fov: 55 }, 760, 520);
  const shorePt = (ang) => { const dx = Math.cos(ang), dz = Math.sin(ang); for (let r = 20; r < 130; r += 0.5) { const x = L.x + dx * r, z = L.z + dz * r; if (T.waterDepthAt(x, z) < 0.05) return [x, z, dx, dz]; } return null; };
  for (const [k, ang] of [['shoreE', 0.2], ['shoreN', 1.9], ['shoreW', 3.3], ['shoreS', 4.6]]) {
    if (!views.includes(k)) continue;
    const q = shorePt(ang); if (!q) continue;
    const [x, z, dx, dz] = q;
    R(k, { pos: [x + dx * 5, T.sampleHeight(x + dx * 5, z + dz * 5) + 2.4, z + dz * 5], target: [x - dx * 7, L.level - 1.2, z - dz * 7], fov: 62 }, 760, 520);
  }
  const rbank = (s, side) => { const p = T.riverProject(0, 0); return null; };
  if (views.includes('fishcam')) { const f = T.fishes[0]; if (f) { const p = f.mesh.position; R('fishcam', { pos: [p.x + 2.5, p.y + 3.2, p.z + 2.5], target: [p.x, p.y, p.z], fov: 55 }, 760, 520); } }
  if (views.includes('shore')) R('shore', { pos: [-86, 2.5, -102], target: [-100, -3.2, -106], fov: 60 }, 760, 520);
  if (views.includes('river')) R('river', { pos: [30, 12, 90], target: [10, 0, 70], fov: 55 }, 760, 520);
  if (views.includes('riverlo')) R('riverlo', { pos: [-30, 5, 70], target: [-52, 0, 48], fov: 60 }, 760, 520);
  if (views.includes('top')) R('top', { pos: [-120, 120, -40], target: [-125, -4, -75], fov: 55 }, 760, 520);
  return { shots, info };
}, process.env.VIEWS || 'mouth,mouthlo,lake,shore,river,riverlo');
for (const [k, url] of Object.entries(res.shots)) fs.writeFileSync(`${out}_${k}.png`, Buffer.from(url.split(',')[1], 'base64'));
console.log(JSON.stringify(res.info));
await b.close();
