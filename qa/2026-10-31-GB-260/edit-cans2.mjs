import fs from 'node:fs';
const p = 'index.html';
const src = fs.readFileSync(p, 'utf8');
const edits = [
  ["      m4:      { r: 0.025, len: 0.17, back: 0.065, look: 'rifle' },",
   "      m4:      { r: 0.0276, len: 0.1907, back: 0.065, look: 'rifle' },   // GB-260: 152 x 44 mm visual, the Velos LBP 5.56's size"],
  ["      ak:      { r: 0.031, len: 0.18, back: 0.036, heavyBack: 0.05, look: 'ak' },",
   "      ak:      { r: 0.0271, len: 0.2009, back: 0.036, heavyBack: 0.05, look: 'ak' },   // GB-260: 163 x 44 mm visual, the Velos LBP 7.62's size"],
  ["      pistol:  { r: 0.0275, len: 0.15, back: 0.008, look: 'pistol' },",
   "      pistol:  { r: 0.0275, len: 0.247, back: 0.008, look: 'pistol' },   // GB-260: 162 mm visual, the Omega 45K's length"],
  ["      uzi:     { r: 0.027, len: 0.16, back: 0.02, look: 'pistol' },",
   "      uzi:     { r: 0.027, len: 0.1997, back: 0.02, look: 'pistol' },   // GB-260: 115 mm visual, the Omega 9K's length"],
];
let out = src, n = 0;
for (const [from, to] of edits) {
  const c = out.split(from).length - 1;
  if (c !== 1) { console.error('ANCHOR COUNT ' + c + ': ' + from.trim()); process.exit(1); }
  out = out.replace(from, to); n++;
}
for (const keep of ["      sniper:  { r: 0.04, len: 0.31, back: 0.124, look: 'sniper' },", "      shotgun: { r: 0.06, len: 0.36, back: 0.045, look: 'big',", "                 clamp: { r: 0.044, z: -0.033, len: 0.025 } },"]) {
  const c = out.split(keep).length - 1;
  if (c !== 1) { console.error('UNTOUCHED ROW COUNT ' + c + ': ' + keep.trim()); process.exit(1); }
}
if (src.includes('\ufeff') !== out.includes('\ufeff')) { console.error('BOM changed'); process.exit(1); }
if (out.includes('\r\n') !== src.includes('\r\n')) { console.error('line endings changed'); process.exit(1); }
fs.writeFileSync(p, out);
console.log('rows set: ' + n + ', bytes ' + src.length + ' -> ' + out.length);
