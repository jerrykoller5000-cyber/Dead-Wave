// GP-19970: repeatable, fixed Inspector views for the nine faces built by refineZombieFace.
import fs from 'node:fs';

const kinds=['shambler','feral','leaper','drowned','military','spitter','bomber','brute','colossus'];
const dir='handoffs/GP-19970/face-after';
const shot=(kind,view,light,out,extra={})=>({target:`zombie.${kind}:${extra.motion||'statue'}`,view,...(light?{time:light}:{}),wait:extra.motion?500:300,size:'1280x720',...(extra.dist?{dist:8,fov:65}:{}),out:`${dir}/${out}`});
const main=[],overcast=[],close=[];
const headPan={shambler:.62,feral:.43,leaper:.35,drowned:.62,military:.68,spitter:.65,bomber:.75,brute:.91,colossus:1.28};
const headSidePan={shambler:-.25,feral:-.65,leaper:-.80,drowned:-.20,military:-.20,spitter:-.15,bomber:-.35,brute:-.60,colossus:-1.10};
for(const kind of kinds){
  for(const light of ['noon','dusk','night'])for(const view of ['front','side'])main.push(shot(kind,view,light,`${kind}-${light}-${view}.png`));
  for(const view of ['front','side'])overcast.push(shot(kind,view,null,`${kind}-overcast-${view}.png`));
  main.push(shot(kind,'side','noon',`${kind}-gameplay-distance.png`,{dist:true}));
  main.push(shot(kind,'side','noon',`${kind}-walk-side.png`,{motion:'walk'}));
  close.push({...shot(kind,'side','noon',`${kind}-noon-head-side.png`),move:{zoom:2.8,pan:[headSidePan[kind],headPan[kind]]}});
}
fs.writeFileSync(`${dir}/job.json`,JSON.stringify({shots:main,out:dir},null,2)+'\n','utf8');
fs.writeFileSync(`${dir}/overcast-job.json`,JSON.stringify({shots:overcast,out:dir},null,2)+'\n','utf8');
fs.writeFileSync(`${dir}/close-job.json`,JSON.stringify({shots:close,out:dir},null,2)+'\n','utf8');
console.log(`Prepared ${main.length+overcast.length+close.length} shots for ${kinds.length} faces.`);
