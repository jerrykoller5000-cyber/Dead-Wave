import fs from 'node:fs';
import crypto from 'node:crypto';

const path = 'world/training.js';
const original = fs.readFileSync(path, 'utf8');
const digest = crypto.createHash('sha256').update(original).digest('hex').toUpperCase();
if (digest !== '634BBB01E3B940EDB19E4DE933C13A5285B18F8E8273BB31809B4F3752B4F1A9') throw Error('Source changed; re-read and merge');
const before = `    box(0.035, 0.26, 0.016, steelLight, 0, 0.29, -0.008, pivot);
    box(0.06, 1.13, 0.04, steelLight, 0, 0.925, 0.02, pivot);
    for (const s of [-1, 1]) box(0.045, 1.13, 0.04, steelLight, s * 0.35, 0.925, 0.02, pivot);
    box(0.78, 0.04, 0.022, steelLight, 0, 1.10, 0.051, pivot);
    box(0.78, 0.04, 0.022, steelLight, 0, 0.45, 0.051, pivot);`;
const after = `    box(0.035, 0.26, 0.016, steelLight, 0, 0.29, -0.008, pivot).name = 'target-lower-stem';
    box(0.06, 1.13, 0.04, steelLight, 0, 0.925, 0.02, pivot).name = 'target-backing-center';
    for (const s of [-1, 1]) box(0.045, 1.13, 0.04, steelLight, s * 0.35, 0.925, 0.02, pivot).name = 'target-backing-side';
    box(0.78, 0.04, 0.022, steelLight, 0, 1.10, 0.051, pivot).name = 'target-backing-crossbar';
    box(0.78, 0.04, 0.022, steelLight, 0, 0.56, 0.051, pivot).name = 'target-backing-crossbar';`;
const newline = original.includes('\r\n') ? '\r\n' : '\n';
const sourceBlock = before.replaceAll('\n', newline), destBlock = after.replaceAll('\n', newline);
if (!original.includes(sourceBlock) || original.indexOf(sourceBlock) !== original.lastIndexOf(sourceBlock)) throw Error('Expected exact frame block once');
const handle = fs.openSync(path, 'r+');
try {
  const current = Buffer.alloc(fs.fstatSync(handle).size);
  fs.readSync(handle, current, 0, current.length, 0);
  const currentDigest = crypto.createHash('sha256').update(current).digest('hex').toUpperCase();
  if (currentDigest !== digest) throw Error('Source changed before save; re-read and merge');
  const updated = Buffer.from(original.replace(sourceBlock, destBlock), 'utf8');
  fs.writeSync(handle, updated, 0, updated.length, 0);
  fs.ftruncateSync(handle, updated.length);
} finally {
  fs.closeSync(handle);
}
console.log('Frame block updated');
