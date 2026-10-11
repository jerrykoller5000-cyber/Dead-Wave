const fs=require('fs'),crypto=require('crypto');const p='index.html',original=fs.readFileSync(p,'utf8'),hash=crypto.createHash('sha256').update(original).digest('hex');let s=original;const nl=s.includes('\r\n')?'\r\n':'\n',lines=a=>a.replaceAll('\n',nl);
function rep(a,b,n=1){const count=s.split(a).length-1;if(count!==n)throw Error(a.slice(0,80)+' count '+count);s=s.replaceAll(a,lines(b));}
rep('    import { steerDrowned,',"    import { militaryActive, militaryCanReach, stepMilitary, restoreMilitaryPose, resetMilitary, applyMilitaryPose, militaryProjectileHit, militaryBulletShare } from './game/military-behavior.js';\n    import { prepareMilitaryAppearance, cycleMilitaryCamo } from './game/military-appearance.js';\n    import { steerDrowned,");
rep('    const extraCamo = new Map();',`    const militaryCamoCache = new Map();
    function militaryCamoTile(key) {
      if (!militaryCamoCache.has(key)) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 256;
        paintCamoTile(key, cv);
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping; militaryCamoCache.set(key, tex);
      }
      return militaryCamoCache.get(key);
    }
    const extraCamo = new Map();`);
rep('      applyZombieConcept({ THREE, g, typeKey, scale: s, rbox });',`      applyZombieConcept({ THREE, g, typeKey, scale: s, rbox });
      if (typeKey === 'military') prepareMilitaryAppearance(THREE, g, militaryCamoTile); // GP-19864`);
rep("if (typeKey === 'shambler' || typeKey === 'drowned') prepareShamblerFeet","if (typeKey === 'shambler' || typeKey === 'drowned' || typeKey === 'military') prepareShamblerFeet");
rep('&& !(c.material.emissive && c.material.emissive.getHex() !== 0) && !c.material.transparent);','&& !c.material.userData.militaryUniform && !(c.material.emissive && c.material.emissive.getHex() !== 0) && !c.material.transparent);');
rep("        if (ud.typeKey === 'drowned') resetDrownedMotion({ typeKey: ud.typeKey, mesh });",`        if (ud.typeKey === 'drowned') resetDrownedMotion({ typeKey: ud.typeKey, mesh });
        if (ud.typeKey === 'military') { resetMilitary({ typeKey: ud.typeKey, mesh }); cycleMilitaryCamo(mesh); }`);
rep('      resetDrownedMotion(z); // GP-19863: restore shuffled feet before the corpse pose',`      resetMilitary(z); // GP-19864: restore the soldier before the corpse pose
      resetDrownedMotion(z); // GP-19863: restore shuffled feet before the corpse pose`);
rep('      for (const z of zombies) resetDrownedMotion(z);',`      for (const z of zombies) resetMilitary(z);
      for (const z of zombies) resetDrownedMotion(z);`);
rep('        restoreDrownedMotion(z);',`        restoreMilitaryPose(z); // GP-19864
        restoreDrownedMotion(z);`);
rep("if (tactics === 'weave' && !lured && !windowRoute)","if (tactics === 'weave' && !militaryActive(z) && !lured && !windowRoute)");
rep("if (tactics === 'weave' && z.rushT > 0)","if (tactics === 'weave' && !militaryActive(z) && z.rushT > 0)");
rep('        let drownedStep = null;',`        let militaryStep = null;
        if (z.typeKey === 'military') {
          const victim = zTarget(z), local = victim === localPlayer;
          militaryStep = stepMilitary(z, dt, { x:sx, z:sz, speed:spd, target:victim, grenades:grenadesInFlight, thrower:g=>playerById(g.throwerId),
            valid:!graceFreeze && !rising && !gameOver && !won && !scriptedKill && victim.alive !== false && !(victim.hp <= 0),
            canStart:!lured && !windowRoute && !z.abilityBusy && z.attackWindup <= 0 && !(z.swingT > 0), dodging:local && rollT > 0,
            blocked:(a,b)=>Math.abs(a.y-b.y)>1.3 || !!buildBetween(a.x,a.y+.25,a.z,b.x,b.y+.25,b.z) || segCrossesHouse(a.x,a.z,b.x,b.z,z.radius) });
          if (militaryStep) {
            sx=militaryStep.x; sz=militaryStep.z; spd=militaryStep.speed;
            if (militaryStep.hit) {
              damagePlayer(z.damage, 'military', z, null, victim); z.attackCd=Math.max(z.attackCd,.9);
              if (local && !devGodmode && !marineDown()) { hitStumble.aimOff=(z.swingSide||1)*.20; hitStumble.aimT=HIT_AIM_S; }
            }
            if (militaryStep.kicked) { const sa=sndAt(zx,zz,30); AudioSys.grenadeBounce(sa.v,sa.pan); }
          }
        }
        let drownedStep = null;`);
