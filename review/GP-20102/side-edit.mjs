import fs from 'node:fs';
import crypto from 'node:crypto';

const path = 'world/training.js';
const original = fs.readFileSync(path, 'utf8');
const digest = crypto.createHash('sha256').update(original).digest('hex').toUpperCase();
if (digest !== 'B7BC6C5B5A1EE8B83274477131555E8DFC47078F79A1324A0F2F071FA9B93399') throw Error('Source changed; re-read and merge');
const before = "for (const s of [-1, 1]) box(0.045, 1.13, 0.04, steelLight, s * 0.35, 0.925, 0.02, pivot).name = 'target-backing-side';";
const after = "for (const s of [-1, 1]) box(0.045, 1.07, 0.04, steelLight, s * 0.35, 0.955, 0.02, pivot).name = 'target-backing-side';";
if (before.length !== after.length || !original.includes(before) || original.indexOf(before) !== original.lastIndexOf(before)) throw Error('Unexpected edit shape');
const handle = fs.openSync(path, 'r+');
try {
  const current = Buffer.alloc(fs.fstatSync(handle).size);
  fs.readSync(handle, current, 0, current.length, 0);
  if (crypto.createHash('sha256').update(current).digest('hex').toUpperCase() !== digest) throw Error('Source changed before save');
  const buffer = Buffer.from(original.replace(before, after), 'utf8');
  fs.writeSync(handle, buffer, 0, buffer.length, 0);
} finally { fs.closeSync(handle); }
console.log('Side uprights now end at silhouette foot');
