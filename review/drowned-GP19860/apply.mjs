// One-time focused integration. Never restore before.html over the shared checkout.
import fs from 'node:fs';import crypto from 'node:crypto';
const digest=t=>crypto.createHash('sha256').update(t).digest('hex');
function edit(path,fn){const old=fs.readFileSync(path,'utf8'),hash=digest(old),next=fn(old);if(digest(fs.readFileSync(path,'utf8'))!==hash)throw Error(path+' changed during edit');fs.writeFileSync(path,next,'utf8');}
function once(t,a,b){const nl=t.includes('\r\n')?'\r\n':'\n';if(t.split(a).length!==2)a=a.replace(/\r?\n/g,nl);if(t.split(a).length!==2)throw Error('expected one match: '+a.slice(0,100));return t.replace(a,b.replace(/\r?\n/g,nl));}
edit('index.html',t=>{
  fs.writeFileSync('review/drowned-GP19860/before.html',t);
  t=once(t,"    import { steerShambler, shamblerCanReach, hasShamblerSteering }", "    import { DROWNED, restoreDrownedPose, resetDrowned, clearDrowned, stepDrowned, drownedPull, drownedPace, releaseDrowned, breakDrownedGrip, smotherDrownedFires, applyDrownedPose } from './game/drowned-behavior.js'; // GP-19860\n    import { steerShambler, shamblerCanReach, hasShamblerSteering }");
  t=once(t,'      rollT = ROLL_DUR;','      breakDrownedGrip(localPlayer); // GP-19860: the roll breaks a wet grip before moving\n      rollT = ROLL_DUR;');
  t=once(t,'      z.alive = false;\n      updateZombieAbilityVisuals(z, simTime, {});', '      z.alive = false;\n      resetDrowned(z); // GP-19860: death releases the victim and restores the corpse pose\n      updateZombieAbilityVisuals(z, simTime, {});');
  t=once(t,'    function clearZombies() {\n      clearSpiderWebs();','    function clearZombies() {\n      clearDrowned(zombies); // GP-19860: no stale grip on room exit/reset\n      clearSpiderWebs();');
  t=once(t,'      return Math.max(WEAK_MIN, Math.min(WEAK_MAX, s));','      const floor = z.typeKey === \'drowned\' && (type === \'fire\' || type === \'burn\') ? .1 : WEAK_MIN; // GP-19860: wet bodies resist 90percent, all other floors unchanged\n      return Math.max(floor, Math.min(WEAK_MAX, s));');
  t=once(t,"    function damageZombie(z, amount, info = null) {\n      if (!z.alive) return;\n      const kind = (info && info.kind) || 'generic';", "    function damageZombie(z, amount, info = null) {\n      if (!z.alive) return;\n      const kind = (info && info.kind) || 'generic';\n      if (kind === 'melee' || kind === 'chainsaw') releaseDrowned(z); // GP-19860: a landed blade breaks the grip");
  t=once(t,'    function updateZombies(dt) {',`    // GP-19860: existing cover/terrain/build collision rules also govern wet grips and dousing.
    function drownedBlocked(a, b) {
      return !!shotBlocked({ x:a.x, y:a.y+.7, z:a.z }, { x:b.x, y:b.y+.7, z:b.z });
    }
    function pullDrownedVictim(z, dx, dz) {
      const pull = drownedPull(z, dx, dz);
      if (!pull) return;
      const victim = pull.target, p = victim.position, fromX = p.x, fromZ = p.z;
      let x = fromX + pull.x, zz = fromZ + pull.z;
      if (entityGroundY(x, zz, p.y + STEP_UP) > p.y + STEP_UP || drownedBlocked(p, {x, y:p.y, z:zz})) { releaseDrowned(z); return; }
      let q = resolveSoftBarricades(x, zz, PLAYER_RADIUS, 1);
      q = resolveHardBuildCollisions(q.x, q.z, PLAYER_RADIUS, true, p.y);
      q = resolveStaticProps(q.x, q.z, PLAYER_RADIUS, p.y);
      if (house.present) q = pushOutOfHouse(q.x, q.z, PLAYER_RADIUS);
      const safe = resolveDeckBody(q.x, q.z, p.y, fromX, fromZ, p.y);
      if (Math.hypot(safe.x-x, safe.z-zz) > .025) { releaseDrowned(z); return; }
      p.x = safe.x; p.z = safe.z;
    }
    function updateZombies(dt) {`);
  t=once(t,'      hordeFrame(dt);   // GB-94','      hordeFrame(dt);   // GB-94\n      for (const p of smotherDrownedFires(zombies, groundFires, dt, drownedBlocked)) spawnSmokePuff(p.x, p.y, p.z, { tone:\'pale\', size:.22, grow:.35, vy:.65, life:.65, peak:.35 }); // GP-19860: small pooled steam puffs');
  t=once(t,'        tickSpiderMotion(z, dt); // restore prior Spider pose before reactions','        restoreDrownedPose(z); // GP-19860: restore last grab overlay before the normal rig poses\n        tickSpiderMotion(z, dt); // restore prior Spider pose before reactions');
  t=once(t,'        if (z.abilityBusy) spd = 0;   // GP-179: feet stay planted through the tell and follow-through',`        let drownedStep = null;
        if (z.typeKey === 'drowned') {
          const victim = zTarget(z), local = victim === localPlayer;
          const valid = !gameOver && !won && !scriptedKill && (!local || (!marineDown() && !climbingTower && !vault && !mortarMounted && !mortarCarried)) && victim.alive !== false && !(victim.hp <= 0);
          drownedStep = stepDrowned(z, dt, { target:victim, radius:PLAYER_RADIUS, now:simTime, valid:valid && !graceFreeze && !rising,
            canStart:!lured && !windowRoute && tx === px0 && tz === pz0 && z.attackCd <= 0 && z.attackWindup <= 0 && !(z.swingT > 0),
            dodging:local && rollT > 0, blocked:drownedBlocked(z.mesh.position, victim.position) });
          if (drownedStep) {
            sx = drownedStep.x; sz = drownedStep.z; spd = drownedStep.speed;
            if (drownedStep.started) { const sa = sndAt(zx, zz, 30); AudioSys.zombieVoice('drowned', 'attack', sa.v, sa.pan, z); }
            if (drownedStep.caught) {
              damagePlayer(z.damage, 'drowned', z, null, victim);
              if (local) showBanner(dwText('world.message.drownedGrab'), dwText('world.message.drownedGrabHelp'), 1.2, '#b6e6da');
            }
          }
        }
        if (z.abilityBusy) spd = 0;   // GP-179: feet stay planted through the tell and follow-through`);
  t=once(t,'        // Stumps pump: a pulse every fifth of a second, weakening, for a couple of','        if (drownedStep?.phase === \'drag\') pullDrownedVictim(z, mx-zx, mz-zz); // GP-19860: resolved backward steps, never teleport through walls\n\n        // Stumps pump: a pulse every fifth of a second, weakening, for a couple of');
  t=once(t,'if (!knocked) z.mesh.rotation.y = spiderTurn ? spiderTurn.yaw : shamblerTurn ? shamblerTurn.yaw : Math.atan2(sx, sz);','if (!knocked) z.mesh.rotation.y = drownedStep ? drownedStep.yaw : spiderTurn ? spiderTurn.yaw : shamblerTurn ? shamblerTurn.yaw : Math.atan2(sx, sz);');
  t=once(t,'        applyShamblerRecovery(z);','        applyShamblerRecovery(z);\n        applyDrownedPose(z); // GP-19860: open two-arm reach, bent elbows and backward hauling');
  t=once(t,'&& !spiderWander && !shamblerRecovering && z.attackWindup <= 0','&& !spiderWander && !shamblerRecovering && !drownedStep && z.attackWindup <= 0');
  t=once(t,'        // Spawn swimming water ripples','        targetSpeed *= drownedPace(localPlayer); // GP-19860: movement remains available during the brief grip\n\n        // Spawn swimming water ripples');
  // Exact marker is capitalized differently in this version; alternate handled below before saving.
  return t;
});
edit('game/weaknesses.js',t=>once(t,'drowned:  { bullet: 0.96, pellet: 1.3,  fire: 0.4,','drowned:  { bullet: 0.96, pellet: 1.3,  fire: 0.1,'));
edit('game/weaknesses.test.mjs',t=>once(t,'share => share >= 0.2 && share <= 1.6','share => share >= (kind === \'drowned\' ? 0.1 : 0.2) && share <= 1.6'));
edit('ui/strings.js',t=>once(t,'  "world.message.webbed": "WEBBED",','  "world.message.drownedGrab": "GRABBED",\n  "world.message.drownedGrabHelp": "V — Dodge free · F — Melee the drowned",\n  "world.message.webbed": "WEBBED",'));
