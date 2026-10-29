import fs from 'node:fs';
import { readPng, diffPixels } from './png.mjs';
const D = process.argv[2];
const b = process.argv[3];
const A = readPng(D + '/' + b + '-both.png');
const B = readPng(D + '/' + b + '-noR.png');
const d = diffPixels(A, B);
const W = 40, H = 18, rows = new Array(H).fill(0), cells = Array.from({length: H}, () => new Array(W).fill(0));
const h = A.height, w = A.width;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = (y*w+x)*3;
  if (Math.abs(A.data[i]-B.data[i])>8||Math.abs(A.data[i+1]-B.data[i+1])>8||Math.abs(A.data[i+2]-B.data[i+2])>8)
    cells[Math.min(H-1, Math.floor(y/h*H))][Math.min(W-1, Math.floor(x/w*W))]++;
}
console.log(b + '  n=' + d.n + ' box ' + d.minX + ',' + d.minY + '-' + d.maxX + ',' + d.maxY);
const max = Math.max(...cells.flat());
for (let r = 0; r < H; r++) console.log('|' + cells[r].map((c) => c === 0 ? ' ' : c > max*0.5 ? '#' : c > max*0.15 ? '+' : '.').join('') + '|');
