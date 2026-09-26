// GP-44: real renderer screenshots and deterministic placement/geometry diagnostics.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),root=fileURLToPath(new URL('..',import.meta.url));
const stage=process.argv.includes('--before')?'before':'after',fake=process.argv.includes('--fake');
const baseline=process.argv.includes('--baseline'),bench=process.argv.includes('--bench');
const out=path.join(root,'Claude outputs/shots/gp44');fs.mkdirSync(out,{recursive:true});
let src=fs.readFileSync(path.join(root,'index.html'),'utf8');
// An in-memory baseline for the same current world, never a checkout or disk revert.
if(baseline){
 const a=src.indexOf('    // --- Foliage (capped) ---'),b=src.indexOf('    // Seeded and built once over the whole map',a);let block=src.slice(a,b);
 for(const [from,to]of [
  ['groundFoliageArt.blade(0.07 + rnd() * 0.03, bh)','new THREE.PlaneGeometry(0.07 + rnd() * 0.03, bh)'],
  ['groundFoliageArt.shrub(0.24 + rnd() * 0.17)','new THREE.SphereGeometry(0.24 + rnd() * 0.17, 8, 6)'],
  ['groundFoliageArt.fern(0.2 + rnd() * 0.08, 0.38 + rnd() * 0.14)','new THREE.PlaneGeometry(0.2 + rnd() * 0.08, 0.38 + rnd() * 0.14)'],
  ['leaf.position.set(Math.sin(ang) * 0.1, 0.025, Math.cos(ang) * 0.1);','leaf.position.set(Math.cos(ang) * 0.13, 0.2, Math.sin(ang) * 0.13);'],
  ['leaf.rotation.x = -0.1;','leaf.rotation.x = -0.6;'],
  ['groundFoliageArt.flowerStem(stemH)','new THREE.PlaneGeometry(0.03, stemH)'],
  ['groundFoliageArt.flower(0.07 + rnd() * 0.03)','new THREE.SphereGeometry(0.07 + rnd() * 0.03, 6, 5)'],
  ['groundFoliageArt.flower(0.045 + rnd() * 0.025)','new THREE.SphereGeometry(0.045 + rnd() * 0.025, 5, 4)'],
  ['bloom.scale.y = 1;','bloom.scale.y = 0.55;'],
  ['new THREE.IcosahedronGeometry(0.026, 0)','new THREE.SphereGeometry(0.03, 5, 4)'],
  ['groundFoliageArt.mushroomCap(0.09 * s)','new THREE.SphereGeometry(0.09 * s, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55)'],
  ['color: 0x668947','color: 0x4caf50'],['color: 0x809951','color: 0x6bbf4e'],['color: 0xa09961','color: 0x8fae4a'],['color: 0x4a703d','color: 0x2e7d32'],['color: 0x617e45','color: 0x357a38'],['color: 0x668c4e','color: 0x66bb6a']
 ])block=block.replace(from,()=>to);
 block=block.replace(/ +groundFoliageArt\.shade\(g, '[a-z]+'\);\r?\n/g,'');src=src.slice(0,a)+block+src.slice(b);
}
if(fake)src=src.replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
src=src.replace('window.TT = {',()=>`window.foliageProbe={generators:{makeGrassTuft,makeBush,makeFern,makeFlowerCluster,makeMushroomCluster,makeClutter},foliage,foliageChunks,windSwayables,clearFoliageInSquare,mulberry32};window.TT = {`);
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));
 const started=Date.now();await page.goto(server.origin+'/index.html?debug=1'+(bench?'':'&raf=timer'));await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:180000});
 const readyMs=Date.now()-started;await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 const stats=await page.evaluate(()=>({counts:TT.foliage.reduce((r,f)=>(r[f.kind]=(r[f.kind]||0)+1,r),{}),placement:TT.foliage.map(f=>[f.kind,f.x,f.z]),chunks:TT.foliageChunks.length,vertices:TT.foliageChunks.reduce((n,c)=>n+c.geometry.attributes.position.count,0),backend:TT.getRendererBackend(),gpuWind:TT.getFoliageWindOnGPU()}));
 fs.writeFileSync(path.join(out,stage+(fake?'-fake':'')+'-stats.json'),JSON.stringify({...stats,readyMs,errors},null,2));console.log(JSON.stringify({stage,fake,readyMs,counts:stats.counts,chunks:stats.chunks,vertices:stats.vertices,backend:stats.backend,errors}));
 if(stage==='after'&&!fake){const original=JSON.parse(fs.readFileSync(path.join(out,'before-stats.json')));assert.deepEqual(stats.placement,original.placement);assert.equal(stats.chunks,original.chunks);assert(stats.gpuWind);console.log('PASS: every plant identity/coordinate and batch count preserved; GPU wind active.');}
 if(bench){
  await page.fill('#playerName','Foliage Tester');await page.click('#modeHunt');await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:60000});
  await page.evaluate(()=>{TT.setWorldTime(.4);TT.setShotView(TT.shotHQ());});await page.waitForTimeout(1200);
  const sample=await page.evaluate(()=>new Promise(resolve=>{const frames=[];let last=performance.now();function step(t){frames.push(t-last);last=t;if(frames.length<360)requestAnimationFrame(step);else{frames.sort((a,b)=>a-b);resolve({meanMs:frames.reduce((s,n)=>s+n,0)/frames.length,p95Ms:frames[Math.floor(frames.length*.95)],draws:TT.renderer.info.render.drawCalls,triangles:TT.renderer.info.render.triangles});}}requestAnimationFrame(step);}));
  fs.writeFileSync(path.join(out,stage+'-bench.json'),JSON.stringify({readyMs,...sample},null,2));console.log('native frame sample '+JSON.stringify(sample));
 }
 if(!fake){
  await page.addStyleTag({content:'body > :not(canvas):not(script):not(style):not(link){visibility:hidden!important}'});
  for(const kind of ['grass','bush','fern','flower']){
   const view=await page.evaluate(kind=>{const f=TT.foliage.filter(f=>f.kind===kind).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z)).find(f=>Math.hypot(f.x,f.z)>14);const y=TT.sampleHeight(f.x,f.z);return {x:f.x+2.1,y:y+1.25,z:f.z+2.1,tx:f.x,ty:y+.2,tz:f.z,fov:45};},kind);
   await page.evaluate(v=>TT.setShotView(v),view);await page.waitForTimeout(300);await page.screenshot({path:path.join(out,`${stage}-${kind}.png`)});
  }
 }
 if(process.argv.includes('--night')&&!fake){await page.evaluate(()=>TT.runDevCommand('night ops'));await page.waitForTimeout(1500);await page.screenshot({path:path.join(out,stage+'-night.png')});}
 if(stage==='after'){
  const cleared=await page.evaluate(()=>{const chunk=TT.foliageChunks.find(c=>c.userData.spans.some(s=>!s.gone));const sp=chunk.userData.spans.find(s=>!s.gone);foliageProbe.clearFoliageInSquare(sp.x,sp.z,.1);const p=chunk.geometry.attributes.position;return sp.gone&&p.getY(sp.start)===-500&&p.getY(sp.start+sp.count-1)===-500;});assert(cleared);console.log('PASS: construction clearing removes the new plant geometry.');
 }
 if(errors.length)throw Error(errors.join('\n'));
}finally{if(browser)await browser.close();server.close();}
