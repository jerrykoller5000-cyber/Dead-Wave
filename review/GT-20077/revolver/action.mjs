import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { launch } from '../../../tools/cdp.mjs';
import { serve } from '../../../tools/serve.mjs';
import { save } from '../../GT-20076/save.mjs';

const phase = process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before', 'after'].includes(phase));
const folder = new URL('./action-' + phase + '/', import.meta.url);
await mkdir(folder, { recursive: true });
const server = await serve(fileURLToPath(new URL('../../../', import.meta.url)), 0);
const browser = await launch({ headless: false });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(server.origin + '/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Art';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate("TT.grantAllWeapons(); TT.setViewFirstDbg(true); if(TT.isUnarmed()) TT.toggleHolster(); TT.setWeapon(TT.WEAPON_ORDER.indexOf('revolver'))");
  assert(await page.waitFor('TT.viewmodelDbg().info.key==="revolver" && TT.viewmodelDbg().info.raise>.98 && TT.fpDbg().w>.98'));
  const report = await page.evaluate(`(async () => {
    const host = TT.inspectHost(), {LIGHTS} = await import('/studio/inspector/stage.js');
    const source = TT.weaponMeshes.revolver, off = TT.offhandMeshes.revolver, vm = TT.viewmodelDbg().gun;
    const data = source.userData;
    const controls = {};
    for (const key of ['trigger', 'hammer']) {
      const name = data.controls?.[key];
      if (!name) continue;
      const held = source.getObjectByName(name), eye = vm.root.getObjectByName(name), second = off.getObjectByName(name);
      controls[key] = {name, resolves: held === data[key] && eye === vm[key] && second === off.userData[key],
        independent: new Set([held, eye, second]).size === 3, pin: held.position.toArray()};
    }
    const heatName = data.heatParts?.barrel;
    const barrels = heatName ? [source, vm.root, off].map(root => root.getObjectByName(heatName)) : [];
    const css = document.createElement('style');
    css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';
    document.head.append(css);
    TT.setOtsAimDbg(0,-.08); TT.flightHold(true);
    for(let i=0;i<60;i++) TT.stepFrame(1/30);
    // Sample the normal game input separately from the isolated artwork preview.
    TT.setAmmoDbg('revolver', 6);
    const start = data.shots || 0, live = [];
    TT.setMouseFireDbg(true);
    for(let frame=0;frame<36;frame++){
      if(frame===14) TT.setMouseFireDbg(false);
      TT.stepFrame(1/120);
      live.push({frame, shots:(data.shots || 0)-start, blade:vm.trigger.rotation.x, hammer:vm.hammer.rotation.x});
    }
    TT.setMouseFireDbg(false);
    for(let i=0;i<60;i++) TT.stepFrame(1/30);
    window.poseArt = async (light, pull, reset) => {
      const L = LIGHTS[light];
      host.attach({held:()=>true,scale:dt=>dt,frame:()=>{
        const p = TT.player.position, dir = new host.THREE.Vector3(...L.dir).normalize();
        host.sun.position.copy(p).addScaledVector(dir,85); host.sun.target.position.copy(p);
        host.sun.target.updateMatrixWorld(); host.sun.color.setHex(L.sunColor); host.sun.intensity=L.sun;
        host.hemi.color.setHex(L.skyColor); host.hemi.groundColor.setHex(L.ground); host.hemi.intensity=L.sky;
        host.ambientFill.intensity=L.fill; host.moon.intensity=0;
        data.doubleActionPose(vm.trigger, vm.hammer, pull, reset);
      }});
      TT.stepFrame(1/120);
      await new Promise(resolve=>setTimeout(resolve,125));
      return {eye:TT.viewmodelDbg().info.key, blade:vm.trigger.rotation.x, hammer:vm.hammer.rotation.x};
    };
    return {controls, triggerPin: data.triggerPin || null, independentBarrels:
      barrels.every(node=>node?.isMesh) && new Set(barrels).size === 3, live};
  })()`);
  report.art = {};
  for (const light of ['noon', 'overcast', 'dusk', 'night']) {
    for (const [state, pull, reset] of [['rest',0,false], ['lift',.88,false], ['break',1,false], ['return',.5,true]]) {
      const pose = await page.evaluate('poseArt(' + [JSON.stringify(light), pull, reset].join(',') + ')');
      assert.equal(pose.eye, 'revolver');
      report.art[light + '-' + state] = pose;
      const shot = await page.send('Page.captureScreenshot', {format:'jpeg',quality:95});
      await save(new URL(light + '-' + state + '.jpg', folder), Buffer.from(shot.data,'base64'));
    }
    assert(Math.abs(report.art[light+'-lift'].hammer) > .1);
    assert.equal(report.art[light+'-break'].hammer, 0);
    assert.equal(report.art[light+'-return'].hammer, 0);
  }
  await save(new URL('report.json', folder), JSON.stringify(report,null,2));
  assert.deepEqual(page.errors, []);
  assert(report.live.some(pose=>pose.shots===1), 'Input must fire a game shot');
  if(phase==='after'){
    for(const key of ['trigger','hammer']){
      assert(report.controls[key]?.resolves && report.controls[key].independent, 'Missing binding '+key);
    }
    assert.deepEqual(report.triggerPin, report.controls.trigger.pin);
    assert(report.independentBarrels, 'Missing barrel artwork');
    const before = JSON.parse(await readFile(new URL('../action-before/report.json',folder),'utf8'));
    assert.deepEqual(report.art,before.art,'Artwork poses differ');
  }
  console.log('PASS', phase, '16 at-eye art frames, one normal input shot', JSON.stringify(report.controls));
} finally {
  await browser.close();
  await server.close();
}
