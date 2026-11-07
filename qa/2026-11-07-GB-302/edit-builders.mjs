// GB-302 builders
import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s.replace(/\n/g, '\r\n'), 'utf8');
const norm = (s) => s.replace(/\r\n/g, '\n');
function patch(path, find, repl, label) {
  const n = norm(read(path));
  const f = norm(find);
  const r = norm(repl);
  if (!n.includes(f)) {
    if (n.includes(r.slice(0, Math.min(80, r.length)))) { console.log(label + ': already'); return; }
    throw new Error(label + ': not found');
  }
  write(path, n.replace(f, r));
  console.log(label + ': patched');
}
patch('studio/weapon-longarms.js',
  '  gun.userData.reloadShell = loadShell;\n  gun.userData.baseReloadShellPos = loadShell.position.clone();\n  gunSuppressor(gun, K, \'shotgun\');   // CL-95',
  '  gun.userData.reloadShell = loadShell;\n  gun.userData.baseReloadShellPos = loadShell.position.clone();\n  gun.userData.baseReloadShellRot = loadShell.rotation.clone();\n  // GB-302: Claude drives the loading-port shell via VM_RELOADS (view gun.shell).\n  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {\n    reloadShell: { restPos: [0.02, -0.05, 0.22], restRot: [Math.PI / 2, 0, 0], visibleAtRest: false }\n  });\n  gunSuppressor(gun, K, \'shotgun\');   // CL-95',
  'longarms reloadShell');
patch('studio/weapon-heavy.js',
  '  gun.userData.ammoBox = ammoBox;\n  gun.userData.mag = ammoBox;\n  gun.userData.baseBarrelRotX = 0;\n  gun.userData.baseAmmoPos = ammoBox.position.clone();\n  gun.userData.baseAmmoRot = ammoBox.rotation.clone();\n  return finishGun(gun);\n}',
  '  gun.userData.ammoBox = ammoBox;\n  gun.userData.mag = ammoBox;\n  gun.userData.baseBarrelRotX = 0;\n  gun.userData.baseAmmoPos = ammoBox.position.clone();\n  gun.userData.baseAmmoRot = ammoBox.rotation.clone();\n  // GB-302: Claude drives the ammo box (view gun.ammoBox / mag).\n  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {\n    ammoBox: { restPos: [0.2, -0.08, -0.02], restRot: [0, 0, 0.12], visibleAtRest: true }\n  });\n  return finishGun(gun);\n}',
  'heavy ammoBox');
patch('studio/weapon-heavy.js',
  '  for (const part of gun.children.slice(tankStart)) tanks.add(part);\n  gun.userData.mag = tanks;\n  gun.userData.baseMagPos = tanks.position.clone();\n  gun.userData.baseMagRot = tanks.rotation.clone();\n  // Rear pistol grip',
  '  for (const part of gun.children.slice(tankStart)) tanks.add(part);\n  gun.userData.mag = tanks;\n  gun.userData.baseMagPos = tanks.position.clone();\n  gun.userData.baseMagRot = tanks.rotation.clone();\n  // GB-302: the reload\'s moving can (off/on). Same group as mag; Claude drives fuelCan.\n  gun.userData.fuelCan = tanks;\n  gun.userData.baseFuelCanPos = tanks.position.clone();\n  gun.userData.baseFuelCanRot = tanks.rotation.clone();\n  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {\n    fuelCan: { restPos: [0, 0, 0], restRot: [0, 0, 0], visibleAtRest: true, note: \'whole tank bank; pull down/away, fresh on with a twist\' }\n  });\n  // Rear pistol grip',
  'heavy fuelCan');
console.log('part1 done');