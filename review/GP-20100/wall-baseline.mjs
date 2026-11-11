import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Run through crew.mjs slot run');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20100');
const phase=process.argv[2]||'before';
const server=await serve(root,0);
const browser=await launch({headless:false,args:['--window-size=1280,720']});
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1`);
  if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"',{timeout:90000}))throw Error('game did not load');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('document.getElementById("opening").hidden',{timeout:30000});
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20100 wall';document.getElementById('modeTraining').click();})()`);
  if(!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"',{timeout:90000}))throw Error('Training did not start');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000});
  await page.evaluate(`(()=>{
    const T=TT,p=T.player.position,y=T.trainingDbg.tg().floorY;
    T.grantAllWeapons();T.setUnarmedDbg(false);T.setViewFirstDbg(false);
    p.set(0,y,-640.9);
    const box={minX:-1,maxX:1,minY:y,maxY:y+2.2,minZ:-640.42,maxZ:-640.32,wall:true};
    T.trainingDbg.tg().solids.push(box);window.__gp20100Box=box;
    const m=new T.THREE.Mesh(new T.THREE.BoxGeometry(2,2.2,.1),new T.THREE.MeshStandardMaterial({color:0x75818b,roughness:.92}));
    m.position.set(0,y+1.1,-640.37);T.scene.add(m);window.__gp20100Mesh=m;
    T.setShotView({x:2.2,y:y+1.9,z:-642.1,tx:0,ty:y+1.2,tz:-640.48,fov:42});
  })()`);
  const results=[];
  for(const weapon of ['pistol','m4','launcher','minigun','chainsaw']){
    await page.evaluate(`((w)=>TT.setWeapon(TT.WEAPON_ORDER.indexOf(w)))(${JSON.stringify(weapon)})`);
    await new Promise(r=>setTimeout(r,1100));
    const result=await page.evaluate(`(()=>{
      const T=TT,b=window.__gp20100Box,g=T.weaponMeshes[T.getCurrentWeapon()],m=T.getMarine(),u=m.userData,V=T.THREE.Vector3;
      m.updateMatrixWorld(true);g.updateMatrixWorld(true);
      const p=T.player.position,muzzle=T.getMuzzleWorld(),v=new V();let gunVertices=0,inside=0,closest=Infinity;
      g.traverse(o=>{if(!o.isMesh||!o.geometry?.attributes.position||o===g.userData.laser||o===g.userData.flash)return;
        for(let a=o;a;a=a.parent){if(!a.visible)return;if(a===g)break;}
        const P=o.geometry.attributes.position;for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i).applyMatrix4(o.matrixWorld);gunVertices++;
          const dz=b.minZ-v.z;if(dz<closest)closest=dz;
          if(v.x>b.minX+.001&&v.x<b.maxX-.001&&v.y>b.minY+.001&&v.y<b.maxY-.001&&v.z>b.minZ+.001&&v.z<b.maxZ-.001)inside++;
        }
      });
      const arms={};let armInside=0;
      for(const side of ['R','L']){const a=u['arm'+side+'G'],e=u['elbow'+side+'G'],w=e?.userData.wrist;
        const pts=[a.getWorldPosition(new V()),e.getWorldPosition(new V()),w?.getWorldPosition(new V())].filter(Boolean);
        arms[side]={shoulder:pts[0].toArray(),elbow:pts[1].toArray(),wrist:pts[2]?.toArray()||null};
        for(let j=0;j<pts.length-1;j++)for(let n=0;n<=12;n++){const q=pts[j].clone().lerp(pts[j+1],n/12),r=.045;
          if(q.x>b.minX-r&&q.x<b.maxX+r&&q.y>b.minY-r&&q.y<b.maxY+r&&q.z>b.minZ-r&&q.z<b.maxZ+r)armInside++;}
      }
      return {weapon:T.getCurrentWeapon(),player:[p.x,p.y,p.z],muzzle:muzzle.toArray(),wall:b,shape:g.userData.gp20100WallShape||null,gunVertices,inside,closest,armInside,arms};
    })()`);
    results.push(result);
    await page.screenshot(path.join(out,`solid-${phase}-${weapon}.png`));
  }
  fs.writeFileSync(path.join(out,`solid-${phase}.json`),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(x=>({weapon:x.weapon,player:x.player,muzzle:x.muzzle,inside:x.inside,armInside:x.armInside,gunVertices:x.gunVertices,closest:x.closest}))));
  if(phase==='after'&&results.some(x=>x.inside||x.armInside))throw Error('Third-person gun/arm intersects the wall: '+results.filter(x=>x.inside||x.armInside).map(x=>`${x.weapon} gun=${x.inside} arm=${x.armInside}`).join(', '));
}finally{await browser.close();await server.close();}
