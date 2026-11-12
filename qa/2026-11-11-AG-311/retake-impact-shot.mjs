// qa/2026-11-11-AG-311/retake-impact-shot.mjs
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: [
    '--window-position=-3800,-3800',
    '--window-size=1280,720',
    '--disable-features=CalculateNativeWinOcclusion',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding'
  ]
});
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  try {
    const win = await page.send('Browser.getWindowForTarget', {});
    if (win?.windowId != null) {
      await page.send('Browser.setWindowBounds', {
        windowId: win.windowId,
        bounds: { left: -3800, top: -3800, width: 1280, height: 720, windowState: 'normal' }
      });
    }
  } catch (_) {}
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 }));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 }));
  await page.evaluate(`(() => {
    document.getElementById('playerName').value = 'AG-311';
    const vf = document.getElementById('viewFirst');
    if (vf && !vf.checked) { vf.checked = true; vf.dispatchEvent(new Event('change', { bubbles: true })); }
    document.getElementById('modeTraining').click();
  })()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 }));
  await page.evaluate(`(() => { window.TT.setViewFirstDbg(true); })()`);
  await pause(1200);
  assert(await page.waitFor('TT.fpDbg().first && TT.trainingDbg.tg().ceiling.root.visible && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 30000 }));

  const check = await page.evaluate(`(() => {
    const T = window.TT, tg = T.trainingDbg.tg(), tr = T.trainingDbg.state(), host = T.inspectHost();
    T.trainingDbg.clear();
    if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
    tr.impacts.clear();
    const offsets = [[-0.28, -5.55], [-0.14, -5.42], [0.0, -5.50], [0.15, -5.38], [0.29, -5.52]];
    for (const [dx, z0] of offsets) {
      const dir = new T.THREE.Vector3(0, 1.0, 0.04).normalize();
      T.fireRoundDbg(tg.origin.x + dx, tg.floorY + 1.65, tg.origin.z + z0, dir.x, dir.y, dir.z, 25, 180, 0);
      for (let s = 0; s < 12; s++) T.stepProjectilesDbg(0.008);
    }
    host.attach({
      held: () => false,
      scale: (dt) => dt,
      frame: () => {
        if (T.flashlight) {
          T.flashlight.visible = true;
          T.flashlight.angle = 0.72;
          T.flashlight.penumbra = 0.85;
          T.flashlight.position.set(tg.origin.x, tg.floorY + 4.82, tg.origin.z - 6.05);
          T.flashlight.target.position.set(tg.origin.x, tg.floorY + 5.98, tg.origin.z - 5.30);
          T.flashlight.target.updateMatrixWorld();
          T.flashlight.intensity = 4.5;
        }
      }
    });
    T.setShotView({
      x: tg.origin.x, y: tg.floorY + 4.82, z: tg.origin.z - 6.05,
      tx: tg.origin.x, ty: tg.floorY + 5.98, tz: tg.origin.z - 5.30,
      fov: 46
    });
    T.flightHold(false);
    for (let i = 0; i < 6; i++) T.stepFrame(0.016);
    return {
      marks: tr.impacts.count(),
      camY: +(T.camera.position.y - tg.floorY).toFixed(3),
      ceilVisible: tg.ceiling.root.visible
    };
  })()`);
  console.log('Impact setup check:', check);
  assert.equal(check.marks, 5);
  assert.equal(check.ceilVisible, true);
  assert(check.camY > 4.7, `Expected camY > 4.7, got ${check.camY}`);
  await pause(800);
  const fQa = path.join(ROOT, 'qa/2026-11-11-AG-311/shots/closeup-ceiling-bullet-impacts.png');
  const fRev = path.join(ROOT, 'review/AG-311/shots/closeup-ceiling-bullet-impacts.png');
  await page.screenshot(fQa);
  const buf = fs.readFileSync(fQa);
  fs.writeFileSync(fRev, buf);
  const sha = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
  for (const p of ['qa/2026-11-11-AG-311/gp20108-5080-summary.json', 'review/AG-311/gp20108-5080-summary.json']) {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
    j.shots['closeup-ceiling-bullet-impacts.png'] = { file: 'closeup-ceiling-bullet-impacts.png', bytes: buf.length, sha };
    j.ballistics.impactShot = { file: 'closeup-ceiling-bullet-impacts.png', bytes: buf.length, sha };
    j.ballistics.baffleHasOwnSolid = false;
    for (const f of j.j128Audit.findings) {
      if ('baffleHasOwnSolid' in f) f.baffleHasOwnSolid = false;
    }
    fs.writeFileSync(path.join(ROOT, p), JSON.stringify(j, null, 2) + '\n');
  }
  console.log('Retook closeup-ceiling-bullet-impacts.png:', buf.length, sha);
} finally {
  await browser.close();
  await server.close();
}
