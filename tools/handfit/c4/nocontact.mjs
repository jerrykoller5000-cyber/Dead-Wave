// nocontact.mjs <export> <gun> : the export's hands with and without their contact give (studio/hand-contacts.js), flipped faces each way
import fs from 'node:fs';
const [f, gun] = process.argv.slice(2);
const D = JSON.parse(fs.readFileSync(f, 'utf8'));
const { HAND_CONTACTS_RAW } = await import('/home/claude/gs306/studio/hand-contacts.js');
const dec = (s) => { const [n, b] = s.split(':'); const u = Buffer.from(b || '', 'base64'); const N = +n; const idx = new Uint16Array(N), d = new Float32Array(N * 3); for (let i = 0; i < N; i++) idx[i] = u.readUInt16LE(i * 2); for (let i = 0; i < N * 3; i++) d[i] = u.readInt16LE(N * 2 + i * 2) * 5e-6; return { idx, d }; };
for (const sd of ['r', 'l']) {
  const H = D.hands[sd], C = HAND_CONTACTS_RAW[gun] && HAND_CONTACTS_RAW[gun][sd]; if (!H || !C) { console.log(sd, 'none'); continue; }
  const P = new Float32Array(Buffer.from(H.loc, 'base64').buffer.slice(0)); const I = new Uint32Array(new Uint8Array(Buffer.from(H.idx, 'base64')).buffer);
  const g = dec(C.glove); let far = 0; const q = C.pose, pp = H.pose;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) far = Math.max(far, Math.abs((q.f[i][j] || 0) - pp.f[i][j]));
  for (let j = 0; j < 6; j++) far = Math.max(far, Math.abs((q.t[j] || 0) - pp.t[j]));
  const k = Math.max(0, 1 - far / 0.12), s = H.side;
  const P0 = P.slice(); for (let i = 0; i < g.idx.length; i++) { const v = g.idx[i]; P0[v * 3] -= s * g.d[i * 3] * k; P0[v * 3 + 1] -= g.d[i * 3 + 1] * k; P0[v * 3 + 2] -= g.d[i * 3 + 2] * k; }
  const flips = (Q) => { const n = Q.length / 3, VN = new Float64Array(n * 3), FN = []; for (let t = 0; t < I.length; t += 3) { const a = I[t], b = I[t + 1], c = I[t + 2]; const ux = Q[b*3]-Q[a*3], uy = Q[b*3+1]-Q[a*3+1], uz = Q[b*3+2]-Q[a*3+2], vx = Q[c*3]-Q[a*3], vy = Q[c*3+1]-Q[a*3+1], vz = Q[c*3+2]-Q[a*3+2]; const nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx; FN.push([nx, ny, nz]); for (const v of [a, b, c]) { VN[v*3] += nx; VN[v*3+1] += ny; VN[v*3+2] += nz; } }
    const out = []; for (let t = 0; t < I.length / 3; t++) { let sx = 0, sy = 0, sz = 0; for (const v of [I[t*3], I[t*3+1], I[t*3+2]]) { const l = Math.hypot(VN[v*3], VN[v*3+1], VN[v*3+2]) || 1; sx += VN[v*3]/l; sy += VN[v*3+1]/l; sz += VN[v*3+2]/l; } const [nx, ny, nz] = FN[t]; if (nx*sx + ny*sy + nz*sz < 0) out.push(t); } return out; };
  const a = flips(P), b = flips(P0);
  let maxd = 0; for (let i = 0; i < g.idx.length; i++) maxd = Math.max(maxd, Math.hypot(g.d[i*3], g.d[i*3+1], g.d[i*3+2]));
  const inC = new Set(g.idx); const touch = a.filter((t) => [0, 1, 2].some((j) => inC.has(I[t * 3 + j]))).length;
  console.log(sd, 'k', k.toFixed(2), 'contact verts', g.idx.length, 'max push mm', (maxd * 1000).toFixed(1), '| flipped as drawn', a.length, '(on contact verts', touch + ')', '| without the give', b.length);
}
