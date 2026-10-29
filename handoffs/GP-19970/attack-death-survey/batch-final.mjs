import {spawnSync} from 'node:child_process';

for(const kind of ['spider','screamer','demon','guardian','caveguard']){
  const run=spawnSync(process.execPath,['handoffs/GP-19970/attack-death-survey/probe.mjs',kind],{stdio:'inherit'});
  if(run.status!==0)process.exit(run.status??1);
}
console.log('PASS five serial zombie attack/death probes');
