import fs from 'fs';
const p = 'crew/BOARD.md';
const s = fs.readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const L = s.split(eol);
let n = 0;
for (let i = 0; i < L.length; i++) {
  if (/^- \[>\] \*\*GB-245\b/.test(L[i])) { L[i] = L[i].replace('- [>]', '- [x]'); n++; }
}
if (n) { fs.writeFileSync(p, L.join(eol), 'utf8'); console.log('flipped ' + n + ' stale GB-245 [>] card to [x]'); }
else console.log('none found');