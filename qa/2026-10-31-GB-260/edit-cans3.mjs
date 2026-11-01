import fs from 'node:fs';
const p = 'index.html';
const src = fs.readFileSync(p, 'utf8');
// GB-260: put each row back on one clean line, the GB-260 size first and the row's own note kept after it.
const rows = [
  ["      m4:      { r: 0.0276, len: 0.1907, back: 0.065, look: 'rifle' },   // GB-260: 152 x 44 mm visual, the Velos LBP 5.56's size                  // over the flash hider, as CL-95 had it",
   "      m4:      { r: 0.0276, len: 0.1907, back: 0.065, look: 'rifle' },              // GB-260: 152 x 44 mm visual (Velos LBP 5.56); over the flash hider, as CL-95 had it"],
  ["      ak:      { r: 0.0271, len: 0.2009, back: 0.036, heavyBack: 0.05, look: 'ak' },   // GB-260: 163 x 44 mm visual, the Velos LBP 7.62's size    // starts in front of the front sight post (it swallowed it)",
   "      ak:      { r: 0.0271, len: 0.2009, back: 0.036, heavyBack: 0.05, look: 'ak' },   // GB-260: 163 x 44 mm visual (Velos LBP 7.62); starts in front of the front sight post"],
  ["      pistol:  { r: 0.0275, len: 0.247, back: 0.008, look: 'pistol' },   // GB-260: 162 mm visual, the Omega 45K's length               // GB-154: 25% fatter (55 mm across, was 44); back face on the crown, just ahead of the longer slide",
   "      pistol:  { r: 0.0275, len: 0.247, back: 0.008, look: 'pistol' },               // GB-260: 162 mm visual (Omega 45K); GB-154's fatter can, back face on the crown"],
  ["      uzi:     { r: 0.027, len: 0.1997, back: 0.02, look: 'pistol' },   // GB-260: 115 mm visual, the Omega 9K's length                  // was 1 mm wider than the barrel nut",
   "      uzi:     { r: 0.027, len: 0.1997, back: 0.02, look: 'pistol' },                // GB-260: 115 mm visual (Omega 9K); 1 mm wider than the barrel nut"],
];
let out = src;
for (const [from, to] of rows) {
  const c = out.split(from).length - 1;
  if (c !== 1) { console.error('ANCHOR COUNT ' + c + ': ' + from.slice(0, 60)); process.exit(1); }
  out = out.replace(from, to);
}
fs.writeFileSync(p, out);
const got = out.split('\n').filter((l) => /^\s+(m4|ak|pistol|uzi):\s+\{ r:/.test(l));
console.log(got.join('\n'));
console.log('bytes ' + src.length + ' -> ' + out.length + ', CRLF ' + (out.includes('\r\n') ? 'yes' : 'no'));
