import fs from 'node:fs';
import crypto from 'node:crypto';

const path = 'world/training.test.mjs';
const original = fs.readFileSync(path, 'utf8');
const digest = crypto.createHash('sha256').update(original).digest('hex').toUpperCase();
if (digest !== 'F44FD25126B47F83396834AA4ED0BC5C00422ED31F774F75732D9BE8EF257045') throw Error('Source changed; re-read and merge');
let updated = original;
const replacements = [
  ["  const tg = buildTrainingGround(T);\r\n  for (const target of tg.targets) {",
   "  const tg = buildTrainingGround(T);\r\n  const depth = m => m.geometry.parameters.depth ?? m.geometry.parameters[2];\r\n  const height = m => m.geometry.parameters.height ?? m.geometry.parameters[1];\r\n  for (const target of tg.targets) {"],
  ["      const p = m.geometry.parameters;\r\n      assert.ok(m.position.z - p.depth / 2 >= -1e-9,",
   "      assert.ok(m.position.z - depth(m) / 2 >= -1e-9,"],
  ["bars[0].geometry.parameters.depth / 2", "depth(bars[0]) / 2"],
  ["rails[0].geometry.parameters.depth / 2", "depth(rails[0]) / 2"],
  ["        const p = m.geometry.parameters;\r\n        const yMin = m.position.y - p.height / 2, zMin = m.position.z - p.depth / 2, zMax = m.position.z + p.depth / 2;",
   "        const yMin = m.position.y - height(m) / 2, zMin = m.position.z - depth(m) / 2, zMax = m.position.z + depth(m) / 2;"]
];
const newline = original.includes('\r\n') ? '\r\n' : '\n';
for (let [a, b] of replacements) {
  a = a.replaceAll('\r\n', newline);
  b = b.replaceAll('\r\n', newline);
  if (!updated.includes(a) || updated.indexOf(a) !== updated.lastIndexOf(a)) throw Error(`Expected replacement once: ${a}`);
  updated = updated.replace(a, b);
}
const handle = fs.openSync(path, 'r+');
try {
  const current = Buffer.alloc(fs.fstatSync(handle).size);
  fs.readSync(handle, current, 0, current.length, 0);
  if (crypto.createHash('sha256').update(current).digest('hex').toUpperCase() !== digest) throw Error('Source changed before save');
  const buffer = Buffer.from(updated, 'utf8');
  fs.writeSync(handle, buffer, 0, buffer.length, 0);
  fs.ftruncateSync(handle, buffer.length);
} finally { fs.closeSync(handle); }
console.log('Test block updated');
