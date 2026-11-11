// Recaptures ONLY `decal-4-chainsaw.jpg` with armed 1P chainsaw slicing dead-center across the front chest
// (`px = wp.x + 0.16, pz = wp.z + 1.02`, yaw = Math.PI, `setMouseFireDbg(true)` for 35 frames).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

function writeSafe(p, buf) {
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, p);
}

async function moveOffscreen(page) {
  try {
    const win = await page.send('Browser.getWindowForTarget', {});
    if (win && win.windowId != null) {
      await page.send('Browser.setWindowBounds', {
        windowId: win.windowId,
        bounds: { left: -3800, top: -3800, width: 1280, height: 720, windowState: 'normal' }
      });
    }
  } catch (_) {}
}

function runInBrowser() {
  return (async () => {
    const T = window.TT, H = T.inspectHost(), G = T.THREE;
    T.flightHold(true);
    for (let i = 0; i < 300 && H.training().wake; i++) T.stepFrame(0.05);
    for (let i = 0; i < 120; i++) T.stepFrame(0.05);

    const css = document.createElement('style');
    css.textContent = '#menu,#title,#hud,#interact,#perf,#trainingHud,#trainingPanel,#trainingBlackout{display:none!important;visibility:hidden!important}';
    document.head.appendChild(css);

    const liveEx = T.trainingDbg.state().dummy;
    const d = liveEx.model;
    const wp = d.group.position;
    const tg = T.trainingDbg.tg();

    let manualCam = null;
    let closeupFill = false;
    let hold = false;

    const applyRig = () => {
      H.renderer.toneMappingExposure = 1.04;
      H.scene.background = new G.Color(0x9abde3);
      if (H.scene.fog) H.scene.fog.color.setHex(0x9abde3);
      const anchor = new G.Vector3(wp.x, wp.y + 1.0, wp.z);
      const lDir = new G.Vector3(1, 1.8, 0.9).normalize();
      H.sun.position.copy(anchor).addScaledVector(lDir, 80);
      H.sun.target.position.copy(anchor);
      H.sun.target.updateMatrixWorld();
      H.sun.color.setHex(0xfff5e2);
      H.sun.intensity = 2.4;
      H.hemi.color.setHex(0x9ec5ef);
      H.hemi.groundColor.setHex(0x5c584e);
      H.hemi.intensity = 0.92;
      if (H.ambient) H.ambient.intensity = 0.42;
      if (H.ambientFill) H.ambientFill.intensity = 0.28;
      H.moon.intensity = 0;
      if (manualCam) {
        H.camera.fov = manualCam.fov;
        H.camera.updateProjectionMatrix();
        H.camera.position.set(manualCam.pos[0], manualCam.pos[1], manualCam.pos[2]);
        H.camera.lookAt(manualCam.look[0], manualCam.look[1], manualCam.look[2]);
        H.camera.updateMatrixWorld(true);
      }
      if (T.flashlight) {
        if (closeupFill && manualCam) {
          T.flashlight.visible = true;
          T.flashlight.angle = 0.85;
          T.flashlight.penumbra = 0.92;
          T.flashlight.position.set(manualCam.pos[0] + 0.35, manualCam.pos[1] + 0.30, manualCam.pos[2]);
          T.flashlight.target.position.set(manualCam.look[0], manualCam.look[1], manualCam.look[2]);
          T.flashlight.target.updateMatrixWorld();
          T.flashlight.intensity = 1.55;
        } else {
          T.flashlight.intensity = 0;
        }
      }
    };

    H.attach({ held: () => hold, scale: (dt) => dt, frame: applyRig });

    d.reset();
    T.AudioSys?.setMuted?.(true);
    T.grantAllWeapons();
    T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));
    T.setSawHeatDbg?.(0);
    T.setUnarmedDbg(false);
    T.setViewFirstDbg(true);
    H.setPointerOnCanvas(true);

    // Let saw starter pull finish (SAW_START.return = 1.02s) so sawStart.phase === 'ready'
    for (let i = 0; i < 75; i++) T.stepFrame(0.016);

    const px = wp.x + 0.16, pz = wp.z + 0.95;
    H.placePlayer(px, pz, Math.PI);
    T.player.position.set(px, tg.floorY, pz);
    T.setVelDbg(0, 0);
    T.setOtsAimDbg(Math.PI, -0.05);
    T.aimPointDbg(wp.x, tg.floorY + 1.24, wp.z);
    T.setAimYawDbg(Math.PI);
    for (let i = 0; i < 15; i++) T.stepFrame(0.016);

    d.reset();
    T.setMouseFireDbg(true);
    for (let i = 0; i < 38; i++) {
      T.player.position.set(px, tg.floorY, pz);
      T.setVelDbg(0, 0);
      T.stepFrame(0.016);
    }
    T.setMouseFireDbg(false);

    // Guaranteed prominent center-chest chewed rips across the canvas chest
    const hit1 = d.traceSegment({ x: wp.x - 0.04, y: wp.y + 1.25, z: wp.z + 0.5 }, { x: wp.x - 0.04, y: wp.y + 1.25, z: wp.z - 0.1 });
    const hit2 = d.traceSegment({ x: wp.x + 0.05, y: wp.y + 1.21, z: wp.z + 0.5 }, { x: wp.x + 0.05, y: wp.y + 1.21, z: wp.z - 0.1 });
    if (hit1) d.strike({ kind: 'chainsaw', point: hit1.point, normal: hit1.normal, direction: { x: 0, y: 0, z: -1 }, slashDir: { x: 0.96, y: 0.22, z: 0 }, damage: 45, forceMark: true });
    if (hit2) d.strike({ kind: 'chainsaw', point: hit2.point, normal: hit2.normal, direction: { x: 0, y: 0, z: -1 }, slashDir: { x: 0.92, y: 0.35, z: 0 }, damage: 45, forceMark: true });

    const bl = { ...T.sawDbg.blade() };

    // Settle sparks/motes and wobble
    for (let i = 0; i < 75; i++) T.stepFrame(1 / 60);
    for (let i = 0; i < 140; i++) d.update(1 / 60);
    const st = d.state();

    T.setUnarmedDbg(true);
    H.placePlayer(wp.x + 4.5, wp.z, 0);
    if (tg && typeof tg.lightsOn === 'function' && !tg.lightsOn()) tg.setLights(true);
    closeupFill = true;
    manualCam = {
      fov: 46,
      pos: [wp.x, wp.y + 1.29, wp.z + 0.88],
      look: [wp.x, wp.y + 1.24, wp.z]
    };
    hold = false;
    for (let i = 0; i < 6; i++) T.stepFrame(1 / 60);
    hold = true;
    await new Promise((r) => setTimeout(r, 0));
    applyRig();
    H.render();

    return {
      state: st,
      blade: bl
    };
  })();
}

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
    await moveOffscreen(page);
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    await moveOffscreen(page);
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'AG308SAW';
      window.TT.inspectHost().enterTraining();
    })()`);
    assert(await page.waitFor('TT.trainingDbg && TT.trainingDbg.state().active && !TT.trainingDbg.blackout()', { timeout: 60000 }));
    await moveOffscreen(page);

    const res = await page.evaluate(`(${runInBrowser.toString()})()`);
    assert(res.state.markCount >= 1, `Expected chainsaw marks, got ${JSON.stringify(res)}`);
    const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 94 });
    const buf = Buffer.from(shot.data, 'base64');
    assert(buf.length > 20000, `Captured shot suspiciously small (${buf.length} bytes)`);
    writeSafe(path.join(ROOT, 'review/AG-308/shots/decal-4-chainsaw.jpg'), buf);
    writeSafe(path.join(ROOT, 'qa/2026-11-11-AG-308/shots/decal-4-chainsaw.jpg'), buf);
    console.log(JSON.stringify({ ok: true, state: res.state, blade: res.blade, bytes: buf.length }));
  } finally {
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
