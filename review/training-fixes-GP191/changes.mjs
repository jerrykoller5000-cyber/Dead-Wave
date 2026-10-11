function edit(source, from, to) {
  if (!source.includes(from) || source.indexOf(from) !== source.lastIndexOf(from)) throw Error('Expected one match: ' + from.slice(0, 110));
  return source.replace(from, to);
}
const normal = s => s.replace(/\r\n/g, '\n');

export function improveProps(input) {
  let s = normal(input);
  s = edit(s, 'box, add, std, texture', 'box: roomBox, add: roomAdd, std, texture');
  s = edit(s, "  const rubber =", `  let moving = null;
  const route = m => { if (moving) moving.add(m); return m; };
  const add = (...args) => route(roomAdd(...args));
  const box = (...args) => route(roomBox(...args));
  const gateLeaves = [-1, 1].map(side => {
    const leaf = new T.Group(); leaf.name = 'training-gate-leaf-' + side;
    leaf.userData.side = side; return leaf;
  });
  const rubber =`);
  s = edit(s, '  box(8.0,5.36,.13,dark,gx,2.68,gz-.08);\n  box(6.62,4.45,.16,rubber,gx,2.28,gz-.19);', `  // A real opening: the room supplies the passage behind these moving leaves.
  box(8.0,.8,.13,dark,gx,4.96,gz-.08);`);
  s = edit(s, '    const px=gx+side*1.65;', `    const px=gx+side*1.65;
    moving = gateLeaves[side < 0 ? 0 : 1];`);
  s = edit(s, '    box(.43,4.72,.48,steel', '    moving = null;\n    box(.43,4.72,.48,steel');
  s = edit(s, '    for(let i=0;i<7;i++)box(.92,.045,.055,rubber,px,3.92+i*.046,gz-.46);', `    moving = gateLeaves[side < 0 ? 0 : 1];
    for(let i=0;i<7;i++)box(.92,.045,.055,rubber,px,3.92+i*.046,gz-.46);
    moving = null;`);
  s = edit(s, '  box(.17,4.28,.16,dark,gx,2.24,gz-.56);', '  moving = gateLeaves[0];\n  box(.17,4.28,.16,dark,gx,2.24,gz-.56);');
  s = edit(s, '  bolt(gx,2.1,gz-.72,.09);', '  bolt(gx,2.1,gz-.72,.09);\n  moving = null;');
  s = edit(s, "  if(labels.containment)sign(labels.containment,3.1,.21,gx,3.62,gz-.78,Math.PI,{bg:'#27352b',color:'#c7c9ae',size:115});", `  if(labels.containment) {
    const label = sign(labels.containment,3.1,.21,gx-1.65,3.62,gz-.78,Math.PI,{bg:'#27352b',color:'#c7c9ae',size:115});
    gateLeaves[0].add(label);
  }`);
  s = edit(s, "  if(labels.medical)sign(labels.medical,.74,.18,cx,1.02,cz+.477,0,{bg:'#25312b',color:'#d2cfb2',size:110});\n}", `  if(labels.medical)sign(labels.medical,.74,.18,cx,1.02,cz+.477,0,{bg:'#25312b',color:'#d2cfb2',size:110});
  return { gateLeaves, gateLamp: amber };
}`);
  return s;
}

