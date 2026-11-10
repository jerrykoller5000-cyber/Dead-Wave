import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20079/visual');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1100,900'] });

async function frame(page, name) {
  await new Promise(resolve => setTimeout(resolve, 250));
  await page.screenshot(path.join(out, name + '.png'));
}
async function shotView(page, subject, side = 'front') {
  await page.evaluate(`(() => {
    const o = ${subject}, T = TT.THREE;
    const b = new T.Box3().setFromObject(o), c = b.getCenter(new T.Vector3()), s = b.getSize(new T.Vector3());
    const d = Math.max(4, s.y * 2.8, s.z * 2.5);
    TT.getMarine().visible = false;
    TT.setShotView({ x: c.x + ${side === 'profile' ? 'd' : '0'}, y: c.y + s.y * .1,
      z: c.z + ${side === 'front' ? 'd' : '0'}, tx: c.x, ty: c.y, tz: c.z, fov: 40 });
  })()`);
}
try {
  const page = await browser.newPage({ width: 1100, height: 900 });
  await page.goto(`${server.origin}/index.html?inspect&raf=timer`);
  if (!await page.waitFor('(window.DWInspect && DWInspect.ready) || !!window.DWInspectError', { timeout: 180000 })) throw Error('inspector not ready');
  if (await page.evaluate('!!window.DWInspectError')) throw Error(await page.evaluate('String(window.DWInspectError)'));
  await page.evaluate("document.querySelector('#dwi')?.classList.add('bare')");

  // The old lateral attack arc swept inward. Compare it with the current
  // outward arc on the same shambler, at the same animation frame and camera.
  await page.evaluate(`(async () => {
    await DWInspect.show('zombie.shambler', { mode: 'live' });
    const z = DWInspect.zombie.get(); z.attackWindup = .22; z._pendingAttack = null;
    await DWInspect.stepAsync(9); DWInspect.light('noon');
  })()`);
  await shotView(page, 'DWInspect.zombie.get().mesh');
  await page.evaluate(`(() => {
    const z = DWInspect.zombie.get(), u = z.mesh.userData;
    window.__gpPose = [u.armLG.rotation.z, u.armRG.rotation.z];
    const wu = 1 - Math.max(0, z.attackWindup) / .22;
    u.armLG.rotation.z += wu * .9; u.armRG.rotation.z -= wu * .9;
  })()`);
  await frame(page, 'shambler-attack-before-reconstructed');
  await page.evaluate(`(() => {
    const u = DWInspect.zombie.get().mesh.userData;
    [u.armLG.rotation.z, u.armRG.rotation.z] = window.__gpPose;
  })()`);
  for (const light of ['noon', 'overcast', 'dusk', 'night']) {
    await page.evaluate(`DWInspect.light('${light}')`);
    await frame(page, `shambler-attack-after-${light}`);
  }

  // The former human corpse arc was the exact opposite lateral rotation at
  // a fixed frame. Capture one demon corpse before/after at identical aim.
  await page.evaluate(`(async () => {
    await DWInspect.show('zombie.demon', { mode: 'live' });
    DWInspect.zombie.kill(); await DWInspect.stepAsync(36); DWInspect.light('noon');
  })()`);
  await shotView(page, 'TT.getCorpses().at(-1).mesh');
  await page.evaluate(`(() => {
    const u = TT.getCorpses().at(-1).mesh.userData;
    window.__gpPose = [u.armLG.rotation.z, u.armRG.rotation.z];
    u.armLG.rotation.z *= -1; u.armRG.rotation.z *= -1;
  })()`);
  await frame(page, 'demon-death-before-reconstructed');
  await page.evaluate(`(() => {
    const u = TT.getCorpses().at(-1).mesh.userData;
    [u.armLG.rotation.z, u.armRG.rotation.z] = window.__gpPose;
  })()`);
  for (const light of ['noon', 'overcast', 'dusk', 'night']) {
    await page.evaluate(`DWInspect.light('${light}')`);
    await frame(page, `demon-death-after-${light}`);
  }

  // Compare the spider's old and new curl targets after the blend completes.
  await page.evaluate(`(async () => {
    await DWInspect.show('zombie.spider', { mode: 'live' });
    DWInspect.zombie.kill(); await DWInspect.stepAsync(48); DWInspect.light('noon');
  })()`);
  await shotView(page, 'TT.getCorpses().at(-1).mesh');
  await page.evaluate(`(() => {
    const T = TT.THREE, c = TT.getCorpses().at(-1), up = new T.Vector3(0,1,0);
    window.__gpPose = c.spiderCurl.limbs.map(p => [p.limb.root.quaternion.clone(), p.limb.knee.quaternion.clone()]);
    for (const [i,p] of c.spiderCurl.limbs.entries()) {
      const l = p.limb, forward = [-.22,0,.26][Math.floor(i/2)];
      const rootQ = new T.Quaternion().setFromUnitVectors(up, new T.Vector3(l.side*.65,-.62,forward).normalize());
      const lower = new T.Vector3(-l.side*.83,.54,-forward*.4).normalize().applyQuaternion(rootQ.clone().invert());
      l.root.quaternion.copy(rootQ); l.knee.quaternion.setFromUnitVectors(up, lower);
    }
  })()`);
  await frame(page, 'spider-death-before-reconstructed');
  await page.evaluate(`(() => {
    const c = TT.getCorpses().at(-1);
    c.spiderCurl.limbs.forEach((p,i) => {
      p.limb.root.quaternion.copy(window.__gpPose[i][0]);
      p.limb.knee.quaternion.copy(window.__gpPose[i][1]);
    });
  })()`);
  for (const light of ['noon', 'overcast', 'dusk', 'night']) {
    await page.evaluate(`DWInspect.light('${light}')`);
    await frame(page, `spider-death-after-${light}`);
  }
  console.log('VISUAL COMPARISON', out, 'page errors', page.errors.length);
} finally {
  await browser.close();
  await server.close();
}
