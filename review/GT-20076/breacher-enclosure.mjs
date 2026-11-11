import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from './save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:800,height:450});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  const out=await page.evaluate(`(async()=>{
    const {auditWeapon}=await import('/tools/tests/weapon-seating.js');
    const {makeAa12Model}=await import('/studio/weapon-longarms.js');
    const c=TT.inspectHost().builders.weaponContext(),g=makeAa12Model({...c,finishGun:x=>x,mergeRigidMeshes:()=>{}});
    const inner='breacher-inner-sleeve',outer='breacher-opaque-front-casing',pose='weapon:aa12:rest';
    const scene=new TT.THREE.Group();scene.scale.copy(TT.weaponMeshes.aa12.scale);
    const piece=g.children.find(o=>o.userData.clipPart===inner),host=g.children.find(o=>o.userData.clipPart===outer);
    if(!piece||!host)throw Error('Missing stable artwork identities');
    scene.add(piece,host);host.material=host.material.clone();
    const rule={id:'breacher-enclosed-sleeve',reason:'Decorative inner artwork enclosed by its opaque casing'};
    const allow=(p,h,state,maximum)=>p===inner && h===outer && state===pose && maximum<=.033494 ? rule:null;
    const check=(state,lookup)=>{
      const v=auditWeapon(scene,{metresPerUnit:1.8/1.655,pose:state,lookup});
      return {raw:v.rawOverlaps.length,open:v.overlaps.length,excused:v.excusedSeats.map(s=>({id:s.id,maximum:s.maximum}))};
    };
    const variantPose='weapon:aa12-heavy:rest';
    const result={production:check(pose),candidate:check(pose,allow),variant:check(variantPose,allow),productionVariant:check(variantPose)};
    host.material.transparent=true;result.glazed=check(pose,allow);result.productionGlazed=check(pose);
    host.material.transparent=false;piece.position.x+=.03;result.showing=check(pose,allow);result.productionShowing=check(pose);
    return result;
  })()`);
  if(process.argv.includes('--production')) {
    assert.equal(out.production.raw,1);assert.equal(out.production.open,0);
    assert.equal(out.production.excused[0]?.id,'breacher-enclosed-sleeve');
    for(const key of ['productionVariant','productionGlazed','productionShowing']){
      assert.equal(out[key].raw,1);assert.equal(out[key].open,1);assert.equal(out[key].excused.length,0);
    }
  }
  assert.equal(out.candidate.raw,1);assert.equal(out.candidate.open,0);assert.equal(out.candidate.excused.length,1);
  for(const key of ['variant','glazed','showing']){assert.equal(out[key].raw,1);assert.equal(out[key].open,1);assert.equal(out[key].excused.length,0);}
  await save(new URL('./visible-repairs/aa12/enclosure.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
  assert.deepEqual(page.errors,[]);console.log('PASS actual enclosed pair at rest, other variant, see-through casing, and exposed artwork. Production excused:',out.production.excused.length);
}finally{await browser.close();await server.close();}
