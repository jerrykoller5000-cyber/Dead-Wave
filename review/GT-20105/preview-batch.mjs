import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {writeFile,readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
assert(process.env.DW_GAME_TEST_TOKEN);
const source=await readFile('studio/weapon-effects.js');await writeFile(new URL('preview-source-sha256.txt',import.meta.url),createHash('sha256').update(source).digest('hex'));
for(const [file,phase]of [['capture-flash.mjs','draft'],['capture-impacts.mjs','draft2']]){
 const p=spawn(process.execPath,['review/GT-20105/'+file,phase],{env:process.env,stdio:'inherit'});
 assert.equal(await new Promise(r=>p.on('close',r)),0,file);
}
assert.deepEqual(await readFile('studio/weapon-effects.js'),source);
console.log('PASS unchanged helper across native flash and impact art prototypes');
