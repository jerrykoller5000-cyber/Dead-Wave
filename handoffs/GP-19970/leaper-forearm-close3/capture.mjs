import {spawnSync} from 'node:child_process';
import {statSync} from 'node:fs';

const owner=['--agent','chatgpt','--task','GP-19970'];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function camera(...args) {
  const r=spawnSync(process.execPath,['tools/camera.mjs',...args,...owner],{stdio:'inherit'});
  if(r.error)throw r.error;
  if(r.status!==0)throw new Error(`camera ${args[0]} exited ${r.status}`);
}
camera('start','--inspect');
try {
  camera('check','zombie.leaper','--out','handoffs/GP-19970/leaper-forearm-close3/check');
  for(const name of ['noon-side','overcast-side','dusk-side','night-side','noon-back','gameplay-distance','walk-side','noon-close-side']) {
    const out=`handoffs/GP-19970/leaper-forearm-close3/${name}.png`;
    for(let attempt=1;attempt<=5;attempt++) {
      await pause(900);
      camera('shot','--from',`handoffs/GP-19970/leaper-strips-after/${name}.json`,'--out',out);
      if(statSync(out).size>100_000)break;
      if(attempt===5)throw new Error(`${name} stayed blank after five attempts`);
    }
  }
} finally {
  camera('stop');
}
