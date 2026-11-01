import fs from 'node:fs';
const p = 'index.html';
const src = fs.readFileSync(p, 'utf8');
const before = src.length;
const edits = [
  ["      m4:      { r: 0.025, len: 0.17, back: 0.065, look: 'rifle' },",
   "      m4:      { r: 0.030, len: 0.2075, back: 0.065, look: 'rifle' },"],
  ["      ak:      { r: 0.031, len: 0.18, back: 0.036, heavyBack: 0.05, look: 'ak' },",
   "      ak:      { r: 0.0295, len: 0.2184, back: 0.036, heavyBack: 0.05, look: 'ak' },"],
  ["      pistol:  { r: 0.0275, len: 0.15, back: 0.008, look: 'pistol' },",
   "      pistol:  { r: 0.0275, len: 0.2686, back: 0.008, look: 'pistol' },"],
  ["      uzi:     { r: 0.027, len: 0.16, back: 0.02, look: 'pistol' },",
   "      uzi:     { r: 0.027, len: 0.2172, back: 0.02, look: 'pistol' },"],
];
let out = src;
for (const [from, to] of edits) {
  const n = out.split(from).length - 1;
  if (n !== 1) { console.error('ANCHOR COUNT ' + n + ' for: ' + from.trim()); process.exit(1); }
  out = out.replace(from, to);
}
// sanity: the table must still parse as the six keys, and the two untouched rows must be identical
const checks = [
  "      sniper:  { r: 0.04, len: 0.31, back: 0.124, look: 'sniper' },",
  "      shotgun: { r: 0.06, len: 0.36, back: 0.045, look: 'big',",
];
for (const c of checks) if (!out.includes(c)) { console.error('UNTOUCHED ROW MISSING: ' + c.trim()); process.exit(1); }
if (!out.includes('const SUPPRESSOR = {')) { console.error('table head missing'); process.exit(1); }
if (src.includes('\ufeff') !== out.includes('\ufeff')) { console.error('BOM changed'); process.exit(1); }
fs.copyFileSync(p, 'qa/2026-10-31-GB-260/index.before-cans.html');
fs.writeFileSync(p, out);
console.log('wrote index.html: ' + before + ' -> ' + out.length + ' bytes (delta ' + (out.length - before) + ')');
console.log('CRLF? ' + (out.includes('\r\n') ? 'yes' : 'no'));
