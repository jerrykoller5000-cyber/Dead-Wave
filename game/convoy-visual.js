// GP-19938: the first medical wreck's overturned ambulance. This is visual only;
// the landmark's existing solids and the objective cooler keep their own owners.
export function buildConvoyVisual(THREE, TSL, foldStatic, wreck, groundAt) {
  const C = {
    shell: 0xc5c3b6, roof: 0xa9aa9e, shade: 0x818b83, red: 0x9d3735,
    fadedRed: 0x723a37, black: 0x242b2b, glass: 0x273a40, steel: 0x747a73,
    rust: 0x795341, lamp: 0xd8c797, rubber: 0x202322, pulse: 0xffd45c
  };
  const mats = new Map();
  const mat = (color, more = {}) => {
    const key = `${color}/${more.metalness || 0}/${more.emissive || 0}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({
      color, roughness: 0.86, metalness: more.metalness || 0,
      emissive: more.emissive || 0, emissiveIntensity: more.emissive ? 0.3 : 0
    }));
    return mats.get(key);
  };
  const add = (group, geo, color, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, mat(color));
    mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    return mesh;
  };
  const box = (g, w, h, d, c, x, y, z, rx, ry, rz) =>
    add(g, new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz);
  const cyl = (g, rt, rb, h, c, x, y, z, rx, ry, rz) =>
    add(g, new THREE.CylinderGeometry(rt, rb, h, 12), c, x, y, z, rx, ry, rz);
  const bar = (g, a, b, r, c) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const m = add(g, new THREE.CylinderGeometry(r, r, A.distanceTo(B), 6), c, 0, 0, 0);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
    return m;
  };

  // Roll onto the right flank. The right cab door is low, directly above the
  // objective case at (1.5, -1.2); the left wheels and roof remain conspicuous.
  const vehicle = new THREE.Group();
  vehicle.name = 'convoy-ambulance';
  vehicle.position.y = 1.58;
  vehicle.rotation.z = -0.89;
  wreck.add(vehicle);
  const still = new THREE.Group(); vehicle.add(still);
  // A full ambulance cabin, with a separate bonnet and a hollow front cab.
  box(still, 2.28, .14, 3.35, C.shell, 0, -.89, 1.02);
  box(still, 2.32, .15, 3.38, C.roof, 0, .94, 1.02);
  for (const x of [-1.12, 1.12]) {
    box(still, .13, 1.77, 3.35, C.shell, x, .02, 1.02);
    box(still, .025, .17, 3.26, C.red, x + Math.sign(x) * .077, .12, 1.02);
    box(still, .035, .035, 3.2, C.fadedRed, x + Math.sign(x) * .09, -.56, 1.02);
  }
  box(still, 2.24, 1.78, .14, C.shell, 0, .02, 2.71);
  box(still, 2.22, 1.72, .12, C.shade, 0, .01, -.66);
  // Rear medical doors, broad crosses and their damaged centre seam.
  box(still, .055, 1.56, .025, C.black, 0, .03, 2.81);
  for (const x of [-.52, .52]) {
    box(still, .6, .12, .026, C.red, x, .17, 2.805);
    box(still, .12, .59, .026, C.red, x, .17, 2.81);
    box(still, .12, .05, .07, C.steel, x * .32, -.14, 2.84);
  }
  box(still, 2.17, .17, 1.92, C.shell, 0, -.89, -1.6);
  box(still, 2.18, .16, 1.96, C.roof, 0, .88, -1.59);
  box(still, 2.16, 1.6, .11, C.shell, 0, -.02, -.62);
  // The cab has real side-window gaps. The right panel is the moving door.
  box(still, .1, .44, 1.85, C.shell, -1.08, -.64, -1.59);
  box(still, .1, .18, 1.82, C.shell, -1.08, .71, -1.59);
  box(still, .035, .95, 1.65, C.glass, -1.14, .15, -1.58);
  box(still, .12, 1.68, .13, C.steel, -1.08, -.01, -2.48);
  box(still, .12, 1.68, .13, C.steel, 1.08, -.01, -2.48);
  box(still, 2.12, .23, .08, C.steel, 0, .72, -2.5);
  box(still, 2.1, .23, .08, C.shell, 0, -.75, -2.5);
  box(still, 2.01, 1.15, .028, C.glass, 0, .03, -2.54);
  // Bonnet, radiator, bumper and one broken lamp.
  box(still, 2.09, .47, .65, C.shell, 0, -.47, -2.81);
  box(still, 1.48, .34, .04, C.black, 0, -.48, -3.155);
  for (let i = -4; i <= 4; i++) box(still, .045, .3, .02, C.steel, i * .16, -.48, -3.18);
  box(still, 2.32, .17, .17, C.steel, .05, -.82, -3.19, 0, 0, -.08);
  for (const x of [-.86, .86]) {
    cyl(still, .15, .15, .06, x < 0 ? C.lamp : C.rust, x, -.42, -3.17, Math.PI / 2);
  }
  // Six tyres make the rollover legible from any approach.
  for (const x of [-1.17, 1.17]) for (const z of [-2.03, .37, 2.08]) {
    cyl(still, .43, .43, .24, C.rubber, x, -.71, z, 0, 0, Math.PI / 2);
    cyl(still, .22, .22, .252, C.rust, x + Math.sign(x) * .02, -.71, z, 0, 0, Math.PI / 2);
    cyl(still, .095, .095, .26, C.steel, x + Math.sign(x) * .025, -.71, z, 0, 0, Math.PI / 2);
  }
  for (const z of [-2.75, 2.23]) {
    box(still, .7, .16, .3, C.red, -.55, .99, z);
    box(still, .7, .16, .3, C.glass, .55, .99, z);
  }
  // Creased metal and shattered windshield strokes, still part of the static draw.
  bar(still, [-.89, .62, -2.59], [-.18, -.18, -2.6], .016, C.steel);
  bar(still, [-.18, -.18, -2.6], [.19, -.03, -2.6], .012, C.steel);
  box(still, .8, .055, 1.04, C.shade, -.22, .99, -.84, 0, .08, -.1);
  box(still, .3, .035, .92, C.rust, .43, -.98, .84, 0, .12, -.18);

  // Door hinge at the front edge; opening swings the painted panel out of the
  // player's sight line to the sleeper. The door folds into one moving draw.
  const hinge = new THREE.Group(); hinge.position.set(1.12, 0, -2.48); vehicle.add(hinge);
  const door = new THREE.Group(); hinge.add(door);
  box(door, .095, 1.45, 1.77, C.shell, 0, -.08, .89);
  box(door, .105, .09, 1.65, C.red, .004, -.2, .89);
  box(door, .035, .67, 1.46, C.glass, .055, .33, .88);
  box(door, .055, .09, .22, C.steel, .09, -.16, 1.13);
  box(door, .027, .37, .37, C.red, .068, -.58, .88);
  box(door, .03, .09, .37, C.red, .07, -.58, .88);
  // Local cab metal holds the sleeper while the upright mount sits just clear
  // of the original front collider, so a visible shot is not blocked by it.
  const sleeperMount = new THREE.Group();
  sleeperMount.name = 'convoy-sleeper-mount';
  const sleeperRestY = groundAt(1.55, -1.5) + .13;
  sleeperMount.position.set(1.55, sleeperRestY, -1.5);
  sleeperMount.rotation.y = Math.PI / 2;
  sleeperMount.scale.setScalar(.68);
  wreck.add(sleeperMount);

  const jack = new THREE.Group(); jack.name = 'convoy-jack'; wreck.add(jack);
  const jackX = 1.72, jackZ = -2.28;
  jack.position.set(jackX, groundAt(jackX, jackZ), jackZ);
  box(jack, .6, .08, .5, C.black, 0, .04, 0);
  box(jack, .3, .12, .28, C.rust, 0, .14, 0);
  const ram = new THREE.Group(); jack.add(ram);
  cyl(ram, .09, .12, .52, C.steel, 0, .45, 0);
  cyl(ram, .15, .15, .07, C.black, 0, .74, 0);
  bar(jack, [.05, .34, 0], [.52, .72, .14], .035, C.steel);
  box(jack, .18, .07, .1, C.rubber, .57, .75, .15);
  // One glowing beat ring is the only constantly changing jack draw.
  const pulseMat = new THREE.MeshStandardMaterial({ color: C.pulse, emissive: C.pulse, emissiveIntensity: .12, roughness: .65 });
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(.25, .029, 6, 20), pulseMat);
  pulse.rotation.x = Math.PI / 2; pulse.position.y = .17; jack.add(pulse);
  // The cooler itself is the existing objective prop, at (1.5, -1.2). A bent
  // sill above it explains why it cannot be pulled free until the jack lifts.
  const cy = groundAt(1.5, -1.2);
  const pin = new THREE.Group(); wreck.add(pin);
  box(pin, .42, .12, .75, C.rust, 1.46, cy + .39, -1.2, 0, -.11, .22);
  bar(pin, [1.31, cy + .38, -1.58], [1.63, cy + .29, -.85], .035, C.steel);

  // foldStatic carries paint, steel and rubber per vertex; the door is folded
  // separately because its hinge changes rotation at runtime.
  foldStatic(THREE, TSL, still);
  foldStatic(THREE, TSL, door);
  foldStatic(THREE, TSL, jack, { skip: (o) => o === pulse || o === ram });
  foldStatic(THREE, TSL, ram);
  foldStatic(THREE, TSL, pin);
  wreck.updateWorldMatrix(true, true);
  const jackAt = wreck.localToWorld(new THREE.Vector3(jackX + .42, groundAt(jackX, jackZ), jackZ + .15));
  const setDoorOpen = (open) => { hinge.rotation.y = open ? 1.52 : 0; };
  const setBeatPulse = (v) => {
    const t = Math.max(0, Math.min(1, Number(v) || 0));
    pulse.scale.setScalar(1 + t * .32);
    pulseMat.emissiveIntensity = .12 + t * 2.6;
  };
  const setJackProgress = (v) => {
    const rise = Math.max(0, Math.min(1, Number(v) || 0)) * .2;
    ram.position.y = rise;
    vehicle.position.y = 1.58 + rise;
    pin.position.y = rise;
    sleeperMount.position.y = sleeperRestY + rise;
  };
  setDoorOpen(false); setBeatPulse(0); setJackProgress(0);
  return { jackAt, sleeperMount, setDoorOpen, setBeatPulse, setJackProgress, vehicle, jack, door: hinge };
}
