import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Run through crew.mjs slot run');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20100');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=source.indexOf('function heldWallPull('),end=source.indexOf('function heldWallPole(',start);
if(start<0||end<0||end-start>3000)throw Error('Wall-pull helper missing');
const baseline=source.slice(0,start)+'function heldWallPull(gun, H, shoulder, pivotW, pivotLocal, gunQ, side, dt) { return 0; }\n    '+source.slice(end);
const temp=[];
for(const [phase,html] of [['before',baseline],['after',source]]){
  const file=path.join(out,`perf-${phase}.html`);temp.push(file);
  fs.writeFileSync(file,html.replace('<head>','<head>\n  <base href="/">'),'utf8');
}
const server=await serve(root,0);
const browser=await launch({headless:false,args:['--window-size=1280,720']});
try{
  const results=[];
  for(const phase of ['after','before']){
    const page=await browser.newPage({width:1280,height:720});
    const began=Date.now();
    await page.goto(`${server.origin}/review/GP-20100/perf-${phase}.html?debug=1`);
    if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"',{timeout:90000}))throw Error(`${phase} load failed`);
    const readyMs=Date.now()-began;
    await page.evaluate('DWOpening.dismissForTesting()');
    await page.waitFor('document.getElementById("opening").hidden',{timeout:30000});
    await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20100 perf';document.getElementById('modeTraining').click();})()`);
    if(!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"',{timeout:90000}))throw Error(`${phase} Training failed`);
    await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000});
    await page.evaluate(`(()=>{
      const T=TT,y=T.trainingDbg.tg().floorY;
      T.grantAllWeapons();T.setUnarmedDbg(false);T.setViewFirstDbg(false);
      T.player.position.set(0,y,-640.9);T.setVelDbg(0,0);T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.marineIdleDbg().reset();T.setWorldTime(.42);
      const box={minX:-1,maxX:1,minY:y,maxY:y+2.2,minZ:-640.42,maxZ:-640.32,wall:true};
      T.trainingDbg.tg().solids.push(box);
      const m=new T.THREE.Mesh(new T.THREE.BoxGeometry(2,2.2,.1),new T.THREE.MeshStandardMaterial({color:0x75818b,roughness:.92}));
      m.position.set(0,y+1.1,-640.37);T.scene.add(m);
      T.setShotView({x:2.2,y:y+1.9,z:-642.1,tx:0,ty:y+1.2,tz:-640.48,fov:42});
    })()`);
    await new Promise(r=>setTimeout(r,1500));
    await page.evaluate('TT.resetPerf()');
    const samples=[];
    for(let i=0;i<5;i++){
      await new Promise(r=>setTimeout(r,1100));
      samples.push(await page.evaluate('TT.perfSnapshot()'));
    }
    const fps=samples.map(x=>x.fps).sort((a,b)=>a-b);
    const result={phase,readyMs,medianFps:fps[2],samples};results.push(result);
    console.log(`${phase}: ready ${readyMs}ms, median ${fps[2].toFixed(1)} fps, samples ${fps.map(x=>x.toFixed(1)).join(',')}`);
    await page.close();
  }
  fs.writeFileSync(path.join(out,'perf-reverse.json'),JSON.stringify(results,null,2));
}finally{
  await browser.close();await server.close();
  for(const file of temp){for(let i=0;i<5;i++){try{fs.unlinkSync(file);break;}catch(e){if(i===4)console.error('Temporary HTML cleanup failed:',file,e.message);await new Promise(r=>setTimeout(r,100));}}}
}
