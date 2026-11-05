import fs from 'node:fs';
const p = 'tools/tests/t189.js';
let t = fs.readFileSync(p, 'utf8');
const old = "const body = []; marine.traverse((o) => { if (!o.isMesh || !o.visible || o.isInstancedMesh) return; for (let q = o; q; q = q.parent) { if (skip.has(q) || !q.visible) return; } body.push(o); });";
if (t.split(old).length !== 2) throw new Error('anchor not unique');
const neu = "// GB-276: his body only. An effect mesh (the chapel halo: an invisible 0.9 m ellipsoid, opacity 0, name 'chapel-glow') is not his body and\n      // must not stop a ray: skip a mesh with no opacity, a transparent-and-faded one, or one an effect flags (userData.effect / halo).\n      const isEffect = (o) => { const mt = Array.isArray(o.material) ? o.material[0] : o.material; return o.name === 'chapel-glow' || !!(o.userData && (o.userData.effect || o.userData.halo)) || !!(mt && (mt.opacity === 0 || mt.visible === false || (mt.transparent && mt.opacity < 0.5))); };\n      const body = []; marine.traverse((o) => { if (!o.isMesh || !o.visible || o.isInstancedMesh || isEffect(o)) return; for (let q = o; q; q = q.parent) { if (skip.has(q) || !q.visible) return; } body.push(o); });";
t = t.replace(old, () => neu);
fs.writeFileSync(p, t);
console.log('ok');
