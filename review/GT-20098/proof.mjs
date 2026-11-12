import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),results={};
try{
 for(const phase of ['before','after']){
  const browser=await launch({headless:false});
  try{
   const page=await browser.newPage({width:960,height:540});let verify;
   if(phase==='before'){
    const {replayArtwork}=await import('../GT-20076/replay-artwork.mjs');
    verify=await replayArtwork(page,server.origin,'/studio/weapon-longarms.js',await readFile(new URL('pre-breacher-source.txt',import.meta.url),'utf8'));
   }
   await page.goto(server.origin+'/index.html?debug=1');
   assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
   await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
   results[phase]=await page.evaluate(`(async()=>{
    const T=TT,G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),{makeAa12Model}=await import('/studio/weapon-longarms.js'),parts=[];
    const model=makeAa12Model({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
     const k=ctx.gunKit(root);return {...k,box(...a){const mesh=k.box(...a);if(a[0]===.006&&((a[1]===.028&&a[2]===.019)||(a[1]===.002&&a[2]===.015)))parts.push(mesh);return mesh;}};
    }});model.updateMatrixWorld(true);
    const latchArtwork=parts.map(mesh=>{const p=mesh.geometry.attributes.position,out=[],v=new G.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);out.push(...v.toArray());}return out;});
    const gun=T.weaponMeshes.aa12,copy=T.cloneLean(gun),scene=new G.Scene(),camera=new G.PerspectiveCamera(36,1,.01,100),renderer=T.inspectHost().renderer;
    scene.add(new G.HemisphereLight(0xdbe9ff,0xb7a483,1.1));const light=new G.DirectionalLight(0xfff0d8,2);light.position.set(2,3,4);scene.add(light);
    copy.visible=true;copy.position.set(0,0,0);copy.quaternion.identity();copy.traverse(m=>m.frustumCulled=false);scene.add(copy);copy.updateMatrixWorld(true);
    const box=new G.Box3().setFromObject(copy),centre=box.getCenter(new G.Vector3()),span=box.getSize(new G.Vector3()).length();camera.position.copy(centre).addScaledVector(new G.Vector3(1,.4,.6).normalize(),span*2.5);camera.lookAt(centre);camera.updateMatrixWorld();
    const info=renderer.info,reset=info.autoReset;info.autoReset=false;renderer.render(scene,camera);info.reset();renderer.render(scene,camera);const draws=info.render.drawCalls??info.render.calls;info.autoReset=reset;
    let meshes=0;gun.traverse(m=>{if(m.isMesh)meshes++;});
    const anchors={triggerPin:model.userData.triggerPin,mag:model.userData.baseMagPos.toArray(),rotation:model.userData.baseMagRot.toArray(),work:model.userData.work.position.toArray()};
    const controls={};for(const [key,name] of Object.entries(model.userData.controls||{})){const node=model.getObjectByName(name);controls[key]={name,position:node.position.toArray(),parent:node.parent.name};}
    return {latchArtwork,draws,meshes,anchors,controls};
   })()`);
   verify?.();assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
 }
 assert.equal(results.before.latchArtwork.length,10);
 assert.deepEqual(results.after.anchors,results.before.anchors);
 let maxMove=0;results.before.latchArtwork.forEach((p,k)=>{assert.equal(p.length,results.after.latchArtwork[k].length);p.forEach((v,i)=>maxMove=Math.max(maxMove,Math.abs(v-results.after.latchArtwork[k][i])));});
 assert(maxMove<1e-12);
 assert(results.after.draws<=35);
 for(const key of ['magRelease','drumLatchLeft','drumLatchRight'])assert(results.after.controls[key]);
 await writeFile(new URL('rest-and-draws.json',import.meta.url),JSON.stringify({...results,maxLatchRestMoveMm:maxMove*1000},null,2));
 console.log('PASS 10 original latch meshes keep every rest vertex, original trigger/mag/work anchors',maxMove);
 console.log('Breacher native own-model draws',results.before.draws,'->',results.after.draws,'meshes',results.before.meshes,'->',results.after.meshes,'controls',results.after.controls);
}finally{await server.close();}
