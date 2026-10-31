const fs = require('fs');
const f = 'index.html';
let s = fs.readFileSync(f, 'utf8');
if (s.charCodeAt(0) === 0xFEFF) throw new Error('BOM');
const crlf0 = (s.match(/\r\n/g) || []).length;   // 3 pre-existing CRLF lines elsewhere; left as they are
const oldL = "      aa12: { up: 0.12, side: 0.12, tip: -0.25 }, launcher: { up: 0.06, cant: 0.6 }, uzi: { up: 0.19, tip: -0.6 } };";
const newL = "      aa12: { up: 0.12, side: 0.12, tip: -0.25 }, launcher: { up: 0.10, side: 0.12, tip: -0.30, cant: 0.6 }, uzi: { up: 0.19, tip: -0.6 } };";
const oldC = "    // (seat5, seat6): it takes the row with the strongest firing hand, R 10-24k, its palm a sliver at the seat (0.7-3.7k).";
const newC = oldC + "\n    // GB-247: the launcher takes the rifles' side and tip too: R 16-34k the whole reload, L out only u0.25-0.40 (the pouch trip) and\n    // 67k at the drum (u0.48), against 5.7k there before (qa/2026-10-29-GB-247 sweep1 row g2). The uzi's support hand reads 0 px\n    // from u0.10 to u0.62 at every mount row tried (12 rows, sweep1-2): its own arm path, not the mount, so its entry stays.";
const c1 = s.split(oldL).length - 1, c2 = s.split(oldC).length - 1;
if (c1 !== 1 || c2 !== 1) throw new Error('match counts ' + c1 + ' ' + c2);
s = s.replace(oldL, newL).replace(oldC, newC);
if ((s.match(/\r\n/g) || []).length !== crlf0) throw new Error('CRLF count changed');
fs.writeFileSync(f, s, 'utf8');
console.log('patched');