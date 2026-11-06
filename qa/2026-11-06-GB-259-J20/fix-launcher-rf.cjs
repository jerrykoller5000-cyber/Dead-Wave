const fs = require('fs');
const f = 'tools/tests/t284.js';
let s = fs.readFileSync(f, 'utf8');
const a = 'launcher: [[0,.123,.053],[0,.102,.65]]';
const b = 'launcher: [[0,.137,-.2],[0,.137,.29]]';
const n = s.split(a).length - 1;
if (n !== 1) throw new Error('launcher RF anchor x' + n);
s = s.replace(a, b);
// also refresh comment
s = s.replace(
  'aa12 ring .168 / post .168@.75.',
  'aa12 ring .168 / post .168@.75, launcher leaf .137 / post .137@.29.'
);
const tmp = f + '.tmp';
fs.writeFileSync(tmp, s);
try { fs.unlinkSync(f); } catch (_) {}
fs.renameSync(tmp, f);
console.log('launcher RF updated to leaf .137');
