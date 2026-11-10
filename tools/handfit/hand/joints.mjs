import * as M from './mh-tool.mjs';
const L = M.handLayout(1, 0, 0);
export function joints(p) {
  const Mx = M._bf(L, p); const o = (k, u) => { const m = Mx[k]; return [m[1] * -u + m[3], m[5] * -u + m[7], m[9] * -u + m[11]].map((x) => +(x * 1000).toFixed(1)); };
  return { idx: [o(1, 0), o(2, 0), o(3, 0), o(3, L.fingers[0].len[2])], mid: [o(5, 0), o(6, 0), o(6, L.fingers[1].len[2])], thumb: [o(13, 0), o(14, 0), o(15, 0), o(15, L.thumb.len[2])] };
}
if (process.argv[2]) { const p = JSON.parse(process.argv[2]); const j = joints(p); for (const k in j) console.log(k, JSON.stringify(j[k])); }
