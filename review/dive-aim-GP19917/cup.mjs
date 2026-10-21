import fs from 'node:fs';import crypto from 'node:crypto';const p='index.html',before=fs.readFileSync(p,'utf8');
const a="Array.isArray(H.fore) && !HANDS.skip[currentWeapon] && HANDS.fore[currentWeapon] !== 'grip')",b="Array.isArray(H.fore) && !HANDS.skip[currentWeapon] && (HANDS.fore[currentWeapon] !== 'grip' || (diving() && !reloading)))";
if(before.split(a).length!==2)throw Error('cup reach anchor');const hash=t=>crypto.createHash('sha256').update(t).digest('hex');if(hash(fs.readFileSync(p,'utf8'))!==hash(before))throw Error('concurrent edit');fs.writeFileSync(p,before.replace(a,b));
