import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';

const phase=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const root=new URL('../../',import.meta.url),dir=new URL('./'+phase+'/',import.meta.url);
await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(root),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:1600,height:900});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Sight review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.views=m.makeViews(TT);return views.equip('revolver')})");
  const geometry=await page.evaluate('('+copies.toString()+')()');
  for(const c of Object.values(geometry))assert.equal(c.present,phase==='after',JSON.stringify(c));
  if(phase==='after')for(const c of Object.values(geometry)){
    assert.equal(c.triangles,geometry.world.triangles);
    assert.equal(c.colour,geometry.world.colour);
  }
  const shots={};
  for(const [view,lights] of [['hip',['noon','overcast','dusk','night']],['aimed',['noon','overcast','dusk','night','dark-room']]]){
    const camera=await page.evaluate('views.pose('+JSON.stringify(view)+')');
    assert(camera.eye&&!camera.glassHidden);
    if(view==='aimed'&&phase==='after'){
      const result=await page.evaluate('('+occlusion.toString()+')()');
      await save(new URL('sight-line.json',dir),JSON.stringify(result,null,2)+'\n');
      console.log('Aimed pixel line: first visible surfaces',result.rows.map(r=>[r.y,r.live?.label,r.raw?.label]));
    }
    shots[view]={camera,lights:{}};
    for(const light of lights){
      if(light==='dark-room'){
        const state=await page.evaluate("if(TT.trainingDbg.lights().on)TT.trainingDbg.toggleLights();TT.setWorldTime?.(.02);TT.trainingDbg.lights()");
        assert.equal(state.on,false);assert.equal(state.room,false);
      }
      await page.evaluate('views.light('+JSON.stringify(light==='dark-room'?'night':light)+')');
      const name=view+'-'+light;
      const capture=async suffix=>{
        const png=await page.send('Page.captureScreenshot',{format:'png'});
        await save(new URL(name+suffix+'.png',dir),Buffer.from(png.data,'base64'));
      };
      await capture('');
      if(phase==='after'){
        await page.evaluate("window.sightMark=TT.viewmodelDbg().gun.root.getObjectByName('revolver-sight-dot');sightMark.visible=false;views.draw(true)");
        await capture('-hidden');
        await page.evaluate('sightMark.visible=true;views.draw(true)');
      }
      shots[view].lights[light]=await page.evaluate('TT.trainingDbg.lights()');
    }
  }
  await save(new URL('review.json',dir),JSON.stringify({phase,geometry,shots},null,2)+'\n');
  assert.deepEqual(page.errors,[]);
  console.log('PASS',phase,'four native model copies, hip and aimed four-light captures and dark Training room');
}finally{await browser.close();await server.close();}

function copies(){
  const T=TT,rack=T.scene.getObjectByName('training-armory').getObjectByName('armoryRack');
  const roots={world:T.weaponMeshes.revolver,view:T.viewmodelDbg().gun.root,carry:T.carryGunCopyDbg('revolver'),rack:rack.children.find(o=>o.userData.rackKind==='revolver')};
  return Object.fromEntries(Object.entries(roots).map(([key,root])=>{
    if(!root)throw Error('Missing '+key+' model');
    let m=root.getObjectByName('revolver-sight-dot');
    if(key==='rack')root.traverseVisible(o=>{if(o.material?.name==='Revolver green front sight')m=o;});
    if(!m)return [key,{present:false}];
    if(m.children.length || !m.material.isMeshBasicMaterial || m.material.toneMapped || m.material.fog || m.material.userData.weaponFinishRole)throw Error('Invalid marker on '+key);
    return [key,{present:true,triangles:(m.geometry.index?.count||m.geometry.attributes.position.count)/3,position:m.position.toArray(),colour:m.material.color.getHexString(),quaternion:m.quaternion.toArray(),lightChildren:m.children.filter(n=>n.isLight).length}];
  }));
}

async function occlusion(){
  const T=TT,G=T.THREE,vm=T.viewmodelDbg(),root=vm.gun.root;
  const {makeRevolverModel}=await import('/studio/weapon-sidearms.js');
  const ctx=T.inspectHost().builders.weaponContext();
  const raw=makeRevolverModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{}});raw.scale.setScalar(1);
  const origin=vm.viewPoint(new G.Vector3()),basis=[new G.Vector3(1,0,0),new G.Vector3(0,1,0),new G.Vector3(0,0,1)].map(p=>vm.viewPoint(p).sub(origin));
  const eye=new G.Vector3().applyMatrix4(new G.Matrix4().makeBasis(...basis).setPosition(origin).invert());
  function first(model,target){
    model.updateWorldMatrix(true,true);
    const a=model.localToWorld(eye.clone()),b=model.localToWorld(target.clone()),dist=a.distanceTo(b);
    const parts=[];model.traverseVisible(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.material?.visible)parts.push(o);});
    const ray=new G.Raycaster(a,b.sub(a).normalize(),0,dist+.0002);
    const hit=ray.intersectObjects(parts,false)[0];if(!hit)return null;
    const label=[];for(let n=hit.object;n!==model;n=n.parent)label.unshift((n.name||n.geometry?.type||'group')+'['+n.parent.children.indexOf(n)+']');
    return {label:label.join('/'),point:model.worldToLocal(hit.point).toArray(),material:hit.object.material.name};
  }
  const rows=[];
  for(let i=0;i<19;i++){
    const y=.117+i*.001,target=new G.Vector3(0,y,root.getObjectByName('revolver-sight-dot').position.z);
    rows.push({y,live:first(root,target),raw:first(raw,target)});
  }
  const dot=root.getObjectByName('revolver-sight-dot'),vertices=dot.geometry.attributes.position;
  const normal=dot.geometry.attributes.normal,front=new Map();
  for(let i=0;i<vertices.count;i++){
    if(normal.getZ(i)>-.1)continue;
    const v=new G.Vector3().fromBufferAttribute(vertices,i);
    front.set(v.toArray().map(c=>Math.round(c*1e7)).join(','),v);
  }
  const covered=[];
  root.updateWorldMatrix(true,true);
  const parts=[];root.traverseVisible(o=>{if(o!==dot && o.isMesh && o.material?.visible)parts.push(o);});
  for(const v of front.values()){
    const target=dot.localToWorld(v.clone()),a=root.localToWorld(eye.clone());
    const ray=new G.Raycaster(a,target.clone().sub(a).normalize(),0,target.distanceTo(a)-.0000001);
    const hit=ray.intersectObjects(parts,false)[0];
    if(hit)covered.push({local:v.toArray(),part:hit.object.name||hit.object.geometry.type,at:root.worldToLocal(hit.point).toArray()});
  }
  return {eye:eye.toArray(),plateVisible:T.weaponMeshes.revolver.userData.opticPlate?.visible,rows,markerSamples:front.size,covered};
}
