import fs from 'node:fs';
import crypto from 'node:crypto';

const path = 'world/training.js';
const expected = 'A8F5D8C10FDBF61F08AF039B85AAD00F05F2E85E5E150D0D2462E384770622F5';
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const original = fs.readFileSync(path);
if (hash(original) !== expected) throw Error('Source changed; re-read and merge');
const before = 'metalness: 0.2, side: T.DoubleSide });';
const after = 'metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, side: T.DoubleSide });';
let next = original.toString('utf8');
if (!next.includes(before) || next.indexOf(before) !== next.lastIndexOf(before)) throw Error('Expected plate material once');
next = next.replace(before, after);
const out = Buffer.from(next, 'utf8');
const handle = fs.openSync(path, 'r+');
try {
  const current = Buffer.alloc(original.length);
  fs.readSync(handle, current, 0, current.length, 0);
  if (hash(current) !== expected) throw Error('Source changed before save');
  fs.writeSync(handle, out, 0, out.length, 0);
} finally { fs.closeSync(handle); }
console.log('Plate depth biased forward to avoid backing coplanarity');
