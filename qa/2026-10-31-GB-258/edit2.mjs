import fs from 'node:fs';
const f = 'index.html'; const t0 = fs.readFileSync(f, 'utf8'); let t = t0; const crlf = t.split('\r\n').length - 1;
const a = `        return k.loose ? sayText('hikers.pouchDown', {}, 'Their kit is down by the tree: grab it there')\n`;
const b = `        return k.loose ? (k.phase === 'ground' ? sayText('hikers.pouchDown', {}, 'Their kit is down by the tree: grab it there') : sayText('hikers.pouchWater', {}, 'Their kit is in the river: grab it'))\n`;
if (t.split(a).length !== 2) throw new Error('anchor'); t = t.replace(a, () => b);
if (t.split('\r\n').length - 1 !== crlf) throw new Error('endings');
if (fs.readFileSync(f, 'utf8') !== t0) throw new Error('changed underneath');
fs.writeFileSync(f, t); console.log('edited 2');