rep('z.mesh.rotation.y = drownedStep ?','z.mesh.rotation.y = militaryStep ? militaryStep.yaw : drownedStep ?');
rep('        applyDrownedMotion(z, dt);',`        applyMilitaryPose(z, dt); // GP-19864: planted combat stride, guard, bash and kick
        applyDrownedMotion(z, dt);`);
rep('&& !drownedStep && z.attackWindup <= 0','&& !drownedStep && !militaryStep?.busy && z.attackWindup <= 0');
rep('const contact = stillNearPlayer && drownedCanReach','const contact = stillNearPlayer && militaryCanReach(z, zTarget(z).position.x-z.mesh.position.x, zTarget(z).position.z-z.mesh.position.z) && drownedCanReach');
rep('else if (drownedCanReach(z, zTarget(z).position.x - mx','else if (militaryCanReach(z, zTarget(z).position.x-mx, zTarget(z).position.z-mz) && drownedCanReach(z, zTarget(z).position.x - mx');
rep('        from: origin.clone(),   // CU-97: where it left his hand',`        handThrown: true, throwerId: localPlayer.id, // GP-19864
        from: origin.clone(),   // CU-97: where it left his hand`);
rep('      const share = weakShare(z, weakTypeOf(kind, info));',`      let share = weakShare(z, weakTypeOf(kind, info));
      const militaryZone = z.typeKey === 'military' ? (info?.militaryZone || (info?.hitY != null && (info.hitY-z.mesh.position.y)/(z.hitH||1.4) > headLineOf(z) ? 'helmet' : info?.hitY != null ? 'chest' : 'exposed')) : null;
      if (militaryZone && kind === 'bullet' && share != null) share *= militaryBulletShare(militaryZone)/.8;`);
rep('      const upperHit = hitFrac > 0.62;',"      const upperHit = militaryZone ? militaryZone === 'face' : hitFrac > 0.62;");
rep('&& hitFrac > headLineOf(z) && !(z.partsLost',"&& (militaryZone ? militaryZone === 'face' : hitFrac > headLineOf(z)) && !(z.partsLost");
rep('        z.hitPartT = 0.45;',`        if (militaryZone && info.militaryPart) z.hitPart = info.militaryPart;
        z.hitPartT = 0.45;`);
// Scope the collision replacements to player/turret rounds, not contact-fused shells.
const start=s.indexOf('        if (p.pierce > 0) {'),end=s.indexOf('        // Bees / butterflies (1 HP)',start),prefix=s.slice(0,start),suffix=s.slice(end);s=s.slice(start,end);
rep('            const t = segmentHitsCylinder(','            let t = segmentHitsCylinder(',2);
rep('z.mesh.position.x, z.mesh.position.z, z.radius + 0.1, zy, zy + (z.hitH || 1.45)',"z.mesh.position.x, z.mesh.position.z, z.radius + (z.typeKey === 'military' ? .3 : .1), zy, zy + (z.hitH || 1.45) + (z.typeKey === 'military' ? .4 : 0)",2);
rep('            if (t !== null && t < wallT) _pierceHits.push({ z, t });',`            let militaryHit = null;
            if (t !== null && z.typeKey === 'military') { militaryHit=militaryProjectileHit(THREE,z,p.prev,p.pos); t=militaryHit?.t ?? null; }
            if (t !== null && t < wallT) _pierceHits.push({ z, t, militaryHit });`);
rep('            if (t !== null && t < hitZT && t < wallT) { hitZT = t; hitZ = z; }',`            let militaryHit = null;
            if (t !== null && z.typeKey === 'military') { militaryHit=militaryProjectileHit(THREE,z,p.prev,p.pos); t=militaryHit?.t ?? null; }
            if (t !== null && t < hitZT && t < wallT) { hitZT = t; hitZ = z; z._militaryRound=militaryHit; }`);
rep("damageZombie(h.z, p.damage, { kind: p.kind || 'bullet', dir: { x: p.dir.x, z: p.dir.z }, hitY: hy,", "damageZombie(h.z, p.damage, { kind: p.kind || 'bullet', dir: { x: p.dir.x, z: p.dir.z }, hitY: hy, militaryZone:h.militaryHit?.zone, militaryPart:h.militaryHit?.part,");
rep("damageZombie(hitZ, p.damage, { kind: p.kind || 'bullet', dir: { x: p.dir.x, z: p.dir.z }, hitY: hy,", "damageZombie(hitZ, p.damage, { kind: p.kind || 'bullet', dir: { x: p.dir.x, z: p.dir.z }, hitY: hy, militaryZone:hitZ._militaryRound?.zone, militaryPart:hitZ._militaryRound?.part,");
s=prefix+s+suffix;if(crypto.createHash('sha256').update(fs.readFileSync(p,'utf8')).digest('hex')!==hash)throw Error('concurrent edit');fs.writeFileSync(p,s);
const w='game/weaknesses.js',v=fs.readFileSync(w,'utf8');if(!v.includes('military: { bullet: 0.7'))throw Error('weakness changed');fs.writeFileSync(w,v.replace('military: { bullet: 0.7','military: { bullet: 0.8').replace('fire: 0.88, blast: 1.4','fire: 0.88, blast: 0.6'));
console.log('Focused military hooks installed');
