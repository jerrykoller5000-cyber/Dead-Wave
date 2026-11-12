import fs from 'node:fs';
const folder=new URL('./',import.meta.url);
for(const name of ['combat-actions','stations-drills','carry-look','mortar-wake']){
 let s=fs.readFileSync(new URL('../GP-20120/'+name+'.mjs',folder),'utf8').replaceAll('GP-20120','GP-20124');
 fs.writeFileSync(new URL(name+'.mjs',folder),s,'utf8');
}
console.log('Prepared four QA batches under GP-20124');
