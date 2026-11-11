import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const folder=new URL('./rack/',import.meta.url);
await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:1152,height:648});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Rack proof';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  const report=await page.evaluate(`(async()=>{
    const T=TT.THREE,H=TT.inspectHost(),{LIGHTS}=await import('/studio/inspector/stage.js');
    const {verifyArtworkInstances}=await import('/review/GT-20081/verify.mjs');
    TT.grantAllWeapons();TT.setViewFirstDbg(false);TT.flightHold(true);const arm=TT.armoryDbg.ui().armory;
    for(const id of ['launcher','revolver'])if(!TT.armoryDbg.stored().includes(id))arm.buy({id:'instance-proof-'+id,kind:id},{store:true});
    TT.armoryDbg.refreshRack(true);for(let i=0;i<12;i++)TT.stepFrame(1/30);
    const training=TT.scene.getObjectByName('training-armory').getObjectByName('armoryRack');
    let target=new T.Vector3(),light='noon';
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    H.attach({held:()=>false,scale:dt=>dt,frame:()=>{
      const L=LIGHTS[light];H.sun.position.copy(target).addScaledVector(new T.Vector3(...L.dir).normalize(),85);
      H.sun.target.position.copy(target);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;
      H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    }});
    function sample(root,material,frame=root,folded=false){
      root.updateWorldMatrix(true,true);
      const origin=frame.matrixWorld.clone().invert(),axes=[[],[],[]],v=new T.Vector3(),local=new T.Matrix4();
      root.traverseVisible(o=>{
        if(!o.isMesh)return;
        if(folded){if(o.material.name!=='fold-static'||!o.geometry.attributes.foldRM||!o.geometry.attributes.color)return}
        else if(o.material!==material)return;
        const g=o.geometry,pos=g.attributes.position,m=new T.Matrix4().multiplyMatrices(origin,o.matrixWorld);
        for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
          const rel=m.clone();if(o.isInstancedMesh){o.getMatrixAt(i,local);rel.multiply(local)}
          for(let j=0;j<(g.index?g.index.count:pos.count);j++){
            const k=g.index?g.index.getX(j):j;
            if(folded){
              const col=g.attributes.color,rm=g.attributes.foldRM,c=material.color;
              if(Math.abs(col.getX(k)-c.r)>.00001 || Math.abs(col.getY(k)-c.g)>.00001 || Math.abs(col.getZ(k)-c.b)>.00001 ||
                Math.abs(rm.getX(k)-material.roughness)>.00001 || Math.abs(rm.getY(k)-material.metalness)>.00001)continue;
            }
            v.fromBufferAttribute(pos,k).applyMatrix4(rel);
            axes[0].push(v.x);axes[1].push(v.y);axes[2].push(v.z);
          }
        }
      });
      for(const axis of axes)axis.sort((a,b)=>a-b);
      return axes;
    }
    const out={failures:[]};
    for(const id of ['launcher','revolver']){
      const carry=TT.carryGunCopyDbg(id),counts=verifyArtworkInstances(T,carry),mapped={};
      const materialGroups=new Map();
      carry.traverse(o=>{if(o.isInstancedMesh && o.userData.artworkSlots){
        if(!materialGroups.has(o.material))materialGroups.set(o.material,[]);
        materialGroups.get(o.material).push(o.name);
      }});
      if(!Object.values(counts).some(n=>n===6))throw Error('Expected a full displayed family on the rack: '+id+' '+JSON.stringify(counts));
      for(const [place,rack] of [['house',TT.house.armoryRack],['training',training]]){
        const copy=rack.children.find(o=>o.userData.rackKind===id);
        if(!copy)throw Error('Missing '+place+' '+id);
        mapped[place]={};
        for(const [material,names] of materialGroups){
          const a=sample(carry,material),n=a[0].length;
          let b=sample(copy,material),packed=false;
          if(n && !b[0].length && !material.vertexColors && !material.map && !material.transparent){
            // The normal shelf pass batches plain metal across the entire rack.
            // Locate its original linear colour and roughness/metalness in the baked attributes.
            b=sample(rack,material,copy,true);packed=true;
          }
          if(n!==b[0].length)out.failures.push(id+' '+place+' '+names+' expected '+n+' triangle vertices, got '+b[0].length);
          let worst=0;for(let axis=0;axis<3;axis++)for(let j=0;j<Math.min(n,b[axis].length);j++)worst=Math.max(worst,Math.abs(a[axis][j]-b[axis][j]));
          if(worst>.00003)out.failures.push('Rack positions differ: '+id+' '+place+' '+names+' '+worst);
          mapped[place][names.join(',')]={expected:n,actual:b[0].length,packed,maxCoordinateError:worst,material:material.uuid};
        }
      }
      out[id]={counts,mapped};
    }
    window.rackFrame=async(id,lighting)=>{
      light=lighting;const gun=training.children.find(o=>o.userData.rackKind===id);
      const bounds=new T.Box3().setFromObject(gun);target=bounds.getCenter(new T.Vector3());
      const eye=new T.Vector3(.12,.08,1).applyQuaternion(training.getWorldQuaternion(new T.Quaternion()))
        .multiplyScalar(Math.max(1,(bounds.max.y-bounds.min.y)*1.55)).add(target);
      TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:40});
      for(let i=0;i<4;i++){TT.stepFrame(1/30);await new Promise(r=>setTimeout(r,75))}
    };
    return out;
  })()`);
  for(const id of ['launcher','revolver'])for(const light of ['noon','overcast','dusk','night']){
    await page.evaluate('rackFrame('+JSON.stringify(id)+','+JSON.stringify(light)+')');
    const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
    await save(new URL(id+'-'+light+'.jpg',folder),Buffer.from(shot.data,'base64'));
  }
  await save(new URL('proof.json',folder),JSON.stringify(report,null,2));
  assert.deepEqual(page.errors,[]);assert.deepEqual(report.failures,[]);console.log('PASS house and training racks, per-material triangles and local coordinates, eight frames',JSON.stringify(report));
}finally{await browser.close();await server.close()}
