import fs from 'node:fs';
let t = fs.readFileSync('tools/tests/t189.js', 'utf8');
const a = "        measured++;\n";
if (!t.includes(a)) throw new Error('anchor');
t = t.replace(a, () => a + "        { let mn = Infinity, mx = -Infinity; for (const p of pts) { const q = sp.g.parent.worldToLocal(p.clone()); mn = Math.min(mn, Math.abs(q.x)); mx = Math.max(mx, Math.abs(q.x)); } out.push('DATA ' + JSON.stringify({ tag, x: +sp.g.position.x.toFixed(4), z: +sp.g.position.z.toFixed(4), inner: +mn.toFixed(4), outer: +mx.toFixed(4), gap: +minClear.toFixed(4), pen: +maxPen.toFixed(4), cy: +cl.y.toFixed(3), cz: +cl.z.toFixed(3) })); }\n");
fs.writeFileSync('qa/2026-11-03-GB-276/probe189.js', t);
