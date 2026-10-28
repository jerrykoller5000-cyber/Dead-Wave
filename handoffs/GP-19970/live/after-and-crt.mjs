import {spawnSync} from 'node:child_process';
// One slot, sequential browsers. Each collector closes its browser in finally.
for(const args of [
 ['handoffs/GP-19970/live/marine-review.mjs','handoffs/GP-19970/live/marine-after-clean'],
 ['handoffs/GP-19970/crt/native.mjs','handoffs/GP-19970/crt/integrated'],
]){
 const r=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});
 if(r.error)throw r.error;
 if(r.status!==0)process.exit(r.status||1);
}
