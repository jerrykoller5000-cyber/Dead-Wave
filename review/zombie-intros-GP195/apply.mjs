import fs from 'node:fs';
const file='index.html',original=fs.readFileSync(file,'utf8');let s=original;
for(const [a,b]of [
 ["    import { createTrainingDanger }", "    import { trainingIntroKinds } from './ui/training-encounter.js';\r\n    import { createTrainingDanger }"],
 ['if (zm) { zm.trainingZ = true;\r\n          const margin', 'if (zm) { zm.trainingZ = true; zm.trainingIntro = true;\r\n          const margin'],
 ["zombies.filter(z => z.trainingZ && z.alive).map(z => z.typeKey).join(',')", "trainingIntroKinds(zombies).join(',')"]
]){if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error('anchor '+a);s=s.replace(a,b);}
if(fs.readFileSync(file,'utf8')!==original)throw Error('file changed');fs.writeFileSync(file,s);
