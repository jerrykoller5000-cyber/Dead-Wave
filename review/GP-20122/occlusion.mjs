// Freeze the Training CIF camera and compare actual pixels with containment shown/hidden.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Run through crew slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20122');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const result={at:new Date().toISOString(),errors:[]};
try {
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(server.origin+'/index.html?debug=1',{timeout:400000});
  if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:120000}))throw Error('Load not ready');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('!window.DWOpening || window.DWOpening.active===false',{timeout:500000});
  await page.evaluate('(()=>{document.getElementById("playerName").value="GP-20122 occlusion";document.getElementById("modeTraining").click()})()');
  if(!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:400000}))throw Error('Training entry not ready');
  await page.evaluate('(()=>{const t=TT.trainingDbg.tg(),f=t.stations.cif.front;TT.player.position.set(f.x,t.floorY,f.z)})()');
  await new Promise(r=>setTimeout(r,2000));
  result.scene=await page.evaluate('(()=>{const r=TT.renderer,g=TT.scene.getObjectByName("training-containment");if(!g)throw Error("containment group missing");r.setAnimationLoop(null);window.__gpOcclusionGroup=g;return {eye:TT.camera.position.toArray(),player:TT.player.position.toArray(),children:g.children.length,renderAsync:typeof r.renderAsync}})()');
  const draw=async visible=>page.evaluate(`(async()=>{__gpOcclusionGroup.visible=${visible};await TT.renderer.renderAsync(TT.scene,TT.camera)})()`);
  await draw(true);await page.screenshot(path.join(out,'occlusion-on.png'));
  await draw(false);await page.screenshot(path.join(out,'occlusion-off.png'));
  result.pixels=await page.evaluate(`(async()=>{
    const paths=['occlusion-on.png','occlusion-off.png'];
    const images=await Promise.all(paths.map(async p=>{const i=new Image();i.src='/review/GP-20122/'+p;await i.decode();const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,c.width,c.height)}));
    const a=images[0].data,b=images[1].data;let changed=0,max=0,bounds=[Infinity,Infinity,-Infinity,-Infinity];
    for(let i=0;i<a.length;i+=4){const d=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));if(d){changed++;max=Math.max(max,d);const x=(i/4)%images[0].width,y=Math.floor((i/4)/images[0].width);bounds=[Math.min(bounds[0],x),Math.min(bounds[1],y),Math.max(bounds[2],x),Math.max(bounds[3],y)];}}
    return {width:images[0].width,height:images[0].height,changed,max,bounds:changed?bounds:null};
  })()`);
  result.errors=page.errors.slice();
  console.log(JSON.stringify(result));
}catch(e){result.failure=String(e?.stack||e);console.error(result.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'occlusion.json'),JSON.stringify(result,null,2)+'\n','utf8');await browser.close();await server.close();}
