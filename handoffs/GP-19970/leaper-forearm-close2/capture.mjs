import {spawnSync} from 'node:child_process';

const owner=['--agent','chatgpt','--task','GP-19970'];
function camera(...args) {
  const r=spawnSync(process.execPath,['tools/camera.mjs',...args,...owner],{stdio:'inherit'});
  if(r.error)throw r.error;
  if(r.status!==0)throw new Error(`camera ${args[0]} exited ${r.status}`);
}
camera('start','--inspect');
try {
  camera('check','zombie.leaper','--out','handoffs/GP-19970/leaper-forearm-close2/check');
  for(const name of ['noon-side','gameplay-distance'])
    camera('shot','--from',`handoffs/GP-19970/leaper-strips-after/${name}.json`,'--out',`handoffs/GP-19970/leaper-forearm-close2/${name}.png`);
} finally {
  camera('stop');
}
