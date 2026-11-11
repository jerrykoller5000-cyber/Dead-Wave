import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../../tools/cdp.mjs';
import {serve} from '../../../tools/serve.mjs';
import {save} from '../../GT-20076/save.mjs';

const [phase,id='uzi']=process.argv.slice(2);
const builders={uzi:['sidearms','makeUziModel'],aa12:['longarms','makeAa12Model'],sniper:['longarms','makeSniperModel'],minigun:['heavy','makeMinigunModel'],launcher:['heavy','makeLauncherModel']};
assert(Object.hasOwn(builders,id));
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const dir=new URL('../'+id+'/model-'+phase+'/',import.meta.url);
await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../../',import.meta.url)),0);
const browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?inspect&debug=1&raf=timer');
  assert(await page.waitFor('window.DWInspect?.ready'));
  const subject=await page.evaluate('DWInspect.show('+JSON.stringify('weapon.'+id)+',{instant:true})');
  assert.equal(subject.id,'weapon.'+id);
  const {faces,fixedFaces,seam,audit,pin,articulation}=await page.evaluate(`(async()=>{
    const id=${JSON.stringify(id)},lib=await import('/studio/weapon-${builders[id][0]}.js');
    const build=lib[${JSON.stringify(builders[id][1])}];
    const {auditWeapon}=await import('/tools/tests/weapon-seating.js');
    const ctx=TT.inspectHost().builders.weaponContext(),T=ctx.THREE;
    const raw=build({...ctx,finishGun:g=>g}),u=raw.userData;
    if(id==='sniper'){
      const issued=TT.weaponMeshes.sniper.getObjectByName('optic.nx8');
      const legacy=raw.getObjectByName('scope');
      if(!issued || !legacy)throw Error('Missing sniper optic setup');
      legacy.visible=false;
      const {makeOptic}=await import('/studio/weapon-optics.js');
      const optic=makeOptic('nx8');
      optic.position.copy(issued.position);raw.add(optic);
    }
    const ignore=[u.laser,u.flare,u.flash,u.flashLight].filter(Boolean);
    const point=new T.Vector3(),seamParts=new Set();
    let seam=null;
    if(id==='aa12'){
      raw.updateMatrixWorld(true);
      const cover=raw.children.find(o=>o.isMesh && Math.abs(o.position.y-.07)<1e-7 &&
        new T.Box3().setFromObject(o).getSize(new T.Vector3()).z>.50);
      if(!cover)throw Error('Missing rounded cover');
      seamParts.add(cover);
      const strip=raw.children.find(o=>o.isMesh && Math.abs(o.position.z+.246)<1e-7 && Math.abs(o.position.y-.11525)<1e-7);
      const radii={};
      const pos=cover.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){
        const z=pos.getZ(i);
        if(z>-.249 && z<-.243)radii[z.toFixed(5)]=Math.hypot(pos.getX(i),pos.getY(i));
      }
      seam={flatStrip:!!strip,radii};
      if(strip){
        seamParts.add(strip);
        const ray=new T.Raycaster(new T.Vector3(.039,.13,-.246),new T.Vector3(0,-1,0));
        const hit=ray.intersectObject(cover)[0];
        if(hit)seam.originalGap=(.115-hit.point.y)*TT.weaponMeshes[id].scale.x/TT.getWeaponSizeDbg().upm;
      }
    }
    const surfaceRows=(skip=null)=>{
    const faces=[];
    raw.updateMatrixWorld(true);
    raw.traverse(o=>{
      if(!o.isMesh || skip?.has(o))return;
      for(let p=o;p;p=p.parent)if(ignore.includes(p))return;
      const pos=o.geometry.attributes.position,coords=[];
      for(let i=0;i<pos.count;i++){
        point.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);
        coords.push(Math.round(point.x*1e6),Math.round(point.y*1e6),Math.round(point.z*1e6));
      }
      faces.push(coords.join(','));
    });
    return faces;
    };
    const faces=surfaceRows(),fixedFaces=seam?surfaceRows(seamParts):null;
    const trigger=raw.getObjectByName(u.controls?.trigger || '__missing__');
    let articulation=null;
    if(trigger){
      const rest=trigger.quaternion.clone(),at=trigger.position.clone();
      trigger.rotateX(.09);
      const preview=surfaceRows();
      trigger.quaternion.copy(rest);
      const restored=surfaceRows();
      articulation={moved:preview.filter((s,i)=>s!==faces[i]).length,restored:restored.every((s,i)=>s===faces[i]),fixed:at.distanceTo(trigger.position)===0};
    }
    raw.scale.copy(TT.weaponMeshes[id].scale);
    const a=auditWeapon(raw,{metresPerUnit:1/TT.getWeaponSizeDbg().upm,ignore});
    return {faces,fixedFaces,seam,pin:u.triggerPin,articulation,audit:{open:a.openSurfaces,overlaps:a.overlaps.length,loose:a.loose,
      seats:a.detailSeats.length,breaches:a.detailBreaches}};
  })()`,90000);
  const hashes=faces.map(s=>createHash('sha256').update(s).digest('hex')).sort();
  const fixed=fixedFaces?.map(s=>createHash('sha256').update(s).digest('hex')).sort();
  await save(new URL('proof.json',dir),JSON.stringify({info:subject.info,hashes,fixed,seam,audit,pin,articulation},null,2));
  if(phase==='after'){
    const original=JSON.parse(await readFile(new URL('../model-before/proof.json',dir),'utf8'));
    if(id==='aa12'){
      assert(original.seam.flatStrip && original.seam.originalGap>.001,'Missing original floating strip');
      assert(!seam.flatStrip && Object.values(seam.radii).some(r=>r<.0445),'Missing recessed cover seam');
      assert.equal(original.hashes.length-original.fixed.length,2);
      assert.equal(hashes.length-fixed.length,1);
      assert.deepEqual(fixed,original.fixed,'An unrelated Breacher surface moved');
    }else assert.deepEqual(hashes,original.hashes,'A rest surface moved');
    assert.deepEqual(articulation,{moved:1,restored:true,fixed:true});
    assert.equal(audit.loose.length,0,'Detached component');
    assert(audit.breaches.length<=original.audit.breaches.length,'Additional detail seat breaches');
  }
  for(const view of ['side','rear3'])for(const light of ['noon','overcast','dusk','night']){
    const shot=await page.evaluate(`(async()=>{
      DWInspect.light('${light}');DWInspect.view('${view}',{instant:true});await DWInspect.stepAsync(3);
      return DWInspect.shot({type:'image/jpeg',quality:.95});
    })()`);
    await save(new URL(view+'-'+light+'.jpg',dir),Buffer.from(shot.split(',')[1],'base64'));
  }
  assert.deepEqual(page.errors,[]);
  console.log('PASS',id,'inspector',phase,hashes.length,'surfaces and eight views',JSON.stringify(audit));
}finally{await browser.close();await server.close()}
