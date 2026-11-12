import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});
 await page.goto(server.origin+'/index.html?debug=1');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 const result=await page.evaluate(`(async()=>{
  const T=TT,G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),{makePistolModel}=await import('/studio/weapon-sidearms.js'),saved=[];
  const gun=makePistolModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
   const k=ctx.gunKit(root);return {...k,slab(...args){
    const mesh=k.slab(...args);
    if((args[1]===.010&&args[0][0][0]===.068)||(args[1]===.003&&args[0][0][0]===.068&&args[0][0][1]===-.026))saved.push({mesh,position:mesh.position.clone()});
    return mesh;
   }};
  }});
  if(saved.length!==2)throw Error('Missing original trigger and inset');
  gun.updateMatrixWorld(true);let maximum=0,vertices=0;
  for(const {mesh,position} of saved){
   const p=mesh.geometry.attributes.position;
   for(let i=0;i<p.count;i++){
    const v=new G.Vector3().fromBufferAttribute(p,i),expected=v.clone().add(position),actual=v.clone().applyMatrix4(mesh.matrixWorld);
    maximum=Math.max(maximum,expected.distanceTo(actual));vertices++;
   }
  }
  return {maximum,vertices,pin:gun.userData.triggerPin,control:gun.userData.controls.trigger};
 })()`);
 assert(result.maximum<1e-12);assert.deepEqual(result.pin,[0,-.014,.0725]);
 console.log('PASS native pistol trigger rest positions preserved',result);
 assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
