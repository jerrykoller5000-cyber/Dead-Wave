// GB-154: exact-string edits; refuses if any anchor is missing or the file changed since the read.
const fs = require('fs'), crypto = require('crypto');
const [file, expectHash] = process.argv.slice(2);
let s = fs.readFileSync(file, 'utf8');
const h = crypto.createHash('sha1').update(s).digest('hex');
if (expectHash && expectHash !== h) { console.log('CHANGED since read', h); process.exit(2); }
if (!expectHash) { console.log('hash', h); }
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const edits = require(process.env.EDITS || './edits154.json')[file.replace(/\\/g, '/').split('/').slice(-2).join('/')];
for (const [a, b] of edits) {
  let A = a, B = b;   // mixed line endings: try the text as given, then with CRLF
  if (s.split(A).length - 1 !== 1 && nl === '\r\n') { A = a.replace(/\n/g, nl); B = b.replace(/\n/g, nl); }
  const n = s.split(A).length - 1;
  if (n !== 1) { console.log('anchor x' + n + ': ' + a.slice(0, 90)); process.exit(3); }
  s = s.replace(A, () => B);
}
if (expectHash) { fs.writeFileSync(file, s, { encoding: 'utf8' }); console.log('saved', file, edits.length, 'edits'); }
else console.log('dry run ok', edits.length, 'edits');
