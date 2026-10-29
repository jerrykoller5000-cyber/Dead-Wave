// Native Inspector comparison of Colossus baseline and dampened body-hit pose.
// Run only through crew.mjs slot run.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Engine } from '../../../../tools/camera.mjs';

const out = 'handoffs/GP-19970/hit-pose/colossus-mass-after';
fs.mkdirSync(out, {recursive:true});
const engine = new Engine({inspect:true,warm:'none',size:[1280,720]});
const evalI = (code) => engine.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`,120000);
const records=[];
try {
  await engine.open();
  const checks=await evalI("return await I.check({only:'zombie.colossus',variants:false,frames:2});");
  assert(checks.length&&checks.every(r=>r.ok),'Colossus real-builder check');
  for (const kind of ['colossus']) for(const light of ['noon','overcast','dusk','night']) {
    for (const condition of ['baseline','body-hit']) {
      await evalI(`await I.show('zombie.${kind}',{mode:'walk',instant:true}); I.light('${light}'); I.pause();`);
      if (condition==='body-hit') await evalI("I.zombie.hit('body',12);");
      let previous=0;
      const frames=condition==='body-hit' ? [5,10,20] : [5];
      for(const frame of frames){
        await evalI(`await I.stepAsync(${frame-previous});`); previous=frame;
        for (const view of ['front','gameplay']) {
          await evalI(`I.view(${view==='front'?"'front'":'{yaw:30,pitch:8,dist:8}'},{instant:true});`);
          const rec=await evalI(`
          const z=I.zombie.get(),u=z.mesh.userData,snap=(o)=>o?[o.rotation.x,o.rotation.y,o.rotation.z]:null;
          const data=await I.shot({type:'image/jpeg',quality:.92});
          return {data,alive:z.alive,hp:z.hp,hitReact:z.hitReact,hitPartT:z.hitPartT,hitPart:z.hitPart,farLod:z.farLod,
            torso:snap(u.torso),head:snap(u.head),armL:snap(u.armLG),armR:snap(u.armRG),errors:I.errors()};
          `);
          assert(rec.alive,`${kind} should survive nonlethal probe`);
          assert.deepEqual(rec.errors,[]);
          const file=`${out}/${kind}-${light}-${condition}-f${frame}-${view}.jpg`;
          fs.writeFileSync(file,Buffer.from(rec.data.split(',')[1],'base64'));
          delete rec.data;delete rec.errors;
          records.push({kind,light,condition,frame,view,file,...rec});
        }
      }
    }
  }
  assert.deepEqual(engine.page.errors,[]);
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({renderer:engine.renderer,checks,records,pageErrors:engine.page.errors},null,2));
  console.log(`PASS Colossus mass correction: ${checks.length} builder, ${records.length} native four-light walk/body-hit stills, page errors 0`);
} finally { await engine.close(); }
