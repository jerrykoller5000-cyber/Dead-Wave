const fs = require('fs'); const f = 'index.html'; let t = fs.readFileSync(f, 'utf8'); const before = t.length;
const NL = '\r\n'; const L = (s) => s.split('\n').join(NL);
const rep = (a, b) => { a = L(a); b = L(b); const i = t.indexOf(a); if (i < 0 || t.indexOf(a, i + 1) >= 0) throw new Error('anchor not unique/missing: ' + a.slice(0, 70)); t = t.slice(0, i) + b + t.slice(i + a.length); };
fs.copyFileSync(f, 'qa/2026-11-03-GB-255/index.before-commit4.html');
rep("          // resumes until the two offset lines are clear again.\n          if (dist < hold && z.lineSawBlock && z.lineClear !== false && z.lineGo > 0) {",
    "          // resumes until the two offset lines are clear again.\n" +
    "          // GB-255: the commit stops at the spit minimum (4 m, below which it never spits). A spider whose two lines kept flickering\n" +
    "          // at a corner got lineGo re-armed on every blocked-to-clear flip and walked on in, to 2.3 m from him (tgb255g, t80's graze check).\n" +
    "          if (dist < hold && dist > 4 && z.lineSawBlock && z.lineClear !== false && z.lineGo > 0) {");
fs.writeFileSync(f, t); console.log('ok', before, t.length);