export function improveWorld(input) {
  let s = normal(input);
  s = edit(s, '  wall(B.minX, B.maxZ, B.maxX, B.maxZ, 0, -1, HB);', `  // Split the far wall around the containment opening and enclose its holding passage.
  const gateX = (B.minX + B.maxX) / 2, gateHalfWidth = 3.3, gateHeight = 4.5;
  wall(B.minX, B.maxZ, gateX - gateHalfWidth, B.maxZ, 0, -1, HB);
  wall(gateX + gateHalfWidth, B.maxZ, B.maxX, B.maxZ, 0, -1, HB);
  const gateHeader = add(tileUv(new T.PlaneGeometry(6.6, HB - gateHeight), 6.6, HB - gateHeight), wallMatOne,
    gateX, gateHeight + (HB - gateHeight) / 2, B.maxZ);
  gateHeader.rotation.y = Math.PI;
  solids.push({ minX: O.x + gateX - 3.3, maxX: O.x + gateX + 3.3, minY: O.y + gateHeight, maxY: O.y + HB,
    minZ: O.z + B.maxZ, maxZ: O.z + B.maxZ + .3, wall: true });
  wall(gateX - 3.3, B.maxZ, gateX - 3.3, B.maxZ + 7, 1, 0, gateHeight);
  wall(gateX + 3.3, B.maxZ, gateX + 3.3, B.maxZ + 7, -1, 0, gateHeight);
  wall(gateX - 3.3, B.maxZ + 7, gateX + 3.3, B.maxZ + 7, 0, -1, gateHeight);
  const passageFloor = box(6.6,.04,7,steel,gateX,-.02,B.maxZ+3.5);
  const passageRoof = box(6.6,.12,7,steel,gateX,gateHeight+.06,B.maxZ+3.5);`);
  s = edit(s, '  dressTrainingProps(T, {', '  const releaseProps = dressTrainingProps(T, {');
  s = edit(s, '    sign, steel, steelLight, hazard, lampMat, labels: opts.labels });', `    sign, steel, steelLight, hazard, lampMat, labels: opts.labels });
  const gateLeafSolids = releaseProps.gateLeaves.map(leaf => {
    g.add(leaf); g.updateMatrixWorld(true);
    const b = new T.Box3().setFromObject(leaf);
    const solid = { minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y,
      minZ: b.min.z, maxZ: b.max.z, prop: true, containment: true };
    solids.push(solid); bakeStatic(T, leaf);
    return { solid, minX: solid.minX, maxX: solid.maxX };
  });
  const releaseGate = {
    leaves: releaseProps.gateLeaves, lamp: releaseProps.gateLamp,
    passage: { x: O.x + gate.x, wallZ: O.z + B.maxZ, spawnZ: O.z + B.maxZ + 3, halfWidth: 3.3 },
    setState({ amount = 0, lit = false }) {
      releaseProps.gateLeaves.forEach((leaf, i) => {
        const dx = leaf.userData.side * 3.5 * amount;
        leaf.position.x = dx;
        gateLeafSolids[i].solid.minX = gateLeafSolids[i].minX + dx;
        gateLeafSolids[i].solid.maxX = gateLeafSolids[i].maxX + dx;
      });
      releaseProps.gateLamp.emissiveIntensity = lit ? 3.5 : .06;
      releaseProps.gateLamp.color.setHex(lit ? 0xffd36a : 0x65451b);
    }
  };
  releaseGate.setState({});`);
  s = edit(s, '  const gc = (i) => i * grid;', '  const offset = opts.gridOffset || 0;\n  const gc = (i) => i * grid + offset;');
  s = s.replaceAll('(O.x + B.minX + grid / 2) / grid', '(O.x + B.minX + grid / 2 - offset) / grid')
    .replaceAll('(O.x + B.maxX - grid / 2) / grid', '(O.x + B.maxX - grid / 2 - offset) / grid')
    .replaceAll('(O.z + B.minZ + grid / 2) / grid', '(O.z + B.minZ + grid / 2 - offset) / grid')
    .replaceAll('(O.z + B.maxZ - grid / 2) / grid', '(O.z + B.maxZ - grid / 2 - offset) / grid');
  s = edit(s, "B.minX + 1.6, -3.0, 3.4", "B.minX + 1.8, -5.2, 4.4");
  s = edit(s, "    if (gateDist(gc(gx), gc(gz)) <= clear) return 'gate';", `    if (gateDist(gc(gx), gc(gz)) <= clear) return 'gate';
    // Wall-adjacent cells fit; occupied support-column cells do not.
    const x = gc(gx), z = gc(gz), h = grid / 2;
    if (solids.some(s => s.column && x + h > s.minX && x - h < s.maxX && z + h > s.minZ && z - h < s.maxZ)) return 'column';`);
  s = edit(s, 'station(B.minX + 0.02, 2.35,', 'station(B.minX + 0.02, 3.0,');
  s = edit(s, 'station(B.minX + 0.02, -1.5,', 'station(B.minX + 0.02, -3.0,');
  s = edit(s, 'z: O.z - 1.5 };', 'z: O.z - 3.0 };');
  s = edit(s, 'shutter, lever, ...targets', 'shutter, lever, passageFloor, passageRoof, ...releaseProps.gateLeaves, ...targets');
  s = edit(s, 'const pivots = new Set(targets.map((t) => t.pivot));', 'const pivots = new Set([...targets.map((t) => t.pivot), ...releaseProps.gateLeaves]);');
  s = edit(s, 'lights, baked, securityDoor,', 'lights, baked, securityDoor, releaseGate,');
  s = edit(s, '\n    build: { grid, minGX,', '\n    build: { grid, offset, minGX,');
  return s;
}

