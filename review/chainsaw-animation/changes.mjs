export function improveModel(source) {
  return edit(source, s => once(s, `  K.cyl(0.012, 0.012, 0.06, gunDark, -0.14, 0.02, -0.22, null, 6, 'x');
  K.sph(0.028, gunMid, -0.18, 0.02, -0.22, null, 8);
  K.box(0.02, 0.02, 0.08, gunPoly, -0.19, 0.02, -0.22);`, `  K.cyl(0.012, 0.012, 0.06, gunDark, 0.14, 0.12, -0.22, null, 6, 'x');
  const starter = new THREE.Group();
  starter.position.set(0.19, 0.12, -0.22);
  const SK = gunKit(starter);
  SK.sph(0.018, gunMid, 0.01, 0, 0, null, 8);
  SK.box(0.025, 0.025, 0.085, gunPoly, 0, 0, 0, 0, 0, 0, null, 0.005);
  gun.add(starter);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 6), gunDark);
  cord.visible = false;
  gun.add(cord);
  gun.userData.starterHandle = starter;
  gun.userData.starterCord = cord;
  gun.userData.starterHome = starter.position.clone();
  gun.userData.starterExit = new THREE.Vector3(0.16, 0.12, -0.22);`));
}
export function improveIndex(source) {
  return edit(source, s => {
    s = once(s, "    import { sampleBedExit } from './studio/marine-bed-exit.js';", "    import { sampleBedExit } from './studio/marine-bed-exit.js';\n    import { createSawStart, stepSawStart, sawStartPose } from './game/chainsaw-animation.js';");
    s = once(s, "    function updateGearSounds() {", `    const sawStart = createSawStart();
    function updateSawStart(dt) {
      stepSawStart(sawStart, dt, {
        equipped: gameStarted && !gameOver && !won && currentWeapon === 'chainsaw' && !unarmed &&
          !playerSwimming && !mortarMounted && !mortarCarried && !marineDown(),
        available: sawFuel > 0 && !marineDraw.state.active && !reloading &&
          knifeAnimT <= 0 && !vault && rollT <= 0 && swapT <= 0,
        suspended: paused || shopOpen
      });
      const gun = weaponMeshes.chainsaw;
      if (gun && sawStart.phase !== 'starting' && gun.userData.starterHandle) {
        gun.userData.starterHandle.position.copy(gun.userData.starterHome);
        gun.userData.starterCord.visible = false;
      }
    }
    function updateGearSounds() {`);
    s = once(s, "const sawWant = live && currentWeapon === 'chainsaw' && sawFuel > 0 && !playerSwimming && !mortarMounted && !mortarCarried;", "const sawWant = live && currentWeapon === 'chainsaw' && sawStart.phase !== 'off';");
    s = once(s, "      updateGearSounds();\n      updateBench();", "      updateSawStart(dt);\n      updateGearSounds();\n      updateBench();");
    s = once(s, "      if (fireHeld && currentWeapon === 'chainsaw') {", "      if (fireHeld && currentWeapon === 'chainsaw' && sawStart.phase === 'ready') {");
    s = once(s, "        off.x += gunLag.x; off.y += gunLag.y; off.z += gunLag.z;   // CL-133: the gun's inertia", `        off.x += gunLag.x; off.y += gunLag.y; off.z += gunLag.z;   // CL-133: the gun's inertia
        // GP-188: vibration belongs to the shared grip anchor, before either arm is solved.
        if (currentWeapon === 'chainsaw' && sawStart.phase === 'ready' && fireHeld) {
          const t = performance.now() * 0.001;
          off.x += Math.sin(t * 71) * 0.002;
          off.y += Math.sin(t * 83) * 0.0015;
          off.z += Math.sin(t * 67) * 0.001;
        }`);
    s = once(s, "        if (currentWeapon === 'chainsaw' && fireHeld) origin.add(_hv.g.set((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.015, (Math.random() - 0.5) * 0.01));\n", "");
    s = once(s, "      else if (palmItem === 'shell') reloadShellToPalm(gun, ud);\n    }", "      else if (palmItem === 'shell') reloadShellToPalm(gun, ud);\n      if (currentWeapon === 'chainsaw' && on && sawStart.phase === 'starting') poseSawStarter(gun, ud);\n    }");
    s = once(s, "    let _rlP = null;", `    // GP-188: keep the saw fixed in the bracing hand while the throttle hand works its cord.
    const _saw = { mount: new THREE.Matrix4(), local: new THREE.Matrix4(),
      home: new THREE.Vector3(), target: new THREE.Vector3(), grip: new THREE.Vector3(),
      channel: new THREE.Vector3(), end: new THREE.Vector3(), direction: new THREE.Vector3(), q: new THREE.Quaternion() };
    function poseSawStarter(gun, ud) {
      const data = gun.userData, handle = data.starterHandle, cord = data.starterCord;
      if (!handle || !cord) return;
      const pose = sawStartPose(sawStart);
      weaponMount.updateMatrixWorld(true);
      _saw.mount.copy(weaponMount.matrixWorld);
      _saw.home.copy(data.starterHome);
      _saw.target.copy(_saw.home).addScaledVector(_saw.direction.set(0.24, 0.11, -0.04), pose.cord);
      gun.localToWorld(_saw.target);
      _saw.grip.set(...WEAPON_HOLD.chainsaw.grip); gun.localToWorld(_saw.grip);
      _saw.target.lerp(_saw.grip, 1 - pose.take);
      gun.getWorldQuaternion(_saw.q);
      gripDownDir(_saw.channel).applyQuaternion(_saw.q);
      _saw.channel.lerp(_saw.direction.set(0, 0, 1).applyQuaternion(_saw.q), pose.take).normalize();
      handRollR = holdHand(ud.armRG, ud.elbowRG, _HAND_R, _saw.target, _saw.channel, 1, _POLE_R, 1, 1);
      ud.armRG.updateMatrixWorld(true);
      // weaponMount is parented below this moving arm: reseat its saved world transform.
      _saw.local.copy(weaponMount.parent.matrixWorld).invert().multiply(_saw.mount);
      _saw.local.decompose(weaponMount.position, weaponMount.quaternion, weaponMount.scale);
      weaponMount.updateMatrixWorld(true);
      handle.position.copy(data.starterHome);
      if (sawStart.t >= 0.22 && sawStart.t <= 0.67) {
        // The handle follows the actual closed fist, including the arm's reach limit.
        fistPointW(ud.elbowRG, _HAND_R, 1, _saw.end);
        gun.worldToLocal(_saw.end); handle.position.copy(_saw.end);
      }
      _saw.direction.subVectors(handle.position, data.starterExit);
      const length = _saw.direction.length();
      cord.visible = length > 0.035;
      cord.position.copy(data.starterExit).add(handle.position).multiplyScalar(0.5);
      cord.scale.set(1, Math.max(0.001, length), 1);
      cord.quaternion.setFromUnitVectors(_AXIS_Y, _saw.direction.normalize());
    }
    let _rlP = null;`);
    s = once(s, "        if (!fireHeld || won || gameOver || !gameStarted) {\n          AudioSys.chainsawStop();", "        if (sawStart.phase !== 'ready') fireHeld = false;   // GP-188: hands back before the chain can bite.\n        if (!fireHeld || won || gameOver || !gameStarted) {\n          AudioSys.chainsawStop();");
    const a = s.indexOf('        // Mount vibration / arm shake while cutting (hand-seated base)');
    const b = s.indexOf('        fireCooldown -= dt;', a);
    if(a<0 || b<0)throw Error('mount overwrite not found');
    s=s.slice(0,a)+'        // GP-188: the mount is already seated by holdWeapon; do not overwrite it after IK.\n'+s.slice(b);
    s = once(s, "getSawFuel: () => sawFuel,", "getSawFuel: () => sawFuel, sawStartDbg: () => ({ ...sawStart, ...sawStartPose(sawStart) }),");
    return s;
  });
}
function once(s, before, after) {
  if(s.split(before).length !== 2)throw Error('Expected one match: '+before.slice(0,90));
  return s.replace(before,after);
}
function edit(source, fn) {
  const crlf=source.includes('\r\n'); const result=fn(source.replaceAll('\r\n','\n'));
  return crlf ? result.replaceAll('\n','\r\n') : result;
}
