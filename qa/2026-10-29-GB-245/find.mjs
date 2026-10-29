import fs from 'fs';
const s = fs.readFileSync('index.html', 'utf8');
for (const k of ['handsDbg', 'gripPoint:', 'handsDbg:']) {
  let i = -1, n = 0;
  while ((i = s.indexOf(k, i + 1)) >= 0) { n++; if (n <= 2) console.log(k + ' @' + i + ': ' + s.slice(i - 80, i + 120).replace(/\n/g, '\\n')); }
  console.log(k + ' total ' + n);
}
