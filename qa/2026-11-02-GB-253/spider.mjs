import fs from 'fs';
const P = 'index.html';
const raw = fs.readFileSync(P, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) throw new Error('BOM');
const crlf = raw.includes('\r\n'); const EOL = crlf ? '\r\n' : '\n';
const L = raw.split(EOL);
const A = '            if (!z.lineClear) { z.lineSawBlock = true; z.lineGo = 1.2; }';
const B = '            else if (hadLine === false && z.lineSawBlock) z.lineGo = 1.2;';
const i = L.findIndex((l, k) => l === A && L[k + 1] === B);
if (i < 0 || L.filter(l => l === A).length !== 1) throw new Error('anchor');
L.splice(i, 2,
  '            // GB-253 (Claude\'s (a), 2026-11-02): one blocked check while it strafes in the open made an open-field',
  '            // spider a blocked hunter for good (GP-19979), so it committed in and parked inside near. Now it takes two',
  '            // blocked checks in a row to become one, and three clear checks in a row beyond near clear it again, so a',
  '            // spider back in the open holds its band. A corner (the house) still blocks every check, so it is unchanged.',
  '            if (!z.lineClear) { z.lineClearN = 0; z.lineBlockN = (z.lineBlockN || 0) + 1; if (z.lineBlockN >= 2) z.lineSawBlock = true; z.lineGo = 1.2; }',
  '            else {',
  '              z.lineBlockN = 0;',
  '              if (hadLine === false && z.lineSawBlock) z.lineGo = 1.2;',
  '              if (z.lineSawBlock && dist > near) { z.lineClearN = (z.lineClearN || 0) + 1; if (z.lineClearN >= 3) { z.lineSawBlock = false; z.lineClearN = 0; } }',
  '              else z.lineClearN = 0;',
  '            }');
fs.writeFileSync(P, L.join(EOL));
console.log('spider fix at line', i + 1, 'crlf', crlf);