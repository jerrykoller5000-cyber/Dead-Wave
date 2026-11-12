// GP-20119: current firing-line base rail, captured in the Training Ground.
// Run only through crew.mjs slot run on Jerry's PC.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20119');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 400000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 500000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20119 Rail';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 400000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 });
  const steelMeshes = await page.evaluate(`(()=>{const T=TT;T.setWorldTime(0.5);T.weather.raining=false;T.player.position.set(0,-200,-630);T.setViewFirstDbg(false);T.setUnarmedDbg(true);
    // Inspection-only light and bright steel material, so the real 75 mm rail can be identified under the roof.
    const key=new T.THREE.PointLight(0xffffff,60,8);key.position.set(-4,-198.8,-641);T.scene.add(key);
    T.renderer.toneMappingExposure=2;
    T.trainingDbg.tg().group.traverse(o=>{if(o.isMesh)o.receiveShadow=false;});
    const bench=T.trainingDbg.tg().group.getObjectByName('training-firing-bench');
    if(!bench)throw Error('Firing bench missing');
    let n=0;bench.traverse(o=>{if(!o.isMesh||o.material?.color?.getHex()!==0x3a4046)return;
      o.material=new T.THREE.MeshBasicMaterial({color:0xffdd00,side:T.THREE.DoubleSide});n++;});
    return n;
  })()`);
  if (!steelMeshes) throw Error('Firing bench steel mesh missing');
  console.log(`inspection-accented steel mesh(es): ${steelMeshes}`);
  await new Promise(r => setTimeout(r, 3000));
  const shots = [
    ['rail-noon', 0.5, { x: -4.8, y: -199.85, z: -640.9, tx: -4.8, ty: -199.96, tz: -639.79, fov: 40 }],
    ['rail-night', 0.02, { x: -4.8, y: -199.85, z: -640.9, tx: -4.8, ty: -199.96, tz: -639.79, fov: 40 }],
  ];
  for (const [name, time, view] of shots) {
    await page.evaluate(`TT.setWorldTime(${time});TT.setShotView(${JSON.stringify(view)})`);
    await new Promise(r => setTimeout(r, 2000));
    const file = path.join(out, `${name}.png`);
    await page.screenshot(file);
    console.log(`${name}: ${file} (${fs.statSync(file).size} bytes)`);
  }
  const warnings = page.console.filter(m => /warn|error/i.test(m.type) || /WebGPU|validation/i.test(m.text));
  console.log(`warnings: ${warnings.length}`);
  for (const w of warnings) console.log(`${w.type}: ${w.text.slice(0, 240)}`);
} finally {
  await browser.close();
  await server.close();
}
