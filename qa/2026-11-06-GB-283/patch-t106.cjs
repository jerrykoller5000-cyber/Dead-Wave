const fs = require('fs');
const p = 'tools/tests/t106.js';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('setScore(false)')) { console.log('already has setScore'); process.exit(0); }
const needle = "    await startMatch(T, 'Shape');\n    T.runDevCommand('godmode');";
const insert = "    await startMatch(T, 'Shape');\n    // CL-297 / GB-283: these checks are the old music's (break/bridge/climax); the score is on by default since D-97, so ask for the old music as t73 does (?score=0). Score's own checks: tcl275a-d.\n    if (T.AudioSys && T.AudioSys.setScore) T.AudioSys.setScore(false);\n    T.runDevCommand('godmode');";
if (!s.includes(needle)) { console.error('needle not found'); console.log(JSON.stringify(s.slice(s.indexOf('startMatch'), s.indexOf('startMatch')+120))); process.exit(1); }
s = s.replace(needle, insert);
if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
s = s.replace(/\r\n/g, '\n');
fs.writeFileSync(p, s);
console.log('patched ok');
console.log(fs.readFileSync(p,'utf8').split('\n').slice(10,18).join('\n'));
