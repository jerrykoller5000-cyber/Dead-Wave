import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const [id,phase] = process.argv.slice(2);
assert(process.env.DW_GAME_TEST_TOKEN && /^[a-z0-9-]+$/.test(id) && ['before','after','paint','rig','rear','revised'].includes(phase));
const folder = new URL('./'+id+'/'+phase+'/',import.meta.url);
await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Inspector';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on") && Math.abs(TT.getWorldTime()-.5)<.02',{timeout:45000}));
  await page.evaluate('window.proofId='+JSON.stringify(id));
  await page.evaluate(`(async()=>{
    const T=TT, H=T.inspectHost(), {LIGHTS}=await import('/studio/inspector/stage.js');
    T.setViewFirstDbg(true);T.grantAllWeapons();
    if(T.isUnarmed())T.toggleHolster();
    T.flightHold(false);
    for(let i=0;i<30&&T.getCurrentWeapon()!==proofId;i++){T.setWeapon(T.WEAPON_ORDER.indexOf(proofId));await new Promise(r=>setTimeout(r,120))}
    T.setOtsAimDbg(0,-.08);
    T.flightHold(true);
    for(let i=0;i<150;i++)T.stepFrame(1/30);
    if(!T.viewmodelDbg().info.active || T.viewmodelDbg().info.key!==proofId)throw Error('View model missing');
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    window.eyeLight='noon';
    function illuminate(){
      const L=LIGHTS[eyeLight],p=T.player.position;
      const dir=new H.THREE.Vector3(...L.dir).normalize();
      H.sun.position.copy(p).addScaledVector(dir,85);H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();
      H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;
      H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;
      H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    }
    H.attach({held:()=>false,scale:dt=>dt,frame:illuminate});
    window.prepareEye=async(pose,light)=>{
      eyeLight=light;
      if(pose==='reload' && !T.isReloading()){
        T.setAmmoDbg(proofId,1);const magazines=T.magazinesDbg(proofId);
        if(magazines)T.setMagazinesDbg(proofId,1,[magazines.size||15,magazines.size||15]);
        T.startReload();T.reloadClipDbg.hold(.46);
      }
      T.setZoomHeldDbg(pose==='aimed');
      for(let i=0;i<52;i++)T.stepFrame(1/30);
      // Let the real renderer present the new pose after the simulation settles.
      for(let pass=0;pass<4;pass++){
        await new Promise(r=>setTimeout(r,75));
        T.stepFrame(1/30);
      }
      illuminate();
      const vm=T.viewmodelDbg(),info=vm.info;
      if(proofId==='pistol' && pose==='aimed'){
        const screen=vm.ndc(vm.viewPoint(new H.THREE.Vector3(0,.092,-.064)));
        if(Math.abs(screen.x)>.008 || Math.abs(screen.y)>.008)throw Error('Aimed model off centre '+screen.x+','+screen.y);
      }
      return {pose,light,key:info.key,raised:info.raise,ads:T.fpDbg().ads,reloading:T.isReloading(),time:T.getWorldTime(),sun:H.sun.intensity};
    };
  })()`);
  if(phase==='rear' || (phase==='revised' && ['m4','shotgun'].includes(id)) || (phase==='after' && id==='shotgun')){
    await page.evaluate("prepareEye('aimed','noon')");
    const result=await page.evaluate(`(async()=>{
      const T=TT.THREE, vm=TT.viewmodelDbg(), g=vm.frame, cameraToGun=g.q.clone().invert();
      const {makeM4Model,makeShotgunModel}=await import('/studio/weapon-longarms.js');
      const ctx={...TT.inspectHost().builders.weaponContext(),finishGun:g=>g};
      const kit=ctx.gunKit, source=new WeakMap();
      ctx.gunKit=(...args)=>Object.fromEntries(Object.entries(kit(...args)).map(([key,fn])=>[key,(...values)=>{
        const result=fn(...values);
        const line=new Error().stack.split('\\n').find(s=>s.includes('/studio/weapon-longarms.js:'));
        if(result?.isObject3D && line)source.set(result,line.trim());
        return result;
      }]));
      const raw=proofId==='shotgun'?makeShotgunModel(ctx):makeM4Model(ctx);
      const origin=g.p.clone().negate().applyQuaternion(cameraToGun).divideScalar(g.s);
      raw.userData.fpStock.visible=vm.gun.stock.visible;
      raw.updateMatrixWorld(true);
      const surfaces=[];raw.traverseVisible(o=>{if(o.isMesh && o.material?.opacity!==0)surfaces.push(o)});
      const ux=vm.ndc(new T.Vector3(1,0,-1)).x,uy=vm.ndc(new T.Vector3(0,1,-1)).y;
      const rays={};
      for(const y of [445,475,505,535,565,595,625,655,685,715])for(const x of [595,625,640,655,685]){
        const dir=new T.Vector3((x/640-1)/ux,(1-y/360)/uy,-1).applyQuaternion(cameraToGun).normalize();
        const hit=new T.Raycaster(origin,dir).intersectObjects(surfaces,false)[0];
        if(hit)rays[x+','+y]={point:hit.point.toArray(),node:hit.object.name,line:source.get(hit.object)||source.get(hit.object.parent)};
      }
      const bead=raw.getObjectByName('shotgun bead');
      let sight;
      if(bead){
        const direction=bead.getWorldPosition(new T.Vector3()).sub(origin).normalize();
        const hit=new T.Raycaster(origin,direction).intersectObjects(surfaces,false)[0];
        const beadScreen=vm.ndc(vm.viewPoint(bead.getWorldPosition(new T.Vector3())));
        sight={firstSurface:hit?.object.name||null,screen:[beadScreen.x,beadScreen.y]};
        const eye=vm.space.localToWorld(new T.Vector3());
        const toBead=vm.space.localToWorld(vm.viewPoint(bead.getWorldPosition(new T.Vector3()))).sub(eye);
        const handRay=new T.Raycaster(eye,toBead.clone().normalize(),0,toBead.length());
        const overlaps=[];
        for(const [side,arm] of Object.entries(vm.arms)){
          if(!arm?.root)continue;
          const skin=[];
          arm.root.traverseVisible(o=>{if(o.isMesh && o.material?.opacity!==0)skin.push(o)});
          const nearest=handRay.intersectObjects(skin,false)[0];
          if(nearest)overlaps.push({side,node:nearest.object.name,parent:nearest.object.parent?.name,distance:nearest.distance});
        }
        sight.handInFront=overlaps;
        for(let y=365;y<=445;y+=4){
          const dir=new T.Vector3(0,(1-y/360)/uy,-1).applyQuaternion(cameraToGun).normalize();
          const face=new T.Raycaster(origin,dir).intersectObjects(surfaces,false)[0];
          if(face)rays['640,'+y]={point:face.point.toArray(),node:face.object.name};
        }
      }
      return {stockVisible:vm.gun.stock.visible,origin:origin.toArray(),rays,sight};
    })()`);
    await save(new URL('rays.json',folder),JSON.stringify(result,null,2));
    if(id==='m4' && phase==='revised'){
      const hits=Object.values(result.rays);
      for(const part of ['GW-4 rear face','GW-4 tube','GW-4 comb'])assert(hits.some(hit=>hit.node===part),'Aimed lower-frame sample misses '+part);
    }
    if(id==='shotgun' && phase==='after'){
      const seen=new Set(Object.values(result.rays).map(hit=>hit.node));
      for(const part of ['shotgun stock body','shotgun comb pad 1','shotgun comb pad 2','shotgun comb pad 3'])assert(seen.has(part),'Aimed lower-frame sample misses '+part);
    }
    if(id==='shotgun' && phase==='revised'){
      const seen=new Set(Object.values(result.rays).map(hit=>hit.node));
      assert(seen.has('shotgun stock body') && seen.has('shotgun receiver'),'Aimed view needs both the comb and receiver');
      assert.equal(result.sight.firstSurface,'shotgun bead','Gun artwork obscures bead centre');
      assert(![...seen].some(name=>name.startsWith('shotgun comb pad')),'Stepped pad remains');
    }
    console.log('Sampled '+Object.keys(result.rays).length+' occupied aimed pixels; rear stock group visible: '+result.stockVisible);
  }
  if(phase==='rig' || (['after','revised'].includes(phase) && ['m4','ak','shotgun'].includes(id))){
    const maps=await page.evaluate(`(()=>{
      const expected={pistol:['trigger','magRelease','slideStop'],m4:['selector','boltCatch','magRelease','chargingHandle'],ak:['selector','magRelease','trigger','chargingHandle'],shotgun:['safety','slideRelease','pump']}[proofId];
      const src=TT.weaponMeshes[proofId],eye=TT.viewmodelDbg().gun.root;
      const copies={world:src,eye};
      if(proofId==='pistol')copies.offhand=TT.offhandMeshes.pistol;
      const result={};
      for(const [kind,keys] of [['controls',expected],['heatParts',['barrel','suppressor']]]){
        const entries=result[kind]={};
        for(const key of keys){
          const name=src.userData[kind]?.[key];
          if(!name)throw Error('Missing '+kind+'.'+key);
          const found=new Set(),counts={};
          for(const [view,root] of Object.entries(copies)){
            const nodes=[];root.traverse(o=>{if(o.name===name)nodes.push(o)});
            if(nodes.length!==1 || found.has(nodes[0]))throw Error(view+' duplicate or missing '+name);
            const node=nodes[0];found.add(node);
            let count=0;node.traverse(o=>{if(o.isMesh)count++});
            if(!count)throw Error(view+' artwork flattened away: '+name);
            if(view!=='eye' && !src.userData.artworkNodes.includes(src.getObjectByName(name)))throw Error('Missing source binding '+name);
            counts[view]=count;
          }
          const original=src.getObjectByName(name);
          if(original.userData.restPosition.length!==3 || original.userData.restQuaternion.length!==4)throw Error('Missing rest pose '+name);
          entries[key]={name,meshes:counts};
        }
      }
      return result;
    })()`);
    await save(new URL('artwork-nodes.json',folder),JSON.stringify(maps,null,2));
    if(id==='pistol'){
      const test=await readFile(new URL('../../tools/tests/t242.js',import.meta.url),'utf8');
      const result=await page.evaluate(test,120000);
      await save(new URL('t242.txt',folder),result+'\n');
      assert(!/^FAIL/m.test(result),result);
    }
  }
  if(id==='pistol' && (['after','rig'].includes(phase) || process.argv.includes('--contact-reference'))){
    const refArgument=process.argv.indexOf('--contact-reference');
    const url=refArgument<0?null:process.argv[refArgument+1];
    if(refArgument>=0)assert(url?.startsWith('/review/GT-20077/pistol/') && url.endsWith('.js'));
    await page.evaluate('window.contactReference='+JSON.stringify(url));
    const sets=await page.evaluate(`(async()=>{
      const T=TT.THREE, ctx={...TT.inspectHost().builders.weaponContext(),finishGun:g=>g};
      const out={};
      const models=[['${phase==='rig'?'rig':'after'}','/studio/weapon-sidearms.js']];
      if(contactReference)models.unshift(['before',contactReference]);
      for(const [label,url] of models){
        const {makePistolModel}=await import(url);
        const gun=makePistolModel(ctx), mag=gun.userData.mag, slide=gun.userData.slide;
        gun.scale.copy(TT.weaponMeshes.pistol.scale).multiplyScalar(1.8/1.655);
        gun.updateMatrixWorld(true);
        const parts={'magazine including top':mag,'magazine floor':mag.children[1],
          'slide housing':slide.children[0],'rear plate':slide.children[1],
          'magazine release':gun.getObjectByName('controls-magRelease')||gun.children[17]};
        const sample=out[label]={};
        for(const [name,root] of Object.entries(parts)){
          const coords=sample[name]=[],v=new T.Vector3();
          root.traverse(mesh=>{
            if(!mesh.isMesh)return;
            const attr=mesh.geometry.attributes.position,idx=mesh.geometry.index;
            for(let i=0;i<(idx?idx.count:attr.count);i++){
              v.fromBufferAttribute(attr,idx?idx.getX(i):i).applyMatrix4(mesh.matrixWorld);
              coords.push(...v.toArray().map(n=>+n.toFixed(7)));
            }
          });
        }
      }
      return out;
    })()`);
    for(const label of Object.keys(sets)){
      const target=new URL('../'+label+'/contact-extra.json',folder);
      await save(target,JSON.stringify(sets[label]));
    }
    console.log('Saved five additional contact surfaces for '+Object.keys(sets).join(' and '));
  }
  if(id==='pistol' && !process.argv.includes('--contact-reference')){
    const geometry=await page.evaluate(`(async()=>{
      const T=TT.THREE, {makePistolModel}=await import('/studio/weapon-sidearms.js');
      const model=makePistolModel({...TT.inspectHost().builders.weaponContext(),finishGun:g=>g});
      model.scale.copy(TT.weaponMeshes.pistol.scale).multiplyScalar(1.8/1.655);
      model.updateMatrixWorld(true);const out={};
      for(const [label,index] of [['dust cover',1],['rear tang',2],['guard',12],['trigger',14],['guard root',13],['grip',27],['light module',-1]]){
        const object=index<0?model.userData.laserLightUnit:model.getObjectByName('pistol '+label)||model.children[index];
        if(!object)throw Error(label+' missing');
        const faces=[],v=new T.Vector3();
        object.traverse(m=>{
          if(!m.isMesh)return;
          const pos=m.geometry.attributes.position,ix=m.geometry.index;
          for(let i=0;i<(ix?ix.count:pos.count);i++){
            v.fromBufferAttribute(pos,ix?ix.getX(i):i).applyMatrix4(m.matrixWorld);
            faces.push(+v.x.toFixed(7),+v.y.toFixed(7),+v.z.toFixed(7));
          }
        });
        if(faces.length<9)throw Error(label+' empty');
        out[label]=faces;
      }
      return out;
    })()`);
    await save(new URL('contact-surfaces.json',folder),JSON.stringify(geometry));
  }
  if(process.argv.includes('--surfaces-only')){console.log('Saved contact surfaces',phase);await browser.close();await server.close();process.exit(0)}
  const records=[],hashes=new Set();
  for(const pose of ['hip','aimed','reload']) for(const light of ['noon','overcast','dusk','night']){
    const data=await page.evaluate('prepareEye('+JSON.stringify(pose)+','+JSON.stringify(light)+')');
    assert.equal(data.key,id);
    assert(pose==='aimed'?data.ads>.98:data.ads<.03,pose+' ads='+data.ads);
    assert.equal(!!data.reloading,pose==='reload',pose+' reload');
    await page.evaluate('new Promise(r=>setTimeout(r,180))');
    const image=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94,captureBeyondViewport:false});
    const bytes=Buffer.from(image.data,'base64'),sha=createHash('sha256').update(bytes).digest('hex');
    assert(bytes.length>6000 && !hashes.has(sha),'empty or duplicate '+pose+' '+light);
    hashes.add(sha);records.push({...data,sha256:sha,bytes:bytes.length});
    await save(new URL(pose+'-'+light+'.jpg',folder),bytes);
  }
  await save(new URL('states.json',folder),JSON.stringify(records,null,2)+'\n');
  if(phase==='after' && id==='pistol'){
    for(const u of [.23,.32,.63,.74]){
      const state=await page.evaluate('TT.reloadClipDbg.hold('+u+'); prepareEye("reload","noon").then(()=>({place:TT.viewmodelDbg().info.handPlace,mag:TT.viewmodelDbg().info.magState}))');
      const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
      await save(new URL('mag-'+Math.round(u*100)+'.jpg',folder),Buffer.from(shot.data,'base64'));
      console.log('reload frame',u,state.place,state.mag);
    }
  }
  if(id==='shotgun' && ['after','revised'].includes(phase)){
    await page.evaluate('TT.reloadClipDbg.hold(null);TT.setViewFirstDbg(false);for(let i=0;i<280;i++)TT.stepFrame(1/30)');
    for(const light of ['noon','overcast','dusk','night']){
      await page.evaluate('prepareEye("hip",'+JSON.stringify(light)+')');
      const context=await page.evaluate('({eye:TT.fpDbg().w,gun:TT.getCurrentWeapon()})');
      assert(context.eye<.02 && context.gun===id,'Third-person context missing');
      const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:90,captureBeyondViewport:false});
      await save(new URL('third-person-'+light+'.jpg',folder),Buffer.from(shot.data,'base64'));
    }
  }
  assert.deepEqual(page.errors,[]);
  console.log('PASS',id,phase,records.length,'distinct frames of the actual first-person model');
}finally{await browser.close();await server.close()}
