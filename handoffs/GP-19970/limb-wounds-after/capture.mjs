import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const root='handoffs/GP-19970';
const out=`${root}/limb-wounds-after`;
const source=`${root}/face-hair-crown-after`;
const shots=[];
for(const type of ['shambler','feral']){
  for(const name of ['noon-side','overcast-side','dusk-side','night-side','gameplay-distance']){
    const prior=JSON.parse(fs.readFileSync(`${source}/${type}-${name}.json`,'utf8'));
    shots.push({target:prior.target,cam:prior.cam,inspect:prior.inspect,size:[1600,900],
      view:prior.view,time:prior.time,wait:700,out:`${out}/${type}-${name}.png`,caption:`${type} ${name}`});
  }
}
fs.writeFileSync(`${out}/job.json`,JSON.stringify({shots,out,cols:5},null,2)+'\n','utf8');
for(const type of ['shambler','feral']){
  const args=['tools/camera.mjs','check',`zombie.${type}`,'--out',`${out}/check-${type}`,'--agent','chatgpt','--task','GP-19970'];
  const result=spawnSync(process.execPath,args,{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
const args=['tools/camera.mjs','job',`${out}/job.json`,'--inspect','--agent','chatgpt','--task','GP-19970'];
const result=spawnSync(process.execPath,args,{stdio:'inherit'});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status??1);
