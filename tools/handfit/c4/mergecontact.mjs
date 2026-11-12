// mergecontact.mjs <hand-contacts.js> <cont json> <gun> <side> [--check]: replace one hold's give in place, every other byte kept
import fs from 'node:fs';
const [file, cj, gun, sd] = process.argv.slice(2), check = process.argv.includes('--check');
const src = fs.readFileSync(file, 'utf8');
const a = src.indexOf('export const HAND_CONTACTS_RAW = ') + 'export const HAND_CONTACTS_RAW = '.length, b = src.indexOf('};\n', a) + 1;
const all = JSON.parse(src.slice(a, b));
const fmt = (o) => JSON.stringify(o, null, 0).replace(/\},"/g, '},\n  "');
if (fmt(all) !== src.slice(a, b)) { console.error('format differs: not touching'); process.exit(1); }
if (check) { console.log('format ok'); process.exit(0); }
const pack = (k) => { const n = k.idx.length, buf = Buffer.alloc(n * 2 + n * 6); for (let i = 0; i < n; i++) buf.writeUInt16LE(k.idx[i], i * 2); for (let i = 0; i < n * 3; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(k.d[i] / 5e-6))), n * 2 + i * 2); return n + ':' + buf.toString('base64'); };
const J = JSON.parse(fs.readFileSync(cj, 'utf8'));
all[gun][sd] = { pose: J.pose, glove: pack(J.glove), bare: pack(J.bare), pads: J.pads ? pack(J.pads) : '0:' };
const out = src.slice(0, a) + fmt(all) + src.slice(b);
fs.writeFileSync(file, out); console.log('wrote', file, gun, sd, 'glove', J.glove.idx.length);
