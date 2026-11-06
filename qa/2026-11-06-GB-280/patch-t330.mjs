import fs from 'fs';
const p = 'tools/tests/t330.js';
let s = fs.readFileSync(p, 'utf8');
const bom = s.charCodeAt(0) === 0xFEFF; if (bom) s = s.slice(1);
const crlf = s.includes('\r\n'); const nl = crlf ? '\r\n' : '\n';
if (s.includes('both hands stay within')) { console.log('already present'); process.exit(0); }
const anchor = `    ok(first && late && (first.live.chest[1] - first.pos[1]) < 0.5 * chestStand && (late.live.chest[1] - late.pos[1]) > (first.live.chest[1] - first.pos[1]) + 0.4,
      'the chest is low on hands and knees at u ' + f2(first && first.u) + ' (' + f2(first && first.live.chest[1] - first.pos[1]) + ' m of ' + f2(chestStand) + ') and has come up by u ' + f2(late && late.u) + ' (' + f2(late && late.live.chest[1] - late.pos[1]) + ' m)');`;
const re = /    ok\(first && late && \(first\.live\.chest\[1\] - first\.pos\[1\]\) < 0\.5 \* chestStand && \(late\.live\.chest\[1\] - late\.pos\[1\]\) > \(first\.live\.chest\[1\] - first\.pos\[1\]\) \+ 0\.4,\r?\n      'the chest is low on hands and knees at u ' \+ f2\(first && first\.u\) \+ ' \(' \+ f2\(first && first\.live\.chest\[1\] - first\.pos\[1\]\) \+ ' m of ' \+ f2\(chestStand\) \+ '\) and has come up by u ' \+ f2\(late && late\.u\) \+ ' \(' \+ f2\(late && late\.live\.chest\[1\] - late\.pos\[1\]\) \+ ' m\)'\);/;
if (!re.test(s)) { console.error('ANCHOR_NOT_FOUND'); process.exit(1); }
const add = [
  "    ok(first && late && (first.live.chest[1] - first.pos[1]) < 0.5 * chestStand && (late.live.chest[1] - late.pos[1]) > (first.live.chest[1] - first.pos[1]) + 0.4,",
  "      'the chest is low on hands and knees at u ' + f2(first && first.u) + ' (' + f2(first && first.live.chest[1] - first.pos[1]) + ' m of ' + f2(chestStand) + ') and has come up by u ' + f2(late && late.u) + ' (' + f2(late && late.live.chest[1] - late.pos[1]) + ' m)');",
  "    // GB-280: hands plant for the hand-knee-push (not fists up at the chest).",
  "    const midHands = A.rows.filter((r) => r.u >= 0.4 && r.u <= 0.55);",
  "    const handH = (r, k) => r.live[k][1] - r.pos[1];",
  "    const handsLow = midHands.filter((r) => handH(r, 'handL') < 0.75 && handH(r, 'handR') < 0.75);",
  "    const handsPlanted = midHands.some((r) => Math.max(handH(r, 'handL'), handH(r, 'handR')) < 0.55);",
  "    ok(midHands.length >= 3 && handsLow.length === midHands.length && handsPlanted,",
  "      'both hands stay within a forearm of the ground at u 0.4-0.55 (' + midHands.length + ' samples, planted ' + handsPlanted + '; worst L/R ' + f2(Math.max(...midHands.map((r) => handH(r, 'handL')))) + '/' + f2(Math.max(...midHands.map((r) => handH(r, 'handR')))) + ' m)');"
].join(nl);
s = s.replace(re, add);
fs.writeFileSync(p, (bom ? '\uFEFF' : '') + s);
console.log('OK t330 hand check added', fs.statSync(p).size);
