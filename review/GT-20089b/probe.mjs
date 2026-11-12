import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const p=await browser.newPage({width:960,height:540});await p.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await p.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));await p.evaluate('DWOpening.dismissForTesting()');assert(await p.waitFor('!DWOpening.active'));
  const metrics=await p.evaluate('('+measure.toString()+')()',90000);
  await writeFile(new URL('./after/opacity-and-timing.json',import.meta.url),JSON.stringify(metrics,null,2)+'\n');
  console.log('PASS camera distances, rates, thermal receipts and two emission sources',metrics.near,metrics.timing,metrics.twins);
  assert.deepEqual(p.errors,[]);
}finally{await browser.close();await server.close();}

function measure(){
  const T=TT,G=T.THREE,b=T.barrelHeat;
  T.flightHold(true);
  const camera=new G.PerspectiveCamera(),cameraRig=new G.Group();
  cameraRig.position.set(9,4,-3);cameraRig.rotation.y=.35;cameraRig.add(camera);cameraRig.updateMatrixWorld(true);
  const state={currentWeapon:'uzi',weaponMesh:T.weaponMeshes.uzi,camera,daylight:1};
  function spawn(h){
    b.reset();b.setHeat('uzi',h);b.update(0,state);
    const w=b._wisps.find(w=>w.active);if(!w)throw Error('Missing smoke sample');return w;
  }
  function place(w,d){
    const point=w.mesh.position.clone();point.x+=d;
    camera.position.copy(cameraRig.worldToLocal(point));cameraRig.updateMatrixWorld(true);
  }
  const hot=spawn(1);
  place(hot,2);b.update(hot.life*.1,{...state,suppressWisp:true});
  const interval=hot.life,peak=hot.mat.opacity;
  const near=[];
  for(const distance of [0,.05,.08,.10,.15,.25,.5,.75,.9,1,1.5,2]){
    place(hot,distance);b.update(0,{...state,suppressWisp:true});near.push({distance,scale:hot.mat.opacity/peak});
  }
  if(near[1].scale>.00001||near[5].scale>=.25||near[6].scale<.5||near[6].scale>=.9||near.some((r,i)=>i&&r.scale<near[i-1].scale-1e-10)||near.slice(-3).some(r=>Math.abs(r.scale-1)>1e-8))throw Error('Invalid proximity fade '+JSON.stringify(near));
  const timing=[];
  for(const h of [.121,.56,1])for(const fps of [30,60,120]){
    const w=spawn(h);place(w,2);const life=w.life,emitted=b.getHeat('uzi');let frames=0;
    while(w.active&&frames<500){b.update(1/fps,{...state,suppressWisp:true});frames++;}
    const elapsed=frames/fps;
    if(Math.abs(life-(1.45+1.45*(h-.12)/.88)*.66)>1e-8||elapsed<life-1e-9||elapsed-life>1/fps+.000001||emitted!==h)throw Error('Wrong lifetime/heat '+h+' '+fps);
    timing.push({h,fps,life,elapsed});
  }
  b.reset();const twins=[0,0],previous=[-1,-1],maxGap=[0,0];
  const pair={...state,offhandMesh:T.offhandMeshes.uzi};
  for(let i=0;i<360;i++){
    b.setHeat('uzi',1,0);b.setHeat('uzi',1,1);b.update(1/60,pair);
    b._wisps.forEach((w,j)=>{if(w.active&&w.age<.017){const h=j%2;twins[h]++;maxGap[h]=Math.max(maxGap[h],i-previous[h]);previous[h]=i;}});
  }
  if(b._wisps.length!==48||twins.some(n=>n<32)||maxGap.some(n=>n>14))throw Error('Pair stopped emitting '+JSON.stringify({twins,maxGap}));
  b.reset();return {near,timing,twins,maxGap,hotLife:interval};
}
