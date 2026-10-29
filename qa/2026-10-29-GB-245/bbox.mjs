import fs from 'node:fs';
import { readPng, diffPixels } from './png.mjs';
const DIR = process.argv[2];
const TAG = process.argv[3];
const pair = (a, b) => {
  const A = readPng(a), B = readPng(b);
  const d = diffPixels(A, B);
  const h = A.height;
  let bottom = 0; for (let y = Math.floor(h * 0.72); y < h; y++) bottom += d.rows[y];
  return { n: d.n, x0: d.minX, x1: d.maxX, y0: d.minY, y1: d.maxY, share: d.n ? bottom / d.n : 0 };
};
const files = fs.readdirSync(DIR).filter((f) => f.startsWith(TAG + '-') && f.endsWith('-both.png'));
for (const f of files.sort()) {
  const base = f.replace('-both.png', '');
  const R = pair(DIR + '/' + base + '-both.png', DIR + '/' + base + '-noR.png');
  const L = pair(DIR + '/' + base + '-both.png', DIR + '/' + base + '-noL.png');
  const fmt = (o) => `n${String(o.n).padStart(6)} box ${o.x0},${o.y0}-${o.x1},${o.y1} bot ${(o.share * 100).toFixed(0)}%`;
  console.log(base.padEnd(13) + ' R ' + fmt(R) + '  |  L ' + fmt(L));
}
