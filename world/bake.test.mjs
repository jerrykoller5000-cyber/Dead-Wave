// node world/bake.test.mjs — CL-218: foldStatic (and bakeStatic leaving folded meshes alone)
import assert from 'node:assert/strict';
import test from 'node:test';
import { register } from 'node:module';
// The vendored three.tsl.js imports the bare 'three/webgpu' (the game's import map); point it at the vendored file.
const V = new URL('../vendor/three/', import.meta.url).href;
register('data:text/javascript,' + encodeURIComponent(`const V = ${JSON.stringify(V)}, M = { 'three': 'three.webgpu.js', 'three/webgpu': 'three.webgpu.js', 'three/tsl': 'three.tsl.js' };
export async function resolve(s, c, next) { return M[s] ? { url: V + M[s], shortCircuit: true } : next(s, c); }`));
const THREE = await import(V + 'three.webgpu.js');
const TSL = await import(V + 'three.tsl.js');
const { bakeStatic, foldStatic } = await import('./bake.js');

const box = (mat, x, name = '') => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat); m.position.x = x; m.name = name; m.castShadow = true; return m; };
const std = (o) => new THREE.MeshStandardMaterial(o);

test('plain colours fold into one draw, with their colour, roughness and metalness per vertex', () => {
  const g = new THREE.Group();
  const red = std({ color: 0xff0000, roughness: 0.3, metalness: 0.7 }), blue = std({ color: 0x0000ff, roughness: 0.9, metalness: 0 });
  g.add(box(red, 0), box(blue, 2), box(red, 4));
  const r = foldStatic(THREE, TSL, g);
  assert.equal(r.folded, 1); assert.equal(r.removed, 3);
  assert.equal(g.children.length, 1);
  const m = g.children[0], geo = m.geometry;
  assert.ok(m.material.isMeshStandardNodeMaterial && m.material.vertexColors);
  assert.equal(geo.attributes.position.count, 36 * 3);
  const c = geo.attributes.color, rm = geo.attributes.foldRM;
  assert.ok(Math.abs(c.getX(0) - 1) < 1e-6 && c.getZ(0) === 0, 'the first box red');
  assert.ok(Math.abs(c.getZ(36) - 1) < 1e-6 && c.getX(36) === 0, 'the second blue');
  assert.ok(Math.abs(rm.getX(0) - 0.3) < 1e-6 && Math.abs(rm.getY(0) - 0.7) < 1e-6 && Math.abs(rm.getX(36) - 0.9) < 1e-6);
  assert.ok(Math.abs(geo.boundingBox.max.x - 4.5) < 1e-6, 'positions in the group\'s frame');
  assert.ok(m.castShadow);
});

test('glows, textures, see-through, held, named, skipped and hidden things stay as they are', () => {
  const g = new THREE.Group();
  const plain = std({ color: 0x808080 }), glow = std({ color: 0xffffff, emissive: 0xff0000, emissiveIntensity: 1 });
  const glass = std({ color: 0xffffff, transparent: true, opacity: 0.5 }), tex = std({ map: new THREE.Texture() }), held = std({ color: 0x00ff00 });
  const keep = box(plain, 10);
  const hidden = new THREE.Group(); hidden.visible = false; hidden.add(box(plain, 12));
  const named = new THREE.Group(); named.name = 'someones'; named.add(box(plain, 14));
  g.add(box(plain, 0), box(plain, 1), box(glow, 2), box(glass, 3), box(tex, 4), box(held, 5), box(held, 6), keep, hidden, named);
  const r = foldStatic(THREE, TSL, g, { skip: (o) => o === keep, hold: new Set([held]) });
  assert.equal(r.removed, 2, 'only the two plain boxes');
  assert.equal(hidden.children.length, 1); assert.equal(named.children.length, 1); assert.equal(keep.parent, g);
});

test('enter lets a named dressing group be folded in', () => {
  const g = new THREE.Group(), d = new THREE.Group(); d.name = 'dressing';
  d.add(box(std({ color: 0x111111 }), 0), box(std({ color: 0x222222 }), 1)); g.add(d, box(std({ color: 0x333333 }), 3));
  const r = foldStatic(THREE, TSL, g, { enter: (o) => o.name === 'dressing' });
  assert.equal(r.removed, 3); assert.equal(d.children.length, 0);
});

test('bakeStatic leaves folded meshes alone (it would drop their colours)', () => {
  const g = new THREE.Group(), a = new THREE.Group(), b = new THREE.Group();
  a.add(box(std({ color: 0xff0000 }), 0), box(std({ color: 0x00ff00 }), 1));
  b.add(box(std({ color: 0x0000ff }), 3), box(std({ color: 0xffff00 }), 4));
  foldStatic(THREE, TSL, a); foldStatic(THREE, TSL, b);
  g.add(a, b);
  const r = bakeStatic(THREE, g);
  assert.equal(r.merged, 0);
  assert.ok(a.children[0].geometry.attributes.foldRM && b.children[0].geometry.attributes.foldRM);
});
