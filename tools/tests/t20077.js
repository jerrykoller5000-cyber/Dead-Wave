// GU-9. Measure the third-person player from the actual builder, with the cloth and skull at their assembled scales.
// Use the unbaked mesh names to exclude the helmet, eyes, pouches and carried items from the anatomical measurements.
(async () => {
  const T = window.TT, THREE = T.THREE, out = [];
  const check = (ok, label) => out.push((ok ? 'PASS ' : 'FAIL ') + label);
  const between = (value, min, max, name) =>
    check(Number.isFinite(value) && value >= min && value <= max, name + ' = ' + value.toFixed(3));
  try {
    const body = T.makeMarine({ skin: false }), rig = body.userData;
    body.updateMatrixWorld(true);
    const pt = new THREE.Vector3();
    const points = root => {
      const result = [];
      root.traverse(mesh => {
        if (!mesh.isMesh) return;
        const pos = mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          pt.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mesh.matrixWorld);
          result.push(pt.clone());
        }
      });
      return result;
    };
    const distance = (a, b) => a.getWorldPosition(new THREE.Vector3()).distanceTo(b.getWorldPosition(new THREE.Vector3()));
    const skull = points(body.getObjectByName('marine-shaped-head'));
    // Rigid batching joins the collar, placket and pockets even with skinning disabled.
    // Their center-front vertices above the clavicles contain the rim of the collar.
    const shirt = rig.torsoG.children.filter(o => o.isMesh && o.material?.name === 'wear:shirt').flatMap(points);
    const collar = shirt.filter(p => Math.abs(p.x) < .016 && p.z > .008 && p.y > 1.23);
    const foot = points(rig.ankleLG), sole = Math.min(...foot.map(p => p.y));
    const faceFront = Math.max(...skull.map(p => p.z));
    const chin = Math.min(...skull.filter(p => p.z > faceFront - .035).map(p => p.y));
    const crown = Math.max(...skull.map(p => p.y));
    const frontCollar = Math.max(...collar.map(p => p.y));
    between((crown - sole) / (crown - chin), 6.9, 7.9, 'standing height in heads');
    between(chin - frontCollar, .025, .070, 'visible neck above the front collar (m)');
    between(distance(rig.armLG, rig.armRG), .36, .40, 'shoulder joint spacing (m)');
    between(distance(rig.legLG, rig.legRG), .20, .225, 'hip joint spacing (m)');
    const hipHeight = rig.legLG.getWorldPosition(new THREE.Vector3()).y;
    const legs = [];
    body.traverse(mesh => {
      if (mesh.name !== 'live-trouser-leg' || mesh.material?.name !== 'wear:trousers') return;
      mesh.userData.cloth.bend();
      legs.push(points(mesh).filter(v => v.y > hipHeight-.060 && v.y < hipHeight));
    });
    check(legs.length === 2 && legs.every(leg => leg.length), 'both upper trouser legs sampled just below the hip joints');
    const outerX = legs.flat().map(v => v.x);
    between(Math.max(...outerX)-Math.min(...outerX), .315, .335, 'upper trouser fabric across both legs (m)');
    const footZ = foot.map(p => p.z), footX = foot.map(p => p.x);
    between(Math.max(...footZ) - Math.min(...footZ), .244, .264, 'boot heel to toe (m)');
    between(Math.max(...footX) - Math.min(...footX), .096, .114, 'boot width (m)');
    check(collar.length > 0 && shirt.every(p => [p.x,p.y,p.z].every(Number.isFinite)), 'the rigid shirt, including the collar, has finite vertices');
    const live = T.getMarine().userData;
    between(distance(live.armLG, live.armRG), .36, .40, 'the playable character uses the measured build');
    T.grantAllWeapons();
    const worn = T.carryDbg({inHand:null,akimbo:false});
    check(worn.slung.filter(Boolean).length === Number(worn.plan.primaryKinds.some(Boolean)) &&
      !worn.holstered.some(Boolean) && worn.hip === 'pistol', 'the worn loadout has one available spare primary and its hip sidearm');
    T.carryDbg({loadout:{primary:['minigun','m4'],secondary:[null,null]},inHand:null,akimbo:false});
    for (const spot of live.carry.slings) {
      let triangles = 0, valid = true;
      spot.gun?.traverseVisible(mesh => {
        if (!mesh.isMesh) return;
        const mat = mesh.material;
        valid &&= Array.isArray(mat) ? mesh.geometry.groups.every(g => mat[g.materialIndex]?.isMaterial) : !!mat?.isMaterial;
        triangles += (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) * (mesh.isInstancedMesh ? mesh.count : 1) / 3;
      });
      check(valid && triangles > 2500, 'stowed ' + spot.kind + ' has a visible body and valid materials (' + triangles + ' triangles)');
    }
    T.carryDbg();
  } catch (e) { check(false, 'threw: ' + (e.stack || e)); }
  return out.join('\n');
})()
