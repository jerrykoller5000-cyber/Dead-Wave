import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Run through crew.mjs slot run');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20100');
const server=await serve(root,0);
const browser=await launch({headless:false,args:['--window-size=1280,720']});
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1`);
  if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"',{timeout:90000}))throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('document.getElementById("opening").hidden',{timeout:30000});
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20100 sweep';document.getElementById('modeTraining').click();})()`);
  if(!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"',{timeout:90000}))throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000});
  await page.evaluate(`(()=>{
    const T=TT,y=T.trainingDbg.tg().floorY;
    T.grantAllWeapons();T.setUnarmedDbg(false);T.setViewFirstDbg(false);T.flightHold(true);T.flightInput({keys:[]});
    const b={minX:-1,maxX:1,minY:y,maxY:y+2.2,minZ:-640.42,maxZ:-640.32,wall:true};
    T.trainingDbg.tg().solids.push(b);window.__gpBox=b;
    T.setShotView({x:2.2,y:y+1.9,z:-642.1,tx:0,ty:y+1.2,tz:-640.48,fov:42});
    window.__gpStep=(z)=>{
      T.player.position.set(0,y,z);T.setVelDbg(0,0);T.player.rotation.y=0;T.setOtsAimDbg(0,0);T.stepFrame(1/60);
      const g=T.weaponMeshes[T.getCurrentWeapon()],u=T.getMarine().userData,V=T.THREE.Vector3,v=new V();
      g.updateMatrixWorld(true);T.getMarine().updateMatrixWorld(true);
      let gunInside=0,armInside=0;
      g.traverse(o=>{if(!o.isMesh||!o.geometry?.attributes.position||o===g.userData.flash||o===g.userData.laser)return;
        for(let a=o;a;a=a.parent){if(!a.visible)return;if(a===g)break;}
        const P=o.geometry.attributes.position;for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i).applyMatrix4(o.matrixWorld);
          if(v.x>b.minX+.001&&v.x<b.maxX-.001&&v.y>b.minY+.001&&v.y<b.maxY-.001&&v.z>b.minZ+.001&&v.z<b.maxZ-.001)gunInside++;}
      });
      for(const side of ['R','L']){const a=u['arm'+side+'G'],e=u['elbow'+side+'G'],w=e.userData.wrist;
        const pts=[a.getWorldPosition(new V()),e.getWorldPosition(new V()),w.getWorldPosition(new V())];
        for(let j=0;j<2;j++)for(let n=0;n<=12;n++){const q=pts[j].clone().lerp(pts[j+1],n/12),r=.045;
          if(q.x>b.minX-r&&q.x<b.maxX+r&&q.y>b.minY-r&&q.y<b.maxY+r&&q.z>b.minZ-r&&q.z<b.maxZ+r)armInside++;}
      }
      return {z,playerZ:T.player.position.z,muzzle:T.getMuzzleWorld().toArray(),gunInside,armInside};
    };
  })()`);
  const report=[];
  for(const weapon of ['pistol','m4','launcher','minigun','chainsaw']){
    await page.evaluate(`((w)=>{const T=TT,y=T.trainingDbg.tg().floorY;T.setWeapon(T.WEAPON_ORDER.indexOf(w));
      T.player.position.set(0,y,-642.4);T.setVelDbg(0,0);T.marineIdleDbg().reset();for(let i=0;i<60;i++)T.stepFrame(1/60);
    })(${JSON.stringify(weapon)})`);
    const frames=[];
    for(let i=0;i<=30;i++)frames.push(await page.evaluate(`__gpStep(${-642.4+1.5*i/30})`));
    for(let i=29;i>=0;i--)frames.push(await page.evaluate(`__gpStep(${-642.4+1.5*i/30})`));
    for(let i=0;i<20;i++)frames.push(await page.evaluate('__gpStep(-642.4)'));
    let maxStep=0;for(let i=1;i<frames.length;i++){
      const a=frames[i-1].muzzle,b=frames[i].muzzle;
      maxStep=Math.max(maxStep,Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]));
    }
    const bad=frames.filter(f=>f.gunInside||f.armInside);
    report.push({weapon,frames:frames.length,maxStep,bad:bad.length,worst:bad.slice(0,3)});
    console.log(`${weapon}: ${frames.length} approach/release frames, max muzzle step ${maxStep.toFixed(3)}m, penetrations ${bad.length}`);
  }
  fs.writeFileSync(path.join(out,'sweep-check.json'),JSON.stringify(report,null,2));
  if(report.some(x=>x.bad||x.maxStep>.3))throw Error('Wall approach/release clips or snaps');
}finally{await browser.close();await server.close();}
