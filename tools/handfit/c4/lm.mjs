// lm.mjs <export> <side>: landmarks of a hand as drawn (cam and gun space, mm)
import fs from 'node:fs';
const M = await import('/home/claude/handfit-work/hand/mh-tool.mjs');
const d = JSON.parse(fs.readFileSync(process.argv[2])); const sd = process.argv[3] || 'l';
const h = d.hands[sd]; const L = M.handLayout(1, 0, 0); const B = M._bf(L, h.pose);
const ap = (F, x, y, z) => [F[0]*x+F[1]*y+F[2]*z+F[3], F[4]*x+F[5]*y+F[6]*z+F[7], F[8]*x+F[9]*y+F[10]*z+F[11]];
const pts = { wrist: [0, -0.214, 0], palm: [0, -0.262, 0.012], grip: [0, -0.271, 0.008] };
const names = ['index', 'middle', 'ring', 'little'];
for (let i = 0; i < 4; i++) { pts[names[i] + 'Tip'] = ap(B[3 + i * 3], 0, -L.fingers[i].len[2], 0); pts[names[i] + 'Mcp'] = ap(B[1 + i * 3], 0, 0, 0); }
pts.thumbRoot = ap(B[13], 0, 0, 0); pts.thumbIp = ap(B[15], 0, 0, 0); pts.thumbTip = ap(B[15], 0, -L.thumb.len[2], 0);
const MW = h.mw; // column-major 4x4
const app4 = (m, v) => [m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12], m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]];
const out = {};
for (const [k, c] of Object.entries(pts)) out[k] = app4(MW, [h.side * c[0] + h.ox, c[1], c[2] + h.gz]);
console.log(JSON.stringify(out));
