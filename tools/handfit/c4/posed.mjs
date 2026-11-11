// posed.mjs <export> <side> '<pose>' <out.bin>: the gloved hand posed, in world, with the export's hand transform
import fs from 'node:fs';
const M = await import('/home/claude/handfit-work/hand/mh-tool.mjs');
const d = JSON.parse(fs.readFileSync(process.argv[2])); const h = d.hands[process.argv[3]]; const pose = JSON.parse(process.argv[4]);
const P = M.handPosed(pose, M.GLOVE_INFLATE), m = h.mw, out = new Float32Array(P.n * 3);
for (let i = 0; i < P.n; i++) { const x = h.side * P.p[i * 3] + h.ox, y = P.p[i * 3 + 1], z = P.p[i * 3 + 2] + h.gz;
  out[i * 3] = m[0] * x + m[4] * y + m[8] * z + m[12]; out[i * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]; out[i * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]; }
fs.writeFileSync(process.argv[5], Buffer.from(out.buffer));
