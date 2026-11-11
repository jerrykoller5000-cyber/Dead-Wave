// CD-1 fixes (11 Nov): a solve's RESULT drawn offline: the export's hand replaced by the canonical gloved hand in the RESULT's
// pose, moved and turned as gungrip3.mjs reads it (no game page; the glove without its contact give or the game's twist).
// node preview.mjs <export.json> <r|l> '<RESULT json>' <out.json>
import fs from 'node:fs';
const M = await import('/home/claude/handfit-work/hand/mh-tool.mjs');
const [f, sd, res, out] = process.argv.slice(2);
const D = JSON.parse(fs.readFileSync(f, 'utf8')), R = JSON.parse(res), H = D.hands[sd];
const P = M.handPosed(R.pose, M.GLOVE_INFLATE);
const L = M.handLayout(1, 0, 0), C = [0, L.gripY, 0.008];
const [dx, dy, dz] = R.move.map((v) => v / 1000), [a, b2, c] = [R.turn[0] || 0, R.turn[1] || 0, R.turn[2] || 0];
const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b2), sb = Math.sin(b2), c3 = Math.cos(c), s3 = Math.sin(c);
const MW = H.mw, s = H.side, ox = H.ox, gz = H.gz, n = P.n, W = new Float32Array(n * 3);
for (let v = 0; v < n; v++) {
  let px = P.p[v * 3] - dx - C[0], py = P.p[v * 3 + 1] - dy - C[1], pz = P.p[v * 3 + 2] - dz - C[2];
  const qx = ca * px + sa * pz, qz = -sa * px + ca * pz, rx = cb * qx + sb * py, ry0 = -sb * qx + cb * py, ry = c3 * ry0 + s3 * qz, rz = -s3 * ry0 + c3 * qz;
  const lx = s * (rx + C[0]) + ox, ly = ry + C[1], lz = rz + C[2] + gz;   // canonical -> the hand's layout
  W[v * 3] = MW[0] * lx + MW[4] * ly + MW[8] * lz + MW[12]; W[v * 3 + 1] = MW[1] * lx + MW[5] * ly + MW[9] * lz + MW[13]; W[v * 3 + 2] = MW[2] * lx + MW[6] * ly + MW[10] * lz + MW[14];
}
const B = M._hs(L, M._bf(L, M._BUILD), true).B; let idx = Uint32Array.from(B.idx);
if (s < 0) for (let t = 0; t < idx.length; t += 3) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; }   // the mirror turns the faces
H.wor = Buffer.from(W.buffer).toString('base64'); H.idx = Buffer.from(idx.buffer).toString('base64'); H.n = n; H.pose = R.pose; delete H.loc;
fs.writeFileSync(out, JSON.stringify(D));
console.log('wrote', out, n, 'verts', idx.length / 3, 'faces');
