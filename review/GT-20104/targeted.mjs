import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {spawn} from 'node:child_process';import {createHash} from 'node:crypto';
assert(process.env.DW_GAME_TEST_TOKEN);
const files=['studio/weapon-sidearms.js','studio/weapon-pistol-action.js','studio/hand-contacts.js','studio/marine-hand.js','game/viewmodel.js','game/viewmodel-poses.js','game/viewmodel-fit.js','index.html'];
async function snap(){const out={at:new Date().toISOString(),files:{}};for(const p of files)out.files[p]=createHash('sha256').update(await readFile(p)).digest('hex');return out;}
const before=await snap();await writeFile(new URL('targeted-start.json',import.meta.url),JSON.stringify(before,null,2));
const child=spawn(process.execPath,['tools/realtest.mjs','tcl334b','tcb301'],{stdio:['ignore','pipe','pipe'],env:process.env});let text='';
for(const stream of [child.stdout,child.stderr])stream.on('data',d=>{text+=d;process.stdout.write(d);});
const code=await new Promise(r=>child.on('close',r));await writeFile(new URL('targeted.txt',import.meta.url),text);
const after=await snap();await writeFile(new URL('targeted-end.json',import.meta.url),JSON.stringify(after,null,2));
console.log('SOURCE CHANGES',JSON.stringify(files.filter(p=>before.files[p]!==after.files[p])));
assert.equal(code,0);assert(!/\bfail\b/.test(text.replace(/\b0 fail\b/g,'')),'Inspect targeted failures');
