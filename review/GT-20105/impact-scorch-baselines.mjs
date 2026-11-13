import assert from 'node:assert/strict';import {spawn} from 'node:child_process';
assert(process.env.DW_GAME_TEST_TOKEN);
for(const args of [['paired-impacts.mjs'],['capture-scorch.mjs','before']]){
 const p=spawn(process.execPath,['review/GT-20105/'+args[0],...args.slice(1)],{env:process.env,stdio:'inherit'});
 assert.equal(await new Promise(r=>p.on('close',r)),0,args[0]);
}
