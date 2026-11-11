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
const before=source.slice(0,start)+'function heldWallPull(gun, H, shoulder, pivotW, pivotLocal, gunQ, side, dt) { return 0; }\n    '+source.slice(end);
const temp=[];
for(const [phase,html] of [['before',before],['after',source]]){
  const file=path.join(out,`live-${phase}.html`);temp.push(file);
  fs.writeFileSync(file,html.replace('<head>','<head>\n  <base href="/">'),'utf8');
}
const server=await serve(root,0);
const browser=await launch({headless:false,args:['--window-size=1280,720']});
try{
  const results=[];
  for(const phase of ['before','after']){
    const page=await browser.newPage({width:1280,height:720});
    await page.goto(`${server.origin}/review/GP-20100/live-${phase}.html?debug=1`);
    if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"',{timeout:90000}))throw Error(`${phase} load failed`);
    await page.evaluate('DWOpening.dismissForTesting()');
    await page.waitFor('document.getElementById("opening").hidden',{timeout:30000});
    await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20100 lights';document.getElementById('modeTraining').click();})()`);
    if(!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"',{timeout:90000}))throw Error(`${phase} Training failed`);
    await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000});
    await page.evaluate(`(()=>{
      const T=TT,y=T.trainingDbg.tg().floorY;
      T.grantAllWeapons();T.setUnarmedDbg(false);T.setViewFirstDbg(false);
      const box={minX:-1,maxX:1,minY:y,maxY:y+2.2,minZ:-640.42,maxZ:-640.32,wall:true};
      T.trainingDbg.tg().solids.push(box);window.__gpWallBox=box;
      const m=new T.THREE.Mesh(new T.THREE.BoxGeometry(2,2.2,.1),new T.THREE.MeshStandardMaterial({color:0x75818b,roughness:.92}));
      m.position.set(0,y+1.1,-640.37);T.scene.add(m);
      T.setShotView({x:2.2,y:y+1.9,z:-642.1,tx:0,ty:y+1.2,tz:-640.48,fov:42});
    })()`);
    for(const [light,time] of Object.entries({noon:.42,overcast:.5,dusk:.74,night:.02})){
      for(const weapon of ['pistol','m4','launcher','minigun','chainsaw']){
        await page.evaluate(`((w,t,l)=>{
          const T=TT,y=T.trainingDbg.tg().floorY;
          T.player.position.set(0,y,-640.9);T.setVelDbg(0,0);T.marineIdleDbg().reset();
          T.setWeapon(T.WEAPON_ORDER.indexOf(w));T.setWorldTime(t);T.weather.raining=l==='overcast';
        })(${JSON.stringify(weapon)},${time},${JSON.stringify(light)})`);
        await new Promise(r=>setTimeout(r,900));
        const result=await page.evaluate(`(()=>{
          const T=TT,b=window.__gpWallBox,g=T.weaponMeshes[T.getCurrentWeapon()],V=T.THREE.Vector3;
          g.updateMatrixWorld(true);let inside=0,vertices=0;const v=new V();
          g.traverse(o=>{if(!o.isMesh||!o.geometry?.attributes.position||o===g.userData.flash||o===g.userData.laser)return;
            for(let a=o;a;a=a.parent){if(!a.visible)return;if(a===g)break;}
            const P=o.geometry.attributes.position;for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i).applyMatrix4(o.matrixWorld);vertices++;
              if(v.x>b.minX+.001&&v.x<b.maxX-.001&&v.y>b.minY+.001&&v.y<b.maxY-.001&&v.z>b.minZ+.001&&v.z<b.maxZ-.001)inside++;}
          });
          return {weapon:T.getCurrentWeapon(),player:T.player.position.toArray(),muzzle:T.getMuzzleWorld().toArray(),inside,vertices,
            camera:T.camera.position.toArray(),shot:T.getShotView(),held:g.visible};
        })()`);
        results.push({phase,light,...result});
        await page.screenshot(path.join(out,`live-${phase}-${light}-${weapon}.png`));
      }
      console.log(`${phase} ${light}: five shots`);
    }
    await page.close();
  }
  fs.writeFileSync(path.join(out,'lights-final.json'),JSON.stringify(results,null,2));
  const beforeHit=results.filter(x=>x.phase==='before'&&x.inside>0).length;
  const afterBad=results.filter(x=>x.phase==='after'&&(x.inside>0||x.vertices<1000));
  console.log(JSON.stringify({beforeHit,afterClear:20-afterBad.length,afterBad}));
  if(beforeHit<5||afterBad.length)throw Error('Four-light wall comparison failed');
}finally{
  await browser.close();await server.close();
  for(const file of temp){for(let i=0;i<5;i++){try{fs.unlinkSync(file);break;}catch(e){if(i===4)console.error('Temporary HTML cleanup failed:',file,e.message);await new Promise(r=>setTimeout(r,100));}}}
}
