import assert from 'node:assert/strict';import {spawn} from 'node:child_process';assert(process.env.DW_GAME_TEST_TOKEN);
for(const phase of ['before-lamp','after-lamp']){
 const p=spawn(process.execPath,['review/GT-20105/capture-scorch.mjs',phase],{env:process.env,stdio:'inherit'});
 assert.equal(await new Promise(r=>p.on('close',r)),0,phase);
}
console.log('PASS original contact-route reconstruction vs production; existing task lamp in night preset; no production reverts');
