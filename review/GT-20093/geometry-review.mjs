import {spawnSync} from 'node:child_process';
for(const args of [['review/GT-20093/measure-run.mjs','--baseline'],['review/GT-20093/measure-run.mjs','--trial']]){
 const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
}
await import('./guard-report.mjs');
