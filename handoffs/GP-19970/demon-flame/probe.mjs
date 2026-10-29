// Native frame-zero visual check. Run only through crew.mjs slot run.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Engine } from '../../../tools/camera.mjs';

const out = 'handoffs/GP-19970/demon-flame';
fs.mkdirSync(out, { recursive: true });
const engine = new Engine({ inspect: true, warm: 'none', size: [1280, 720] });
const evalI = (code) => engine.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`, 120000);
const records = [];
try {
  await engine.open();
  const checks = await evalI("return await I.check({only:'zombie.demon',variants:false,frames:2});");
  assert(checks.length && checks.every((check) => check.ok), 'demon real-builder check');
  for (const light of ['noon', 'night']) {
    await evalI(`await I.show('zombie.demon',{mode:'walk',instant:true}); I.light(${JSON.stringify(light)}); I.pause(); I.view('front',{instant:true});`);
    for (const frame of [0, 20]) {
      if (frame) await evalI('await I.stepAsync(20);');
      for (const view of ['front', 'gameplay']) {
        await evalI(`I.view(${view === 'front' ? "'front'" : '{yaw:30,pitch:8,dist:8}'},{instant:true});`);
        const shot = await evalI(`const data=await I.shot({type:'image/jpeg',quality:.92}); return {data,session:I.session(),errors:I.errors()};`);
        assert.deepEqual(shot.errors, []);
        const file = `${out}/demon-${light}-walk-f${frame}-${view}.jpg`;
        fs.writeFileSync(file, Buffer.from(shot.data.split(',')[1], 'base64'));
        records.push({ file, frame, light, view, session: shot.session });
      }
    }
  }
  assert.deepEqual(engine.page.errors, []);
  fs.writeFileSync(`${out}/report.json`, JSON.stringify({renderer:engine.renderer,checks,records,pageErrors:engine.page.errors}, null, 2));
  console.log(`PASS ${records.length} demon frame-zero/walk native stills; builder ${checks.filter(x=>x.ok).length}/${checks.length}; page errors 0`);
} finally {
  await engine.close();
}
