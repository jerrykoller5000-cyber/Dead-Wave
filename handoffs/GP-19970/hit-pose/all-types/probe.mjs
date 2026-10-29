// 14-type native body-hit survey after the shared pose-order change.
// Run only through crew.mjs slot run.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Engine } from '../../../../tools/camera.mjs';

const out='handoffs/GP-19970/hit-pose/all-types';
fs.mkdirSync(out,{recursive:true});
const engine=new Engine({inspect:true,warm:'none',size:[1280,720]});
const evalI=(code)=>engine.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`,120000);
const records=[];
try{
  await engine.open();
  const entries=await evalI("return I.list().filter(e=>e.kind==='zombie');");
  const checks=await evalI("return await I.check({only:'zombie.',variants:false,frames:2});");
  assert.equal(entries.length,14,'expected 14 zombie types');
  assert.equal(checks.length,14,'expected 14 builder checks');
  assert(checks.every(c=>c.ok),'all live zombie builders must pass');
  for(const {id} of entries){
    await evalI(`await I.show(${JSON.stringify(id)},{mode:'walk',instant:true}); I.light('noon'); I.pause(); I.zombie.hit('body',12);`);
    let previous=0;
    for(const frame of [5,20]){
      await evalI(`await I.stepAsync(${frame-previous}); I.view({yaw:30,pitch:8,dist:8},{instant:true});`);previous=frame;
      const rec=await evalI(`const z=I.zombie.get(),u=z.mesh.userData;
        const data=await I.shot({type:'image/jpeg',quality:.88});
        return {data,alive:z.alive,hp:z.hp,hitReact:z.hitReact,hitPart:z.hitPart,hitPartT:z.hitPartT,
          torso:u.torso?[u.torso.rotation.x,u.torso.rotation.y,u.torso.rotation.z]:null,
          head:u.head?[u.head.rotation.x,u.head.rotation.y,u.head.rotation.z]:null,errors:I.errors()};`);
      assert(rec.alive,`${id} survived 12-point body hit`);
      assert.deepEqual(rec.errors,[],`${id} inspector errors`);
      const file=`${out}/${id}-body-hit-f${frame}-gameplay.jpg`;
      fs.writeFileSync(file,Buffer.from(rec.data.split(',')[1],'base64'));
      delete rec.data;delete rec.errors;
      records.push({id,frame,file,...rec});
    }
    console.log(`${id}: body-hit f5/f20 pass`);
  }
  assert.deepEqual(engine.page.errors,[]);
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({renderer:engine.renderer,checks,records,pageErrors:engine.page.errors},null,2));
  console.log(`PASS ${checks.filter(c=>c.ok).length}/${checks.length} builders, ${records.length} native hit/recovery stills, 0 errors`);
}finally{await engine.close();}
