import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const root='handoffs/GP-19970';
const source=`${root}/colossus-carrier-after`;
const out=`${root}/colossus-thigh-after`;
const names=['noon-side','overcast-side','dusk-side','night-side','noon-front','noon-back',
  'gameplay-distance','colossus-walk-side','colossus-walk-back'];
const shots=names.map(name=>{
  const prior=JSON.parse(fs.readFileSync(`${source}/${name}.json`,'utf8'));
  return {target:prior.target,cam:prior.cam,inspect:prior.inspect,size:[1600,900],
    view:prior.view,time:prior.time,wait:700,out:`${out}/${name}.png`,caption:name};
});
fs.writeFileSync(`${out}/job.json`,JSON.stringify({shots,out,cols:3},null,2)+'\n','utf8');
for(const args of [
  ['tools/camera.mjs','check','zombie.colossus','--out',`${out}/check`,'--agent','chatgpt','--task','GP-19970'],
  ['tools/camera.mjs','job',`${out}/job.json`,'--inspect','--agent','chatgpt','--task','GP-19970'],
  ['tools/camera.mjs','shot','zombie.colossus:statue','--from',`${source}/noon-side.json`,
    '--pan','0,-0.65','--zoom','1.8','--view','side','--wait','900','--size','1600x900',
    '--out',`${out}/noon-close-thigh-side.png`,'--inspect','--agent','chatgpt','--task','GP-19970']
]){
  const result=spawnSync(process.execPath,args,{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
