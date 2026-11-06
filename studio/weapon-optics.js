// GP-20025: standalone 1.3 sight studies. Gun-local convention: +Z muzzle, +Y up.
// The group origin is the centre of its mounting foot; no weapon builder uses these yet.
import * as THREE from 'three';

const paint = new THREE.MeshStandardMaterial({ color: 0x303633, metalness: 0.08, roughness: 0.67 });
const alloy = new THREE.MeshStandardMaterial({ color: 0x4b5354, metalness: 0.83, roughness: 0.43 });
const edge = new THREE.MeshStandardMaterial({ color: 0x858b83, metalness: 0.9, roughness: 0.42 });
const rimMetal = edge.clone(); rimMetal.side = THREE.DoubleSide;
const rubber = new THREE.MeshStandardMaterial({ color: 0x171c1c, metalness: 0, roughness: 0.9 });
const lens = new THREE.MeshPhysicalMaterial({ color: 0x77989a, metalness: 0, roughness: 0.14, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
const reticle = new THREE.MeshBasicMaterial({ color: 0xb1392c, transparent: true, opacity: 0.86, depthWrite: false, side: THREE.DoubleSide });

function box(root, name, mat, size, at, tilt = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.name = name;
  mesh.position.set(...at);
  mesh.rotation.x = tilt;
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

function beveledBox(root, name, mat, size, at, bevel = 0.0012) {
  const [w, h, d] = size, b = Math.min(bevel, w / 5, h / 5, d / 5);
  const x = w / 2 - b, y = h / 2 - b;
  const shape = new THREE.Shape();
  shape.moveTo(-x, -y); shape.lineTo(x, -y); shape.lineTo(x, y); shape.lineTo(-x, y); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * b, steps: 1, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 });
  geo.translate(0, 0, -d / 2 + b);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name; mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
  return mesh;
}

function cylinder(root, name, mat, r, length, at, axis = 'z', sides = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, length, sides), mat);
  mesh.name = name;
  mesh.rotation[axis === 'z' ? 'x' : 'z'] = Math.PI / 2;
  mesh.position.set(...at);
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

function glass(root, width, height, y, z, round = false) {
  const pane = new THREE.Mesh(round ? new THREE.CircleGeometry(width / 2, 24) : new THREE.PlaneGeometry(width, height), lens);
  pane.name = 'faint blue-gray optical glass';
  pane.position.set(0, y, z);
  root.add(pane);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(round ? 0.0016 : 0.0013, 8), reticle);
  dot.name = 'low-intensity virtual dot';
  dot.position.set(0, y, z - 0.0004);
  root.add(dot);
}

function foot(root, width, length) {
  beveledBox(root, 'chamfered alloy clamp foot', alloy, [width, 0.004, length], [0, 0.002, 0], 0.0008);
  beveledBox(root, 'painted riser', paint, [width * 0.84, 0.007, length * 0.72], [0, 0.007, 0]);
  for (const side of [-1, 1]) {
    box(root, 'rail clamp lip', edge, [0.0025, 0.005, length * 0.85], [side * (width / 2 - 0.001), 0.001, 0]);
    cylinder(root, 'recessed clamp screw', rubber, 0.002, 0.001, [side * (width / 2 + 0.0005), 0.004, -length * 0.18], 'x', 8);
  }
}

function mini(root) {
  foot(root, 0.029, 0.049);
  beveledBox(root, 'low emitter housing', paint, [0.026, 0.009, 0.023], [0, 0.014, -0.009], 0.0015);
  for (const side of [-1, 1]) {
    box(root, 'cast window cheek', alloy, [0.0035, 0.016, 0.009], [side * 0.0145, 0.024, 0.011], -0.12);
    box(root, 'worn outer bevel', edge, [0.001, 0.013, 0.007], [side * 0.0168, 0.024, 0.011], -0.12);
  }
  box(root, 'window top bridge', alloy, [0.034, 0.003, 0.007], [0, 0.032, 0.011]);
  glass(root, 0.026, 0.014, 0.024, 0.011);
  box(root, 'rubberized brightness key', rubber, [0.004, 0.003, 0.008], [0.014, 0.019, -0.014]);
  return { eye: [0, 0.024, -0.036], dot: [0, 0.024, 0.011] };
}

function tube(root) {
  foot(root, 0.046, 0.065);
  for (const z of [-0.020, 0.020]) beveledBox(root, 'ring cradle', alloy, [0.042, 0.012, 0.011], [0, 0.015, z]);
  // Open-ended rolled tube; dark inner wall and two slim metal rims show real wall thickness.
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.070, 24, 1, true), paint);
  shell.name = 'open-ended cylindrical housing'; shell.rotation.x = Math.PI / 2; shell.position.y = 0.042; shell.castShadow = true; root.add(shell);
  const inside = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.069, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x0f1717, metalness: 0.08, roughness: 0.86, side: THREE.BackSide }));
  inside.name = 'anti-glare bore'; inside.rotation.x = Math.PI / 2; inside.position.y = 0.042; root.add(inside);
  for (const z of [-0.034, 0.034]) {
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.0205, 0.024, 20), rimMetal);
    rim.name = 'exposed machined rim'; rim.position.set(0, 0.042, z); root.add(rim);
  }
  glass(root, 0.041, 0.041, 0.042, 0.029, true);
  cylinder(root, 'elevation turret', alloy, 0.009, 0.009, [0, 0.070, -0.010], 'y', 16);
  cylinder(root, 'windage turret', alloy, 0.007, 0.008, [0.028, 0.042, -0.010], 'x', 12);
  return { eye: [0, 0.042, -0.041], dot: [0, 0.042, 0.029] };
}

function holo(root) {
  foot(root, 0.052, 0.105);
  // Keep the emitter in the low chassis; the glass above it occupies nearly the whole face.
  beveledBox(root, 'polymer battery and emitter chassis', paint, [0.054, 0.017, 0.082], [0, 0.018, -0.010], 0.0025);
  for (const side of [-1, 1]) {
    box(root, 'hood side wall', alloy, [0.003, 0.015, 0.068], [side * 0.027, 0.069, 0.005]);
    box(root, 'front window upright', edge, [0.003, 0.042, 0.005], [side * 0.025, 0.055, 0.034]);
    box(root, 'rear hood support', alloy, [0.003, 0.050, 0.005], [side * 0.025, 0.0515, -0.026]);
  }
  beveledBox(root, 'hood eave', alloy, [0.056, 0.006, 0.070], [0, 0.079, 0.007]);
  box(root, 'window lower sill', alloy, [0.049, 0.004, 0.009], [0, 0.033, 0.032]);
  glass(root, 0.046, 0.043, 0.055, 0.032);
  cylinder(root, 'brightness dial', rubber, 0.007, 0.005, [0.034, 0.026, -0.027], 'x', 12);
  return { eye: [0, 0.055, -0.061], dot: [0, 0.055, 0.032] };
}

export function makeOptic(kind) {
  const optic = new THREE.Group();
  optic.name = `optic.${kind}`;
  const sight = kind === 'mini-reflex' ? mini(optic) : kind === 'reflex' ? tube(optic) : kind === 'holo' ? holo(optic) : null;
  if (!sight) throw new RangeError(`Unknown optic kind: ${kind}`);
  optic.userData.sight = sight;
  optic.userData.mount = [0, 0, 0];
  return optic;
}
