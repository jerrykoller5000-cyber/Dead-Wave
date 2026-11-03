import fs from 'fs';
const a = fs.readFileSync('qa/2026-11-02-GB-253/index.before.html','utf8').split('\r\n'), b = fs.readFileSync('index.html','utf8').split('\r\n');
console.log('lines', a.length, '->', b.length, 'lf-only lines in new:', b.filter(l=>l.includes('\n')).length);
let i=0; while(i<a.length && a[i]===b[i]) i++; let j=0; while(j<a.length-i && a[a.length-1-j]===b[b.length-1-j]) j++;
console.log('first diff', i+1, 'common tail', j, 'changed old', a.length-i-j, 'new', b.length-i-j);
