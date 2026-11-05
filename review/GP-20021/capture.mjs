// GP-20021 material review. Use only via crew.mjs slot run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20021');
const guns = process.argv[2] ? process.argv[2].split(',') : ['launcher', 'aa12', 'shotgun', 'flamer'];
const allLights = [
  { name: 'noon', t: 0.5, rain: false },
  { name: 'overcast', t: 0.42, rain: true },
  { name: 'dusk', t: 0.77, rain: false },
  { name: 'night', t: 0.02, rain: false },
];
const lights = process.argv[3] ? allLights.filter(l => l.name === process.argv[3]) : allLights;
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion'] });
try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 240000 })) throw new Error('TT did not boot');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); else window.DWOpening?.skip?.(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'JERRY');
    T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    T.setViewFirstDbg(true);
    if (T.isUnarmed()) T.toggleHolster();
    T.setWorldTime(0.5);
    if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
    for (let i = 0; i < 30; i++) T.stepFrame(1/60);
    const ots = T.otsDbg();
    const seat = { x:T.player.position.x, z:T.player.position.z, yaw:T.player.rotation.y, otsYaw:ots.yaw||T.player.rotation.y };
    window.__gp20021 = {seat, step(dt=1/60) {
      const nf=T.renderer?._nodes?.nodeFrame;
      if (nf?.update) { nf.update(); T.renderer.info.frame=nf.frameId; }
      T.stepFrame(dt);
    }, lock(light) {
      T.marineIdleDbg?.()?.reset();
      const y=T.sampleHeight(seat.x,seat.z);
      T.player.position.set(seat.x,y,seat.z);
      T.localPlayer?.position?.set(seat.x,y,seat.z);
      T.player.rotation.y=seat.yaw;
      T.setAimYawDbg(seat.yaw); T.setOtsAimDbg(seat.otsYaw,0); T.setVelDbg(0,0);
      T.setWorldTime(light.t);
      if (T.weather) { T.weather.raining=light.rain; T.weather.intensity=light.rain?0.85:0; }
    }};
  })()`);
  const telemetry = { generatedAt: new Date().toISOString(), guns: {}, errors: [] };
  for (const key of guns) {
    telemetry.guns[key] = {};
    for (const light of lights) {
      const data = await page.evaluate(`(async () => {
        const T=window.TT, h=window.__gp20021, key=${JSON.stringify(key)}, light=${JSON.stringify(light)};
        T.flightHold(true); T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
        T.flightInput({keys:[],zoom:false,fire:false}); T.setMouseFireDbg(false); T.setZoomHeldDbg(false);
        T.setViewFirstDbg(true); if (T.isUnarmed()) T.toggleHolster();
        if (T.vaultDbg.flags().dualActive) T.toggleDualWieldDbg();
        T.reloadClipDbg.hold(null); T.handsDbg.knifeHold(null); T.holdGrenadeAnim(null);
        T.setWeapon(T.WEAPON_ORDER.indexOf(key)); T.setAmmoDbg(key,999);
        for (let i=0;i<150;i++) { h.lock(light); h.step(); }
        await T.renderer.compileAsync(T.scene,T.camera);
        h.step(0); h.step(0);
        const vm=T.viewmodelDbg();
        const materials=[];
        vm.gun?.root?.traverse(o=>{
          if (!o.isMesh) return;
          for (const m of Array.isArray(o.material)?o.material:[o.material]) {
            if (m && !materials.some(x=>x.uuid===m.uuid)) materials.push({uuid:m.uuid,name:m.name,color:m.color?.getHexString(),metalness:m.metalness,roughness:m.roughness,vertexColors:m.vertexColors});
          }
        });
        return {weapon:T.getCurrentWeapon(),first:T.fpDbg().first,w:T.fpDbg().w,
          vmKey:vm.info.key,raise:vm.info.raise,ads:vm.info.ads,worldTime:T.getWorldTime(),
          backend:T.getRendererBackend(),calls:T.renderer.info.render.calls,materials};
      })()`);
      telemetry.guns[key][light.name] = data;
      const shot = await page.send('Page.captureScreenshot', {format:'jpeg',quality:92,captureBeyondViewport:false});
      fs.writeFileSync(path.join(out,`${key}-${light.name}.jpg`),Buffer.from(shot.data,'base64'));
      if (data.weapon!==key || !data.first || data.w<0.99 || data.vmKey!==key || data.raise<0.99 || data.ads>0.02) telemetry.errors.push(`${key}-${light.name}: bad view state ${JSON.stringify(data)}`);
      console.log(`${key}-${light.name}: ${data.backend} calls=${data.calls} mats=${data.materials.length} ads=${data.ads.toFixed(3)}`);
    }
  }
  telemetry.errors.push(...page.errors);
  fs.writeFileSync(path.join(out,'telemetry.json'),JSON.stringify(telemetry,null,2)+'\n','utf8');
  if (telemetry.errors.length) throw new Error(telemetry.errors.join(' | '));
} finally { await browser.close(); await server.close(); }
