import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const [id, phase]=process.argv.slice(2);
assert(process.env.DW_GAME_TEST_TOKEN && ['flamer','chainsaw'].includes(id) && ['before','baseline-look','art','after','coarse-chain','fine-chain','unified-chain'].includes(phase));
const dir=new URL('./'+id+'/'+phase+'/',import.meta.url);
await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:1280,height:720});
  let verifyBaseline;
  if(phase==='baseline-look'){
    assert.equal(id,'chainsaw');
    const {originalSawForPage}=await import('./chainsaw/baseline-look.mjs');
    verifyBaseline=await originalSawForPage(page,server.origin);
  }
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Surface review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  const refs=[];
  if(phase!=='before'){
    refs.push(...JSON.parse(await readFile(new URL('./'+id+'/before/frames.json',import.meta.url),'utf8')));
    const reverse=new URL('./'+id+'/before/reverse-frames.json',import.meta.url);
    try{refs.push(...JSON.parse(await readFile(reverse,'utf8')))}catch(error){if(error.code!=='ENOENT')throw error}
  }
  await page.evaluate('window.frameRefs='+JSON.stringify(refs));
  await page.evaluate('window.reviewId='+JSON.stringify(id));
  await page.evaluate(`(async()=>{
    const T=TT.THREE,H=TT.inspectHost(),{LIGHTS}=await import('/studio/inspector/stage.js');
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    TT.grantAllWeapons();TT.modsOwnAllDbg();TT.setViewFirstDbg(true);if(TT.isUnarmed())TT.toggleHolster();
    TT.flightHold(true);
    const step=n=>{for(let i=0;i<n;i++)TT.stepFrame(1/30)};
    for(let i=0;i<25&&TT.getCurrentWeapon()!==reviewId;i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(reviewId));step(12)}
    let light='noon',frozen=false,previousView='';
    H.attach({held:()=>frozen,scale:dt=>dt,frame:()=>{
      const L=LIGHTS[light],p=TT.player.position;
      H.sun.position.copy(p).addScaledVector(new T.Vector3(...L.dir).normalize(),85);H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();
      H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);
      H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    }});
    window.finishAppearance=(id,proof)=>{
      const gun=TT.weaponMeshes[id], mats=[];
      gun.traverse(o=>{
        if(!o.isMesh||Array.isArray(o.material))return;
        const m=o.material;
        mats.push({name:o.name,role:m.userData.weaponFinishRole||'',registered:m.userData.gunPaintId||'',color:m.color?.getHex()??null,map:m.map?.uuid||null});
      });
      return {proof,mats,trigger:gun.userData.controls?.trigger||null,pin:gun.userData.triggerPin||null,perPart:gun.userData.partFinish===true};
    };
    window.prepareHeavy=async(view,lighting,finish)=>{
      light=lighting;
      const sceneKey=view+'/'+finish;
      if(sceneKey!==previousView){
        frozen=false;
        TT.setShotView(null);TT.setViewFirstDbg(!view.startsWith('held'));TT.setZoomHeldDbg(view==='aimed');step(32);
        const range=TT.trainingDbg.tg();TT.player.position.set(range.origin.x,range.floorY,range.origin.z-.55);TT.setOtsAimDbg(0,-.08);
        if(!TT.armoryFinishDbg.paint(reviewId,finish))throw Error('Armory finish missing on '+reviewId);
        step(72);
        const gun=TT.weaponMeshes[reviewId];
        if(view.startsWith('held')){
          if(!gun.parent||!gun.visible)throw Error('Not held');
          const focus=gun.localToWorld(new T.Vector3(0,.01,.28));
          const eye=gun.localToWorld(new T.Vector3(view==='held-right'?2.05:-2.05,.42,.66));
          TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:focus.x,ty:focus.y,tz:focus.z,fov:34});step(1);
        }else if(!TT.viewmodelDbg().info.active||TT.viewmodelDbg().info.key!==reviewId)throw Error('Missing eye');
        previousView=sceneKey;
      }
      frozen=true;
      // The historical M81 reverse view caught an idle gesture at dusk/night. For this side,
      // compare current factory/M81 using the same recorded factory camera in every light.
      const refFinish=reviewId==='flamer' && view==='held-right'?'':finish;
      const ref=frameRefs.find(f=>f.view===view && f.light===lighting && f.finish===refFinish);
      if(ref && view.startsWith('held')){
        const [x,y,z]=ref.camera,[dx,dy,dz]=ref.dir;
        TT.setShotView({x,y,z,tx:x+dx,ty:y+dy,tz:z+dz,fov:34});
      }
      for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,65));step(1)}
      if(TT.armoryFinishDbg.list(reviewId).current!==finish)throw Error('Wrong displayed finish');
      return {view,light,finish,camera:H.camera.position.toArray(),dir:H.camera.getWorldDirection(new T.Vector3()).toArray()};
    };
  })()`);
  const frames=[],parts={};
  const reverseOnly = process.argv.includes('--reverse');
  for(const finish of (phase==='art'?['']:['','m81'])){
    for(const view of (reverseOnly?['held-right']:finish?['hip','held','held-right']:['held','held-right','hip','aimed']))for(const light of ['noon','overcast','dusk','night']){
      frames.push(await page.evaluate('prepareHeavy('+[view,light,finish].map(v=>JSON.stringify(v)).join(',')+')'));
      const img=await page.send('Page.captureScreenshot',{format:'jpeg',quality:93});
      await save(new URL([finish||'factory',view,light].join('-')+'.jpg',dir),Buffer.from(img.data,'base64'));
    }
    parts[finish||'factory']=await page.evaluate('finishAppearance(reviewId,"'+(finish||'factory')+'")');
  }
  await page.evaluate("prepareHeavy('hip','overcast','')");
  parts.restored=await page.evaluate('finishAppearance(reviewId,"restored")');
  await save(new URL(reverseOnly?'reverse-frames.json':'frames.json',dir),JSON.stringify(frames,null,2));
  await save(new URL(reverseOnly?'reverse-materials.json':'materials.json',dir),JSON.stringify(parts,null,2));
  if(phase==='art'||phase==='after'){
    const rig = await page.evaluate(`(()=>{
      const G=TT.THREE, source=TT.weaponMeshes[reviewId], eye=TT.viewmodelDbg().gun.root;
      const id=source.userData.controls?.trigger, pin=source.userData.triggerPin;
      if(!id || !Array.isArray(pin))throw Error('Missing visual control contract');
      const original=source.getObjectByName(id), twin=eye.getObjectByName(id);
      if(!original || !twin || original===twin)throw Error('Missing independent first-person control');
      const hold=original.parent, copy=TT.cloneLean(source), node=copy.getObjectByName(id);
      if(!hold || !node)throw Error('Missing clone control');
      const anchors=[];
      node.traverse(o=>{if(o.isMesh)anchors.push(o)});
      if(!anchors.length)throw Error('Empty control');
      copy.updateMatrixWorld(true);
      const point=new G.Vector3().fromBufferAttribute(anchors[0].geometry.attributes.position,0);
      const before=anchors[0].localToWorld(point.clone());
      const pivot=node.getWorldPosition(new G.Vector3());
      node.rotation.x+=.2;copy.updateMatrixWorld(true);
      const moved=anchors[0].localToWorld(point.clone()).distanceTo(before);
      return {name:id,anchorError:original.position.distanceTo(new G.Vector3(...pin)),
        fixedPivot:pivot.distanceTo(node.getWorldPosition(new G.Vector3())),artMoves:moved,meshes:anchors.length};
    })()`);
    assert(rig.anchorError<1e-6 && rig.fixedPivot<1e-6 && rig.artMoves>1e-6);
    await save(new URL('control.json',dir),JSON.stringify(rig,null,2));
  }
  if(phase==='after'){
    const a=parts.factory,b=parts.m81,c=parts.restored;
    assert(a.perPart && a.trigger && a.pin?.length===3);
    assert(a.mats.some(m=>m.role && m.registered));
    assert.equal(a.mats.length,b.mats.length);assert.deepEqual(a.mats,c.mats);
    for(const [i,m] of a.mats.entries()){
      if(m.role)assert(b.mats[i].map && b.mats[i].map!==m.map,'Paint not applied to '+m.role);
      else assert.deepEqual(b.mats[i],m,'Factory material changed on '+m.name);
    }
  }
  if(phase.endsWith('-chain')){
    const motion=await page.evaluate(`(async()=>{
      const T=TT.THREE,held=TT.weaponMeshes.chainsaw,vm=TT.viewmodelDbg().gun.root;
      const ctx=TT.inspectHost().builders.weaponContext(), {makeChainsawModel}=await import('/studio/weapon-heavy.js');
      const raw=makeChainsawModel({...ctx,finishGun:g=>g});
      const inst=raw.userData.chainInst, n=inst.count;
      const before=inst.instanceMatrix.array.slice();
      raw.userData.chainPhase=.173;ctx.layoutChainsawChain(raw);
      let changed=0;
      for(let i=0;i<n;i++){
        const at=i*16;
        if(inst.instanceMatrix.array.slice(at,at+16).some((v,j)=>Math.abs(v-before[at+j])>1e-5))changed++;
      }
      const batches=root=>{let found=0;root.traverse(o=>{if(o.isInstancedMesh&&o.count===n)found++});return found};
      return {instances:n,changed,heldBatches:batches(held),eyeBatches:batches(vm),
        templateTriangles:(inst.geometry.index?.count||inst.geometry.attributes.position.count)/3};
    })()`);
    assert(motion.instances>0 && motion.changed===motion.instances && motion.heldBatches===1 && motion.eyeBatches===1);
    await save(new URL('chain-motion.json',dir),JSON.stringify(motion,null,2));
    console.log('PASS one eye and one held chain batch;',motion.instances,'of',motion.instances,'instance matrices advance');
  }
  if(verifyBaseline)verifyBaseline();
  assert.deepEqual(page.errors,[]);console.log('PASS',id,phase,frames.length,'four-light held and eye views');
}finally{await browser.close();await server.close()}
