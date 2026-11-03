import fs from 'fs';
// GB-253 spider fix, Claude's (1) (2026-11-02): edits ./index.html in the cwd (exact lines, keeps EOL, no BOM)
const P = process.argv[2] || 'index.html';
const raw = fs.readFileSync(P, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) throw new Error('BOM');
const crlf = raw.includes('\r\n'); const EOL = crlf ? '\r\n' : '\n';
const L = raw.split(EOL);
const one = (s) => { const h = L.map((l, i) => l === s ? i : -1).filter(i => i >= 0); if (h.length !== 1) throw new Error('anchor x' + h.length + ': ' + s); return h[0]; };
const A = '            if (!z.lineClear) { z.lineSawBlock = true; z.lineGo = 1.2; }';
const B = '            else if (hadLine === false && z.lineSawBlock) z.lineGo = 1.2;';
const i = one(A); if (L[i + 1] !== B || L[i + 2] !== '          }') throw new Error('anchor B');
L.splice(i, 2,
  '            // GB-253 (Claude\'s (1), 2026-11-02): one blocked check while it strafed in the open made an open-field spider',
  '            // a blocked hunter for good (GP-19979), so it committed in and parked inside near. Now a spider that had the line',
  '            // in its band and loses it while strafing turns its strafe round (back toward where it had the line) and keeps',
  '            // holding; it becomes a hunter only if it is still blocked 2 s later (lineLostT, below). One that never had the',
  '            // line (behind the house) becomes one after two blocked checks in a row, as GP-19979 meant; three clear checks',
  '            // in a row beyond near clear it again.',
  '            if (!z.lineClear) {',
  '              z.lineClearN = 0; z.lineBlockN = (z.lineBlockN || 0) + 1;',
  '              if (z.spider && z.lineHad && !z.lineSawBlock) { if (!(z.lineLostT > 0)) { z.lineLostT = 2; z.strafeDir = -(z.strafeDir || 1); z.strafeT = 2.2; } }',
  '              else { if (z.lineBlockN >= 2) z.lineSawBlock = true; z.lineGo = 1.2; }',
  '            } else {',
  '              z.lineBlockN = 0; z.lineLostT = 0;',
  '              if (z.spider && !z.lineSawBlock) z.lineHad = true;',
  '              if (hadLine === false && z.lineSawBlock) z.lineGo = 1.2;',
  '              if (z.lineSawBlock && dist > near) { z.lineClearN = (z.lineClearN || 0) + 1; if (z.lineClearN >= 3) { z.lineSawBlock = false; z.lineClearN = 0; } }',
  '              else z.lineClearN = 0;',
  '            }');
const j = i + 18; if (L[j - 1] !== '          }') throw new Error('close');
L.splice(j, 0,
  '          if (z.lineLostT > 0) { z.lineLostT -= dt; if (z.lineLostT <= 0) { z.lineLostT = 0; if (z.lineClear === false) { z.lineSawBlock = true; z.lineHad = false; z.lineGo = 1.2; } } }');
const S0 = '          } else if (dist < hold && z.lineClear !== false && !(z.lineGo > 0)) {';
const k = one(S0);
L[k] = '          } else if (dist < hold && ((z.lineClear !== false && !(z.lineGo > 0)) || z.lineLostT > 0)) {';
fs.writeFileSync(P, L.join(EOL));
console.log('spider (1) at', i + 1, 'timer at', j + 1, 'strafe branch at', k + 1, 'crlf', crlf);
