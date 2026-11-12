// Live Training gun-camo tile density; run through the crew game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew.mjs slot run');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20123/camo');
fs.mkdirSync(out,{recursive:true});
const server=await serve(root,0);
const browser=await launch({headless:false,args:['--disable-features=CalculateNativeWinOcclusion','--window-size=1280,720']});
const result={at:new Date().toISOString(),errors:[]};
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`,{timeout:240000});
  if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:120000}))throw Error('Game not ready');
  await page.evaluate('window.DWOpening?.dismissForTesting?.()');
  await page.evaluate(fs.readFileSync(path.join(root,'tools/tests/lib.js'),'utf8'));
  result.audit=await page.evaluate(`(async()=>{
    const T=window.TT;await startMatch(T,'GP20123');T.clearZombies?.();T.setHp(100000);T.grantAllWeapons();
    const picks={};for(const id of Object.keys(T.weaponMeshes))picks[id]='multicam';T.dressGuns({guns:picks});
    const v0=new T.THREE.Vector3(),v1=new T.THREE.Vector3(),rows=[];
    for(const [id,gun] of Object.entries(T.weaponMeshes)){
      gun.updateWorldMatrix(true,true);const ratios=[];let parts=0;
      gun.traverse(o=>{
        if(!o.isMesh||o.material?.userData?.gunPaintId!==id)return;
        const P=o.geometry?.attributes?.position,U=o.geometry?.attributes?.uv;
        if(!P||!U||P.count!==U.count)return;parts++;
        const step=Math.max(3,Math.ceil(P.count/300/3)*3);
        for(let i=0;i+2<P.count;i+=step)for(const [a,b] of [[i,i+1],[i,i+2]]){
          v0.fromBufferAttribute(P,a).applyMatrix4(o.matrixWorld);
          v1.fromBufferAttribute(P,b).applyMatrix4(o.matrixWorld);
          const len=v0.distanceTo(v1),ratio=Math.hypot(U.getX(a)-U.getX(b),U.getY(a)-U.getY(b))/len;
          if(len>.002&&len<.5&&ratio>.2&&ratio<5)ratios.push(ratio);
        }
      });
      ratios.sort((a,b)=>a-b);const median=ratios.length?ratios[Math.floor(ratios.length/2)]:null;
      rows.push({id,rootScale:gun.scale.x,parts,edges:ratios.length,medianRepeatsPerM:median,tileMetres:median?1/median:null});
    }
    return rows;
  })()`);
  result.errors=page.errors.slice();
  console.log(JSON.stringify({audit:result.audit,errors:result.errors}));
  if(result.errors.length)throw Error('Page errors: '+result.errors.length);
}catch(e){result.failure=String(e?.stack||e);console.error(result.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(result,null,2)+'\n','utf8');await browser.close();await server.close();}
