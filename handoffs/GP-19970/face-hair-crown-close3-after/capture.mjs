import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const root='handoffs/GP-19970';
const source=`${root}/face-hair-crown-after`;
const out=`${root}/face-hair-crown-close3-after`;
const shots=[];
for(const type of ['shambler','feral','drowned','spitter']){
  for(const name of ['head-back','head-side','noon-side','overcast-side','dusk-side','night-side','gameplay-distance']){
    const prior=JSON.parse(fs.readFileSync(`${source}/${type}-${name}.json`,'utf8'));
    shots.push({target:prior.target,cam:prior.cam,inspect:prior.inspect,size:[1600,900],
      view:prior.view,time:prior.time,wait:700,out:`${out}/${type}-${name}.png`,caption:`${type} ${name}`});
  }
}
fs.writeFileSync(`${out}/job.json`,JSON.stringify({shots,out,cols:7},null,2)+'\n','utf8');
for(const args of [
  ['tools/camera.mjs','check','zombie','--out',`${out}/check`,'--agent','chatgpt','--task','GP-19970'],
  ['tools/camera.mjs','job',`${out}/job.json`,'--inspect','--agent','chatgpt','--task','GP-19970']
]){
  const result=spawnSync(process.execPath,args,{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
