import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,statSync} from 'node:fs';

const root='handoffs/GP-19970/shin-fit-close2';
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
  camera('check','zombie','--out',`${root}/check-all`);
  for(const [kind,source,views] of [
    ['feral','shin-hem-after',['noon-side','overcast-side','dusk-side','night-side','gameplay-distance']],
    ['colossus','colossus-shin-after',['noon-close-thigh-side','noon-side','overcast-side','dusk-side','night-side','gameplay-distance','colossus-walk-side']]
  ]) for(const view of views) {
    const sourceName=kind==='feral'?`feral-${view}`:view;
    const name=`${kind}-${view}`,out=`${root}/${name}.png`;
    if(valid(out))continue;
    for(let attempt=1;attempt<=5;attempt++) {
      await pause(500);
      camera('shot','--from',`handoffs/GP-19970/${source}/${sourceName}.json`,'--out',out,'--wait','300');
      if(valid(out))break;
    }
    if(!valid(out))blank.push(name);
  }
} finally {
  camera('stop');
}
if(blank.length)throw new Error(`blank frames: ${blank.join(', ')}`);
