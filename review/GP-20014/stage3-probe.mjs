// Initial real-renderer gameplay-camera survey. Run through the crew slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20014');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const guns = arg('--guns', 'shotgun,aa12,revolver,sniper').split(',');
fs.mkdirSync(out, { recursive: true });
const log = [];
const record = (line) => { log.push(line); console.log(line); };
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!await page.waitFor('!!window.TT', { timeout: 600000 })) throw new Error('TT did not boot');
  await page.evaluate('DWOpening?.dismissForTesting?.()');
  await page.waitFor('!window.DWOpening||DWOpening.active===false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  await page.evaluate(`(async()=>{
    await startMatch(TT,'VM-stage3'); TT.clearZombies(); TT.setHp(1e5); TT.grantAllWeapons();
    TT.setWorldTime(.42); TT.setViewFirstDbg(true);
  })()`);
  for (const key of guns) {
    await page.evaluate(`(async()=>{
      for(let i=0;i<16&&TT.getCurrentWeapon()!=='${key}';i++){
        TT.setWeapon(TT.WEAPON_ORDER.indexOf('${key}'));
        await new Promise(r=>setTimeout(r,150));
      }
      if(TT.getCurrentWeapon()!=='${key}')throw new Error('weapon selection failed');
      TT.setZoomHeldDbg(false);
    })()`);
    await new Promise(r=>setTimeout(r,1800));
    await page.screenshot(path.join(out, `${key}-hip.png`));
    await page.evaluate('TT.setZoomHeldDbg(true)');
    await new Promise(r=>setTimeout(r,1800));
    await page.screenshot(path.join(out, `${key}-ads.png`));
    const facts = await page.evaluate(`(()=>{
      const v=TT.viewmodelDbg(), THREE=TT.THREE||window.THREE;
      const sp=v.space||v.root; sp.updateMatrixWorld(true);
      const inv=new THREE.Matrix4().copy(sp.matrixWorld).invert();
      const line=(a)=>{const w=a.wrist.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv),
        e=a.root.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv),
        d=e.clone().sub(w).normalize(),eye=w.clone().multiplyScalar(-1).normalize();
        return {angle:+(Math.acos(Math.max(-1,Math.min(1,d.dot(eye))))*180/Math.PI).toFixed(1),
          elbowY:+v.ndc(e).y.toFixed(2)};};
      return {backend:TT.getRendererBackend(),key:v.info.key,
        active:v.info.active,ads:v.info.ads,wrist:v.info.wrist,
        mag:!!v.gun?.mag,pump:!!v.gun?.pump,bolt:!!v.gun?.bolt,
        cylinder:!!v.gun?.cylinder,shell:!!v.gun?.shell,visible:v.root.visible,
        right:line(v.arms.r),left:line(v.arms.l)};
    })()`);
    record(JSON.stringify(facts));
    if (facts.backend !== 'WebGPU' || !facts.active || facts.key !== key || facts.ads < .99) throw new Error('viewmodel state invalid');
    await page.evaluate('TT.setZoomHeldDbg(false)');
    await new Promise(r=>setTimeout(r,500));
    for (const at of [0.20, 0.45, 0.70, 0.90]) {
      await page.evaluate(`(async()=>{
        TT.setAmmoDbg('${key}',2); TT.startReload();
        if (!TT.isReloading()) throw new Error('reload did not start');
        TT.reloadClipDbg.hold(${at});
      })()`);
      await new Promise(r=>setTimeout(r,350));
      await page.screenshot(path.join(out, `${key}-reload-${String(at).slice(2)}.png`));
      const state = await page.evaluate(`(()=>{const v=TT.viewmodelDbg();return {key:v.info.key,u:v.info.reloadU,
        hand:v.info.handPlace,mag:v.info.magState,shell:!!v.gun?.shell?.visible};})()`);
      record(`${key} ${at}: ${JSON.stringify(state)}`);
      await page.evaluate('TT.reloadClipDbg.hold(null)');
      await page.evaluate(`(async()=>{while(TT.isReloading())await new Promise(q=>setTimeout(q,50))})()`);
    }
    if (page.errors.length) throw new Error('page errors: ' + page.errors.slice(0, 3).join(' | '));
  }
} finally {
  fs.writeFileSync(path.join(out, 'probe.log'), log.join('\n') + '\n', 'utf8');
  await browser.close();
  await server.close();
}
