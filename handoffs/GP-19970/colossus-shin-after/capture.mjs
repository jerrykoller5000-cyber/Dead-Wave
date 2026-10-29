import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,statSync} from 'node:fs';

const root='handoffs/GP-19970/colossus-shin-after';
const owner=['--agent','chatgpt','--task','GP-19970'];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function camera(...args) {
  const r=spawnSync(process.execPath,['tools/camera.mjs',...args,...owner],{stdio:'inherit'});
  if(r.error)throw r.error;
  if(r.status!==0)throw new Error(`camera ${args[0]} exited ${r.status}`);
}
mkdirSync(root,{recursive:true});
const valid=out=>existsSync(out)&&statSync(out).size>100_000;
const blank=[];
camera('start','--inspect');
try {
  camera('check','zombie.colossus','--out',`${root}/check`);
  for(const view of ['noon-close-thigh-side','noon-side','overcast-side','dusk-side','night-side','noon-front','gameplay-distance','colossus-walk-side']) {
    const out=`${root}/${view}.png`;
    if(valid(out))continue;
    for(let attempt=1;attempt<=5;attempt++) {
      await pause(500);
      camera('shot','--from',`handoffs/GP-19970/colossus-thigh-after/${view}.json`,'--out',out,'--wait','300');
      if(valid(out))break;
    }
    if(!valid(out))blank.push(view);
  }
} finally {
  camera('stop');
}
if(blank.length)throw new Error(`blank frames: ${blank.join(', ')}`);