export function improveIndex(input) {
  let s = normal(input);
  s = edit(s, "    import { createTrainingDeployment }", "    import { createTrainingRelease } from './ui/training-release.js';   // GP-191\n    import { createTrainingDeployment }");
  s = edit(s, 'function gridIndex(v) { return Math.round(v / BUILD_GRID); }', 'function gridIndex(v) { return Math.round((v - (training.active ? BUILD_GRID / 2 : 0)) / BUILD_GRID); }');
  s = edit(s, 'function gridCentre(i) { return i * BUILD_GRID; }', 'function gridCentre(i) { return i * BUILD_GRID + (training.active ? BUILD_GRID / 2 : 0); }');
  s = edit(s, 'function cornerPos(i) { return (i - 0.5) * BUILD_GRID; }', 'function cornerPos(i) { return gridCentre(i) - BUILD_GRID / 2; }');
  s = edit(s, 'function cornerIndex(v) { return Math.round(v / BUILD_GRID + 0.5); }', 'function cornerIndex(v) { return gridIndex(v + BUILD_GRID / 2); }');
  s = edit(s, 'sampleHeight(gx * BUILD_GRID, gz * BUILD_GRID)', 'sampleHeight(gridCentre(gx), gridCentre(gz))');
  s = edit(s, 'buildTrainingGround(THREE, {', 'buildTrainingGround(THREE, { gridOffset: BUILD_GRID / 2,');
  s = edit(s, '      // The moving parts: the same node in the copy', `      // The Training alarm has its own beacon material; HQ lighting must not overwrite it.
      if (out.hqPanel && house.panelBeacon) {
        const beacon = house.panelBeacon.clone(); out.alarmBeacon = beacon;
        out.hqPanel.copy.traverse(o => { if (o.isMesh && o.material === house.panelBeacon) o.material = beacon; });
      }
      // The moving parts: the same node in the copy`);
  s = edit(s, '      if (!training.panel) { training.panel', `      if (!training.release) training.release = createTrainingRelease({ onChange: state => {
        training.tg?.releaseGate?.setState(state);
        const beacon = training.copies?.alarmBeacon;
        if (beacon) { beacon.emissiveIntensity = state.lit ? 3.5 : .06; beacon.color.setHex(state.lit ? 0xffd36a : 0x65451b); }
      } });
      if (!training.panel) { training.panel`);
  s = s.replaceAll('training.deployment.cancel();', 'training.deployment.cancel(); training.release?.reset();')
    .replaceAll('training.deployment?.cancel();', 'training.deployment?.cancel(); training.release?.reset();');
  s = edit(s, 'if (accepted) { trainingKeepPlayer(); AudioSys.trainingAlarm(); }', 'if (accepted) { training.release.begin(); trainingKeepPlayer(); AudioSys.trainingAlarm(); }');
  s = edit(s, 'const x = tg.gate.x + ((i % 5) - 2) * 0.95, z = tg.gate.z - Math.floor(i / 5) * 1.0;', `const passage = tg.releaseGate.passage;
        const x = tg.gate.x + ((i % 5) - 2) * 0.95, z = passage.spawnZ + Math.floor(i / 5) * 1.2;`);
  // Only the normal call deploys behind the door; screamers still summon within the room.
  const at = s.indexOf('    function trainingDeployNow('), end = s.indexOf('    // Leftovers', at);
  const section = s.slice(at, end).replace('zm.trainingZ = true; made++;', `zm.trainingZ = true;
          const margin = (zm.radius || .42) + .18;
          zm.trainingEntry = { x: Math.max(passage.x - 3.3 + margin, Math.min(passage.x + 3.3 - margin, x)), z };
          zm.mesh.position.x = zm.trainingEntry.x; made++;`);
  s = s.slice(0, at) + section + s.slice(end);
  s = edit(s, '      if (!r) return;\n      const p = z.mesh.position,', `      if (!r) return;
      if (z.trainingEntry) {
        z.mesh.position.x = z.trainingEntry.x; z.mesh.position.z = z.trainingEntry.z;
        return;
      }
      const p = z.mesh.position,`);
  s = edit(s, '      if (!paused && !shopOpen && !cifOpen && !training.wake) training.deployment?.tick(dt);', `      if (!paused && !shopOpen && !cifOpen && !training.wake) {
        const entrants = zombies.filter(z => z.alive && z.trainingEntry);
        training.release?.tick(dt, training.deployment?.read(), entrants.length);
        training.deployment?.tick(dt);
        for (const z of entrants) {
          const entry = z.trainingEntry;
          entry.z -= dt * 3;
          z.mesh.position.set(entry.x, tg.floorY, entry.z); z.mesh.rotation.y = Math.PI;
          if (entry.z <= tg.releaseGate.passage.wallZ - (z.radius || .42) - 1) delete z.trainingEntry;
        }
      }`);
  return s;
}
