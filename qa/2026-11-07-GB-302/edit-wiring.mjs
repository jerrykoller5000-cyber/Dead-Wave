import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s.replace(/\n/g, '\r\n'), 'utf8');
const norm = (s) => s.replace(/\r\n/g, '\n');
function patch(path, find, repl, label) {
  const n = norm(read(path));
  const f = norm(find);
  const r = norm(repl);
  if (!n.includes(f)) {
    if (n.includes(r.slice(0, 70))) { console.log(label + ': already'); return; }
    throw new Error(label + ': not found');
  }
  write(path, n.replace(f, r));
  console.log(label + ': patched');
}

// viewmodel.js — expose new parts on the view gun
patch('game/viewmodel.js',
`    const gun = { key, src, root: r, pairs, slide: map.get(direct(ud.slide)) || null,
      work: map.get(direct(ud.work || ud.slide)) || null, mag: map.get(direct(ud.mag)) || null,
      pump: map.get(direct(ud.pump)) || null, bolt: map.get(direct(ud.bolt)) || null,
      cylinder: map.get(direct(ud.cylinder)) || null, shell: map.get(direct(ud.reloadShell)) || null,
      stock: map.get(ud.fpStock) || null,
      flash: map.get(ud.flash) || null,
      nodes: countNodes(src), s: 1, foot: null, magBase: null };
    gun.workBase = gun.work ? gun.work.position.clone() : null;
    gun.pumpBase = gun.pump ? gun.pump.position.clone() : null;
    gun.boltBase = gun.bolt ? gun.bolt.position.clone() : null;   // GB-301: exposed like the shotgun's pump
    gun.shellBase = gun.shell ? { pos: gun.shell.position.clone(), quat: gun.shell.quaternion.clone() } : null;`,
`    const gun = { key, src, root: r, pairs, slide: map.get(direct(ud.slide)) || null,
      work: map.get(direct(ud.work || ud.slide)) || null, mag: map.get(direct(ud.mag)) || null,
      pump: map.get(direct(ud.pump)) || null, bolt: map.get(direct(ud.bolt)) || null,
      cylinder: map.get(direct(ud.cylinder)) || null, shell: map.get(direct(ud.reloadShell)) || null,
      // GB-302: reload moving parts Claude drives (direct children of the gun root, as pump/slide).
      ammoBox: map.get(direct(ud.ammoBox)) || null,
      fuelCan: map.get(direct(ud.fuelCan)) || null,
      empties: map.get(direct(ud.empties)) || null,
      speedloader: map.get(direct(ud.speedloader)) || null,
      fuelCap: map.get(direct(ud.fuelCap)) || null,
      stock: map.get(ud.fpStock) || null,
      flash: map.get(ud.flash) || null,
      nodes: countNodes(src), s: 1, foot: null, magBase: null };
    gun.workBase = gun.work ? gun.work.position.clone() : null;
    gun.pumpBase = gun.pump ? gun.pump.position.clone() : null;
    gun.boltBase = gun.bolt ? gun.bolt.position.clone() : null;   // GB-301: exposed like the shotgun's pump
    gun.shellBase = gun.shell ? { pos: gun.shell.position.clone(), quat: gun.shell.quaternion.clone() } : null;
    gun.ammoBoxBase = gun.ammoBox ? { pos: gun.ammoBox.position.clone(), quat: gun.ammoBox.quaternion.clone() } : null;
    gun.fuelCanBase = gun.fuelCan ? { pos: gun.fuelCan.position.clone(), quat: gun.fuelCan.quaternion.clone() } : null;
    gun.emptiesBase = gun.empties ? { pos: gun.empties.position.clone(), quat: gun.empties.quaternion.clone() } : null;
    gun.speedloaderBase = gun.speedloader ? { pos: gun.speedloader.position.clone(), quat: gun.speedloader.quaternion.clone() } : null;
    gun.fuelCapBase = gun.fuelCap ? { pos: gun.fuelCap.position.clone(), quat: gun.fuelCap.quaternion.clone() } : null;`,
'viewmodel copyGun');

// index.html — clone reset list
patch('index.html',
`      for (const [key, base] of [['mag', 'Mag'], ['ammoBox', 'Ammo'], ['slide', 'Slide'], ['bolt', 'Bolt'],
        ['pump', 'Pump'], ['cylinder', 'Cylinder'], ['hammer', 'Hammer'], ['drum', 'Drum']]) {`,
`      for (const [key, base] of [['mag', 'Mag'], ['ammoBox', 'Ammo'], ['slide', 'Slide'], ['bolt', 'Bolt'],
        ['pump', 'Pump'], ['cylinder', 'Cylinder'], ['hammer', 'Hammer'], ['drum', 'Drum'],
        // GB-302
        ['fuelCan', 'FuelCan'], ['empties', 'Empties'], ['speedloader', 'Speedloader'], ['fuelCap', 'FuelCap'],
        ['reloadShell', 'ReloadShell']]) {`,
'index clone reset');

// index.html — cancel/reset reload parts (after reloadShell block)
patch('index.html',
`        if (gun.userData.reloadShell) {
          gun.userData.reloadShell.visible = false;
          if (gun.userData.baseReloadShellPos) {
            gun.userData.reloadShell.position.copy(gun.userData.baseReloadShellPos);
          }
        }
        if (gun.userData.cylinder && gun.userData.baseCylinderRot) {`,
`        if (gun.userData.reloadShell) {
          gun.userData.reloadShell.visible = false;
          if (gun.userData.baseReloadShellPos) {
            gun.userData.reloadShell.position.copy(gun.userData.baseReloadShellPos);
          }
          if (gun.userData.baseReloadShellRot) gun.userData.reloadShell.rotation.copy(gun.userData.baseReloadShellRot);
        }
        // GB-302: restore reload moving parts Claude drives
        if (gun.userData.fuelCan && gun.userData.baseFuelCanPos) {
          gun.userData.fuelCan.position.copy(gun.userData.baseFuelCanPos);
          if (gun.userData.baseFuelCanRot) gun.userData.fuelCan.rotation.copy(gun.userData.baseFuelCanRot);
          gun.userData.fuelCan.visible = true;
        }
        if (gun.userData.empties && gun.userData.baseEmptiesPos) {
          gun.userData.empties.position.copy(gun.userData.baseEmptiesPos);
          if (gun.userData.baseEmptiesRot) gun.userData.empties.rotation.copy(gun.userData.baseEmptiesRot);
          gun.userData.empties.visible = true;
          if (gun.userData.emptyCasings) for (const c of gun.userData.emptyCasings) c.visible = false;
        }
        if (gun.userData.speedloader && gun.userData.baseSpeedloaderPos) {
          gun.userData.speedloader.position.copy(gun.userData.baseSpeedloaderPos);
          if (gun.userData.baseSpeedloaderRot) gun.userData.speedloader.rotation.copy(gun.userData.baseSpeedloaderRot);
          gun.userData.speedloader.visible = false;
        }
        if (gun.userData.fuelCap && gun.userData.baseFuelCapPos) {
          gun.userData.fuelCap.position.copy(gun.userData.baseFuelCapPos);
          if (gun.userData.baseFuelCapRot) gun.userData.fuelCap.rotation.copy(gun.userData.baseFuelCapRot);
          gun.userData.fuelCap.visible = true;
        }
        if (gun.userData.cylinder && gun.userData.baseCylinderRot) {`,
'index reset parts');

console.log('wiring done');