import fs from 'node:fs';
import crypto from 'node:crypto';

const path = 'world/training.js';
const original = fs.readFileSync(path, 'utf8');
const digest = crypto.createHash('sha256').update(original).digest('hex').toUpperCase();
if (digest !== '28E58E2F024E9127D1DF997D897A98950BCBD2372A864A35F93CA0D0242A9CA8') throw Error('Source changed; re-read and merge');
const needle = "    box(0.78, 0.04, 0.022, steelLight, 0, 0.56, 0.051, pivot).name = 'target-backing-crossbar';";
const addition = "\n    // The backing touches the translucent plate; its own shadow would stripe the target face at distance.\n    for (const part of pivot.children) if (part.name.startsWith('target-backing-')) part.castShadow = false;";
if (!original.includes(needle) || original.indexOf(needle) !== original.lastIndexOf(needle)) throw Error('Expected exact crossbar once');
const handle = fs.openSync(path, 'r+');
try {
  const current = Buffer.alloc(fs.fstatSync(handle).size);
  fs.readSync(handle, current, 0, current.length, 0);
  if (crypto.createHash('sha256').update(current).digest('hex').toUpperCase() !== digest) throw Error('Source changed before save');
  const buffer = Buffer.from(original.replace(needle, needle + addition.replaceAll('\n', original.includes('\r\n') ? '\r\n' : '\n')), 'utf8');
  fs.writeSync(handle, buffer, 0, buffer.length, 0);
} finally { fs.closeSync(handle); }
console.log('Backing shadow disabled on translucent target face');
