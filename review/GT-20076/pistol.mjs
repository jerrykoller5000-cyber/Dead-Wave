import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from './save.mjs';

const phase = process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const folder = new URL('./pistol/' + phase + '/', import.meta.url);
await mkdir(folder, {recursive:true});
const server = await serve(fileURLToPath(new URL('../../', import.meta.url)), 0);
const browser = await launch({headless:false});
try {
  const page = await browser.newPage({width:960,height:540});
  await page.goto(server.origin + '/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Surface';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on") && Math.abs(TT.getWorldTime()-.5)<.02',{timeout:45000}));
  await page.evaluate(`(async()=>{
    const {makePistolModel}=await import('/studio/weapon-sidearms.js');
    const {auditWeapon}=await import('/tools/tests/weapon-seating.js');
    const T=TT.THREE, ctx={...TT.inspectHost().builders.weaponContext(),finishGun:g=>g};
    const pistol=makePistolModel(ctx), mag=pistol.userData.mag;
    const stage=new T.Group();stage.position.set(30,80,-60);stage.scale.setScalar(5);
    TT.scene.add(stage);TT.setViewFirstDbg(false);
    const key=new T.DirectionalLight(0xfff4df,2.6),fill=new T.HemisphereLight(0xf1f6ff,0xcabdac,1.5);
    key.position.set(33,84,-62);key.target.position.copy(stage.position);TT.scene.add(key,key.target,fill);
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    const issued=TT.weaponMeshes.pistol.scale;
    const measured={};
    for(const [name,group] of [['mag',mag],['slide',pistol.userData.slide]]) {
      const copy=group.clone(true);copy.position.set(0,0,0);copy.scale.copy(issued);
      const a=auditWeapon(copy,{metresPerUnit:1.8/1.655});
      measured[name]={pieces:a.parts,open:a.openSurfaces,loose:a.loose,intersections:a.overlaps};
    }
    window.pistolProof={measured,frame:(part,angle)=>{
      const object=part==='mag'?mag.clone(true):pistol.clone(true);
      if(part==='whole')object.traverse(o=>{if(o.name==='laserLightUnit')o.visible=false});
      object.position.set(0,0,0);stage.clear();stage.add(object);stage.updateMatrixWorld(true);
      const bounds=new T.Box3().makeEmpty();
      const subjects=part==='mag'?[object]:[pistol.userData.slide,mag,pistol.userData.frame].map(g=>object.children[pistol.children.indexOf(g)]);
      for(const subject of subjects)subject.traverseVisible(o=>{if(o.isMesh && o.geometry){o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld))}});
      const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
      const dir=new T.Vector3(...angle).normalize();
      const distance=Math.max(size.y,size.z*.61,size.x)*2.05;
      const eye=center.clone().addScaledVector(dir,distance);
      TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:center.x,ty:center.y,tz:center.z,fov:34});
    }};
  })()`);
  const results = await page.evaluate('pistolProof.measured');
  await save(new URL('results.json',folder),JSON.stringify(results,null,2)+'\n');
  for (const [part,name,direction] of [
    ['whole','side',[-1,.12,-.08]],['whole','three',[.85,.35,.5]],
    ['mag','face',[1,.12,.05]],['mag','three',[-1,.35,.5]]
  ]) {
    await page.evaluate('pistolProof.frame('+JSON.stringify(part)+','+JSON.stringify(direction)+');new Promise(r=>setTimeout(r,200))');
    const shot = await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
    await save(new URL(part+'-'+name+'.jpg',folder),Buffer.from(shot.data,'base64'));
  }
  assert.deepEqual(page.errors,[]);
  console.log(Object.entries(results).map(([id,r])=>id+' '+r.pieces+' pieces, '+r.loose.length+' detached, '+r.intersections.length+' intersections').join('\n'));
} finally {await browser.close();await server.close()}
