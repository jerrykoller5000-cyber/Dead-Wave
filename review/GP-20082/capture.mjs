import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const label = process.argv[2];
if (!['before','after','final'].includes(label)) throw Error('Pass before, after or final');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root,'review/GP-20082');
const server = await serve(root,0);
const browser = await launch({headless:false,args:['--window-size=1280,720']});
try {
  const page = await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"',{timeout:90000})) throw Error('game not ready');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('document.getElementById("opening").hidden',{timeout:15000})) throw Error('opening not dismissed');
  await page.evaluate(`(() => {document.querySelector('#playerName').value='CIF Collision';document.querySelector('#modeTraining').click()})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:90000})) throw Error('training not ready');
  const geometry = await page.evaluate(`(async () => {
    const T=TT.THREE, station=TT.trainingDbg.tg().group.getObjectByName('training-cif');
    if (!station) throw Error('training CIF missing');
    station.updateMatrixWorld(true);
    const p=(x,y,z)=>station.localToWorld(new T.Vector3(x,y,z));
    const cam=p(0,1.62,2.6), aim=p(0,.95,.32);
    TT.getMarine().visible=false;
    TT.setShotView({x:cam.x,y:cam.y,z:cam.z,tx:aim.x,ty:aim.y,tz:aim.z,fov:43});
    let plaque=station.children.find(o=>o.isMesh&&o.geometry?.parameters?.width===1.62&&o.geometry?.parameters?.height===.20);
    let corbels=station.children.filter(o=>o.isMesh&&o.geometry?.parameters?.width===.07&&(o.name==='cif-counter-corbel'||(o.geometry?.parameters?.height===.28&&Math.abs(Math.abs(o.position.x)-.63)<.01)));
    if (!plaque || corbels.length!==2) {
      // The HQ static bake combines the corbels; build the same source unbaked for a geometric clearance check.
      const mod=await import('/ui/cif-exterior.js'), isolated=new T.Group();
      mod.dressCifExterior(T,isolated,k=>k,new T.MeshStandardMaterial());
      plaque=isolated.children.find(o=>o.isMesh&&o.geometry?.parameters?.width===1.62&&o.geometry?.parameters?.height===.20);
      corbels=isolated.children.filter(o=>o.name==='cif-counter-corbel');
    }
    if (!plaque || corbels.length!==2) throw Error('unbaked plaque or corbels missing');
    const corners=o=>{const b=new T.Box3().setFromObject(o);return {min:b.min.toArray(),max:b.max.toArray()}};
    return {plaque:corners(plaque),corbels:corbels.map(corners),camera:TT.getShotView()};
  })()`);
  await new Promise(r=>setTimeout(r,800));
  const shot=path.join(out,`${label}-eye.png`);
  await page.screenshot(shot);
  fs.writeFileSync(path.join(out,`${label}-geometry.json`),JSON.stringify({geometry,bytes:fs.statSync(shot).size,errors:page.errors},null,2));
  console.log(`${label} eye ${fs.statSync(shot).size} bytes; corbels ${geometry.corbels?.length ?? 0}; page errors ${page.errors.length}`);
  if (fs.statSync(shot).size<50000||page.errors.length) process.exitCode=1;
} finally {await browser.close();await server.close();}