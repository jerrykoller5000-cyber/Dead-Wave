import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
assert(process.env.DW_GAME_TEST_TOKEN);const batch=process.argv[2],batches={sights:['t188','t277'],contacts:['tcl334b','tcb294b']},tests=batches[batch];assert(tests);
const files=['studio/weapon-sidearms.js','studio/weapon-pistol-action.js','studio/hand-contacts.js','game/viewmodel.js','game/viewmodel-poses.js','game/viewmodel-fit.js','index.html'];
async function snapshot(){const out={at:new Date().toISOString(),files:{}};for(const p of files)out.files[p]=createHash('sha256').update(await readFile(p)).digest('hex');return out;}
const start=await snapshot();await writeFile(new URL('revolver-'+batch+'-start.json',import.meta.url),JSON.stringify(start,null,2));
let text='';const child=spawn(process.execPath,['tools/realtest.mjs',...tests],{env:process.env,stdio:['ignore','pipe','pipe']});
for(const stream of [child.stdout,child.stderr])stream.on('data',d=>{text+=d;process.stdout.write(d);});const code=await new Promise(r=>child.on('close',r));
await writeFile(new URL('revolver-'+batch+'.txt',import.meta.url),text);
const end=await snapshot();await writeFile(new URL('revolver-'+batch+'-end.json',import.meta.url),JSON.stringify(end,null,2));
const changed=files.filter(p=>start.files[p]!==end.files[p]);console.log('SOURCE CHANGES',JSON.stringify(changed));
const rows=[...text.matchAll(/^\s*(?:ok|FAIL)\s+(\S+)\s+(\d+) pass\s+(\d+) fail/gm)].map(m=>({test:m[1],pass:+m[2],fail:+m[3]}));
await writeFile(new URL('revolver-'+batch+'-summary.json',import.meta.url),JSON.stringify({tests,rows,changed,exit:code},null,2));
assert.equal(code,0);assert.equal(rows.length,tests.length);assert(rows.every(r=>r.fail===0),'Read original test failures; no assertion changed');
console.log('PASS native revolver '+batch+' original checks');
