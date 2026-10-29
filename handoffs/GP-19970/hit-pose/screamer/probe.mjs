// Native Screamer body-hit probe with its sonic shield protected vs exposed.
// Run only through crew.mjs slot run.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Engine } from '../../../../tools/camera.mjs';

const out='handoffs/GP-19970/hit-pose/screamer';
fs.mkdirSync(out,{recursive:true});
const engine=new Engine({inspect:true,warm:'none',size:[1280,720]});
const evalI=(code)=>engine.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`,120000);
const records=[];
try{
  await engine.open();
  const checks=await evalI("return await I.check({only:'zombie.screamer',variants:false,frames:2});");
  assert(checks.length&&checks.every(c=>c.ok));
  for(const mode of ['protected','exposed']){
    await evalI("await I.show('zombie.screamer',{mode:'walk',instant:true}); I.light('noon'); I.pause();");
    if(mode==='exposed')await evalI('I.zombie.get().sonicOpenT=2.4;');
    const start=await evalI("const z=I.zombie.get(); return {mode:z.sonicOpenT>0?'exposed':'protected',hp:z.hp};");
    assert.equal(start.mode,mode);
    await evalI("I.zombie.hit('body',12);");
    let prior=0;
    for(const frame of [5,20]){
      await evalI(`await I.stepAsync(${frame-prior});I.view({yaw:30,pitch:8,dist:8},{instant:true});`);prior=frame;
      const rec=await evalI(`const z=I.zombie.get(),u=z.mesh.userData,data=await I.shot({type:'image/jpeg',quality:.9});
        return {data,hp:z.hp,alive:z.alive,hitReact:z.hitReact,hitPart:z.hitPart,hitPartT:z.hitPartT,sonicOpenT:z.sonicOpenT,
          torso:u.torso?[u.torso.rotation.x,u.torso.rotation.y,u.torso.rotation.z]:null,errors:I.errors()};`);
      assert(rec.alive);assert.deepEqual(rec.errors,[]);
      const file=`${out}/screamer-${mode}-body-hit-f${frame}-gameplay.jpg`;
      fs.writeFileSync(file,Buffer.from(rec.data.split(',')[1],'base64'));
      delete rec.data;delete rec.errors;
      records.push({mode,frame,file,...rec});
    }
  }
  assert.deepEqual(engine.page.errors,[]);
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({renderer:engine.renderer,checks,records,pageErrors:engine.page.errors},null,2));
  console.log(`PASS Screamer protected/exposed body-hit: ${checks.filter(c=>c.ok).length}/${checks.length} builder, ${records.length} stills, 0 errors`);
}finally{await engine.close();}
