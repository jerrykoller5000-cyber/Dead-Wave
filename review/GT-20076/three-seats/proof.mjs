import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../../tools/cdp.mjs';
import {serve} from '../../../tools/serve.mjs';
import {save} from '../save.mjs';

const phase=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const folder=new URL('./'+phase+'/',import.meta.url);
await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../../',import.meta.url)),0);
const browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:920,height:520});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Hardware';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  const test=await readFile(new URL('../../../tools/tests/t333.js',import.meta.url),'utf8');
  const log=await page.evaluate(test,120000);
  await save(new URL('t333.txt',folder),log+'\n');
  const data=await page.evaluate(`(async()=>{
    const T=TT.THREE,{makeM4Model}=await import('/studio/weapon-longarms.js'),{makeRevolverModel}=await import('/studio/weapon-sidearms.js');
    const H=TT.inspectHost(),{LIGHTS}=await import('/studio/inspector/stage.js');
    const ctx={...H.builders.weaponContext(),finishGun:g=>g};
    const source=new WeakMap(),kit=ctx.gunKit;
    ctx.gunKit=(...args)=>Object.fromEntries(Object.entries(kit(...args)).map(([name,fn])=>[name,(...a)=>{
      const o=fn(...a);if(o?.isObject3D)source.set(o,new Error().stack.split('\n').find(s=>s.includes('/studio/weapon-'))?.trim());
      return o;
    }]));
    const guns={m4:makeM4Model(ctx),revolver:makeRevolverModel(ctx)};
    const stage=new T.Group();stage.scale.setScalar(12);stage.position.set(30,80,-60);TT.scene.add(stage);TT.setViewFirstDbg(false);
    let lightName='noon';
    H.attach({held:()=>false,scale:dt=>dt,frame:()=>{
      const L=LIGHTS[lightName];H.sun.position.copy(stage.position).addScaledVector(new T.Vector3(...L.dir).normalize(),75);
      H.sun.target.position.copy(stage.position);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;
      H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    }});
    const style=document.createElement('style');style.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(style);
    const details={};
    for(const [id,g] of Object.entries(guns)){
      g.updateMatrixWorld(true);
      const mesh=[];
      g.traverse(o=>{
        if(!o.isMesh || /flash|laser|flare|suppressor|light/i.test(o.name) || (o.material?.transparent && !o.material.opacity))return;
        const b=new T.Box3().setFromObject(o),s=b.getSize(new T.Vector3());
        mesh.push({o,b,long:Math.max(s.x,s.y,s.z)});
      });
      const rows=details[id]=[];
      const targets=id==='m4'?[[-.024,.005,-.110]]:[[-.036,-.073,-.066],[.036,-.073,-.066]];
      for(const coords of targets){
        const point=new T.Vector3(...coords),side=Math.sign(point.x);
        const ray=new T.Raycaster(new T.Vector3(side,point.y,point.z),new T.Vector3(-side,0,0));
        const nearby=mesh.filter(m=>m.long<=.018 && m.b.getCenter(new T.Vector3()).distanceTo(point)<.009);
        for(const {o,b} of nearby){
          const p=b.getCenter(new T.Vector3());
          const supports=mesh.filter(m=>m.long>.018).map(({o:host,b:box})=>{
            const gap=Math.hypot(Math.max(0,b.min.x-box.max.x,box.min.x-b.max.x),Math.max(0,b.min.y-box.max.y,box.min.y-b.max.y),Math.max(0,b.min.z-box.max.z,box.min.z-b.max.z));
            const hit=ray.intersectObject(host,false)[0];
            return {name:host.name,where:source.get(host),gap,xAtCentre:hit?.point.x};
          }).sort((a,b)=>a.gap-b.gap);
          rows.push({centre:p.toArray(),extent:[b.min.x,b.max.x],seat:o.userData.detailSeat||o.userData,part:o.name,parent:o.parent.name,
            parentPosition:o.parent.position.toArray(),where:source.get(o),nearest:supports.slice(0,4)});
        }
      }
      stage.add(g);g.visible=false;
    }
    window.seatView=(id,light,oblique)=>{
      lightName=light;
      for(const [key,g] of Object.entries(guns))g.visible=key===id;
      const p=id==='m4'?[-.024,0,-.11]:[.034,-.065,-.065],sx=Math.sign(p[0]);
      const center=stage.localToWorld(new T.Vector3(...p)),dist=(id==='m4'?.087:.18)*12;
      const eye=center.clone().addScaledVector(new T.Vector3(sx,oblique?.45:.08,oblique?-.72:-.1).normalize(),dist);
      TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:center.x,ty:center.y,tz:center.z,fov:34});
    };
    return details;
  })()`.replace("split('\n')","split('\\n')"));
  await save(new URL('detail.json',folder),JSON.stringify(data,null,2));
  const units=await page.evaluate('Object.fromEntries(["m4","revolver"].map(id=>[id,TT.weaponMeshes[id].scale.x/TT.getWeaponSizeDbg().upm]))');
  await save(new URL('metres-per-local-unit.json',folder),JSON.stringify(units,null,2));
  for(const id of ['m4','revolver'])for(const [oblique,light] of [[false,'noon'],[true,'noon'],[true,'overcast'],[true,'dusk'],[true,'night']]){
    await page.evaluate('seatView('+[id,light,oblique].map(v=>JSON.stringify(v)).join(',')+');new Promise(r=>setTimeout(r,240))');
    const img=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
    await save(new URL(id+(oblique?'-angle':'-side')+'-'+light+'.jpg',folder),Buffer.from(img.data,'base64'));
  }
  assert.deepEqual(page.errors,[]);
  const reds=log.split('\n').filter(s=>s.startsWith('FAIL '));
  if(phase==='after')assert.deepEqual(reds,[]);
  console.log(phase,log.split('\n').filter(s=>s.startsWith('PASS ')).length,'pass',reds.length,'fail');
}finally{await browser.close();await server.close();}
