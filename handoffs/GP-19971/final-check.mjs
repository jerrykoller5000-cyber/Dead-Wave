import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const jobs=[['render',['handoffs/GP-19971/capture.mjs','after']],['live',['handoffs/GP-19971/live-proof.mjs']],['night',['handoffs/GP-19971/night-proof.mjs']],['unit',['--test','game/screamer-behavior.test.mjs','studio/zombie-concepts.test.mjs','game/zombie-headshots.test.mjs','studio/zombie-hit-surface.test.mjs','handoffs/GP-19971/skull-clearance.test.mjs']]];
for(const [name,args]of jobs){
 const r=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:8*1024*1024});
 fs.writeFileSync(`handoffs/GP-19971/${name}.log`,r.stdout+r.stderr,'utf8');
 console.log(`${name}: exit ${r.status}\n${(r.stdout+r.stderr).slice(-1800)}`);
 if(r.status!==0){process.exitCode=1;break;}
}
