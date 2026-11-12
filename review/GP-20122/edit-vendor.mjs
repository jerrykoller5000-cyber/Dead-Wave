import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const file = path.resolve('vendor/three/three.webgpu.js');
const before = fs.readFileSync(file, 'utf8');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
let updated = before;
for (const [key, count] of [['4', 1], ['3', 1], ['2', 2], ['1', 1]]) {
  const oldText = `\t\t_chainKeys$${key}.length = 0;`;
  const newText = `\t\t_chainKeys$${key}.length = 2;`;
  if (updated.split(oldText).length !== count + 1) throw Error(`Expected ${count} vendor ${key} anchors`);
  updated = updated.replaceAll(oldText, newText);
}
const temp = file + '.gp20122.tmp';
fs.writeFileSync(temp, updated, { encoding: 'utf8', flag: 'wx' });
try {
  if (hash(fs.readFileSync(file, 'utf8')) !== hash(before)) throw Error('Vendor changed during edit');
  fs.renameSync(temp, file);
  console.log('Retained vendor two-slot chain-key backing stores');
} finally {
  if (fs.existsSync(temp)) fs.unlinkSync(temp);
}
