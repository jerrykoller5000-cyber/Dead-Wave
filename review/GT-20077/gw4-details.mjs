import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';

const [phase,id='m4']=process.argv.slice(2);
assert(['m4','ak','shotgun'].includes(id));
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after','reviewed','revised'].includes(phase));
const dir = new URL('./'+id+'/details/' + phase + '/', import.meta.url);
await mkdir(dir,{recursive:true});
const server = await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser = await launch({headless:false});
try {
  const page = await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Artwork';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on") && Math.abs(TT.getWorldTime()-.5)<.02',{timeout:45000}));
  await page.evaluate('window.modelId='+JSON.stringify(id));
  await page.evaluate(`(async()=>{
    const lib=await import('/studio/weapon-longarms.js');
    window.buildRaw=()=>lib[{m4:'makeM4Model',ak:'makeAkModel',shotgun:'makeShotgunModel'}[modelId]]({...TT.inspectHost().builders.weaponContext(),finishGun:g=>g});
  })()`);
  const snapshot = await page.evaluate(`(async()=>{
    const T=TT.THREE, raw=buildRaw();
    const u=raw.userData;
    const skip=[u.flash,u.flashLight,u.flare,u.laser].filter(Boolean);
    const vertices=[],outsideMount=[],point=new T.Vector3();
    raw.updateMatrixWorld(true);
    raw.traverse(o=>{
      if(!o.isMesh || !o.geometry.attributes.position)return;
      for(let p=o;p;p=p.parent)if(skip.includes(p))return;
      const attr=o.geometry.attributes.position,coords=[];
      for(let i=0;i<attr.count;i++){
        point.fromBufferAttribute(attr,i).applyMatrix4(o.matrixWorld);
        coords.push(Math.round(point.x*1e6),Math.round(point.y*1e6),Math.round(point.z*1e6));
      }
      const signature=coords.join(',');
      vertices.push(signature);
      if(modelId==='ak' && o.parent!==u.opticPlate)outsideMount.push(signature);
    });
    const stage=new T.Group();stage.position.set(30,80,-60);stage.scale.setScalar(5);stage.add(raw);TT.scene.add(stage);
    TT.setViewFirstDbg(false);
    const key=new T.DirectionalLight(0xfff4df,2.6),fill=new T.HemisphereLight(0xf1f6ff,0xcabdac,1.5);
    key.position.set(33,84,-62);key.target.position.copy(stage.position);TT.scene.add(key,key.target,fill);
    const style=document.createElement('style');style.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(style);
    window.frameGW=(part,view,target,distance)=>{
      raw.traverse(o=>{if(o.name==='laserLightUnit')o.visible=false});
      const center=new T.Vector3(...target).multiplyScalar(5).add(stage.position);
      const eye=center.clone().addScaledVector(new T.Vector3(...view).normalize(),distance*5);
      TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:center.x,ty:center.y,tz:center.z,fov:34});
    };
    if(modelId==='ak'){
      TT.modsOwnAllDbg();
      const gun=TT.weaponMeshes.ak;
      window.fitReviewOptic=kind=>{
        if(!TT.armoryDbg.fit('ak','optic:'+kind,true) && TT.opticDbg.fitted().ak!==kind)throw Error('Cannot fit '+kind);
        const fitted=gun.userData.fittedOptic;
        if(!fitted || !gun.userData.opticPlate.visible)throw Error('Missing fitted bracket');
        if(window.reviewMounted)stage.remove(reviewMounted);
        const copy=TT.cloneLean(fitted);
        stage.add(copy);window.reviewMounted=copy;u.opticPlate.visible=true;
        return {kind,line:fitted.userData.line,position:copy.position.toArray()};
      };
    }
    const contacts={};
    const metric=TT.weaponMeshes[modelId].scale.x*1.8/1.655;
    // Stage translation and the presentation scale must not enter the fit measurements.
    const inverse=new T.Matrix4().copy(stage.matrixWorld).invert();
    stage.updateWorldMatrix(true,true);inverse.copy(stage.matrixWorld).invert();
    const parts = modelId==='shotgun' ? [['pump and fore-end',u.pump],['grip',raw.getObjectByName('shotgun grip')],
      ['stock body',raw.getObjectByName('shotgun stock body')],['light module',u.laserLightUnit],
      ['slide artwork',u.slideLock],['rear sight',raw.getObjectByName('shotgun rear sight')]] : [['rear handle',u.work],['comb',raw.getObjectByName('GW-4 comb')],
      ['tube',raw.getObjectByName('GW-4 tube')],['rear face',raw.getObjectByName('GW-4 rear face')],
      ['rear end plate',raw.getObjectByName('GW-4 rear end plate')],['rear collar',raw.getObjectByName('GW-4 rear collar')]];
    for(const [name,obj] of parts){
      if(!obj)continue;
      const coords=contacts[name]=[];
      obj.traverse(mesh=>{
        if(!mesh.isMesh)return;
        const attr=mesh.geometry.attributes.position,index=mesh.geometry.index;
        const local=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
        for(let i=0;i<(index?index.count:attr.count);i++){
          point.fromBufferAttribute(attr,index?index.getX(i):i).applyMatrix4(local).multiplyScalar(metric);
          coords.push(...point.toArray().map(x=>+x.toFixed(7)));
        }
      });
    }
    return {vertices,contacts,outsideMount};
  })()`);
  if(id==='shotgun'||['reviewed','revised'].includes(phase)){
    assert.equal(Object.keys(snapshot.contacts).length,6);
    await save(new URL('contact-surfaces.json',dir),JSON.stringify(snapshot.contacts));
  }
  if(id==='shotgun'||id==='ak'||['after','revised'].includes(phase)){
    const audit=await page.evaluate(`(async()=>{
      const {auditWeapon}=await import('/tools/tests/weapon-seating.js');
      const raw=buildRaw();
      raw.scale.copy(TT.weaponMeshes[modelId].scale);
      const u=raw.userData;
      if(modelId==='ak')u.opticPlate.visible=true;
      const r=auditWeapon(raw,{metresPerUnit:1.8/1.655,ignore:[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)});
      return {parts:r.parts,open:r.openSurfaces,intersections:r.overlaps.length,loose:r.loose,details:r.detailSeats.length,breaches:r.detailBreaches};
    })()`,90000);
    await save(new URL('audit.json',dir),JSON.stringify(audit,null,2));
    assert.deepEqual(audit.loose,[]); assert.deepEqual(audit.breaches,[]);
    console.log(id+' artwork audit',JSON.stringify(audit));
  }
  const hashes = snapshot.vertices.map(coords=>createHash('sha256').update(coords).digest('hex')).sort();
  await save(new URL('mesh-shapes.json',dir),JSON.stringify(hashes,null,2));
  if(id==='ak'){
    const fixed=snapshot.outsideMount.map(s=>createHash('sha256').update(s).digest('hex')).sort();
    await save(new URL('outside-mount.json',dir),JSON.stringify(fixed));
  }
  const views=id==='ak'?[
    ['whole',[1,.28,-.32],[0,-.016,.14],1.63],
    ['receiver',[1,.24,-.23],[0,.018,.03],.58],
    ['wood',[-.8,.42,.62],[0,.002,.29],.81],
    ['mag',[-.8,-.1,.3],[0,-.135,.07],.63]
  ]:id==='shotgun'?[
    ['side',[1,.16,-.10],[0,.005,.09],.43],['underside',[.18,-1,-.16],[0,-.015,.105],.37],
    ['rear',[-.8,.45,-1],[0,.0,-.14],.7],['foreend',[.85,-.16,.48],[0,.0,.48],.62],
    ['front',[.8,.12,.7],[0,.015,.84],.42],['whole',[1,.24,-.26],[0,0,.23],1.50]
  ]:[
    ['side',[1,.07,-.05],[0,.015,.045],.43],
    ['rear',[-.95,.38,-.9],[0,.018,-.20],.72],
    ['mag',[-1,.04,.28],[0,-.14,.049],.43],
    ['whole',[1,.24,-.26],[0,0,.16],1.56]
  ];
  for (const [name,view,target,distance] of views) {
    await page.evaluate('frameGW('+[name,view,target,distance].map(x=>JSON.stringify(x)).join(',')+');new Promise(r=>setTimeout(r,250))');
    const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
    await save(new URL(name+'.jpg',dir),Buffer.from(shot.data,'base64'));
  }
  if(id==='ak'){
    const lines={};
    for(const kind of ['rmr','prism','acog']){
      lines[kind]=await page.evaluate('fitReviewOptic('+JSON.stringify(kind)+')');
      for(const [label,view] of [['side',[1,.1,-.06]],['bracket',[-1,.22,-.38]]]){
        await page.evaluate('frameGW("mount",'+JSON.stringify(view)+',[0,.075,.065],.36);new Promise(r=>setTimeout(r,250))');
        const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
        await save(new URL(kind+'-'+label+'.jpg',dir),Buffer.from(shot.data,'base64'));
      }
    }
    await save(new URL('optic-lines.json',dir),JSON.stringify(lines,null,2));
  }
  assert.deepEqual(page.errors,[]);
  console.log('PASS '+phase+' '+id+': '+hashes.length+' mesh fingerprints and '+views.length+' model views');
} finally {await browser.close();await server.close()}
