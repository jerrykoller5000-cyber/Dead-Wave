import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Run through crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20100');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 90000 })) throw Error('game did not load');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('document.getElementById("opening").hidden', { timeout: 30000 });
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20100 walk';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 90000 })) throw Error('Training did not start');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 30000 });
  await page.evaluate(`(()=>{
    const T=TT,y=T.trainingDbg.tg().floorY;
    T.grantAllWeapons();T.setUnarmedDbg(false);T.setViewFirstDbg(false);T.flightHold(true);
    T.player.position.set(0,y,-641.6);
    T.setShotView({x:2.2,y:y+1.9,z:-642.1,tx:0,ty:y+1.2,tz:-640.48,fov:42});
    window.__gpWall={
      wall:{minX:-1,maxX:1,minY:y,maxY:y+2.2,minZ:-640.42,maxZ:-640.32},
      door:{minX:-.38,maxX:.38,minY:y,maxY:y+2.2,minZ:-640.42,maxZ:-640.32},
      crate:{minX:-.6,maxX:.6,minY:y,maxY:y+1.55,minZ:-640.42,maxZ:-640.03},
      station:{minX:-1.1,maxX:1.1,minY:y,maxY:y+1.7,minZ:-640.42,maxZ:-640.05}
    };
    window.__gpSetBox=(kind)=>{
      if(window.__gpBox){T.trainingDbg.tg().solids.splice(T.trainingDbg.tg().solids.indexOf(window.__gpBox),1);T.scene.remove(window.__gpMesh);}
      const b=window.__gpWall[kind];T.trainingDbg.tg().solids.push(b);window.__gpBox=b;
      const m=new T.THREE.Mesh(new T.THREE.BoxGeometry(b.maxX-b.minX,b.maxY-b.minY,b.maxZ-b.minZ),new T.THREE.MeshStandardMaterial({color:0x75818b,roughness:.92}));
      m.position.set((b.maxX+b.minX)/2,(b.maxY+b.minY)/2,(b.maxZ+b.minZ)/2);T.scene.add(m);window.__gpMesh=m;
    };
    window.__gpSample=()=>{
      const b=window.__gpBox,T=TT,g=T.weaponMeshes[T.getCurrentWeapon()],u=T.getMarine().userData,V=T.THREE.Vector3;
      g.updateMatrixWorld(true);T.getMarine().updateMatrixWorld(true);
      const v=new V();let gunInside=0,vertices=0,armInside=0;
      g.traverse(o=>{if(!o.isMesh||!o.geometry?.attributes.position||o===g.userData.flash||o===g.userData.laser)return;
        for(let a=o;a;a=a.parent){if(!a.visible)return;if(a===g)break;}
        const P=o.geometry.attributes.position;for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i).applyMatrix4(o.matrixWorld);vertices++;
          if(v.x>b.minX+.001&&v.x<b.maxX-.001&&v.y>b.minY+.001&&v.y<b.maxY-.001&&v.z>b.minZ+.001&&v.z<b.maxZ-.001)gunInside++;
        }
      });
      for(const side of ['R','L']){const a=u['arm'+side+'G'],e=u['elbow'+side+'G'],w=e?.userData.wrist;
        const pts=[a.getWorldPosition(new V()),e.getWorldPosition(new V()),w?.getWorldPosition(new V())].filter(Boolean);
        for(let j=0;j<pts.length-1;j++)for(let n=0;n<=16;n++){const q=pts[j].clone().lerp(pts[j+1],n/16),r=.045;
          if(q.x>b.minX-r&&q.x<b.maxX+r&&q.y>b.minY-r&&q.y<b.maxY+r&&q.z>b.minZ-r&&q.z<b.maxZ+r)armInside++;}
      }
      return {gunInside,armInside,vertices,player:T.player.position.toArray(),yaw:T.player.rotation.y,muzzle:T.getMuzzleWorld().toArray()};
    };
  })()`);
  const report = [];
  const weapons = ['minigun','m4','ak','pistol','uzi','shotgun','aa12','revolver','sniper','launcher','flamer','chainsaw'];
  const cases = [
    { kind:'wall', stance:'still', z:-640.9, keys:[] },
    { kind:'wall', stance:'crouch', z:-640.9, keys:['KeyC'] },
    { kind:'wall', stance:'walk', z:-641.15, keys:['KeyW'] },
    { kind:'wall', stance:'sprint', z:-641.15, keys:['KeyW','ShiftLeft'] },
    { kind:'door', stance:'still', z:-640.9, keys:[] },
    { kind:'door', stance:'crouch', z:-640.9, keys:['KeyC'] },
    { kind:'crate', stance:'still', z:-640.9, keys:[] },
    { kind:'crate', stance:'crouch', z:-640.9, keys:['KeyC'] },
    { kind:'station', stance:'still', z:-640.9, keys:[] },
    { kind:'station', stance:'crouch', z:-640.9, keys:['KeyC'] },
  ];
  for (const weapon of weapons) {
    await page.evaluate(`((w)=>{
      const T=TT,y=T.trainingDbg.tg().floorY;
      T.player.position.set(0,y,-642);T.setVelDbg(0,0);T.flightInput({keys:[]});
      T.setWeapon(T.WEAPON_ORDER.indexOf(w));
      for(let i=0;i<60;i++)T.stepFrame(1/60);
    })(${JSON.stringify(weapon)})`);
    for (const spec of cases) {
      await page.evaluate(`((w,s)=>{
        const T=TT,y=T.trainingDbg.tg().floorY;
        T.setVelDbg(0,0);__gpSetBox(s.kind);
        T.player.position.set(0,y,s.z);T.player.rotation.y=0;T.setOtsAimDbg(0,0);T.flightInput({keys:s.stance==='crouch'?['KeyC']:[]});
        for(let i=0;i<24;i++)T.stepFrame(1/60);
        T.player.position.set(0,y,s.z);
        for(let i=0;i<3;i++)T.stepFrame(1/60);
        if(s.stance==='walk'||s.stance==='sprint'){
          T.player.position.set(0,y,s.z);T.flightInput({keys:s.keys});
          for(let i=0;i<(s.stance==='sprint'?3:5);i++)T.stepFrame(1/60);
          T.flightInput({keys:[]});
        }
      })(${JSON.stringify(weapon)},${JSON.stringify(spec)})`);
      const sample=await page.evaluate('__gpSample()');
      report.push({weapon,kind:spec.kind,stance:spec.stance,...sample});
    }
    console.log(`${weapon}: ${report.filter(x=>x.weapon===weapon&&x.gunInside===0&&x.armInside===0).length}/${cases.length} clear`);
  }
  fs.writeFileSync(path.join(out,'walk-check.json'),JSON.stringify(report,null,2));
  const bad=report.filter(x=>x.gunInside||x.armInside);
  console.log(JSON.stringify({checks:report.length,pass:report.length-bad.length,fail:bad.length,bad:bad.slice(0,24)}));
  if(bad.length)throw Error(`${bad.length} weapon/arm penetration checks failed`);
  for(const [light,time] of Object.entries({noon:.42,overcast:.5,dusk:.74,night:.02})){
    for(const weapon of ['pistol','m4','launcher','minigun','chainsaw']){
      await page.evaluate(`((w,t,l)=>{
        const T=TT,y=T.trainingDbg.tg().floorY;T.setWeapon(T.WEAPON_ORDER.indexOf(w));__gpSetBox('wall');
        T.player.position.set(0,y,-640.9);T.flightInput({keys:[]});T.setWorldTime(t);T.weather.raining=l==='overcast';
        for(let i=0;i<24;i++)T.stepFrame(1/60);
      })(${JSON.stringify(weapon)},${time},${JSON.stringify(light)})`);
      await page.screenshot(path.join(out,`after-${light}-${weapon}.png`));
    }
  }
} finally { await browser.close(); await server.close(); }
