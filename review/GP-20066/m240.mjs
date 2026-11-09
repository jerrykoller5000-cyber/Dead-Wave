// GP-20066: standard-issue PEQ-16 on the mounted Watchman, no kiosk purchase.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20066/m240');fs.mkdirSync(out,{recursive:true});
const server=await serve(root,0);
const browser=await launch({headless:false,args:['--disable-features=CalculateNativeWinOcclusion','--window-size=1280,720']});
try {
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`,{timeout:240000});
  if(!await page.waitFor('!!window.TT',{timeout:400000}))throw new Error('TT did not boot');
  await page.evaluate('window.DWOpening?.dismissForTesting?.()');
  await page.evaluate(fs.readFileSync(path.join(root,'tools/tests/lib.js'),'utf8'));
  const result=await page.evaluate(`(async()=>{
    const T=window.TT,wait=ms=>new Promise(r=>setTimeout(r,ms)),p=T.player.position;
    await startMatch(T,'GP20066M240');T.clearZombies?.();T.setHp(100000);
    if(T.getGearOwned().laserLight)throw new Error('test needs unowned attachment');
    const b=T.spawnBuild('m240',p.x+1.2,p.z);
    if(!b||!T.mountMortar(b))throw new Error('M240 mount failed');
    const u=b.mesh.userData.laserLightUnit;
    if(!u||!u.visible||!b.mesh.userData.elev.getObjectById(u.id))throw new Error('standard PEQ-16 missing from elevation pivot');
    T.setLasersDbg(true);await wait(500);
    const beam=T.scene.getObjectByName('m240-laser-beam');
    const aim=T.laserAimDbg(),projected=u.localToWorld(u.userData.laserLens.clone());
    if(!beam?.visible||!aim||projected.distanceTo(new T.THREE.Vector3(aim.ox,aim.oy,aim.oz))>.02)throw new Error('mounted laser misses its lens');
    document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'Digit2',bubbles:true}));
    document.body.dispatchEvent(new KeyboardEvent('keyup',{code:'Digit2',bubbles:true}));await wait(250);
    const light=T.scene.children.find(o=>o.isSpotLight&&o.color.getHex()===0xfff2d0);
    const white=u.localToWorld(u.userData.lightLens.clone());
    if(!light||light.intensity<=0||light.position.distanceTo(white)>.02)throw new Error('mounted white light misses its lens');
    return {backend:T.getRendererBackend(),owned:T.getGearOwned().laserLight,unitOnElev:true,laserError:projected.distanceTo(new T.THREE.Vector3(aim.ox,aim.oy,aim.oz)),lightError:light.position.distanceTo(white)};
  })()`);
  const shot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(path.join(out,'mounted-noon.png'),Buffer.from(shot.data,'base64'));
  fs.writeFileSync(path.join(out,'live.json'),JSON.stringify({result,errors:page.errors},null,2)+'\n');
  console.log(JSON.stringify({result,errors:page.errors}));
  if(page.errors.length)throw new Error(page.errors[0]);
} finally {await browser.close();await server.close();}
