import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});
 await page.goto(server.origin+'/index.html?debug=1');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate(`(async()=>{
  const T=TT,G=T.THREE,H=T.inspectHost(),{makePistolModel}=await import('/studio/weapon-sidearms.js');
  const gun=makePistolModel({...H.builders.weaponContext(),finishGun:g=>g,mergeRigidMeshes:()=>{}});
  gun.userData.setMagazineRounds(5);window.magDetail=gun.userData.mag;window.magRound=gun.userData.magazineTopRound;
  T.scene.add(magDetail);magDetail.position.copy(T.player.position).add(new G.Vector3(0,4,1));magDetail.scale.copy(T.weaponMeshes.pistol.scale);
  magDetail.updateMatrixWorld(true);
  const eye=magDetail.localToWorld(new G.Vector3(.14,.18,.16)),target=magDetail.localToWorld(new G.Vector3(0,.055,.02));
  T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:38});
  for(const element of document.querySelectorAll('body *'))if(element.tagName!=='CANVAS'&&!element.querySelector('canvas'))element.style.visibility='hidden';
  H.loop(false);return true;
 })()`);
 for(const light of ['noon','overcast','dusk','night'])for(const phase of ['before','after']){
  await page.evaluate('magRound.visible='+JSON.stringify(phase==='after')+';true');
  await page.evaluate(`(async()=>{const T=TT,G=T.THREE,H=T.inspectHost(),L=(await import('/studio/inspector/stage.js')).LIGHTS[${JSON.stringify(light)}];T.stepFrame(1/60);H.sun.position.copy(magDetail.position).addScaledVector(new G.Vector3(...L.dir).normalize(),85);H.sun.target.position.copy(magDetail.position);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;H.render();return true})()`);
  const shot=await page.send('Page.captureScreenshot',{format:'png'});
  await writeFile(new URL('pistol-live/magazine-'+phase+'-'+light+'.png',import.meta.url),Buffer.from(shot.data,'base64'));
 }
 assert.deepEqual(page.errors,[]);console.log('PASS native pistol magazine and live round in four lights');
}finally{await browser.close();await server.close();}
