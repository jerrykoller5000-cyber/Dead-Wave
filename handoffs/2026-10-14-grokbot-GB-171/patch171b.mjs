import fs from 'node:fs';
const p = 'index.html', before = fs.readFileSync(p, 'utf8'), N = '\r\n';
const a = "        for (const kind of ['grenade', 'shell', 'mortar']) {" + N +
"          const m = acquireProjectileMesh(kind, () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshStandardMaterial({ color: 0x4a5530, roughness: 0.55, metalness: 0.4 }))); return g; });" + N +
"          releaseProjectileMesh(m);" + N + "        }" + N;
const b = "        // GB-171: warm the pools with the real meshes. A placeholder ball built here went back into the pool and every" + N +
"        // later throw reused it, so a thrown grenade (and a mortar round) never showed its model. The shotgun shell's" + N +
"        // builder is inline at its one use, so its pool fills on the first shot." + N +
"        for (const [kind, build] of [['grenade', () => makeFragGrenade({ THREE, r: 0.11 })], ['mortar', makeMortarRoundMesh]]) {" + N +
"          const m = acquireProjectileMesh(kind, build);" + N +
"          releaseProjectileMesh(m);" + N + "        }" + N;
if (before.split(a).length !== 2) { console.error('anchor', before.split(a).length - 1); process.exit(1); }
const next = before.replace(a, b);
if (fs.readFileSync(p, 'utf8') !== before) { console.error('changed under us'); process.exit(1); }
fs.writeFileSync(p, next, 'utf8'); console.log('patched');
