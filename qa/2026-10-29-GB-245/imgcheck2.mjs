import fs from 'node:fs';
import { readPng, diffPixels } from './png.mjs';
const D = 'qa/2026-10-29-GB-245/tune/rfocus8/f/';
for (const b of ['uzi-g1-u25','uzi-g1-u40','uzi-g2-u25']) {
  const A = readPng(D+b+'-both.png');
  const line = [b];
  for (const k of ['noR','noL','none']) line.push(k + ':' + diffPixels(A, readPng(D+b+'-'+k+'.png')).n);
  console.log(line.join('  '));
}
