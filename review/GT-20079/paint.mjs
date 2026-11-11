import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const [id,phase]=process.argv.slice(2);
assert(process.env.DW_GAME_TEST_TOKEN && /^[a-z0-9-]+$/.test(id) && ['before','pre-finish','after','lights','lights-before','riser','rack-before','rack-after','rack-final','carry-fixed'].includes(phase));
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
    const optic = id==='sniper'?'nx8':['ak','m4'].includes(id)?'acog':'rmr';
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
      const out={},groups={assembled:g,firstPerson:vm.gun.root,slide:g.userData.slide,magazine:g.userData.mag,light:g.userData.laserLightUnit,suppressor:g.userData.suppressor,optic:id==='sniper'?g.getObjectByName('optic.nx8'):g.userData.fittedOptic};
      if(['revolver','uzi'].includes(id))groups.offhand=T.offhandMeshes[id];
      if(['revolver','uzi','aa12','sniper'].includes(id)){
        groups.rack=T.house.armoryRack.children.find(o=>o.userData.rackKind===id);
      }
      for(const [group,root] of Object.entries(groups)){
        if(!root)continue;
        const mats=new Map();
        root.traverse(o=>{
          if(!o.isMesh || !o.material || Array.isArray(o.material))return;
          const m=o.material;
          if(!mats.has(m.uuid))mats.set(m.uuid,{part:o.name,materialName:m.name||'',material:m.uuid,role:m.userData.weaponFinishRole||null,registered:!!m.userData.gunPaintId,map:m.map?.uuid||null,color:m.color?.getHex(),roughness:m.roughness,metalness:m.metalness});
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
      const centre=copy.localToWorld(new T.THREE.Vector3(0,0,id==='ak'?.12:id==='m4'?.32:id==='revolver'?.09:id==='uzi'?.18:.24));
      const cameraDistance=id==='sniper'?2.9:['m4','ak','aa12'].includes(id)?2.05:1;
      const eye=centre.clone().addScaledVector(new T.THREE.Vector3(-.64,.22,.31),cameraDistance);
      T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:centre.x,ty:centre.y,tz:centre.z,fov:34});
      for(let i=0;i<5;i++){T.stepFrame(1/30);await new Promise(r=>setTimeout(r,80));}
    };
    window.rackPaint=async(fixed=false)=>{
      T.setViewFirstDbg(false);
      const rack=T.scene.getObjectByName('training-armory')?.getObjectByName('armoryRack');
      const gun=rack?.children.find(o=>o.userData.rackKind===id);
      if(!gun)throw Error('Missing displayed Training Ground rack gun');
      const bounds=new T.THREE.Box3().setFromObject(gun);
      const pivot=fixed?rack.localToWorld(new T.THREE.Vector3(.76,1.63,.5)):bounds.getCenter(new T.THREE.Vector3());
      const direction=rack.getWorldQuaternion(new T.THREE.Quaternion());
      const eye=new T.THREE.Vector3(.12,.08,1).applyQuaternion(direction)
        .multiplyScalar(fixed?2.35:Math.max(1.0,(bounds.max.y-bounds.min.y)*1.55)).add(pivot);
      T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:pivot.x,ty:pivot.y,tz:pivot.z,fov:40});
      for(let i=0;i<5;i++){T.stepFrame(1/30);await new Promise(r=>setTimeout(r,80));}
    };
    return key;
  })()`);
  if(phase==='carry-fixed'){
    assert.equal(id,'revolver');
    // Recreate the side-view fill that was present for the original rack frames.
    await page.evaluate('sidePaint()');
    const states={};
    for(const [name,key] of [['factory',''],['camo',swatch],['restored','']]){
      assert.equal(await page.evaluate('setPaint('+JSON.stringify(key)+')'),key);
      await page.evaluate('rackPaint()');
      states[name]=await page.evaluate(`(()=>{
        const clone=TT.carryGunCopyDbg('revolver'),result={};
        for(const label of ['empties','speedloader','palm-rounds']){
          const part=clone.getObjectByName(label);
          if(!part)throw Error('Missing carry prop '+label);
          result[label]=part.visible;
        }
        return result;
      })()`);
      assert(Object.values(states[name]).every(visible=>visible===false),'Visible reload prop on carry copy');
      const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
      await save(new URL('rack-'+name+'.jpg',folder),Buffer.from(shot.data,'base64'));
    }
    assert.deepEqual(page.errors,[]);
    await save(new URL('proof.json',folder),JSON.stringify(states,null,2));
    console.log('PASS all three reload groups hidden on factory, M81 and restored carry copies');
    return;
  }
  if(phase==='rack-before' || phase==='rack-after'){
    const results={};
    for(const [name,key] of [['factory',''],['camo',swatch],['restored','']]){
      assert.equal(await page.evaluate('setPaint('+JSON.stringify(key)+')'),key);
      await page.evaluate('rackPaint(true)');
      results[name]=await page.evaluate(`(()=>{
        const rack=TT.scene.getObjectByName('training-armory').getObjectByName('armoryRack');
        const faults=[],folds=[];
        rack.traverseVisible(o=>{
          if(o.material?.name!=='fold-static')return;
          const {position,color,foldRM}=o.geometry.attributes;
          folds.push(position.count);
          if(!color || color.count!==position.count)faults.push('Missing vertex colours');
          if(!foldRM || foldRM.count!==position.count)faults.push('Missing surface roughness/metalness');
        });
        return {folds,faults};
      })()`);
      const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
      await save(new URL(name+'.jpg',folder),Buffer.from(shot.data,'base64'));
    }
    await save(new URL('rack.json',folder),JSON.stringify(results,null,2));
    assert.deepEqual(page.errors,[]);
    for(const value of Object.values(results)){
      assert(value.folds.length,'Rack needs folded factory surfaces');
      if(phase==='rack-after')assert.deepEqual(value.faults,[]);
    }
    console.log(id,phase,JSON.stringify(results));
    return;
  }
  const lightingOnly=phase==='lights' || phase==='lights-before';
  if(lightingOnly || (['revolver','uzi','aa12','sniper'].includes(id) && ['before','after'].includes(phase))){
    const lightFolder=lightingOnly?folder:new URL('../'+(phase==='before'?'lights-before':'lights')+'/',folder);
    await mkdir(lightFolder,{recursive:true});
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
      await save(new URL(finish+'-'+light+'.jpg',lightFolder),Buffer.from(shot.data,'base64'));
    }
    assert.deepEqual(page.errors,[]);
    console.log('PASS '+id+' factory and '+swatch+' from the player eye in all four lights');
    if(lightingOnly)return;
    await page.evaluate("TT.inspectHost().attach(null);setPaint('')");
  }
  const states={};
  let tiles;
  for(const angle of (['shotgun','ak','revolver','uzi','aa12','sniper'].includes(id)?['eye','side','rack']:['eye','side']))for(const [name,key] of [['factory',''],['camo',swatch],['restored','']]){
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
    else await page.evaluate(angle==='rack'?'rackPaint()':'sidePaint()');
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
  if(phase==='after' || phase==='riser' || phase==='rack-final'){
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
    if(['m4','ak','shotgun'].includes(id)){
      const rows={};
      const options=await page.evaluate('TT.opticDbg.options[reviewId]');
      assert.deepEqual([...options].sort(),id==='shotgun'?['prism','rmr']:['acog','prism','rmr']);
      for(const kind of options){
        const values=await page.evaluate(`(async()=>{
          const T=TT, kind='${kind}', g=T.weaponMeshes[reviewId];
          if(!T.armoryDbg.fit(reviewId,'optic:'+kind,true))throw Error('Fit '+kind);
          await setPaint('${swatch}');
          const root=g.userData.fittedOptic;
          if(root?.userData.kind!==kind)throw Error('Wrong optic '+root?.userData.kind);
          const counts={coated:0,factory:0,rail:0},leaks=[];
          const riser={};
          if(kind==='rmr' && (${phase==='riser'} || reviewId==='shotgun')){
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
            else if(reviewId!=='m4' && m.userData.weaponFinishRole==='rail' && m.map)counts.rail++;
            else if(!m.userData.weaponFinishRole && !m.userData.gunPaintId)counts.factory++;
            else leaks.push(o.name);
          });
          const lib=await import('/studio/weapon-longarms.js');
          const build={m4:lib.makeM4Model,ak:lib.makeAkModel,shotgun:lib.makeShotgunModel}[reviewId];
          const raw=build({...T.inspectHost().builders.weaponContext(),finishGun:g=>g});
          const roles={};
          const parts={barrel:raw.getObjectByName(raw.userData.heatParts.barrel),
            lightLens:raw.userData.laserLightUnit.getObjectByName('lightLens'),
            laserCavity:raw.userData.laserLightUnit.getObjectByName('laserCavity')};
          if(reviewId!=='ak')parts.dial=raw.userData.laserLightUnit.getObjectByName(reviewId==='shotgun'?'windageDial':'modeDial');
          if(reviewId==='m4' || reviewId==='ak')Object.assign(parts,{magazine:raw.userData.mag,handle:raw.userData.work,sideInlay:raw.userData.recoilBolt,
            selectors:raw.getObjectByName(raw.userData.controls.selector)});
          else Object.assign(parts,{bolt:raw.userData.shotgunBolt,lifter:raw.getObjectByName('shotgun lifter'),
            trigger:raw.getObjectByName('shotgun trigger'),safety:raw.getObjectByName(raw.userData.controls.safety),
            paddle:raw.userData.slideLock,shell:raw.userData.reloadShell,bead:raw.getObjectByName('shotgun bead'),
            rubber:raw.getObjectByName('shotgun recoil pad')});
          if(reviewId==='ak'){
            for(const key of ['magRelease','trigger'])parts[key]=raw.getObjectByName(raw.userData.controls[key]);
            parts.latch=raw.getObjectByName('KR-7 bracket latch');
            parts.stock=raw.getObjectByName('KR-7 stock');
            parts.bore=raw.userData.suppressor.children.at(-1);
            parts.nose=raw.userData.suppressor.children.at(-2);
            const wood=parts.stock.material;
            if(!wood.map)throw Error('Missing factory walnut texture');
            let count=0;raw.traverse(o=>{if(o.material===wood)count++});
            if(count<4)throw Error('Missing wood on the grip or fore-end');
            const targets={'KR-7 receiver cover':'receiver','KR-7 bracket web':'rail'};
            for(const [name,role] of Object.entries(targets))if(raw.getObjectByName(name)?.material.userData.weaponFinishRole!==role)throw Error('Missing finish on '+name);
          }
          if(reviewId==='shotgun'){
            const lamp=raw.userData.laserLightUnit;
            const shells=[['shotgun receiver','receiver'],['shotgun grip','furniture'],['shotgun stock body','furniture']];
            for(const [name,role] of shells)if(raw.getObjectByName(name)?.material.userData.weaponFinishRole!==role)throw Error('Missing finish on '+name);
            for(const name of ['lightTube','laserTube','sideRail'])if(lamp.getObjectByName(name)?.material.userData.weaponFinishRole!=='light shell')throw Error('Missing lamp finish on '+name);
            const fore=raw.userData.pump.children.filter(o=>o.material?.userData.weaponFinishRole==='furniture');
            if(fore.length!==1)throw Error('Expected the fore-end shell alone to take furniture paint');
          }
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
        if(kind==='rmr' && (phase==='riser' || id==='shotgun')){
          const {factory,camo,restored}=values.riser;
          assert.deepEqual(restored,factory,'RMR riser factory reset');
          for(const [name,finish] of Object.entries(camo)){
            if(name.includes('fastener'))assert.deepEqual(finish,factory[name],name);
            else assert(finish.role==='optic shell' && finish.map && !factory[name].map,name+' must take the selected finish');
          }
        }
        if(!values.counts.coated || !values.counts.factory || values.leaks.length)failures.push('Optic mask '+kind);
        if(id!=='m4' && !values.counts.rail)failures.push('Missing coated removable rail on '+kind);
        if(Object.values(values.roles).some(n=>n!==0))failures.push(id+' paint on factory hardware');
        const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
        await save(new URL('optic-'+kind+'.jpg',folder),Buffer.from(shot.data,'base64'));
      }
      await save(new URL('optics.json',folder),JSON.stringify(rows,null,2));
      await page.evaluate("setPaint('')");
    }
    if(id==='ak'){
      const wood=states.factory.assembled.find(m=>m.materialName==='KR-7 walnut');
      if(!wood?.map || wood.registered || wood.role)failures.push('Factory walnut was not isolated');
      else for(const [key,state] of Object.entries(states)){
        for(const group of ['assembled','firstPerson']){
          if(!state[group].some(m=>m.map===wood.map && m.color===wood.color))failures.push(key+' '+group+' lost factory walnut');
        }
      }
    }
    const mapped=new Set(states.camo.assembled.filter(m=>m.role).map(m=>m.map));
    if(mapped.size!==1||mapped.has(null))failures.push('The coated surfaces did not share one camo texture');
    const required=id==='pistol'?{assembled:['frame','slide'],slide:['slide']}:
      {assembled:id==='ak'?['receiver','rail','optic shell']:['receiver','furniture','rail','optic shell']};
    Object.assign(required,{light:['light shell'],optic:['optic shell']});
    if(id!=='aa12')required.suppressor=['suppressor shell'];
    if(['aa12','sniper'].includes(id)){
      await page.evaluate("TT.setShotView(null);TT.setViewFirstDbg(true);setPaint("+JSON.stringify(swatch)+")");
      const masks=await page.evaluate(`(async()=>{
        const T=TT,g=T.weaponMeshes[reviewId],vm=T.viewmodelDbg().gun;
        const lib=await import('/studio/weapon-longarms.js');
        const build=reviewId==='aa12'?lib.makeAa12Model:lib.makeSniperModel;
        const raw=build({...T.inspectHost().builders.weaponContext(),finishGun:x=>x});
        const coating=T.getGunFurniture()[reviewId].find(m=>m.userData.weaponFinishRole==='receiver')?.map;
        if(!coating)throw Error('Missing camo');
        const result={},sourceOf=new Map(vm.pairs.map(([source,copy])=>[copy,source]));
        for(const [key,root] of Object.entries({held:g,eye:vm.root})){
          let coated=0,factory=0;
          root.traverseVisible(o=>{
            if(!o.isMesh || !o.material)return;
            const source=key==='eye'?sourceOf.get(o):o;
            if(!source?.material)throw Error('No material source on '+key);
            const tagged=!!source.material.userData.weaponFinishRole;
            if((o.material.map===coating)!==tagged)throw Error('Incorrect visual finish '+key+' '+o.name);
            if(tagged)coated++;else factory++;
          });
          result[key]={coated,factory};
        }
        const factoryParts={barrel:raw.getObjectByName(raw.userData.heatParts.barrel),
          lampGlass:raw.userData.laserLightUnit.getObjectByName('lightLens'),
          ...Object.fromEntries(Object.entries(raw.userData.controls).map(([key,n])=>[key,raw.getObjectByName(n)]))};
        if(reviewId==='aa12')Object.assign(factoryParts,{drum:raw.userData.mag,brake:raw.getObjectByName('Breacher muzzle brake')});
        else{
          Object.assign(factoryParts,{magazine:raw.userData.mag,bolt:raw.userData.bolt,round:raw.userData.boltRound});
          const optic=(await import('/studio/weapon-optics.js')).makeOptic('nx8');
          for(const name of ['ocular lens','50 mm objective lens','left parallax and illumination dial','exposed ZeroStop elevation turret','right capped windage turret'])
            factoryParts[name]=optic.getObjectByName(name);
          for(const name of ['NX8 tapered optical housing','scope rail bridge','scope ring saddle'])
            if(!optic.getObjectByName(name)?.material.userData.weaponFinishRole)throw Error('Missing finish on '+name);
        }
        for(const [name,obj] of Object.entries(factoryParts)){
          if(!obj)throw Error('Missing '+name);
          let bare=0;
          obj.traverse(o=>{
            if(!o.isMesh)return;
            if(o.material.userData.weaponFinishRole)throw Error('Paint on '+name);
            bare++;
          });
          if(!bare)throw Error('Missing source mesh '+name);
          result[name]={bare};
        }
        return result;
      })()`);
      await save(new URL('masks.json',folder),JSON.stringify(masks,null,2));
    }
    if(id==='uzi'){
      await page.evaluate("TT.setShotView(null);TT.setViewFirstDbg(true);setPaint("+JSON.stringify(swatch)+")");
      const masks=await page.evaluate(`(()=>{
        const result={};
        const viewGun=TT.viewmodelDbg().gun,sourceOf=new Map(viewGun.pairs.map(([source,copy])=>[copy,source]));
        const coating=TT.getGunFurniture().uzi.find(m=>m.userData.weaponFinishRole==='receiver')?.map;
        if(!coating)throw Error('Missing selected Wasp finish');
        for(const [view,g] of Object.entries({held:TT.weaponMeshes.uzi,offhand:TT.offhandMeshes.uzi,eye:viewGun.root})){
          const u=TT.weaponMeshes.uzi.userData,groups={};
          for(const [key,name] of Object.entries(u.controls))groups[key]=g.getObjectByName(name);
          groups.barrel=g.getObjectByName(u.heatParts.barrel);
          groups.optic=g.getObjectByName('fitted-optic-rmr');
          groups.rail=g.getObjectByName('uzi-optic-rail');
          if(view==='held')groups.mag=u.mag;
          result[view]={};
          for(const [key,group] of Object.entries(groups)){
            if(!group)throw Error(view+' missing '+key);
            let coated=0,factory=0;
            group.traverse(o=>{
              if(!o.isMesh)return;
              const source=view==='eye'?sourceOf.get(o):o;
              if(!source || !source.material)throw Error('Unmatched surface '+view+' '+key);
              const intended=!!source.material.userData.weaponFinishRole;
              // Eye materials preserve the selected texture but omit the source tags.
              if((o.material.map===coating)!==intended)throw Error('Incorrect visible coating '+view+' '+key);
              if(intended)coated++;
              else factory++;
            });
            result[view][key]={coated,factory};
          }
        }
        return result;
      })()`);
      await save(new URL('masks.json',folder),JSON.stringify(masks,null,2));
      for(const parts of Object.values(masks))for(const [key,part] of Object.entries(parts)){
        if(key==='optic')assert(part.coated && part.factory,'RMR housing and fixed glass');
        else if(key==='rail')assert(part.coated && !part.factory,'Wasp optic rail');
        else assert(part.factory && !part.coated,'Bare Wasp '+key);
      }
    }
    if(id==='revolver'){
      required.assembled=['frame','rail','optic shell'];
      delete required.suppressor;
      const woods=states.factory.assembled.filter(m=>m.materialName.startsWith('Revolver walnut'));
      assert.equal(woods.length,2,'Expected both factory walnut finishes');
      for(const material of woods){
        assert(material.map && !material.registered && !material.role);
        for(const state of Object.values(states)) for(const group of ['assembled','firstPerson','offhand','rack']){
          assert(state[group].some(m=>m.color===material.color && m.map===material.map && m.roughness===material.roughness),
            'Factory walnut changed on '+group);
        }
      }
      const masks=await page.evaluate(`(async()=>{
        const g=TT.weaponMeshes.revolver, result={};
        for(const kind of TT.opticDbg.options.revolver){
          if(!TT.armoryDbg.fit('revolver','optic:'+kind,true))throw Error('Failed to fit '+kind);
          await setPaint('${swatch}');
          const checks={};
          const groups={optic:g.userData.fittedOptic,plate:g.userData.opticPlate,trigger:g.userData.trigger,
            hammer:g.userData.hammer,drum:g.userData.cylinder,barrel:g.getObjectByName(g.userData.heatParts.barrel)};
          for(const [part,root] of Object.entries(groups)){
            let coated=0, factory=0;
            root.traverse(o=>{
              if(!o.isMesh)return;
              if(o.material.userData.weaponFinishRole && o.material.map)coated++;
              else if(!o.material.userData.gunPaintId)factory++;
              else throw Error('Untagged paint on '+part);
            });
            checks[part]={coated,factory};
          }
          result[kind]=checks;
        }
        return result;
      })()`);
      assert.deepEqual(Object.keys(masks).sort(),['prism','rmr']);
      await save(new URL('optics.json',folder),JSON.stringify(masks,null,2));
      for(const checks of Object.values(masks)){
        for(const part of ['optic','plate'])assert(checks[part].coated && checks[part].factory,part);
        for(const part of ['trigger','hammer','drum','barrel'])assert(checks[part].factory && !checks[part].coated,part);
      }
    }
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
