import fs from 'node:fs';
import crypto from 'node:crypto';

const path = 'world/training.js';
const original = fs.readFileSync(path, 'utf8');
const digest = crypto.createHash('sha256').update(original).digest('hex').toUpperCase();
if (digest !== '67973F0AE5E918B46AB050D9CBE2BE5C9206FE683156122E19F71D0AC2D94A85') throw Error('Source changed; re-read and merge');
const before = "box(0.035, 0.26, 0.016, steelLight, 0, 0.29, -0.008, pivot).name = 'target-lower-stem';";
const after = "box(0.035, 0.32, 0.009, steelLight, 0, 0.20, 0, pivot).name = 'target-lower-stem';";
if (!original.includes(before) || original.indexOf(before) !== original.lastIndexOf(before)) throw Error('Expected stem once');
const handle = fs.openSync(path, 'r+');
try {
  const current = Buffer.alloc(fs.fstatSync(handle).size);
  fs.readSync(handle, current, 0, current.length, 0);
  if (crypto.createHash('sha256').update(current).digest('hex').toUpperCase() !== digest) throw Error('Source changed before save');
  const buffer = Buffer.from(original.replace(before, after), 'utf8');
  fs.writeSync(handle, buffer, 0, buffer.length, 0);
  fs.ftruncateSync(handle, buffer.length);
} finally { fs.closeSync(handle); }
console.log('Stem now joins axle to backing');
