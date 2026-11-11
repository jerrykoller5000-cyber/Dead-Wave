import fs from 'node:fs';
import crypto from 'node:crypto';

const path = 'world/training.js';
const expected = '86709422D0FB3194056F42036AD4D003E87B8BA59D18CF7BF674B38AA8F1E16E';
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const original = fs.readFileSync(path);
if (hash(original) !== expected) throw Error('Source changed; re-read and merge');
const oldText = original.toString('utf8');
const before = ['0, 0.925, 0.05, pivot', 's * 0.35, 0.955, 0.05, pivot', '0, 1.10, 0.081, pivot', '0, 0.56, 0.081, pivot'];
const after = ['0, 0.925, 0.02, pivot', 's * 0.35, 0.955, 0.02, pivot', '0, 1.10, 0.051, pivot', '0, 0.56, 0.051, pivot'];
let next = oldText;
for (let i = 0; i < before.length; i++) {
  if (!next.includes(before[i]) || next.indexOf(before[i]) !== next.lastIndexOf(before[i])) throw Error('Expected exact backing piece once');
  next = next.replace(before[i], after[i]);
}
const out = Buffer.from(next, 'utf8');
if (out.length !== original.length) throw Error('Edit must preserve byte length');
const handle = fs.openSync(path, 'r+');
try {
  const current = Buffer.alloc(original.length);
  fs.readSync(handle, current, 0, current.length, 0);
  if (hash(current) !== expected) throw Error('Source changed before save');
  fs.writeSync(handle, out, 0, out.length, 0);
} finally { fs.closeSync(handle); }
console.log('Backing returned to collision-safe geometry');
