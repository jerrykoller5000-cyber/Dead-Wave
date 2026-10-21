import fs from 'node:fs';
const path='index.html',old=fs.readFileSync(path,'utf8');let s=old;
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a);s=s.replace(a,b);}
replace("    import { feralPose,", "    import { prepareShamblerFeet, resetShamblerMotion, applyShamblerMotion } from './game/shambler-motion.js';   // GP-19852\n    import { feralPose,");
replace('      compactZombieMesh(g);',"      if (typeKey === 'shambler') prepareShamblerFeet(THREE, g, s);   // before skin binds the boots\n      compactZombieMesh(g);");
replace('        resetFeralClaws(z);', '        resetShamblerMotion(z);\n        resetFeralClaws(z);');
replace('        applyFeralClaws(THREE, z, phase, standing ? 0 : walkAmt);','        applyShamblerMotion(z, dt, phase, standing ? 0 : walkAmt, marineGait);\n        applyFeralClaws(THREE, z, phase, standing ? 0 : walkAmt);');
if(fs.readFileSync(path,'utf8')!==old)throw Error('index changed');fs.writeFileSync(path,s,'utf8');
