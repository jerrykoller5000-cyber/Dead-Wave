// CD-1 fixes 5 (Claude 1): // pad.mjs '<pose>' : the index pad (Claude 5's: distal frame (0, -0.55 len2, 0.007)) and the tip, canonical hand frame
import * as M from '/home/claude/handfit-work/hand/mh-tool.mjs';
export function padOf(pose) { const L = M.handLayout(1, 0, 0); const B = M._bf(L, pose)[3]; const f = L.fingers[0];
  const ap = (m, x, y, z) => [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]];
  return { pad: ap(B, 0, -0.55 * f.len[2], 0.007), tip: ap(B, 0, -f.len[2], 0.004) }; }
if (import.meta.url === "file://" + process.argv[1]) console.log(JSON.stringify(padOf(JSON.parse(process.argv[2]))));
