import {spawnSync} from 'node:child_process';
for(const args of [['review/GT-20098/capture.mjs','aa12','before','--rack-only','--saved-source'],['review/GT-20098/capture.mjs','aa12','after','--rack-only']]){
 const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
}
