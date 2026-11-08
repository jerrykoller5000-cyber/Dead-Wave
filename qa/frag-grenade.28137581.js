// studio/frag-grenade.js - GB-171 (Jerry, 2026-10-14: "this grenade could use some work"). An M67-style fragmentation
// grenade: a smooth body a little taller than wide (olive drab, a faint yellow marking band, a thin equator seam, a
// few scuffs, all in vertex colours), the fuse on top (threaded collar, fuse head, striker block), the spoon bent to
// the body's contour from the fuse down the +x side, the safety pin through the striker block and its pull ring.
// Built at body radius 1 inside a scaled group, so the caller's origin (the body's centre) and pivot are the old ones.
// Parts are separate, named meshes (body, fuse, spoon, pin, ring) so a pin pull or spoon fly can move them; three
// materials shared by every grenade built with the same THREE.
const MATS = new WeakMap();
function mats(THREE) {
  let m = MATS.get(THREE);
  if (!m) {
    m = {
      body: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.78, metalness: 0.08 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x9a9c94, roughness: 0.38, metalness: 0.78 }),
      spoon: new THREE.MeshStandardMaterial({ color: 0x575c45, roughness: 0.5, metalness: 0.55 })
    };
    MATS.set(THREE, m);
  }
  return m;
}
// A small deterministic hash, so every grenade has the same scuffs (and tests are stable).
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export const FRAG = Object.freeze({ TALL: 1.12, NECK: 0.3 });

export function makeFragGrenade({ THREE, r = 0.05, tall = FRAG.TALL }) {
  const M = mats(THREE);
  const outer = new THREE.Group(); outer.name = 'frag-grenade';
  const g = new THREE.Group(); g.name = 'frag-grenade-scale'; g.scale.setScalar(r); outer.add(g);

  // Body: an ellipse of revolution, opened at the neck. Extra rings at the band and the seam keep their edges crisp.
  const top = Math.sqrt(1 - FRAG.NECK * FRAG.NECK) * tall;   // where the body meets the neck
  const ys = [];
  for (let i = 0; i <= 22; i++) ys.push(-tall + (top + tall) * (1 - Math.cos(Math.PI * i / 22)) / 2);
  for (const y of [-0.03, -0.012, 0.012, 0.03, 0.40, 0.43, 0.53, 0.56].map((k) => k * tall)) ys.push(y);
  ys.sort((a, b) => a - b);
  const prof = ys.map((y) => new THREE.Vector2(Math.max(0.001, Math.sqrt(Math.max(0, 1 - (y / tall) ** 2))), y));
  const bodyGeo = new THREE.LatheGeometry(prof, 28);
  const pos = bodyGeo.attributes.position, col = new Float32Array(pos.count * 3);
  const olive = [0.30, 0.33, 0.21], band = [0.66, 0.58, 0.25];   // sRGB
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / tall, ang = Math.atan2(pos.getZ(i), pos.getX(i));
    let c = olive.slice();
    if (y > 0.43 && y < 0.53) c = band.map((v, k) => v * 0.8 + olive[k] * 0.2);   // the marking stripe
    if (Math.abs(y) < 0.014) c = c.map((v) => v * 0.55);                           // the seam
    const n = 0.95 + 0.07 * hash(Math.round(ang * 5) * 31 + Math.round(y * 9));     // tone variation, broad patches
    const scuff = hash(i * 7.3) > 0.965 ? 1.45 : 1;                                 // worn paint, bare spots
    for (let k = 0; k < 3; k++) col[i * 3 + k] = Math.pow(Math.min(1, c[k] * n * scuff), 2.2);   // vertex colours are linear
  }
  bodyGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  bodyGeo.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeo, M.body); body.name = 'body'; body.castShadow = true; g.add(body);

  // Fuse: one lathe (collar, three thread ridges, fuse head, cap) and the striker block on the spoon side.
  const f = (x, y) => new THREE.Vector2(x, top - 0.04 + y);
  const fuseGeo = new THREE.LatheGeometry([f(0.001, 0), f(0.32, 0), f(0.32, 0.07), f(0.29, 0.09), f(0.315, 0.12), f(0.29, 0.15),
    f(0.315, 0.18), f(0.29, 0.21), f(0.3, 0.23), f(0.27, 0.25), f(0.27, 0.5), f(0.22, 0.56), f(0.001, 0.57)], 18);
  const fuse = new THREE.Mesh(fuseGeo, M.metal); fuse.name = 'fuse'; g.add(fuse);
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.26), M.metal); block.name = 'fuse-block';
  block.position.set(0.3, top + 0.32, 0); fuse.add(block);

  // Spoon: a bent strip. Over the striker block, a short drop, then it follows the body ~0.05 off its skin down to
  // below the equator, the end turned in.
  const path = [[0.2, top + 0.47], [0.42, top + 0.46], [0.47, top + 0.36]];
  for (let k = 0; k <= 9; k++) {
    const a = 0.62 + k * (1.25 / 9);                       // polar angle from the top of the body
    path.push([Math.sin(a) * 1.06, Math.cos(a) * tall * 1.03]);
  }
  { const [x, y] = path[path.length - 1]; path.push([x - 0.08, y - 0.06]); }
  const sp = [], idx = [], N = path.length, T = 0.035;
  for (let i = 0; i < N; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(N - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const nx = ty, ny = -tx;                                // outward normal of the strip (path runs clockwise in xy)
    const w = (0.17 - 0.06 * (i / (N - 1)));               // half width, narrowing toward the end
    for (const s of [-1, 1]) for (const z of [-w, w]) sp.push(path[i][0] + nx * T * s / 2, path[i][1] + ny * T * s / 2, z);
  }
  // per ring: 0 (in,-z) 1 (in,+z) 2 (out,-z) 3 (out,+z)
  for (let i = 0; i < N - 1; i++) {
    const a = i * 4, b = a + 4;
    const quad = (p, q, r2, s) => idx.push(p, q, r2, p, r2, s);
    quad(a + 2, b + 2, b + 3, a + 3); quad(a + 1, b + 1, b, a); quad(a, b, b + 2, a + 2); quad(a + 3, b + 3, b + 1, a + 1);
  }
  idx.push(0, 2, 3, 0, 3, 1); { const e = (N - 1) * 4; idx.push(e, e + 1, e + 3, e, e + 3, e + 2); }
  const spoonGeo = new THREE.BufferGeometry();
  spoonGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); spoonGeo.setIndex(idx); spoonGeo.computeVertexNormals();
  const spoon = new THREE.Mesh(spoonGeo, M.spoon); spoon.name = 'spoon'; g.add(spoon);

  // Safety pin through the striker block (along z), the pull ring on its -z end, and the safety clip over the spoon.
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.5, 6), M.metal); pin.name = 'pin';
  pin.rotation.x = Math.PI / 2; pin.position.set(0.33, top + 0.3, -0.06); g.add(pin);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.026, 6, 16), M.metal); ring.name = 'ring';
  ring.position.set(0.33, top + 0.15, -0.34); ring.rotation.set(0, 0.35, 0.2); g.add(ring);
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.38), M.metal); clip.name = 'clip';
  clip.position.set(0.5, top + 0.12, 0); clip.rotation.z = -0.5; spoon.add(clip);

  outer.userData.parts = { body, fuse, spoon, pin, ring, clip };
  return outer;
}
