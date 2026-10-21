import fs from 'node:fs';const dir='review/shambler-miss-GP19853';
let old=fs.readFileSync('index.html','utf8'),s=old;
if(fs.existsSync(dir+'/before.html')){if(fs.readFileSync(dir+'/before.html','utf8').replace('<head><base href="/">','<head>')!==old)throw Error('baseline differs; do not rerun');}
else fs.writeFileSync(dir+'/before.html',old.replace('<head>','<head><base href="/">'));
const eol=old.includes('\r\n')?'\r\n':'\n';
function replace(a,b){a=a.replace(/\r?\n/g,eol);b=b.replace(/\r?\n/g,eol);if(!s.includes(a))throw Error('Missing '+a.slice(0,80));s=s.replace(a,b);}
replace("    import { prepareShamblerFeet,", "    import { shamblerLungeResult, tickShamblerRecovery, shamblerRecoveryStep, applyShamblerRecovery } from './game/shambler-recovery.js';   // GP-19853\n    import { prepareShamblerFeet,");
replace('      for (const z of zombies) {\n        if (!z.alive) continue;\n        if (z.hz === undefined)', '      for (const z of zombies) {\n        if (!z.alive) continue;\n        const shamblerRecovering = tickShamblerRecovery(z, dt);\n        if (z.hz === undefined)');
replace('        if (z.abilityBusy) spd = 0;   // GP-179:', '        if (shamblerRecovering) { const step = shamblerRecoveryStep(z); spd *= step.pace; sx = step.x; sz = step.z; }\n        if (z.abilityBusy) spd = 0;   // GP-179:');
const hit="            else if (atk.type === 'player' && stillNearPlayer && !buildBetween(z.mesh.position.x, z.mesh.position.y + 0.9, z.mesh.position.z, zTarget(z).position.x, zTarget(z).position.y + 0.9, zTarget(z).position.z)) damagePlayer(atk.dmg, z.typeKey, z, null, zTarget(z));";
replace(hit,`            else if (atk.type === 'player') {
              const contact = stillNearPlayer && !buildBetween(z.mesh.position.x, z.mesh.position.y + 0.9, z.mesh.position.z, zTarget(z).position.x, zTarget(z).position.y + 0.9, zTarget(z).position.z);
              if (contact) damagePlayer(atk.dmg, z.typeKey, z, null, zTarget(z));
              shamblerLungeResult(z, contact && !(zTarget(z) === localPlayer && rollT > 0));
            }`);
replace('        applyShamblerMotion(z, dt, phase, standing ? 0 : walkAmt, marineGait);','        applyShamblerMotion(z, dt, phase, standing ? 0 : walkAmt, marineGait);\n        applyShamblerRecovery(z);');
replace("        if ((!zombieGraceActive() || (z.poiGuard && z.poiAwake)) && z.attackWindup <= 0 && !rising && !z.abilityBusy && tactics !== 'bomb')", "        if ((!zombieGraceActive() || (z.poiGuard && z.poiAwake)) && !shamblerRecovering && z.attackWindup <= 0 && !rising && !z.abilityBusy && tactics !== 'bomb')");
if(fs.readFileSync('index.html','utf8')!==old)throw Error('index changed');fs.writeFileSync('index.html',s,'utf8');
const path='game/shambler-motion.js';old=fs.readFileSync(path,'utf8');s=old.replace('const suppressed=z.farLod||','const suppressed=z.shamblerRecoveryActive||z.farLod||');if(s===old)throw Error('No motion guard');if(fs.readFileSync(path,'utf8')!==old)throw Error('motion changed');fs.writeFileSync(path,s,'utf8');
