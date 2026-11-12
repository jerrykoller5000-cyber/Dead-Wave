import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';

// Both test pages see the same live carry code, even when another owner lands changes between them.
assert(process.env.DW_GAME_TEST_TOKEN);
const repo=new URL('../../',import.meta.url), frozen=new Map();
for(const path of ['index.html','studio/weapon-longarms.js','ui/weapon-sling.js','ui/marine-kit-fit.js','tools/tests/weapon-seating.js']){
  frozen.set('/'+path,await readFile(new URL(path,repo)));
}
const armPath='/studio/weapon-longarms.js',current=frozen.get(armPath).toString('utf8');
const face='    seatDrumPlate(faceLayer(.137, .137, .065, .0675, gunBody, 32), sz);',cut="  trimPanelBack(THREE, emitterCover, 1, .118, 'y');";
assert.equal(current.split(face).length,2);assert.equal(current.split(cut).length,2);
const previous=Buffer.from(current.replace(face,'    K.cyl(0.137, 0.137, 0.005, gunBody, 0, 0, sz * 0.065, drumBody, 32);').replace(cut,''));
const sources=Object.fromEntries([...frozen].map(([path,bytes])=>[path,createHash('sha256').update(bytes).digest('hex')]));
const server=await serve(fileURLToPath(repo),0),browser=await launch({headless:false}),results={sources};
try{
  for(const phase of ['before','after']){
    const page=await browser.newPage({width:960,height:540}),seen=new Set();
    page.conn.onEvent(msg=>{
      if(msg.sessionId!==page.sessionId||msg.method!=='Fetch.requestPaused')return;
      const url=new URL(msg.params.request.url);assert.equal(url.origin,server.origin);
      const bytes=phase==='before'&&url.pathname===armPath?previous:frozen.get(url.pathname);
      seen.add(url.pathname);
      const mime=url.pathname==='/index.html'?'text/html':'text/javascript';
      page.send('Fetch.fulfillRequest',{requestId:msg.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:mime+'; charset=utf-8'}],body:bytes.toString('base64')}).catch(e=>page.errors.push(e.message));
    });
    await page.send('Fetch.enable',{patterns:[...frozen.keys()].map(p=>({urlPattern:server.origin+p+'*'}))});
    await page.goto(server.origin+'/index.html?debug=1&raf=timer');
    assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
    await page.evaluate("document.getElementById('playerName').value='Carry comparison';document.getElementById('modeTraining').click()");
    assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')"));
    results[phase]=await page.evaluate('('+measure.toString()+')()',120000);
    assert.equal(results[phase].modelHash,phase==='before'?'52f54c0a':'ba357f18');
    assert.equal(seen.size,frozen.size);assert.deepEqual(page.errors,[]);
    await page.send('Page.close',{});
  }
  await writeFile(new URL('./visible-repairs/aa12/clear-drum-optic-after/sling-comparison.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
  for(const phase of ['before','after'])console.log(phase,results[phase].modelHash,results[phase].fits.map(s=>[s.seed,s.vest,s.slot,s.webHash,s.audit.overlaps.length]));
  for(let i=0;i<results.before.fits.length;i++){
    const a=results.before.fits[i],b=results.after.fits[i];
    assert.equal(a.webHash,b.webHash,'Sling path differs '+i);
    assert.deepEqual(b.audit,a.audit,'Contact changed on revised art '+i);
    assert.equal(b.audit.overlaps.length,0);
    assert(b.audit.ends.every(e=>e.gunContact&&e.webContact));
    if(b.detail){
      assert.deepEqual(b.detail.raw,[]);
      if(b.detail.witness){assert.deepEqual(b.detail.inside,[]);assert(b.detail.nearest[0].gapMm>12);}
    }
  }
}finally{await browser.close();await server.close();}
async function measure(){
  const T=TT,G=T.THREE,{auditSling,visiblePieces,artworkFingerprint}=await import('/tools/tests/weapon-seating.js');
  const {currentModel}=await import('/review/GT-20076/rank-visibility.mjs');
  const {makeAa12Model}=await import('/studio/weapon-longarms.js');
  const ctx=T.inspectHost().builders.weaponContext();
  const unbatched=makeAa12Model({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{}}).userData.magStretch.clone(true);
  const metres=1.8/1.655;
  function inspectDrum(spot,witness){
    const batch=spot.gun.getObjectByName('magazineBody');
    unbatched.matrixAutoUpdate=false;unbatched.matrix.copy(batch.matrixWorld);
    unbatched.updateWorldMatrix(true,true);
    const raw=auditSling({...spot,gun:unbatched},metres);
    if(!witness)return {raw:raw.overlaps};
    const p=new G.Vector3(...witness),local=unbatched.worldToLocal(p.clone().divideScalar(metres));
    const solids=visiblePieces(unbatched,metres).map(part=>{
      let angle=0,d=Infinity;const q=new G.Vector3(),cross=new G.Vector3();
      for(const f of part.faces){
        d=Math.min(d,f.tri.closestPointToPoint(p,q).distanceTo(p));
        const [a,b,c]=f.p.map(v=>v.clone().sub(p));
        angle+=2*Math.atan2(a.dot(cross.crossVectors(b,c)),a.length()*b.length()*c.length()+a.dot(b)*c.length()+b.dot(c)*a.length()+c.dot(a)*b.length());
      }
      return {label:part.label,closed:part.closed,gapMm:d*1000,winding:angle/(4*Math.PI)};
    });
    solids.sort((a,b)=>a.gapMm-b.gapMm);
    return {raw:raw.overlaps,witness,local:local.toArray(),nearest:solids.slice(0,3),inside:solids.filter(s=>Math.abs(s.winding)>.5)};
  }
  T.flightHold(true);T.grantAllWeapons();T.setViewFirstDbg(false);
  if(T.isUnarmed())T.toggleHolster();
  const step=n=>{for(let i=0;i<n;i++)T.stepFrame(1/30);};
  for(let i=0;i<24&&T.getCurrentWeapon()!=='aa12';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('aa12'));step(15);}
  step(50);if(T.getCurrentWeapon()!=='aa12')throw Error('Breacher not equipped');
  const modelHash=artworkFingerprint(currentModel(T,'aa12')),fits=[];
  for(const seed of [17,311,1906]){
    let state=seed;const random=Math.random;Math.random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
    try{
      const marine=T.makeMarine();
      for(const vest of [false,true]){
        const rig=T.carryPreview(marine,{loadout:{primary:['aa12','aa12'],secondary:[null,null]},inHand:null,akimbo:false,vest,grenades:0});
        rig.slings.forEach((spot,i)=>{
          const audit=auditSling(spot,1.8/1.655),webHash=artworkFingerprint(visiblePieces(spot.sling,1.8/1.655));
          const part=visiblePieces(spot.gun,1.8/1.655).find(p=>p.label.includes('magazineBody')&&p.label.endsWith('[16]~0'));
          const root=spot.gun.children[0],box=new G.Box3();
          if(part)for(const v of part.vertices)box.expandByPoint(root.worldToLocal(v.clone().divideScalar(1.8/1.655)));
          const detail=seed===17?inspectDrum(spot,i===0?(vest?[.26382,.96727,-.11607]:[.26409,.96465,-.11547]):null):null;
          fits.push({seed,vest,slot:i+1,webHash,audit,detail,suspectBox:part?[box.min.toArray(),box.max.toArray()]:null});
        });
      }
    }finally{Math.random=random;}
  }
  return {modelHash,fits};
}
