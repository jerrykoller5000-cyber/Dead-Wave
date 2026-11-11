import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../../tools/serve.mjs';
import {launch} from '../../../tools/cdp.mjs';
import {save} from '../../GT-20076/save.mjs';

const phase=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const dir=new URL('./'+phase+'/',import.meta.url);
await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../../',import.meta.url)),0);
const browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Model rig';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate(`(async()=>{
    const T=TT.THREE,H=TT.inspectHost(),lib=await import('/studio/weapon-longarms.js');
    const builders={ak:lib.makeAkModel,m4:lib.makeM4Model,shotgun:lib.makeShotgunModel};
    const stage=new T.Group();stage.position.set(25,80,-60);stage.scale.setScalar(10);TT.scene.add(stage);
    const key=new T.DirectionalLight(0xfff4e6,2.7),fill=new T.HemisphereLight(0xf0f7ff,0xc7bca8,1.6);
    key.position.set(19,85,-63);key.target.position.copy(stage.position);TT.scene.add(key,key.target,fill);
    const style=document.createElement('style');style.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(style);
    TT.grantAllWeapons();if(TT.isUnarmed())TT.toggleHolster();
    const tips={ak:-.0165,m4:-.0283,shotgun:.0384};
    window.proveTrigger=async(id,revised)=>{
      TT.setShotView(null);TT.setViewFirstDbg(true);TT.flightHold(false);
      for(let i=0;i<30 && TT.getCurrentWeapon()!==id;i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(id));await new Promise(r=>setTimeout(r,120))}
      for(let i=0;i<100;i++)TT.stepFrame(1/30);
      if(TT.viewmodelDbg().info.key!==id)throw Error('Missing eye copy '+id);
      stage.clear();
      let blade;
      const ctx={...H.builders.weaponContext(),finishGun:g=>g},makeKit=ctx.gunKit;
      ctx.gunKit=(...args)=>{
        const kit=makeKit(...args),slab=kit.slab;
        kit.slab=(outline,...rest)=>{
          const mesh=slab(outline,...rest);
          if(outline.length===8 && Math.abs(outline[0][0]-tips[id])<.00001)blade=mesh;
          return mesh;
        };
        return kit;
      };
      const raw=builders[id](ctx),gun=TT.weaponMeshes[id],vm=TT.viewmodelDbg();
      if(!blade)throw Error('Missing original blade '+id);
      const skip=new Set([raw.userData.flash,raw.userData.flashLight,raw.userData.flare,raw.userData.laser]);
      function faces(){
        raw.updateMatrixWorld(true);
        const rows=[],v=new T.Vector3();
        raw.traverse(o=>{
          if(!o.isMesh)return;
          for(let p=o;p;p=p.parent)if(skip.has(p))return;
          const a=o.geometry.attributes.position,coords=[];
          for(let i=0;i<a.count;i++){
            v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);
            coords.push(Math.round(v.x*1e6),Math.round(v.y*1e6),Math.round(v.z*1e6));
          }
          rows.push(coords.join(','));
        });
        return rows;
      }
      const rest=faces(),pin=gun.userData.triggerPin||null;
      const report={pin};let node;
      if(revised){
        const name=gun.userData.controls.trigger,held=gun.getObjectByName(name),eye=vm.gun.root.getObjectByName(name);
        node=raw.getObjectByName(name);
        if(!held || !eye || held===eye || node!==blade.parent)throw Error('Wrong bound art '+id);
        const p=new T.Vector3(...pin);
        if(p.distanceTo(node.position)>1e-8 || p.distanceTo(held.position)>1e-8 || p.distanceTo(eye.position)>1e-8)throw Error('Pivot did not survive both copies');
        const q=node.quaternion.clone();
        node.rotateX(-.10);
        const pose=faces();
        report.changed=pose.filter((v,i)=>v!==rest[i]).length;
        if(report.changed!==1 || node.position.distanceTo(p)>1e-8)throw Error('Preview moved more than the blade');
        node.quaternion.copy(q);raw.updateMatrixWorld(true);
        if(faces().some((v,i)=>v!==rest[i]))throw Error('Rest did not restore');
        report.name=name;
      }
      const center=new T.Box3().setFromObject(blade).getCenter(new T.Vector3());
      stage.add(raw);
      const target=stage.localToWorld(center.clone()),eye=target.clone().addScaledVector(new T.Vector3(1,-.04,-.12).normalize(),1.1);
      TT.setViewFirstDbg(false);TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:30});
      window.posePreview=pressed=>{if(node)node.rotation.x=pressed?-.10:0;return new Promise(r=>setTimeout(r,250))};
      return {rest,report};
    };
  })()`);
  const report={};
  for(const id of ['ak','m4','shotgun']){
    const result=await page.evaluate('proveTrigger('+JSON.stringify(id)+','+(phase==='after')+')');
    const hashes=result.rest.map(s=>createHash('sha256').update(s).digest('hex')).sort();
    const file=id+'-rest.json';
    await save(new URL(file,dir),JSON.stringify(hashes));
    if(phase==='after')assert.deepEqual(hashes,JSON.parse(await readFile(new URL('../before/'+file,dir),'utf8')),'Changed rest surfaces: '+id);
    report[id]={...result.report,meshes:hashes.length};
    for(const pose of (phase==='after'?['rest','preview']:['rest'])){
      await page.evaluate('posePreview('+(pose==='preview')+')');
      const img=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
      await save(new URL(id+'-'+pose+'.jpg',dir),Buffer.from(img.data,'base64'));
    }
  }
  assert.deepEqual(page.errors,[]);
  await save(new URL('report.json',dir),JSON.stringify(report,null,2));
  console.log('PASS',phase,JSON.stringify(report));
}finally{await browser.close();await server.close();}
