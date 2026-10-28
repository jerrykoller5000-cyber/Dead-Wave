// GP-19970: second-pass lower-face contact, preserving first-pass images.
import fs from 'node:fs';

const src=JSON.parse(fs.readFileSync('handoffs/GP-19970/face-after/close-job.json','utf8'));
const dir='handoffs/GP-19970/face-close2-after',shots=[];
for(const close of src.shots){
  const kind=close.target.match(/^zombie\.([^:]+)/)?.[1];
  if(!kind)throw new Error(`Unknown target ${close.target}`);
  shots.push({...close,out:`${dir}/${kind}-noon-head-side.png`});
  shots.push({target:`zombie.${kind}:statue`,view:'front',time:'noon',wait:300,size:'1280x720',out:`${dir}/${kind}-noon-front.png`});
}
fs.writeFileSync(`${dir}/job.json`,JSON.stringify({shots,out:dir},null,2)+'\n');
console.log(`Prepared ${shots.length} close/front comparisons`);
