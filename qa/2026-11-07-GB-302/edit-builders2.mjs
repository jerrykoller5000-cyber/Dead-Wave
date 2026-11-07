import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s.replace(/\n/g, '\r\n'), 'utf8');
const norm = (s) => s.replace(/\r\n/g, '\n');
function patch(path, find, repl, label) {
  const n = norm(read(path));
  const f = norm(find);
  const r = norm(repl);
  if (!n.includes(f)) {
    if (n.includes('GB-302: fuel cap is a named part') || n.includes('GB-302: six empties')) { console.log(label + ': already'); return; }
    const i = n.indexOf('Exhaust muffler');
    console.log('nearby', JSON.stringify(n.slice(i, i+350)));
    throw new Error(label + ': not found');
  }
  write(path, n.replace(f, r));
  console.log(label + ': patched');
}
patch('studio/weapon-heavy.js',
  `  // Exhaust muffler with a dark vent, fuel and oil caps, spark-plug boot at rear of cowling.
  K.box(0.05, 0.09, 0.1, gunDark, 0.14, 0.02, 0.05, 0, 0, 0, null, 0.012);
  for (let i = 0; i < 3; i++) K.box(0.006, 0.05, 0.012, gunRubber, 0.166, 0.02, 0.025 + i * 0.022);
  K.cyl(0.025, 0.025, 0.02, gunRubber, -0.12, 0.1, -0.15, null, 10, 'x');
  K.cyl(0.02, 0.02, 0.02, gunRubber, -0.12, 0.02, -0.03, null, 10, 'x');
  K.box(0.028, 0.024, 0.036, gunRubber, 0.045, 0.168, -0.232, -0.35, 0, 0, null, 0.008);`,
  `  // Exhaust muffler with a dark vent, fuel and oil caps, spark-plug boot at rear of cowling.
  K.box(0.05, 0.09, 0.1, gunDark, 0.14, 0.02, 0.05, 0, 0, 0, null, 0.012);
  for (let i = 0; i < 3; i++) K.box(0.006, 0.05, 0.012, gunRubber, 0.166, 0.02, 0.025 + i * 0.022);
  // GB-302: fuel cap is a named part Claude can unscrew during the gas refill.
  const fuelCap = K.group(-0.12, 0.1, -0.15);
  K.cyl(0.025, 0.025, 0.02, gunRubber, 0, 0, 0, fuelCap, 10, 'x');
  K.cyl(0.012, 0.012, 0.008, gunAccent, 0.012, 0, 0, fuelCap, 8, 'x');
  gun.userData.fuelCap = fuelCap;
  gun.userData.baseFuelCapPos = fuelCap.position.clone();
  gun.userData.baseFuelCapRot = fuelCap.rotation.clone();
  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {
    fuelCap: { restPos: [-0.12, 0.1, -0.15], restRot: [0, 0, 0], visibleAtRest: true, note: 'unscrew, pour, screw back' }
  });
  K.cyl(0.02, 0.02, 0.02, gunRubber, -0.12, 0.02, -0.03, null, 10, 'x');
  K.box(0.028, 0.024, 0.036, gunRubber, 0.045, 0.168, -0.232, -0.35, 0, 0, null, 0.008);`,
  'heavy fuelCap');

patch('studio/weapon-sidearms.js',
  `export function makeRevolverModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, finishGun, revolverSteel: steelMat, woodMat, woodDark, gunDark, gunAccent, gunRubber } = ctx;   // GB-233: its own steel`,
  `export function makeRevolverModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, finishGun, revolverSteel: steelMat, woodMat, woodDark, gunDark, gunAccent, gunRubber, brassMat } = ctx;   // GB-233: its own steel; GB-302 brass for empties/loader`,
  'sidearms destr');

const emptiesBlock = `  gun.userData.pairReload = { right: [0.06, 0.50], left: [0.48, 0.92] };
  gun.userData.cylinderSwing = { openX: -0.095, openY: -0.008, openZ: 0.01, yaw: -0.16, ejectX: -0.012 };
  // GB-302: six empties + a speedloader Claude can drive on the reload (pair cylinder swing is GB-300).
  const empties = new THREE.Group();
  empties.name = 'empties';
  const emptyCasings = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    const casing = new THREE.Group();
    casing.position.set(Math.cos(a) * 0.033, 0.05 + Math.sin(a) * 0.033, 0.02);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.0085, 0.038, 8), brassMat);
    body.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.004, 8), brassMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.z = -0.019;
    casing.add(body, rim);
    casing.visible = false;
    empties.add(casing);
    emptyCasings.push(casing);
  }
  gun.add(empties);
  gun.userData.empties = empties;
  gun.userData.emptyCasings = emptyCasings;
  gun.userData.baseEmptiesPos = empties.position.clone();
  gun.userData.baseEmptiesRot = empties.rotation.clone();
  const speedloader = new THREE.Group();
  speedloader.name = 'speedloader';
  speedloader.position.set(-0.02, 0.05, 0.02);
  const loaderRing = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.004, 8, 16), gunDark);
  loaderRing.rotation.y = Math.PI / 2;
  speedloader.add(loaderRing);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    const rnd = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.008, 0.036, 8), brassMat);
    rnd.rotation.x = Math.PI / 2;
    rnd.position.set(Math.cos(a) * 0.033, Math.sin(a) * 0.033, 0);
    speedloader.add(rnd);
  }
  speedloader.visible = false;
  gun.add(speedloader);
  gun.userData.speedloader = speedloader;
  gun.userData.baseSpeedloaderPos = speedloader.position.clone();
  gun.userData.baseSpeedloaderRot = speedloader.rotation.clone();
  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {
    empties: { restPos: [0, 0, 0], restRot: [0, 0, 0], visibleAtRest: false, chamberR: 0.033, chamberY0: 0.05, chamberZ0: 0.02, note: 'six casings; show on eject, then fall' },
    speedloader: { restPos: [-0.02, 0.05, 0.02], restRot: [0, 0, 0], visibleAtRest: false, note: 'into the open cylinder; hide at rest' },
    cylinder: { restPos: [0, 0.05, 0.02], swing: gun.userData.cylinderSwing, pairReload: gun.userData.pairReload }
  });
  // The reference has a smooth full underlug`;

patch('studio/weapon-sidearms.js',
  `  gun.userData.pairReload = { right: [0.06, 0.50], left: [0.48, 0.92] };
  gun.userData.cylinderSwing = { openX: -0.095, openY: -0.008, openZ: 0.01, yaw: -0.16, ejectX: -0.012 };
  // The reference has a smooth full underlug`,
  emptiesBlock,
  'sidearms empties');
console.log('part2 done');