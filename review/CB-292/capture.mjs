import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const phase=process.argv[2];
if(!['before','after'].includes(phase))throw Error('Usage: capture.mjs before|after');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/CB-292');
fs.mkdirSync(out,{recursive:true});
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const records=[];
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-292';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:20000}));
  const sites=['cif','kiosk','armory','skullWindow','rangeConsole'];
  const baseline=phase==='after'?JSON.parse(fs.readFileSync(path.join(out,'before-cameras.json'),'utf8')):[];
  for(const site of sites){
    const matched=baseline.find(r=>r.site===site)||null;
    const rec=await page.evaluate(`((site,view)=>{
      const T=TT,tg=T.trainingDbg.tg(),s=tg.stations[site],inward=s.x>0?-1:1;
      T.setWorldTime(.5);
      if(!T.trainingDbg.lights().on)T.trainingDbg.toggleLights();
      const x=view?.camera[0]??s.x+inward*2.3,z=view?.camera[2]??s.z,eye=tg.floorY+1.6;
      T.player.position.set(x,tg.floorY,z);
      const tx=view?.target[0]??s.x,tz=view?.target[2]??s.z;
      T.setShotView({x,y:eye,z,tx,ty:eye,tz,fov:50});
      for(let i=0;i<45;i++)T.stepFrame(.016);
      const objectName=site==='rangeConsole'?'training-range-console':'training-'+site;
      const b=new T.THREE.Box3().setFromObject(tg.group.getObjectByName(objectName));
      return {site,camera:T.camera.position.toArray(),target:[tx,eye,tz],bounds:{min:b.min.toArray(),max:b.max.toArray()},lights:T.trainingDbg.lights()};
    })(${JSON.stringify(site)},${JSON.stringify(matched)})`);
    records.push(rec);
    await page.screenshot(path.join(out,`${phase}-${site}-noon.png`));
  }
  fs.writeFileSync(path.join(out,`${phase}-cameras.json`),JSON.stringify(records,null,2));
  assert.deepEqual(page.errors,[]);
  console.log(`PASS CB-292 ${phase}: ${records.length} station camera shots, 0 page errors`);
}finally{await browser.close();await server.close();}
