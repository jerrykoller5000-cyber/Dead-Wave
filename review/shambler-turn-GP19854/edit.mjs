import fs from 'node:fs';
const dir='review/shambler-turn-GP19854';
const old=fs.readFileSync('index.html','utf8');
if(fs.existsSync(`${dir}/before.html`))throw Error('Historical edit only; do not reapply.');
fs.writeFileSync(`${dir}/before.html`,old.replace('<head>','<head><base href="/">'));
const eol=old.includes('\r\n')?'\r\n':'\n';let s=old;
function replace(a,b){a=a.replace(/\r?\n/g,eol);b=b.replace(/\r?\n/g,eol);if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error('Not unique: '+a.slice(0,100));s=s.replace(a,b);}
replace("    import { shamblerLungeResult,", "    import { steerShambler, shamblerCanReach } from './game/shambler-steering.js';   // GP-19854\n    import { shamblerLungeResult,");
replace('        if (z.abilityBusy) spd = 0;   // GP-179:', '        const shamblerTurn = steerShambler(z, sx, sz, dt);\n        if (shamblerTurn) { sx = shamblerTurn.x; sz = shamblerTurn.z; spd *= shamblerTurn.pace; }\n        if (z.abilityBusy) spd = 0;   // GP-179:');
replace('        if (!knocked) z.mesh.rotation.y = Math.atan2(sx, sz); // hold the facing while down','        if (!knocked) z.mesh.rotation.y = shamblerTurn ? shamblerTurn.yaw : Math.atan2(sx, sz); // hold the facing while down');
replace('              const contact = stillNearPlayer && !buildBetween(', '              const contact = stillNearPlayer && shamblerCanReach(z, zTarget(z).position.x - z.mesh.position.x, zTarget(z).position.z - z.mesh.position.z) && !buildBetween(');
replace("              else tryWindup('player', z.damage, 0.85);", "              else if (shamblerCanReach(z, zTarget(z).position.x - mx, zTarget(z).position.z - mz)) tryWindup('player', z.damage, 0.85);");
if(fs.readFileSync('index.html','utf8')!==old)throw Error('Concurrent edit; merge first.');
fs.writeFileSync('index.html',s,'utf8');console.log('Applied five reserved Shambler steering/facing/reach edits.');
