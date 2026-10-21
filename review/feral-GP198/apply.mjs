import fs from 'node:fs';
import crypto from 'node:crypto';
const path='index.html',before=fs.readFileSync(path,'utf8'), hash=s=>crypto.createHash('sha256').update(s).digest('hex');
if(before.includes('feralMotionDbg:'))throw Error('GP-198 already applied; do not replace the saved baseline.');
fs.writeFileSync('review/feral-GP198/before.html',before.replace('<head>','<head><base href="/">'));
let source=before;
function replace(a,b){if(source.split(a).length!==2)throw Error('Anchor missing/ambiguous: '+a.slice(0,70));source=source.replace(a,b);}
const nl=before.includes('\r\n')?'\r\n':'\n';
replace("    import { createSawStart, stepSawStart, sawStartPose } from './game/chainsaw-animation.js';", "    import { feralPose, createFeralMotion } from './game/feral-motion.js';   // GP-198: Jerry's Feral motion pass"+nl+"    import { createSawStart, stepSawStart, sawStartPose } from './game/chainsaw-animation.js';");
replace('    const enemyAbilities = createZombieAbilityRuntime({',`    const feralMotion = createFeralMotion({ THREE, scene, actors: () => zombies, camera,
      active: () => gameStarted && !gameOver && !won && !scriptedKill && !cine,
      inDomain: z => !!z.below === !!hollowFloor && (!training.active || !!z.trainingZ) });
    const enemyAbilities = createZombieAbilityRuntime({`.replace(/\n/g,nl));
const old=`          // Bounding lope: the whole body pitches with each stride, head thrust forward.
          gaitLean = walkAmt * (0.1 + Math.sin(phase * 2) * 0.16);
          hipRoll = Math.sin(phase) * 0.05 * walkAmt;
          headBob = Math.sin(phase * 2 + 1) * 0.12 * walkAmt;
          headLoll = Math.sin(z.bob * 0.5) * 0.06;`.replace(/\n/g,nl);
replace(old,`          // GP-198: Feral double tics, shoulder snaps and a bank into sharp turns.
          // Attack tells, hit reactions, climbs and maimed movement retain their own poses.
          if (!rising && !z.farLod && !z.crawling && !z.hopping && !(z.hitReact > 0 || z.hitPartT > 0 || z.attackWindup > 0 || z.swingT > 0)) {
            const f = feralPose(z.bob / 6 + (vr.phase || 0), phase, standing ? 0 : walkAmt, feralMotion.turn(z));
            gaitLean = f.lean; gaitSway = f.sway; gaitTwist = f.twist; hipRoll = f.hips;
            headBob = f.headBob; headLoll = f.headLoll;
            if (ud.armLG && !parts.armL) { ud.armLG.rotation.z += f.armL; if (ud.armLG.userData.elbowG) ud.armLG.userData.elbowG.rotation.x -= f.elbow; }
            if (ud.armRG && !parts.armR) { ud.armRG.rotation.z += f.armR; if (ud.armRG.userData.elbowG) ud.armRG.userData.elbowG.rotation.x -= f.elbow; }
          } else {
            gaitLean = walkAmt * (0.1 + Math.sin(phase * 2) * 0.16);
            hipRoll = Math.sin(phase) * 0.05 * walkAmt;
            headBob = Math.sin(phase * 2 + 1) * 0.12 * walkAmt;
            headLoll = Math.sin(z.bob * 0.5) * 0.06;
          }`.replace(/\n/g,nl));
replace('        enemyAbilities.update(dt);   // GP-179: poses after walking, swept shots and walking acid','        enemyAbilities.update(dt);   // GP-179: poses after walking, swept shots and walking acid'+nl+'        feralMotion.update(dt);   // GP-198: snapshot the final pose and actual travel');
replace('          enemyAbilitiesDbg: enemyAbilities,   // GP-179','          feralMotionDbg: feralMotion,   // GP-198'+nl+'          enemyAbilitiesDbg: enemyAbilities,   // GP-179');
const clear='      enemyAbilities.clear();   // GP-179';
if(source.split(clear).length!==5)throw Error('Expected four lifecycle reset hooks');
source=source.replaceAll(clear,clear+nl+'      feralMotion.clear();   // GP-198');
if(hash(fs.readFileSync(path,'utf8'))!==hash(before))throw Error('Concurrent index edit; rebase patch');
fs.writeFileSync(path,source,'utf8');
console.log('Applied narrow Feral hooks; preserved all other sections and original line endings.');
