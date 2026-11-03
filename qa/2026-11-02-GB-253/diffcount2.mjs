import fs from 'fs';
const a = fs.readFileSync('qa/2026-11-02-GB-253/index.before.html','utf8').split('\r\n'), b = fs.readFileSync('index.html','utf8').split('\r\n');
const off = b.length - a.length; let diffs = [];
// region after ctor+literal: compare a[i] with b[i+off] from literal end
for (let i = 42619; i < a.length; i++) if (a[i] !== b[i + off]) diffs.push(i + 1);
console.log('offset', off, 'differing old lines after literal:', diffs.join(','));
for (let i = 0; i < 42559; i++) if (a[i] !== b[i]) { console.log('early diff', i + 1); break; }
