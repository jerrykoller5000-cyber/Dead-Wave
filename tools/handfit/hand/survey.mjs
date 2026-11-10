// J126 rule 1 survey: every pose the game uses, self-clip on the new hand
import * as M from './mh-tool.mjs';
const VP = await import('/home/claude/gs306/game/viewmodel-poses.js');
const HG = await import('/home/claude/gs306/studio/hand-grips.js');
const S = VP.VM_SOCKETS || {};
const rows = [];
const add = (name, p) => { if (!p || !p.f) return; const r = M.handClipReport(p); rows.push([name, r.max, r.count, JSON.stringify(r.pairs)]); };
for (const [k, v] of Object.entries(M.HAND_POSES)) add('HAND_POSES.' + k, v);
for (const [k, v] of Object.entries(S)) { add(k + '.gripPose', v.gripPose); add(k + '.supportPose', v.supportPose); }
for (const [k, v] of Object.entries(HG.ITEM_POSES || {})) add('ITEM.' + k, HG.gripPose(v));
for (const [k, v] of Object.entries(HG.HAND_GRIPS || {})) { if (v && v.f) add('GRIP.' + k, v); else if (v) for (const [k2, v2] of Object.entries(v)) if (v2 && v2.f) add('GRIP.' + k + '.' + k2, v2); }
add('FIST', HG.gripPose ? HG.gripPose(HG.FIST) : null);
rows.sort((a, b) => b[1] - a[1]);
for (const r of rows) console.log(r[0].padEnd(28), String(r[1]).padStart(6), String(r[2]).padStart(5), r[3]);
console.log('poses', rows.length, 'clipping', rows.filter((r) => r[1] > 0.5).length);
