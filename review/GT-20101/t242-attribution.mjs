import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);let code=await readFile(new URL('../../tools/tests/t242.js',import.meta.url),'utf8');
function change(s,a,b){assert.equal(s.split(a).length,2,a);return s.replace(a,b);}
code=change(code,'V.push([v.x, v.y, v.z]);',"V.push([v.x,v.y,v.z,o.name||o.parent?.name||'?',o===ud.magazineTopRound]);");
code=change(code,'for (const [x, y, z] of V)','for (const [x, y, z, part, isRound] of V)');
code=change(code,'where = '+String.fromCharCode(96)+'at u ','where = part+" "+(isRound?"TOP_ROUND ":"")+'+String.fromCharCode(96)+'at u ');
const counter=change(code,'const V = verts(g.userData.mag);','const V = verts(g.userData.mag,new Set([g.userData.magazineTopRound]));');
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});await page.goto(server.origin+'/index.html?debug=1&raf=timer');assert(await page.waitFor('!!window.TT',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));await page.evaluate(await readFile(new URL('../../tools/tests/lib.js',import.meta.url),'utf8'));
 const original=String(await page.evaluate(code,180000)).split('\n');const skipped=String(await page.evaluate(counter,180000)).split('\n');
 const data={original,privateRoundExcludedTrial:skipped,originalFails:original.filter(x=>x.startsWith('FAIL')),counterFails:skipped.filter(x=>x.startsWith('FAIL'))};
 await writeFile(new URL('t242-attribution.json',import.meta.url),JSON.stringify(data,null,2));console.log(JSON.stringify(data,null,2));assert.deepEqual(page.errors,[]);
 assert(data.originalFails.every(l=>l.includes('TOP_ROUND')),'Another structural mesh is failing too');assert.equal(data.counterFails.length,0,'Mag body still fails without top round');
 console.log('PASS attribution: only live round causes current t242 failure; private exclusion trial green, official test untouched');
}finally{await browser.close();await server.close();}
