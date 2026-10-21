import fs from 'node:fs';
const p = 'index.html', before = fs.readFileSync(p, 'utf8'), N = '\r\n';
const swaps = [
  ["    import { makeKatanaModel, makeSheathedKatana } from './studio/katana.js';   // CL-184: the red katana" + N,
   "    import { makeKatanaModel, makeSheathedKatana } from './studio/katana.js';   // CL-184: the red katana" + N +
   "    import { makeFragGrenade } from './studio/frag-grenade.js';   // GB-171: the M67-style frag grenade" + N],
  ["      const body = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshStandardMaterial({ color: 0x3a5a30, roughness: 0.65, metalness: 0.35 }));" + N +
   "      body.scale.set(1, 1.18, 1); grenadeHand.add(body);" + N +
   "      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.01, 0.055), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.35 }));" + N +
   "      lever.position.set(0.036, 0.03, 0); grenadeHand.add(lever);" + N +
   "      const pin = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 12), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.25 }));" + N +
   "      pin.position.set(0, 0.062, 0); pin.rotation.x = Math.PI / 2; grenadeHand.add(pin);" + N,
   "      // GB-171 (Jerry: \"this grenade could use some work\"): the M67-style model, same size, origin and spoon side (+x)." + N +
   "      const frag = makeFragGrenade({ THREE, r: 0.05 }); grenadeHand.add(frag); grenadeHand.userData.parts = frag.userData.parts;" + N],
];
let next = before;
for (const [a, b] of swaps) { const n = next.split(a).length - 1; if (n !== 1) { console.error('anchor', n, a.slice(0, 60)); process.exit(1); } next = next.replace(a, b); }
// the thrown one: from "const g = new THREE.Group();" to "return g;" inside acquireProjectileMesh('grenade'
const k = next.indexOf("const mesh = acquireProjectileMesh('grenade', () => {" + N);
if (k < 0 || next.indexOf("const mesh = acquireProjectileMesh('grenade', () => {", k + 10) >= 0) { console.error('thrown anchor'); process.exit(1); }
const s0 = next.indexOf('        const g = new THREE.Group();' + N, k), s1 = next.indexOf('        return g;' + N, k);
if (s0 < 0 || s1 < 0 || s1 - k > 1400) { console.error('thrown body', s0, s1); process.exit(1); }
next = next.slice(0, s0) + "        return makeFragGrenade({ THREE, r: 0.11 });   // GB-171: the M67-style model (was a 0.11 sphere, a box lever, a torus)" + N + next.slice(s1 + ('        return g;' + N).length);
if (fs.readFileSync(p, 'utf8') !== before) { console.error('changed under us'); process.exit(1); }
fs.writeFileSync(p, next, 'utf8'); console.log('patched');
