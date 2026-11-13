import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
assert(process.env.DW_GAME_TEST_TOKEN);const batch=process.argv[2];assert(['art','checks'].includes(batch));
const files=['studio/weapon-sidearms.js','studio/weapon-pistol-action.js'];
async function snapshot(){const data={at:new Date().toISOString(),files:{}};for(const p of files)data.files[p]=createHash('sha256').update(await readFile(p)).digest('hex');return data;}
const start=await snapshot();await writeFile(new URL('final-'+batch+'-start.json',import.meta.url),JSON.stringify(start,null,2));
for(const file of (batch==='art'?['inspect-mechanism.mjs']:['mechanism-check.mjs','targeted.mjs'])){
 let output='';const child=spawn(process.execPath,['review/GT-20104/'+file],{env:process.env,stdio:['ignore','pipe','pipe']});
 for(const stream of [child.stdout,child.stderr])stream.on('data',d=>{output+=d;process.stdout.write(d);});
 const code=await new Promise(r=>child.on('close',r));await writeFile(new URL('final-'+file+'.txt',import.meta.url),output);assert.equal(code,0,file);
}
const end=await snapshot();await writeFile(new URL('final-'+batch+'-end.json',import.meta.url),JSON.stringify(end,null,2));assert.deepEqual(end.files,start.files,'own model sources changed during final proof');
console.log('PASS final '+batch+' on unchanged model sources');
