// GP-19970: common crown locks and rear occipital peg fit.
import fs from 'node:fs';

const dir='handoffs/GP-19970/face-trim-after';
const kinds=['shambler','feral','drowned','spitter','bomber'];
const headPan={shambler:.62,feral:.43,drowned:.62,spitter:.65,bomber:.75};
const sidePan={shambler:-.25,feral:-.65,drowned:-.20,spitter:-.15,bomber:-.35};
const main=[],overcast=[],close=[];
for(const kind of kinds){
  for(const time of ['noon','dusk','night'])for(const view of ['side','back'])
    main.push({target:`zombie.${kind}:statue`,view,time,wait:300,size:'1280x720',out:`${dir}/${kind}-${time}-${view}.png`});
  for(const view of ['side','back'])overcast.push({target:`zombie.${kind}:statue`,view,wait:300,size:'1280x720',out:`${dir}/${kind}-overcast-${view}.png`});
  main.push({target:`zombie.${kind}:statue`,view:'side',time:'noon',dist:8,fov:65,wait:300,size:'1280x720',out:`${dir}/${kind}-gameplay-distance.png`});
  main.push({target:`zombie.${kind}:walk`,view:'side',time:'noon',wait:500,size:'1280x720',out:`${dir}/${kind}-walk-side.png`});
  close.push({target:`zombie.${kind}:statue`,view:'side',time:'noon',move:{zoom:2.8,pan:[sidePan[kind],headPan[kind]]},wait:300,size:'1280x720',out:`${dir}/${kind}-head-side.png`});
  close.push({target:`zombie.${kind}:statue`,view:'back',time:'noon',move:{zoom:2.8,pan:[0,headPan[kind]]},wait:300,size:'1280x720',out:`${dir}/${kind}-head-back.png`});
}
for(const [name,shots] of [['job',main],['overcast-job',overcast],['close-job',close]])
  fs.writeFileSync(`${dir}/${name}.json`,JSON.stringify({shots,out:dir},null,2)+'\n');
console.log(`Prepared ${main.length+overcast.length+close.length} views`);
