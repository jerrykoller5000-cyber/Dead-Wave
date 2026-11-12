import {spawn} from 'node:child_process';import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
assert(process.env.DW_GAME_TEST_TOKEN);
const n=process.argv[2],lists={1:['tcb301','tce4','tce4b','tce6'],2:['tce7','tcl293','tcl301','tcl334','tcl334b'],3:['tcl334c','tcl334d','tgb255b','t333']};assert(lists[n]);
async function run(args,collect=false){let out='';const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{stdio:collect?['ignore','pipe','pipe']:'inherit',windowsHide:true});if(collect)for(const [s,d] of [[p.stdout,process.stdout],[p.stderr,process.stderr]])s.on('data',b=>{out+=b.toString();d.write(b);});p.on('error',reject);p.on('exit',resolve);});return {code,out};}
assert.equal((await run(['review/GT-20099/confirming/capture-tree.mjs',n==='1'?'batch1-early':'batch'+n+'-start'])).code,0);
const args=['tools/realtest.mjs',...lists[n],'--all'];console.log('COMMAND node '+args.join(' '));const r=await run(args,true);
await writeFile(new URL('batch'+n+'.txt',import.meta.url),'COMMAND node '+args.join(' ')+'\n'+r.out,{flag:'wx'});
assert.equal((await run(['review/GT-20099/confirming/capture-tree.mjs','batch'+n+'-end'])).code,0);process.exitCode=r.code||0;
