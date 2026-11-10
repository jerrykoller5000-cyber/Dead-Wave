// CL-334 c: node tools/hand-bake.mjs -- builds the first-person hand's one surface (studio/marine-hand.js) and writes it
// to studio/marine-hand-bake.js, so the game doesn't build it at load (about half a second). Run it after any change to the
// hand's shape: the game ignores a bake whose signature no longer matches the code (and builds the hand itself).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const M = await import(new URL('../studio/marine-hand.js', import.meta.url));
const t0 = Date.now();
const K = M.bakeHandSurface();
const out = path.join(ROOT, 'studio/marine-hand-bake.js');
const body = '// CL-334 c: written by tools/hand-bake.mjs (the first-person hand\'s surface, built ahead). Do not edit: run the tool.\n' +
  '// ' + K.main.verts + ' vertices, ' + K.main.tris + ' triangles (and the glove\'s pieces, the nails); signature ' + K.sig + '.\n' +
  'export const HAND_BAKE = ' + JSON.stringify(K).replace(/,"/g, ',\n  "') + ';\n';
fs.writeFileSync(out, body);
// CL-334 g: the detail maps
const { paintHandDetail, encodePNG } = await import('./hand-detail.mjs');
const info = M.handDetailInfo(), dir = path.join(ROOT, 'assets/hand');
fs.mkdirSync(dir, { recursive: true });
for (const kind of ['skin', 'glove']) {
  const t1 = Date.now(), m = paintHandDetail(info, kind);
  for (const [name, buf] of [['normal', m.normal], ['colour', m.colour]]) fs.writeFileSync(path.join(dir, `hand-${kind}-${name}.png`), encodePNG(m.W, m.H, buf));
  console.log('hand detail:', kind, m.W + 'x' + m.H, Date.now() - t1, 'ms');
}
console.log('hand bake:', K.main.verts, 'vertices,', K.main.tris, 'triangles,', (body.length / 1024).toFixed(0), 'KB,', Date.now() - t0, 'ms ->', path.relative(ROOT, out));
