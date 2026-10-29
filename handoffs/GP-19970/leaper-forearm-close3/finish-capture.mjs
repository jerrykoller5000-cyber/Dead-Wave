import {spawnSync} from 'node:child_process';
import {statSync} from 'node:fs';

const owner=['--agent','chatgpt','--task','GP-19970'];
function camera(...args) {
  const r=spawnSync(process.execPath,['tools/camera.mjs',...args,...owner],{stdio:'inherit'});
  if(r.error)throw r.error;
  if(r.status!==0)throw new Error(`camera ${args[0]} exited ${r.status}`);
}
camera('start','--inspect');
try {
  camera('check','zombie.leaper','--out','handoffs/GP-19970/leaper-forearm-close3/check');
  for(const name of ['noon-close-side']) {
    const out=`handoffs/GP-19970/leaper-forearm-close3/${name}.png`;
    for(let i=0;i<5;i++) {
      camera('shot','--from',`handoffs/GP-19970/leaper-strips-after/${name}.json`,'--out',out,'--wait','300');
      if(statSync(out).size>100_000)break;
    }
    if(statSync(out).size<=100_000)throw new Error(`${name} stayed blank`);
  }
  const walk='handoffs/GP-19970/leaper-forearm-close3/walk-side.png';
  for(let i=0;i<5;i++) {
    camera('shot','zombie.leaper:walk','--view','side','--time','noon','--wait','500','--out',walk);
    if(statSync(walk).size>100_000)break;
  }
  if(statSync(walk).size<=100_000)throw new Error('walk-side stayed blank');
} finally {
  camera('stop');
}
