// Compare existing failures with the current game minus only GP-19856's six hooks.
import fs from 'node:fs';import assert from 'node:assert/strict';import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
const dir='review/leaper-GP19856',proof=[],current=fs.readFileSync('index.html','utf8');let baseline=current;
const remove=line=>{assert.equal(baseline.split(line).length,2);baseline=baseline.replace(line,'');};
remove("    import { leaperGroundPace, tickLeaperMotion, leaperLanding, applyLeaperMotion } from './game/leaper-motion.js'; // GP-19856\r\n");
remove('        tickLeaperMotion(z, dt); // restore prior visual pose before reactions/LOD\r\n');
remove('        spd = leaperGroundPace(z, spd); // GP-19856: 75% after ground caps/slows; the leap still owns airborne speed\r\n\r\n');
remove('              leaperLanding(z); // pose-only compression, no attack/movement delay\r\n');
remove('        applyLeaperMotion(THREE, z, dt, standing ? 0 : walkAmt, dist); // GP-19856\r\n');
const entry='leaperGroundPace(zm, Math.max(1.3, Math.min(3.6, (zm.speed || 3) * 0.9)))';assert.equal(baseline.split(entry).length,2);baseline=baseline.replace(entry,'Math.max(1.3, Math.min(3.6, (zm.speed || 3) * 0.9))');
const fake=source=>source.replace(/<script type="importmap">[\s\S]*?<\/script>/,`<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>`).replace('<head>','<head><base href="/">');
for(const [name,source] of [['baseline',baseline],['current',current]])fs.writeFileSync(`${dir}/${name}-tests.html`,fake(source));
const server=await serve(process.cwd(),0),browser=await launch({headless:true});
try{
 for(const mode of ['baseline','current'])for(const name of mode==='baseline'?['t1','t3']:['t1','t3','t75','t93','t215','t222']){
  const page=await browser.newPage({width:1280,height:720});
  try{await page.goto(`${server.origin}/${dir}/${mode}-tests.html?debug=1&raf=timer`,{timeout:120000});assert.ok(await page.waitFor('!!window.TT',{timeout:120000}));await page.evaluate(`if(window.DWOpening?.dismissForTesting)DWOpening.dismissForTesting();`);await page.waitFor('!window.DWOpening||DWOpening.active===false',{timeout:30000});await page.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));const raw=await page.evaluate(fs.readFileSync(`tools/tests/${name}.js`,'utf8'),200000);const lines=String(raw).split('\n');const item={mode,name,pass:lines.filter(l=>/^PASS\b/.test(l)).length,fail:lines.filter(l=>/^FAIL\b/.test(l)),raw,errors:page.errors};proof.push(item);console.log(JSON.stringify({...item,raw:undefined}));}finally{await page.send('Page.close',{});}
 }
 for(const name of ['t1','t3']){const a=proof.find(p=>p.name===name&&p.mode==='baseline'),b=proof.find(p=>p.name===name&&p.mode==='current');assert.deepEqual(b.fail,a.fail,`${name}: no new failures`);}
 for(const name of ['t75','t93','t215','t222'])assert.equal(proof.find(p=>p.name===name).fail.length,0,name);
}finally{fs.writeFileSync(`${dir}/regression-proof.json`,JSON.stringify(proof,null,2));await browser.close();await server.close();}process.exit(0);
