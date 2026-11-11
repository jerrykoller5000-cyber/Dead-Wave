import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/CB-292');
const old = JSON.parse(fs.readFileSync(path.join(out, 'inventory.json'), 'utf8'));
const originalOverlays = old.all.filter(m => {
  const gap = m.min[1] - old.floorY;
  return gap > .0005 && gap < .03 && m.size[1] < .0005;
}).map(m => ({name:m.name, min:m.min, max:m.max}));
assert.equal(originalOverlays.length, 13);
const server = await serve(root, 0);
const browser = await launch({headless:false, args:['--window-size=1280,720']});
try {
  const page = await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', {timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden', {timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-292';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active', {timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', {timeout:20000}));
  const pair = await page.evaluate(`(old=>{
    const T=TT,tg=T.trainingDbg.tg(),g=tg.group,B=T.THREE.Box3;
    const meshes=[];g.traverse(m=>{if(m.isMesh&&m.geometry)meshes.push(m)});
    const overlays=meshes.map(m=>({m,b:new B().setFromObject(m)})).filter(({b})=>
      b.min.y>tg.floorY+.0005&&b.min.y<tg.floorY+.03&&b.max.y-b.min.y<.0005);
    const match=(b,r)=>['x','z'].every((a,i)=>Math.abs(b.min[a]-r.min[i?2:0])<.002&&Math.abs(b.max[a]-r.max[i?2:0])<.002);
    const mapping=overlays.map(({m,b})=>{
      const prior=old.filter(r=>match(b,r));
      if(prior.length!==1)throw Error('floor paint baseline match '+(m.name||'(unnamed)')+' '+prior.length);
      return {m,oldY:prior[0].min[1],nowY:b.min.y,originalY:m.position.y};
    });
    if(mapping.length!==old.length)throw Error('floor paint count differs: '+mapping.length);
    window.__CB292Paint=mapping;
    return mapping.map(({m,oldY,nowY})=>({name:m.name||'(unnamed)',oldMm:(oldY-tg.floorY)*1000,newMm:(nowY-tg.floorY)*1000}));
  })(${JSON.stringify(originalOverlays)})`);
  const lights=[['noon',.5],['overcast',.5],['dusk',.76],['night',.02]];
  const sites=[['firing-line',0,-643,0,-640],['no-build',-26,-626,-26,-623]];
  const records=[];
  for (const [light,time] of lights) for (const [site,x,z,tx,tz] of sites) {
    const setting = await page.evaluate(`((light,time,x,z,tx,tz)=>{
      const T=TT,tg=T.trainingDbg.tg(),eye=tg.floorY+.42;
      T.setWorldTime(time);
      if(!T.trainingDbg.lights().on)T.trainingDbg.toggleLights();
      T.player.position.set(x,tg.floorY,z);
      T.setShotView({x,y:eye,z,tx,ty:tg.floorY+.003,tz,fov:52});
      for(let i=0;i<45;i++)T.stepFrame(.016);
      if(light==='overcast'){T.sun.intensity*=.35;T.hemi.intensity*=.75;}
      return {camera:T.camera.position.toArray(),time,light};
    })(${JSON.stringify(light)},${time},${x},${z},${tx},${tz})`);
    for (const phase of ['before','after']) {
      await page.evaluate(`(phase=>{
        const T=TT,tg=T.trainingDbg.tg();
        for(const p of window.__CB292Paint)p.m.position.y=p.originalY+(phase==='before'?p.oldY-p.nowY:0);
        tg.group.updateMatrixWorld(true);
        T.renderer.render(T.scene,T.camera);
      })(${JSON.stringify(phase)})`);
      await page.screenshot(path.join(out,`${phase}-paint-${light}-${site}.png`));
      records.push({...setting,site,phase});
    }
  }
  fs.writeFileSync(path.join(out,'paint-pairs.json'),JSON.stringify({overlays:pair,records},null,2));
  assert.deepEqual(page.errors,[]);
  console.log(`PASS CB-292 paint: ${pair.length} baseline-matched overlays, ${records.length} low-eye shots in four lights, 0 page errors`);
} finally { await browser.close(); await server.close(); }
