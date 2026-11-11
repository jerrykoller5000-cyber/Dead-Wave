import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const phase=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && /^[a-z0-9-]+$/.test(phase));
const folder=new URL('./'+phase+'/',import.meta.url);
await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate(`window.coldArtworkNodes={};for(const [id,gun] of Object.entries(TT.weaponMeshes)){const nodes=[];gun.traverse(o=>{if(o.isMesh)nodes.push(o)});coldArtworkNodes[id]=nodes}true`);
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Artwork';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  const report=await page.evaluate(`(async()=>{
    TT.grantAllWeapons();TT.setViewFirstDbg(false);if(TT.isUnarmed())TT.toggleHolster();TT.flightHold(true);
    const host=TT.inspectHost(),T=TT.THREE,renderer=host.renderer,info=renderer.info;
    const scene=new T.Scene(),cam=new T.PerspectiveCamera(36,16/9,.01,50);
    scene.add(new T.HemisphereLight(0xdbe9ff,0xb7a483,1.1));
    const sun=new T.DirectionalLight(0xfff0d8,2);sun.position.set(2,3,4);scene.add(sun);
    const result={},lastReset=info.autoReset;info.autoReset=false;
    const draw=()=>{info.reset();renderer.render(scene,cam);return {draws:info.render.drawCalls??info.render.calls,triangles:info.render.triangles}};
    try {
      cam.position.set(2,.6,1.3);cam.lookAt(0,0,0);const empty=draw();cam.layers.enableAll();
      for(const [id,source] of Object.entries(TT.weaponMeshes)){
        for(let tries=0;tries<20 && TT.getCurrentWeapon()!==id;tries++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(id));for(let s=0;s<20;s++)TT.stepFrame(1/30)}
        for(let s=0;s<80;s++)TT.stepFrame(1/30);
        if(TT.getCurrentWeapon()!==id)throw Error('Held model missing '+id);
        const copy=TT.cloneLean(source);copy.visible=true;copy.position.set(0,0,0);copy.quaternion.identity();
        copy.traverse(o=>{o.frustumCulled=false});scene.add(copy);copy.updateMatrixWorld(true);
        const b=new T.Box3(),point=new T.Vector3();let all=0,shown=0;
        copy.traverse(o=>{if(o.isMesh)all++});
        copy.traverseVisible(o=>{
          if(!o.isMesh)return;
          shown++;
          const p=o.geometry.attributes.position;
          for(let i=0;i<p.count;i++)b.expandByPoint(point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));
        });
        const c=b.getCenter(new T.Vector3()),s=b.getSize(new T.Vector3()).length();
        cam.position.copy(c).addScaledVector(new T.Vector3(1,.4,.6).normalize(),s*2.5);cam.lookAt(c);cam.updateMatrixWorld();
        draw();const sample=draw();
        const refs=new Map(),present=new Set(),cold=new Set(coldArtworkNodes[id]),hidden=[];
        for(const [key,value] of Object.entries(source.userData)){
          if(value?.isObject3D)refs.set(value,value.name||key);
          else if(Array.isArray(value))value.forEach((o,i)=>{if(o?.isObject3D)refs.set(o,o.name||key+'['+i+']')});
        }
        source.traverse(o=>{
          if(!o.isMesh)return;present.add(o);
          let owner='',gate='';
          for(let p=o;p&&p!==source;p=p.parent){
            if(!owner && (refs.has(p)||p.name))owner=refs.get(p)||p.name;
            if(!p.visible)gate=refs.get(p)||p.name||owner||p.type;
          }
          if(gate)hidden.push({owner:owner||'body',gate,name:o.name,material:o.material.name||o.material.type,cold:cold.has(o)});
        });
        result[id]={all,shown,cold:cold.size,added:[...present].filter(o=>!cold.has(o)).length,
          removed:[...cold].filter(o=>!present.has(o)).length,hidden,draws:sample.draws-empty.draws,triangles:sample.triangles-empty.triangles};
        scene.remove(copy);
      }
      return {empty,result,backend:renderer.backend?.constructor.name};
    } finally {info.autoReset=lastReset}
  })()`);
  await save(new URL('draws.json',folder),JSON.stringify(report,null,2));
  const missing=Object.entries(report.result).filter(([,r])=>!(r.draws>0 && r.triangles>0));
  assert.equal(missing.length,0,'Missing GPU counters: '+JSON.stringify(missing));
  await page.evaluate(`(async()=>{
    TT.grantAllWeapons();TT.setViewFirstDbg(true);
    if(TT.isUnarmed())TT.toggleHolster();TT.setOtsAimDbg(0,-.08);
    const H=TT.inspectHost(),{LIGHTS}=await import('/studio/inspector/stage.js');
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    let light='noon';
    H.attach({held:()=>false,scale:dt=>dt,frame:()=>{
      const L=LIGHTS[light];
      H.sun.position.copy(TT.player.position).addScaledVector(new H.THREE.Vector3(...L.dir).normalize(),85);
      H.sun.target.position.copy(TT.player.position);H.sun.target.updateMatrixWorld();
      H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);
      H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    }});
    window.batchEye=async(key,name)=>{
      light=name;
      if(TT.getCurrentWeapon()!==key){
        TT.flightHold(false);for(let i=0;i<35&&TT.getCurrentWeapon()!==key;i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(key));await new Promise(r=>setTimeout(r,100))}
      }
      TT.flightHold(true);for(let i=0;i<100;i++)TT.stepFrame(1/30);
      for(let i=0;i<3;i++){await new Promise(r=>setTimeout(r,70));TT.stepFrame(1/30)}
      const v=TT.viewmodelDbg().info;if(v.key!==key||!v.active||v.raise<.98)throw Error('Eye missing '+key);
    };
  })()`);
  const ids=process.argv.includes('--inventory')?[]:process.argv.includes('--decals')?['chainsaw']:['sniper','launcher','revolver','chainsaw'];
  for(const id of ids){
    for(const light of ['noon','overcast','dusk','night']){
      await page.evaluate('batchEye('+JSON.stringify(id)+','+JSON.stringify(light)+')');
      if(process.argv.includes('--decals')){
        const overlay=await page.evaluate(`(async()=>{
          for(let i=0;i<4;i++){TT.sawEffectsDbg.setBlood(.65,0);TT.stepFrame(1/30);await new Promise(r=>setTimeout(r,75))}
          const g=TT.weaponMeshes.chainsaw.userData.sawBloodGroup,eye=TT.viewmodelDbg().gun.root.getObjectByName('saw-blood-overlay');
          const counts=n=>{const pieces=[];n.traverse(o=>{if(o.isMesh)pieces.push({vertices:o.geometry.index?.count??o.geometry.attributes.position.count,order:o.renderOrder,opacity:o.material.opacity})});return pieces};
          return {held:counts(g),eye:counts(eye)};
        })()`);
        assert(overlay.held.every(o=>o.opacity>.6 && o.order===2));
        assert.equal(overlay.held.reduce((s,o)=>s+o.vertices,0),84);
        assert(overlay.eye.every(o=>o.opacity>.6));
        await save(new URL('decals-'+light+'.json',folder),JSON.stringify(overlay,null,2));
      }
      const img=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
      await save(new URL(id+'-'+light+'.jpg',folder),Buffer.from(img.data,'base64'));
    }
  }
  assert.deepEqual(page.errors,[]);
  const total=Object.values(report.result).reduce((sum,r)=>sum+r.draws,0);
  console.log('PASS',report.backend,'isolated GPU draws across all 12 models',total,'four-light eye frames',ids.length*4);
}finally{await browser.close();await server.close()}
