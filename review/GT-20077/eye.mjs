import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const [id,phase] = process.argv.slice(2);
assert(process.env.DW_GAME_TEST_TOKEN && /^[a-z0-9-]+$/.test(id) && ['before','after','paint'].includes(phase));
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
  if(id==='pistol' && (phase==='after' || process.argv.includes('--contact-reference'))){
    const refArgument=process.argv.indexOf('--contact-reference');
    const url=refArgument<0?null:process.argv[refArgument+1];
    if(refArgument>=0)assert(url?.startsWith('/review/GT-20077/pistol/') && url.endsWith('.js'));
    await page.evaluate('window.contactReference='+JSON.stringify(url));
    const sets=await page.evaluate(`(async()=>{
      const T=TT.THREE, ctx={...TT.inspectHost().builders.weaponContext(),finishGun:g=>g};
      const out={};
      const models=[['after','/studio/weapon-sidearms.js']];
      if(contactReference)models.unshift(['before',contactReference]);
      for(const [label,url] of models){
        const {makePistolModel}=await import(url);
        const gun=makePistolModel(ctx), mag=gun.userData.mag, slide=gun.userData.slide;
        gun.scale.copy(TT.weaponMeshes.pistol.scale).multiplyScalar(1.8/1.655);
        gun.updateMatrixWorld(true);
        const parts={'magazine including top':mag,'magazine floor':mag.children[1],
          'slide housing':slide.children[0],'rear plate':slide.children[1],'magazine release':gun.children[17]};
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
  assert.deepEqual(page.errors,[]);
  console.log('PASS',id,phase,records.length,'distinct frames of the actual first-person model');
}finally{await browser.close();await server.close()}
