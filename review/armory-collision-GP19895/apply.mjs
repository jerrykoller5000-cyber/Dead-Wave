import fs from 'node:fs';import crypto from 'node:crypto';
const path='index.html',dir='review/armory-collision-GP19895',before=fs.readFileSync(path,'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
if(hash(before)!=='6c1f1c1b441c29d7fa35e5274ae7e0a456e6fed3ce8d2a9e209cc1f9a793604a')throw Error('Re-read latest source: changed since inspection');
const edits=[
 ["    import { createTrainingInfirmary } from './game/training-infirmary.js'; // GP-19882", "    import { createTrainingInfirmary } from './game/training-infirmary.js'; // GP-19882\r\n    import { createTrainingArmoryCollision } from './game/training-armory-collision.js'; // GP-19895"],
 ["      if (!training.infirmary) training.infirmary = createTrainingInfirmary(training.tg); // GP-19882", "      if (!training.infirmary) training.infirmary = createTrainingInfirmary(training.tg); // GP-19882\r\n      if (!training.armoryCollision && training.copies.armory) training.armoryCollision = createTrainingArmoryCollision(THREE, training.copies.armory.copy);"],
 ["      const ko = tg.keepOut?.(p, PLAYER_RADIUS);", "      const armory = training.armoryCollision?.constrain(p, playerFrameStart, PLAYER_RADIUS);\r\n      if (armory?.moved) { p.x = armory.x; p.z = armory.z; if (armory.blockX) velX = 0; if (armory.blockZ) velZ = 0; }\r\n      const ko = tg.keepOut?.(p, PLAYER_RADIUS);"]
];
let after=before;
for(const[a,b]of edits){if(after.split(a).length!==2)throw Error('Non-unique/missing anchor');after=after.replace(a,b);}
fs.writeFileSync(dir+'/index-before.txt',before,'utf8');
if(fs.readFileSync(path,'utf8')!==before)throw Error('Source changed during preparation');
fs.writeFileSync(path,after,'utf8');
fs.writeFileSync(dir+'/scope-proof.json',JSON.stringify({before:hash(before),after:hash(after),edits},null,2));
console.log('Applied three focused training collision insertions with freshness guard');
