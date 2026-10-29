import fs from 'fs';
const p = 'crew/BOARD.md';
const s = fs.readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(eol);
const card = fs.readFileSync('qa/2026-10-29-GB-247/card.txt', 'utf8').replace(/\r?\n+\$/, '');
if (lines.some((l) => /\*\*GB-247\*\*/.test(l))) console.log('GB-247 already on the board');
else {
  const h = lines.findIndex((l) => /^### Grokbot\b/.test(l));
  if (h < 0) throw new Error('no Grokbot header');
  let j = h + 1;
  while (j < lines.length && !/^\s*- \[/.test(lines[j]) && !/^#{2,4} /.test(lines[j])) j++;
  if (!/^\s*- \[/.test(lines[j] || '')) throw new Error('no task line under Grokbot');
  lines.splice(j, 0, card);
  fs.writeFileSync(p, lines.join(eol), 'utf8');
  console.log('GB-247 card added at board line ' + (j + 1));
}
const t = fs.readFileSync(p, 'utf8');
const L = t.split(eol);
let n = 0;
for (let i = 0; i < L.length; i++) {
  if (/^- \[>\] \*\*GB-245\*\*/.test(L[i])) { L[i] = L[i].replace('^- \[>\]', '- [x]'); n++; }
}
if (n) { fs.writeFileSync(p, L.join(eol), 'utf8'); console.log('flipped ' + n + ' stale GB-245 card to [x]'); }
else console.log('no stale GB-245 [>] card');