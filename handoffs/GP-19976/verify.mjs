import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
for(const [name,args] of [
 ['targeted-after',['tools/tests/run-all.mjs','t57','t101','--agent','chatgpt','--task','GP-19976','--jobs','1','--all-fails']],
 ['native-after',['handoffs/GP-19976/native-t57.mjs','after']],
]){
 const r=spawnSync(process.execPath,args,{encoding:'utf8',env:process.env});
 const output=(r.stdout||'')+(r.stderr||'');
 fs.writeFileSync(`handoffs/GP-19976/${name}.log`,output);process.stdout.write(output);
 if(r.error)throw r.error;
 if(r.status!==0)process.exit(r.status||1);
}
