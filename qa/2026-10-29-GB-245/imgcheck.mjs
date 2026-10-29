import fs from 'node:fs';
import crypto from 'node:crypto';
import { readPng, diffPixels } from './png.mjs';
const D = 'qa/2026-10-29-GB-245/tune/rfocus7/f/';
const b = 'uzi-g3-u25';
for (const k of ['both','noR','noL','none']) {
  const buf = fs.readFileSync(D + b + '-' + k + '.png');
  console.log(k.padEnd(5) + buf.length + '  ' + crypto.createHash('sha256').update(buf).digest('hex').slice(0,16));
}
const A = readPng(D+b+'-both.png');
for (const k of ['noR','noL','none']) console.log('both vs ' + k + ': ' + diffPixels(A, readPng(D+b+'-'+k+'.png')).n);
console.log('size ' + A.width + 'x' + A.height);
