import {spawnSync} from 'node:child_process';
for(const args of [['review/GT-20093/geometry-review.mjs'],['review/GT-20093/hands-diagnose.mjs','--after-only'],['review/GT-20093/capture.mjs','uzi','after','--trial']]){
 const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
}
