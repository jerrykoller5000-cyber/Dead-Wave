// Real renderer view-gun review. Run only through crew.mjs slot run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const keys = ['revolver', 'chainsaw', 'minigun', 'flamer', 'launcher'];
const only = process.argv[2];
if (only && !keys.includes(only)) throw new Error('unknown view gun: ' + only);
const out = path.join(root, 'review/GP-20016', only ? `stage4-${only}` : 'stage4');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1920,1080'] });
try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  await page.evaluate(`(async () => {
    const T = window.TT; await startMatch(T, 'GP20016');
    T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    T.setViewFirstDbg(true);
    for (let i = 0; i < 100 && T.fpDbg().w < 0.99; i++) await new Promise(r => setTimeout(r, 100));
  })()`);
  const result = { backend: null, guns: {}, problems: [] };
  for (const key of only ? [only] : keys) {
    for (const state of ['hip', 'ads']) {
      const data = await page.evaluate(`(async () => {
        const T = window.TT, key = ${JSON.stringify(key)}, state = ${JSON.stringify(state)};
        const wait = ms => new Promise(r => setTimeout(r, ms));
        if (T.isUnarmed()) T.toggleHolster();
        for (let i = 0; i < 20 && T.getCurrentWeapon() !== key; i++) {
          T.setWeapon(T.WEAPON_ORDER.indexOf(key)); await wait(200);
        }
        T.setZoomHeldDbg(state === 'ads');
        for (let i = 0; i < 100 && (T.viewmodelDbg()?.info?.key !== key || T.viewmodelDbg()?.info?.raise < 0.99 || (state === 'ads' && T.fpDbg().ads < 0.99)); i++) await wait(100);
        await wait(400);
        const vm = T.viewmodelDbg(), fp = T.fpDbg(), src = T.weaponMeshes[key];
        const muzzle = src?.userData?.muzzleLocal ? vm.ndc(vm.viewPoint(src.userData.muzzleLocal.clone())) : null;
        const wrist = side => vm.wrists?.[side]?.p ? vm.ndc(vm.wrists[side].p) : null;
        const teeth = []; vm.gun?.root?.traverse(o => { if (o.isInstancedMesh) teeth.push({name:o.name,count:o.count,sourceCount:vm.gun.pairs.find(p=>p[1]===o)?.[0]?.count ?? null}); });
        return {weapon:T.getCurrentWeapon(),fp:{first:fp.first,w:fp.w,ads:fp.ads},vm:{active:vm.info.active,key:vm.info.key,raise:vm.info.raise},
          backend:T.getRendererBackend(),muzzle,wristR:wrist('r'),wristL:wrist('l'),teeth,
          errors:window.__stage4Errors || []};
      })()`);
      const id = `${key}-${state}`;
      result.guns[id] = data;
      result.backend = data.backend;
      const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(out, `${id}.png`), Buffer.from(shot.data, 'base64'));
      if (data.weapon !== key || !data.fp.first || data.fp.w < 0.9 || !data.vm.active || data.vm.key !== key) {
        result.problems.push(`${id} was not an active first-person view gun: ${JSON.stringify(data)}`);
      }
    }
    if (key === 'chainsaw') {
      const mirrored = await page.evaluate(`(async () => {
        const T = window.TT, src = T.weaponMeshes.chainsaw.userData.chainInst;
        const vm = T.viewmodelDbg(), dst = vm.gun.pairs.find(([s]) => s === src)?.[1];
        if (!dst) return false;
        const old = new T.THREE.Matrix4(); src.getMatrixAt(0, old);
        const moved = old.clone(); moved.elements[12] += 0.01;
        src.setMatrixAt(0, moved); src.instanceMatrix.needsUpdate = true;
        await new Promise(r => setTimeout(r, 250));
        const same = src.instanceMatrix.array.slice(0, 16).every((v, i) => Math.abs(v - dst.instanceMatrix.array[i]) < 1e-6);
        src.setMatrixAt(0, old); src.instanceMatrix.needsUpdate = true;
        return same && dst.count === src.count;
      })()`);
      result.guns['chainsaw-moving-teeth'] = { mirrored };
      if (!mirrored) result.problems.push('chainsaw tooth instance did not mirror a changed source matrix');
    }
    if (key === 'minigun' || key === 'flamer' || key === 'launcher' || key === 'revolver') {
      const started = await page.evaluate(`(() => { const T=window.TT; T.setZoomHeldDbg(false); T.setAmmoDbg(${JSON.stringify(key)}, 1); T.startReload(); return T.isReloading(); })()`);
      if (!started) { result.problems.push(`${key} reload did not start`); continue; }
      for (const [name, u] of [['out', .22], ['in', .58], ['home', .82]]) {
        const data = await page.evaluate(`(async () => {
          const T=window.TT, wait=ms=>new Promise(r=>setTimeout(r,ms));
          T.reloadClipDbg.hold(${u}); await wait(350);
          const vm=T.viewmodelDbg();
          return {weapon:T.getCurrentWeapon(),active:vm.info.active,first:T.fpDbg().first,
            reloadU:vm.info.reloadU,handPlace:vm.info.handPlace};
        })()`);
        result.guns[`${key}-reload-${name}`] = data;
        const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.join(out, `${key}-reload-${name}.png`), Buffer.from(shot.data, 'base64'));
        if (!data.active || !data.first || Math.abs(data.reloadU - u) > .03) result.problems.push(`${key} reload ${name} failed: ${JSON.stringify(data)}`);
      }
      await page.evaluate(`(() => window.TT.reloadClipDbg.hold(null))()`);
    }
  }
  fs.writeFileSync(path.join(out, 'probe.json'), JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result, null, 2));
  if (page.errors.length) throw new Error('page errors: ' + page.errors.slice(0, 3).join(' | '));
  if (result.problems.length) throw new Error(result.problems.join(' | '));
} finally { await browser.close(); await server.close(); }
