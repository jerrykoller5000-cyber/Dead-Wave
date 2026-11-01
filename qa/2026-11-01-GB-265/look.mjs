import fs from 'node:fs';
const t = fs.readFileSync('index.html', 'utf8');
const crlf = t.split('\r\n').length - 1, lf = t.split('\n').length - 1;
console.log('CRLF', crlf, 'LF total', lf);
const lines = t.split('\n'); let first = -1, last = -1;
lines.forEach((l, i) => { if (l.endsWith('\r')) { if (first < 0) first = i + 1; last = i + 1; } });
console.log('first CRLF line', first, 'last', last);
const b = fs.readFileSync('qa/2026-10-31-GB-258/index.pre-edit.html', 'utf8'); console.log('GB-258 time CRLF', b.split('\r\n').length - 1);