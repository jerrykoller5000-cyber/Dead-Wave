// Native Inspector comparison of baseline walk and nonlethal body-hit pose.
// Run only through crew.mjs slot run. Pass before or after as first argument.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Engine } from '../../../tools/camera.mjs';

const label = process.argv[2];
if (!['before','after'].includes(label)) throw new Error('say before or after');
const out = `handoffs/GP-19970/hit-pose/${label}`;
fs.mkdirSync(out, {recursive:true});
const engine = new Engine({inspect:true,warm:'none',size:[1280,720]});
const evalI = (code) => engine.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`,120000);
const records=[];
try {
  await engine.open();
  for (const kind of ['shambler','brute','colossus']) {
    for (const condition of ['baseline','body-hit']) {
      await evalI(`await I.show('zombie.${kind}',{mode:'walk',instant:true}); I.light('noon'); I.pause();`);
      if (condition==='body-hit') await evalI("I.zombie.hit('body',12);");
      let previous=0;
      const frames=condition==='body-hit'&&label==='after' ? [5,10,20] : [5];
      for(const frame of frames){
        await evalI(`await I.stepAsync(${frame-previous});`); previous=frame;
        for (const view of condition==='baseline' ? ['front'] : ['front','gameplay']) {
          await evalI(`I.view(${view==='front'?"'front'":'{yaw:30,pitch:8,dist:8}'},{instant:true});`);
          const rec=await evalI(`
          const z=I.zombie.get(),u=z.mesh.userData,snap=(o)=>o?[o.rotation.x,o.rotation.y,o.rotation.z]:null;
          const data=await I.shot({type:'image/jpeg',quality:.92});
          return {data,alive:z.alive,hp:z.hp,hitReact:z.hitReact,hitPartT:z.hitPartT,hitPart:z.hitPart,farLod:z.farLod,
            torso:snap(u.torso),head:snap(u.head),armL:snap(u.armLG),armR:snap(u.armRG),errors:I.errors()};
          `);
          assert(rec.alive,`${kind} should survive nonlethal probe`);
          assert.deepEqual(rec.errors,[]);
          const file=`${out}/${kind}-${condition}-f${frame}-${view}.jpg`;
          fs.writeFileSync(file,Buffer.from(rec.data.split(',')[1],'base64'));
          delete rec.data;delete rec.errors;
          records.push({kind,condition,frame,view,file,...rec});
        }
      }
    }
  }
  assert.deepEqual(engine.page.errors,[]);
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({renderer:engine.renderer,records,pageErrors:engine.page.errors},null,2));
  console.log(`PASS ${label}: ${records.length} native walk/body-hit stills; 3 live types; page errors 0`);
} finally { await engine.close(); }
