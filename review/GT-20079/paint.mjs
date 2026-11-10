import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const [id,phase]=process.argv.slice(2);
assert(process.env.DW_GAME_TEST_TOKEN && /^[a-z0-9-]+$/.test(id) && ['before','after','lights','riser'].includes(phase));
const folder=new URL('./'+id+'/'+phase+'/',import.meta.url);
await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
async function capture() {
  const page=await browser.newPage({width:1152,height:648});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Finish';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:45000}));
  await page.evaluate('window.reviewId='+JSON.stringify(id));
  const swatch=await page.evaluate(`(async()=>{
    const T=TT,id=reviewId,g=T.weaponMeshes[id];
    T.setViewFirstDbg(true);T.grantAllWeapons();T.modsOwnAllDbg();
    if(T.isUnarmed())T.toggleHolster();
    for(let i=0;i<25 && T.getCurrentWeapon()!==id;i++){T.setWeapon(T.WEAPON_ORDER.indexOf(id));await new Promise(r=>setTimeout(r,120));}
    T.setOtsAimDbg(0,-.08);
    const mods=T.armoryDbg.mods(id);
    const optic = id==='m4'?'acog':'rmr';
    for(const key of ['suppressor','laserLight','optic:'+optic]){
      const mod=mods.find(x=>x.id===key);
      if(mod && !T.armoryDbg.fit(id,key,true))throw Error('Cannot fit '+key+'; owned='+mod.owned);
    }
    // Keep the issued copy equipped and put a second copy on the actual rack.
    const armory=T.armoryDbg.ui().armory;
    if(!T.armoryDbg.stored().includes(id))armory.buy({id:'paint-proof-'+id,kind:id},{store:true});
    T.armoryDbg.refreshRack(true);
    const opts=T.armoryFinishDbg.list(id).list;
    const key=(opts.find(x=>x.key==='urban_digital'&&!x.locked)||opts.find(x=>x.key&&!x.locked))?.key;
    if(!key)throw Error('No Training Ground paint swatch');
    T.flightHold(true);
    for(let i=0;i<150;i++)T.stepFrame(1/30);
    window.setPaint=async key=>{
      if(!T.armoryFinishDbg.paint(id,key))throw Error('Armory did not select '+key);
      for(let i=0;i<48;i++)T.stepFrame(1/30);
      for(let i=0;i<3;i++){await new Promise(r=>setTimeout(r,90));T.stepFrame(1/30);}
      return T.armoryFinishDbg.list(id).current;
    };
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    const vm=T.viewmodelDbg();if(!vm.info.active || vm.info.key!==id)throw Error('Gun at the eye missing');
    window.paintTiles=()=>{
      const map=T.getGunFurniture()[id].find(m=>m.map)?.map;
      if(!map)throw Error('Missing selected camo texture');
      function density(root,parts=root){
        root.updateWorldMatrix(true,true);
        const inv=root.matrixWorld.clone().invert(), scale=Math.abs(root.getWorldScale(new T.THREE.Vector3()).x);
        const samples=[];
        parts.traverseVisible(o=>{
          if(!o.isMesh || o.material?.map!==map)return;
          const geom=o.geometry, p=geom.attributes.position, uv=geom.attributes.uv, ix=geom.index;
          if(!uv)throw Error('Missing painted UV');
          const relative=new T.THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);
          const v=[new T.THREE.Vector3(),new T.THREE.Vector3(),new T.THREE.Vector3()];
          const cross=new T.THREE.Vector3();
          for(let i=0;i<(ix?ix.count:p.count);i+=3){
            const ids=[i,i+1,i+2].map(j=>ix?ix.getX(j):j);
            ids.forEach((j,n)=>v[n].fromBufferAttribute(p,j).applyMatrix4(relative));
            cross.crossVectors(v[1].sub(v[0]),v[2].sub(v[0]));
            const area=Math.max(Math.abs(cross.x),Math.abs(cross.y),Math.abs(cross.z))*scale*scale;
            const [a,b,c]=ids, texelArea=Math.abs((uv.getX(b)-uv.getX(a))*(uv.getY(c)-uv.getY(a))-(uv.getX(c)-uv.getX(a))*(uv.getY(b)-uv.getY(a)));
            if(area>1e-10 && texelArea>1e-10)samples.push({width:Math.sqrt(area/texelArea),area});
          }
        });
        samples.sort((a,b)=>a.width-b.width);
        const total=samples.reduce((s,v)=>s+v.area,0);
        let area=0;const q=[];
        for(const p of samples){area+=p.area;while(q.length<3 && area/total>=[.1,.5,.9][q.length])q.push(p.width);}
        if(!samples.length)throw Error('No textured faces');
        return {triangles:samples.length,tile:q,scale};
      }
      const widths={held:density(g),eye:density(vm.gun.root)};
      const rack=T.house.armoryRack?.children.find(o=>o.userData.rackKind===id);
      if(!rack)throw Error('No '+id+' on the actual armory rack');
      widths.rack=density(rack);
      return widths;
    };
    window.paintSnapshot=()=>{
      const out={},groups={assembled:g,firstPerson:vm.gun.root,slide:g.userData.slide,magazine:g.userData.mag,light:g.userData.laserLightUnit,suppressor:g.userData.suppressor,optic:g.userData.fittedOptic};
      for(const [group,root] of Object.entries(groups)){
        if(!root)continue;
        const mats=new Map();
        root.traverse(o=>{
          if(!o.isMesh || !o.material || Array.isArray(o.material))return;
          const m=o.material;
          if(!mats.has(m.uuid))mats.set(m.uuid,{part:o.name,material:m.uuid,role:m.userData.weaponFinishRole||null,registered:!!m.userData.gunPaintId,map:m.map?.uuid||null,color:m.color?.getHex(),roughness:m.roughness,metalness:m.metalness});
        });out[group]=Array.from(mats.values());
      }
      return out;
    };
    window.sidePaint=async()=>{
      if(window.paintCopy)T.scene.remove(paintCopy);
      T.setViewFirstDbg(false);
      const copy=T.cloneLean(g);copy.visible=true;copy.position.set(20,80,-60);copy.rotation.set(0,0,0);T.scene.add(copy);
      window.paintCopy=copy;
      if(!window.reviewLamp){
        const lamp=new T.THREE.DirectionalLight(0xffecd6,2.3);
        lamp.position.copy(copy.position).add(new T.THREE.Vector3(-3,4,-2));
        lamp.target.position.copy(copy.position);
        T.scene.add(lamp,lamp.target,new T.THREE.HemisphereLight(0xf3f7ff,0xc7bba9,1.5));window.reviewLamp=lamp;
      }
      const centre=copy.localToWorld(new T.THREE.Vector3(0,0,id==='m4'?.32:.24));
      const eye=centre.clone().addScaledVector(new T.THREE.Vector3(-.64,.22,.31),id==='m4'?2.05:1);
      T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:centre.x,ty:centre.y,tz:centre.z,fov:34});
      for(let i=0;i<5;i++){T.stepFrame(1/30);await new Promise(r=>setTimeout(r,80));}
    };
    return key;
  })()`);
  if(phase==='lights'){
    await page.evaluate(`(async()=>{
      const H=TT.inspectHost(),{LIGHTS}=await import('/studio/inspector/stage.js');
      window.applyProofLight=name=>{
        const L=LIGHTS[name],pos=TT.player.position,dir=new H.THREE.Vector3(...L.dir).normalize();
        H.sun.position.copy(pos).addScaledVector(dir,85);H.sun.target.position.copy(pos);H.sun.target.updateMatrixWorld();
        H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;
        H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;
        H.ambientFill.intensity=L.fill;H.moon.intensity=0;
      };
      H.attach({held:()=>false,scale:dt=>dt,frame:()=>applyProofLight(window.lightName||'noon')});
    })()`);
    for(const [finish,key] of [['factory',''],['camo',swatch]])for(const light of ['noon','overcast','dusk','night']){
      await page.evaluate('window.lightName='+JSON.stringify(light));
      assert.equal(await page.evaluate('setPaint('+JSON.stringify(key)+')'),key);
      const state=await page.evaluate('({key:TT.viewmodelDbg().info.key,current:TT.armoryFinishDbg.list(reviewId).current,sun:TT.inspectHost().sun.intensity})');
      assert.equal(state.key,id);assert.equal(state.current,key);
      const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
      await save(new URL(finish+'-'+light+'.jpg',folder),Buffer.from(shot.data,'base64'));
    }
    assert.deepEqual(page.errors,[]);
    console.log('PASS '+id+' factory and '+swatch+' from the player eye in all four lights');
    return;
  }
  const states={};
  let tiles;
  for(const angle of ['eye','side'])for(const [name,key] of [['factory',''],['camo',swatch],['restored','']]){
    const selected=await page.evaluate('setPaint('+JSON.stringify(key)+')');
    assert.equal(selected,key);
    if(angle==='eye'){
      states[name]=await page.evaluate('paintSnapshot()');
      if(name==='camo'){
        tiles=await page.evaluate('paintTiles()');
        await save(new URL('tiles.json',folder),JSON.stringify(tiles,null,2)+'\n');
        console.log('Weighted median tile widths',tiles.held.tile[1],tiles.eye.tile[1]);
      }
    }
    else await page.evaluate('sidePaint()');
    const snap=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
    await save(new URL(angle+'-'+name+'.jpg',folder),Buffer.from(snap.data,'base64'));
  }
  await save(new URL('materials.json',folder),JSON.stringify(states,null,2)+'\n');
  const appearance=parts=>parts.map(({material,...look})=>look);
  const failures=[];
  for(const group of Object.keys(states.factory)){
    // Record both checks so a regenerated material can be distinguished from a changed finish.
    try { assert.deepEqual(states.restored[group],states.factory[group]); }
    catch { failures.push(group+' did not restore the exact material instances and properties'); }
    try { assert.deepEqual(appearance(states.restored[group]),appearance(states.factory[group])); }
    catch { failures.push(group+' did not restore the visible finish properties'); }
  }
  for(const [group,parts] of Object.entries(states.camo)){
    const count=parts.filter(m=>m.map).length;
    console.log(group, count,'of',parts.length,'materials have maps');
  }
  if(phase==='after' || phase==='riser'){
    if(id==='pistol'){
      const ids=await page.evaluate(`(async()=>{
        const {makePistolModel}=await import('/studio/weapon-sidearms.js');
        const gun=makePistolModel({...TT.inspectHost().builders.weaponContext(),finishGun:g=>g});
        const slide=gun.userData.slide, lamp=gun.userData.laserLightUnit;
        const parts={trigger:gun.getObjectByName('pistol trigger'),grip:gun.getObjectByName('pistol grip'),
          slide:slide.children[0],rearPlate:slide.children[1],magazine:gun.userData.mag.children[0],
          module:lamp.getObjectByName('moduleShell'),rubber:lamp.getObjectByName('activationPad'),
          glass:lamp.getObjectByName('lightLens'),cavity:lamp.getObjectByName('laserCavity')};
        return Object.fromEntries(Object.entries(parts).map(([key,o])=>[key,o.material.userData.weaponFinishRole||'factory']));
      })()`);
      await save(new URL('part-roles.json',folder),JSON.stringify(ids,null,2)+'\n');
      assert.deepEqual(ids,{trigger:'factory',grip:'frame',slide:'slide',rearPlate:'factory',magazine:'factory',module:'light shell',rubber:'factory',glass:'factory',cavity:'factory'});
    }
    if(id==='m4'){
      const rows={};
      for(const kind of ['rmr','prism','acog']){
        const values=await page.evaluate(`(async()=>{
          const T=TT, kind='${kind}', g=T.weaponMeshes.m4;
          if(!T.armoryDbg.fit('m4','optic:'+kind,true))throw Error('Fit '+kind);
          await setPaint('${swatch}');
          const root=g.userData.fittedOptic;
          if(root?.userData.kind!==kind)throw Error('Wrong optic '+root?.userData.kind);
          const counts={coated:0,factory:0},leaks=[];
          const riser={};
          if(kind==='rmr' && ${phase==='riser'}){
            const names=['optic riser block','optic riser foot','optic riser fastener -1','optic riser fastener 1'];
            const inspect=()=>Object.fromEntries(names.map(name=>{
              const mesh=root.getObjectByName(name);
              if(!mesh)throw Error('Missing '+name);
              const m=mesh.material;
              return [name,{role:m.userData.weaponFinishRole||null,map:!!m.map,color:m.color.getHex(),roughness:m.roughness,metalness:m.metalness}];
            }));
            await setPaint('');riser.factory=inspect();
            await setPaint('${swatch}');riser.camo=inspect();
            await setPaint('');riser.restored=inspect();
            await setPaint('${swatch}');
          }
          root.traverse(o=>{
            if(!o.isMesh || !o.material)return;
            const m=o.material;
            if(m.userData.weaponFinishRole==='optic shell' && m.map)counts.coated++;
            else if(!m.userData.weaponFinishRole && !m.userData.gunPaintId)counts.factory++;
            else leaks.push(o.name);
          });
          const {makeM4Model}=await import('/studio/weapon-longarms.js');
          const raw=makeM4Model({...T.inspectHost().builders.weaponContext(),finishGun:g=>g});
          const roles={};
          const parts={magazine:raw.userData.mag,barrel:raw.getObjectByName(raw.userData.heatParts.barrel),
            handle:raw.userData.work,sideInlay:raw.userData.recoilBolt,lightLens:raw.userData.laserLightUnit.getObjectByName('lightLens'),
            selectors:raw.getObjectByName(raw.userData.controls.selector),dial:raw.userData.laserLightUnit.getObjectByName('modeDial'),
            laserCavity:raw.userData.laserLightUnit.getObjectByName('laserCavity')};
          for(const [name,part] of Object.entries(parts)){
            if(!part)throw Error('Missing proof part '+name);
            let covered=0;part.traverse(o=>{if(o.material?.userData.weaponFinishRole)covered++});
            roles[name]=covered;
          }
          await sidePaint();
          const optic=paintCopy.getObjectByName('fitted-optic-'+kind);
          const box=new T.THREE.Box3().setFromObject(optic),center=box.getCenter(new T.THREE.Vector3()),size=box.getSize(new T.THREE.Vector3());
          // Keep the small optic beyond the world camera's near plane and
          // narrow the field of view to preserve its size in the proof frame.
          const framing=Math.max(size.y,size.z*.75,size.x)*2.8;
          const distance=Math.max(.52,framing);
          const fov=360/Math.PI*Math.atan(Math.tan(34*Math.PI/360)*framing/distance);
          const eye=center.clone().addScaledVector(new T.THREE.Vector3(-1,.28,-.48).normalize(),distance);
          T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:center.x,ty:center.y,tz:center.z,fov});
          for(let pass=0;pass<5;pass++){T.stepFrame(1/30);await new Promise(r=>setTimeout(r,80));}
          return {counts,leaks,roles,riser,framing:{width:size.x,height:size.y,length:size.z,distance:eye.distanceTo(center)}};
        })()`);
        rows[kind]=values;
        if(kind==='rmr' && phase==='riser'){
          const {factory,camo,restored}=values.riser;
          assert.deepEqual(restored,factory,'RMR riser factory reset');
          for(const [name,finish] of Object.entries(camo)){
            if(name.includes('fastener'))assert.deepEqual(finish,factory[name],name);
            else assert(finish.role==='optic shell' && finish.map && !factory[name].map,name+' must take the selected finish');
          }
        }
        if(!values.counts.coated || !values.counts.factory || values.leaks.length)failures.push('Optic mask '+kind);
        if(Object.values(values.roles).some(n=>n!==0))failures.push('M4 paint on factory hardware');
        const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
        await save(new URL('optic-'+kind+'.jpg',folder),Buffer.from(shot.data,'base64'));
      }
      await save(new URL('optics.json',folder),JSON.stringify(rows,null,2));
      await page.evaluate("setPaint('')");
    }
    const mapped=new Set(states.camo.assembled.filter(m=>m.role).map(m=>m.map));
    if(mapped.size!==1||mapped.has(null))failures.push('The coated surfaces did not share one camo texture');
    const required=id==='m4'?{assembled:['receiver','furniture','rail','optic shell']}:{assembled:['frame','slide'],slide:['slide']};
    Object.assign(required,{light:['light shell'],suppressor:['suppressor shell'],optic:['optic shell']});
    for(const [group,roles] of Object.entries(required)){
      const parts=states.camo[group]||[];
      for(const role of roles)if(!parts.some(m=>m.role===role&&m.map))failures.push(group+' missing painted '+role);
    }
    for(const [group,parts] of Object.entries(states.camo)){
      if(group==='firstPerson')continue;
      for(const m of parts.filter(m=>!m.role)){
        const factory=states.factory[group].find(f=>f.material===m.material);
        if(!factory || m.map!==factory.map || m.color!==factory.color || m.roughness!==factory.roughness || m.metalness!==factory.metalness)
          failures.push(group+' changed a factory surface '+m.part);
      }
    }
    for(const [view,sample] of Object.entries(tiles)){
      if(sample.tile.length!==3 || Math.abs(sample.tile[1]-.42)>.015)failures.push(view+' camo tile median '+sample.tile[1]);
    }
  }
  assert.deepEqual(page.errors,[]);
  await save(new URL('checks.json',folder),JSON.stringify({id,phase,swatch,failures},null,2)+'\n');
  assert.deepEqual(failures,[]);
  console.log('PASS',id,phase,'factory →',swatch,'→ factory');
}
try {await capture()} finally {await browser.close();await server.close()}
