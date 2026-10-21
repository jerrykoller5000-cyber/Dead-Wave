// Builds a reviewable preview before touching another crew owner's combat section.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const p='index.html',source=fs.readFileSync(p,'utf8'),eol=source.includes('\r\n')?'\r\n':'\n';
let output=source;const hooks=[];
function replace(name,old,next){
  assert.equal(output.split(old).length-1,1,'Hook must match exactly once: '+name);
  output=output.replace(old,next);hooks.push(name);
}
replace('imports',"    import { trainingFloorHit", "    import { createZombieAbilityRuntime } from './game/zombie-ability-runtime.js';"+eol+"    import { attachZombieAbilityVisuals, resetZombieAbilityVisuals, updateZombieAbilityVisuals } from './game/zombie-ability-visuals.js';"+eol+"    import { trainingFloorHit");
const bindings=fs.readFileSync('review/zombie-abilities/host-bindings.txt','utf8').replace(/\r?\n/g,eol);
replace('runtime host', '    const acidPools = [];', '    const acidPools = [];'+eol+bindings);
replace('attach props', '      skinZombieMesh(g, s);   // CL-138', '      skinZombieMesh(g, s);   // CL-138'+eol+'      attachZombieAbilityVisuals(THREE, g, typeKey, s);   // GP-179');
// Insert into the exact reset function boundary instead of changing its traversal.
const resetStart=output.indexOf('    function resetZombieMesh(mesh) {'),resetEnd=output.indexOf(eol+'    // Every wave carries',resetStart);
assert(resetStart>0&&resetEnd>resetStart);
const reset=output.slice(resetStart,resetEnd),closing=reset.lastIndexOf('    }');
output=output.slice(0,resetStart)+reset.slice(0,closing)+'      resetZombieAbilityVisuals(mesh);   // GP-179'+eol+reset.slice(closing)+output.slice(resetEnd);hooks.push('pooled props reset');
replace('charge priority', "if (tactics === 'charge' && !graceFreeze", "if (tactics === 'charge' && !z.abilityBusy && !graceFreeze");
replace('slam priority', "if (tactics === 'boss' && !graceFreeze)", "if (tactics === 'boss' && !z.abilityBusy && !graceFreeze)");
replace('planted attacks', '        let mx = zx + ((graceFreeze || rising) ? 0 : sx * spd * dt);', '        if (z.abilityBusy) spd = 0;   // GP-179: feet stay planted through the tell and follow-through'+eol+'        let mx = zx + ((graceFreeze || rising) ? 0 : sx * spd * dt);');
replace('melee priority', "&& !rising && tactics !== 'bomb')", "&& !rising && !z.abilityBusy && tactics !== 'bomb')");
replace('below planted attacks', 'const sp = (z.speed || 2) * (belowTheme', 'const sp = (z.abilityBusy ? 0 : (z.speed || 2)) * (belowTheme');
replace('below melee priority', '        } else if (d <= reach) {', '        } else if (d <= reach && !z.abilityBusy) {');
replace('below planted leg pose', '        } else {'+eol+'          let ux = dx / (d || 1), uz = dz / (d || 1);', '        } else if (!z.abilityBusy) {'+eol+'          let ux = dx / (d || 1), uz = dz / (d || 1);');
replace('visible attack tells', '      if (z.attackWindup > 0 || z.swingT > 0 || z._pendingAttack || z.chargeWind > 0 || z.chargeT > 0)', '      if (z.abilityBusy || z.attackWindup > 0 || z.swingT > 0 || z._pendingAttack || z.chargeWind > 0 || z.chargeT > 0)');
replace('animate distant tells', '      const far = Math.hypot(z.mesh.position.x - camera.position.x, z.mesh.position.z - camera.position.z) > ZOMBIE_FAR_M;', '      const far = !z.abilityBusy && Math.hypot(z.mesh.position.x - camera.position.x, z.mesh.position.z - camera.position.z) > ZOMBIE_FAR_M;');
replace('frame update', '        updateZombies(dt);', '        updateZombies(dt);'+eol+'        enemyAbilities.update(dt);   // GP-179: poses after walking, swept shots and walking acid');
for(const fn of ['clearZombies','stopBelowFight','leaveTraining','trainingBlackout'])replace('clear '+fn,'    function '+fn+'() {','    function '+fn+'() {'+eol+'      enemyAbilities.clear();   // GP-179');
const deathStart=output.indexOf('    function killZombie('),deathEnd=output.indexOf('    function clearZombies()',deathStart);
assert(deathStart>0&&deathEnd>deathStart);
const death=output.slice(deathStart,deathEnd);assert(death.includes('      z.alive = false;'));
output=output.slice(0,deathStart)+death.replace('      z.alive = false;','      z.alive = false;'+eol+'      updateZombieAbilityVisuals(z, simTime, {});   // GP-179: fists go dark and the carried stone drops with its owner')+output.slice(deathEnd);hooks.push('death props cleanup');
replace('review inspection', '          waterWaveTargets, motes,', '          enemyAbilitiesDbg: enemyAbilities,   // GP-179'+eol+'          waterWaveTargets, motes,');
assert.equal(fs.readFileSync(p,'utf8'),source,'Source changed during preparation; rerun.');
fs.writeFileSync('.tmp-zombie-abilities.html',output,'utf8');
const apply=process.argv.includes('--apply');
if(apply){
  fs.writeFileSync('.tmp-zombie-abilities-base.html',source,'utf8');
  assert.equal(fs.readFileSync(p,'utf8'),source,'Source changed before integration; rerun.');
  fs.writeFileSync(p,output,'utf8');
}
fs.writeFileSync('review/zombie-abilities/preview-proof.json',JSON.stringify({at:new Date().toISOString(),sourceHash:createHash('sha256').update(source).digest('hex'),resultHash:createHash('sha256').update(output).digest('hex'),hooks,preview:'.tmp-zombie-abilities.html',productionWritten:apply},null,2)+'\n');
console.log((apply?'Integrated':'Prepared isolated preview with')+' '+hooks.length+' narrow hooks.'+(apply?'':' Production index.html unchanged.'));
