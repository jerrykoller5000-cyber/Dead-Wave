// posehand.mjs '<pose json>' <out.json>: the canonical gloved hand posed (handPosed + the surface's triangles)
import fs from 'node:fs';
import * as M from '/home/claude/handfit-work/hand/mh-tool.mjs';
const pose = JSON.parse(process.argv[2]); while (pose.t.length < 6) pose.t.push(0);
const P = M.handPosed(pose, M.GLOVE_INFLATE), L = M.handLayout(1, 0, 0), S = M._hs(L, M._bf(L, M._BUILD), true);
fs.writeFileSync(process.argv[3], JSON.stringify({ p: Array.from(P.p), idx: Array.from(S.B.idx), b0: Array.from(P.b0), n: P.n }));
