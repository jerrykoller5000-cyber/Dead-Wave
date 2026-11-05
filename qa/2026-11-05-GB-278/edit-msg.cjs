const fs = require('fs');
const p = 'Claude outputs/commit/message.txt';
let buf = fs.readFileSync(p);
const hasCRLF = buf.includes(0x0d);
let t = buf.toString('utf8');
if (t.includes('GB-277')) { console.log('already has GB-277'); process.exit(0); }
const line = "- The brute's live get-up (GB-277, J40): combat/brute-getup.js drives studio getup.keys onto the live brute's own joints (Claude's call b); t330.";
const needle = '- Board:';
const i = t.indexOf(needle);
if (i < 0) { console.error('no Board line'); process.exit(1); }
const out = t.slice(0, i) + line + '\n' + t.slice(i);
const final = Buffer.from(hasCRLF ? out.replace(/\r?\n/g, '\r\n') : out, 'utf8');
fs.writeFileSync(p, final);
console.log('wrote', final.length, 'CRLF=' + hasCRLF);
