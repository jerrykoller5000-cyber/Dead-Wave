import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const ROOT = process.cwd();
const OUT_ROOT = path.join(ROOT, 'qa', 'AG-403');
fs.mkdirSync(OUT_ROOT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const metrics = {
  at: new Date().toISOString(),
  renderer: null,
  viewport: [1920, 1080],
  proportions: null,
  shots: {},
  errors: [],
};

function installPlayerHelpers() {
  const T = window.TT;
  const THREE = T.THREE;

  function hideHud() {
    for (const id of ['hud', 'topBar', 'ammoHud', 'crosshair', 'reticle', 'trainingHud', 'waveBanner', 'bigBanner', 'placeBanner', 'minimap', 'tips', 'controlsHint', 'fpsBox']) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }
    document.querySelectorAll('.hud, .banner, .training-hud').forEach((el) => { el.style.display = 'none'; });
  }

  function measureMarine() {
    const m = T.getMarine ? T.getMarine() : T.marine;
    m.updateMatrixWorld(true);
    const bodyBox = new THREE.Box3();
    const skipRe = /laser|beam|cone|light|flash|muzzle|sight|ray|arc|proxy|shadow/i;
    m.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      for (let q = o; q && q !== m.parent; q = q.parent) {
        if (!q.visible) return;
        if (q.name && skipRe.test(q.name)) return;
      }
      const b = new THREE.Box3().setFromObject(o);
      if (b.isEmpty()) return;
      const sz = b.getSize(new THREE.Vector3());
      // Ignore oversized non-body FX meshes (>2.4m in any axis)
      if (sz.x > 2.4 || sz.y > 2.4 || sz.z > 2.4) return;
      bodyBox.union(b);
    });
    const head = m.userData?.headG ? new THREE.Box3().setFromObject(m.userData.headG) : null;
    const size = bodyBox.isEmpty() ? new THREE.Vector3() : bodyBox.getSize(new THREE.Vector3());
    const hSize = head ? head.getSize(new THREE.Vector3()) : null;
    return {
      weapon: T.getCurrentWeapon ? T.getCurrentWeapon() : null,
      unarmed: T.isUnarmed ? T.isUnarmed() : null,
      bodyHeight: +size.y.toFixed(3),
      bodyWidth: +size.x.toFixed(3),
      bodyDepth: +size.z.toFixed(3),
      headSize: hSize ? hSize.toArray().map((n) => +n.toFixed(3)) : null,
      headToHeightRatio: hSize && size.y > 0 ? +(hSize.y / size.y).toFixed(3) : null,
      headWidthToBodyWidth: hSize && size.x > 0 ? +(hSize.x / size.x).toFixed(3) : null,
      playerPos: T.player.position.toArray().map((n) => +n.toFixed(3)),
      marineYaw: +(m.rotation ? m.rotation.y : 0).toFixed(3),
    };
  }

  function framePlayer({ yawDeg = 0, pitchDeg = 5, dist = 3.25, lookY = 0.94, fov = 32, sideShift = 0 } = {}) {
    const m = T.getMarine ? T.getMarine() : T.marine;
    m.updateMatrixWorld(true);
    const base = T.player.position;
    const baseYaw = m.rotation ? m.rotation.y : 0;
    const yaw = baseYaw + (yawDeg * Math.PI) / 180;
    const pitch = (pitchDeg * Math.PI) / 180;
    const tx = base.x;
    const ty = base.y + lookY;
    const tz = base.z;
    const horiz = dist * Math.cos(pitch);
    // Perpendicular right offset for over-the-shoulder views
    const rx = Math.cos(yaw) * sideShift;
    const rz = -Math.sin(yaw) * sideShift;
    const cam = {
      x: tx + Math.sin(yaw) * horiz + rx,
      y: ty + Math.sin(pitch) * dist,
      z: tz + Math.cos(yaw) * horiz + rz,
      tx: tx + rx * 0.4,
      ty,
      tz: tz + rz * 0.4,
      fov,
    };
    return { cam };
  }

  function setWeaponByKey(key) {
    if (key === 'unarmed') {
      if (T.isUnarmed && !T.isUnarmed() && T.toggleHolster) T.toggleHolster();
      return;
    }
    if (T.isUnarmed && T.isUnarmed() && T.toggleHolster) T.toggleHolster();
    if (key !== 'pistol' && T.grantWeaponDbg) {
      try { T.grantWeaponDbg(key); } catch {}
    }
    const idx = T.WEAPON_ORDER ? T.WEAPON_ORDER.indexOf(key) : -1;
    if (idx >= 0) T.setWeapon(idx);
  }

  function setupTrainingPose(weaponKey) {
    T.flightHold(true);
    T.setViewFirstDbg(false);
    const tg = T.trainingDbg.tg();
    tg.setLights(true);
    const px = -26, py = tg.floorY, pz = -632;
    T.player.position.set(px, py, pz);
    T.setVelDbg(0, 0);
    T.setOtsAimDbg(0, 0);
    T.pinAimDbg(() => {
      T.aimTarget.set(px, py + 1.25, pz + 30);
      T.setAimYawDbg(0);
    });
    setWeaponByKey(weaponKey);
    T.setHp(99999);
    hideHud();
    for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
    return measureMarine();
  }

  function setCamAndRender(cam) {
    T.flightHold(true);
    T.setShotView(cam);
    T.stepFrame(0);
    return cam;
  }

  window.AG403 = {
    hideHud,
    measureMarine,
    framePlayer,
    setWeaponByKey,
    setupTrainingPose,
    setCamAndRender,
  };
  return true;
}

async function capturePng(page, fileAbs, lastHashRef) {
  await page.evaluate('TT.stepFrame(0);');
  await sleep(70);
  await page.evaluate('TT.stepFrame(0);');
  await sleep(60);
  const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const png = Buffer.from(res.data, 'base64');
  assert(png.length > 5000, `PNG too small: ${fileAbs}`);
  const h = crypto.createHash('sha256').update(png).digest('hex');
  if (lastHashRef.hash && lastHashRef.hash === h) {
    await page.evaluate('TT.stepFrame(0);');
    await sleep(120);
    const res2 = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const png2 = Buffer.from(res2.data, 'base64');
    const h2 = crypto.createHash('sha256').update(png2).digest('hex');
    assert.notEqual(h2, lastHashRef.hash, `Stale frame: ${fileAbs}`);
    lastHashRef.hash = h2;
    fs.writeFileSync(fileAbs, png2);
    const th = await page.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 84,
      captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 640 / 1920 },
    });
    return { bytes: png2.length, hash: h2, thumb: th.data };
  }
  lastHashRef.hash = h;
  fs.writeFileSync(fileAbs, png);
  const th = await page.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 84,
    captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 640 / 1920 },
  });
  return { bytes: png.length, hash: h, thumb: th.data };
}

async function run() {
  const engine = new Engine({ training: true, onscreen: true, size: '1920x1080', warm: 'none' });
  const lastHashRef = { hash: null };
  const thumbs = [];

  try {
    console.log('[AG-403] Opening native WebGPU 1920x1080 Training session...');
    await engine.open();
    const page = engine.page;
    const backend = await page.evaluate('TT.getRendererBackend()');
    assert.equal(backend, 'WebGPU', `Expected WebGPU, got ${backend}`);
    metrics.renderer = { backend, detail: engine.renderer };
    await page.evaluate(`(${installPlayerHelpers.toString()})()`);

    const take = async (id, label, camCode) => {
      if (camCode) {
        const framed = await page.evaluate(camCode);
        await page.evaluate(`AG403.setCamAndRender(${JSON.stringify(framed.cam)})`);
      } else {
        await page.evaluate('TT.flightHold(true); TT.setShotView(null); TT.stepFrame(0);');
      }
      const fileAbs = path.join(OUT_ROOT, `${id}.png`);
      const cap = await capturePng(page, fileAbs, lastHashRef);
      const rel = path.relative(ROOT, fileAbs).split(path.sep).join('/');
      thumbs.push({ data: cap.thumb, label });
      metrics.shots[id] = { file: rel, bytes: cap.bytes };
      console.log(`  [AG-403] ${id} -> ${rel} (${cap.bytes} B)`);
    };

    // 1-3: Full-body M4 front / side / back centered on player.position
    const m4Meas = await page.evaluate(`AG403.setupTrainingPose('m4')`);
    console.log('[AG-403] M4 pose:', JSON.stringify(m4Meas));
    metrics.proportions = { m4: m4Meas };

    await take('01-front-m4', '01 Front (M4, full body)', `AG403.framePlayer({ yawDeg: 0, pitchDeg: 5, dist: 3.15, lookY: 0.94, fov: 34 })`);
    await take('02-side-right-m4', '02 Right side (M4, full body)', `AG403.framePlayer({ yawDeg: -90, pitchDeg: 5, dist: 3.15, lookY: 0.94, fov: 34 })`);
    await take('03-back-m4', '03 Back (M4, full body)', `AG403.framePlayer({ yawDeg: 180, pitchDeg: 6, dist: 3.15, lookY: 0.94, fov: 34 })`);

    // 4-6: Unarmed front + tight head/collar/shoulders front & back closeups
    const unMeas = await page.evaluate(`AG403.setupTrainingPose('unarmed')`);
    console.log('[AG-403] Unarmed pose:', JSON.stringify(unMeas));
    metrics.proportions.unarmed = unMeas;

    await take('04-front-unarmed', '04 Front (unarmed, proportions)', `AG403.framePlayer({ yawDeg: 0, pitchDeg: 5, dist: 3.05, lookY: 0.94, fov: 34 })`);
    await take('05-closeup-head-collar-front', '05 Closeup: head/collar/shoulders front 3/4', `AG403.framePlayer({ yawDeg: 24, pitchDeg: 3, dist: 1.38, lookY: 1.48, fov: 32 })`);
    await take('06-closeup-head-collar-back', '06 Closeup: head/collar/nape rear 3/4', `AG403.framePlayer({ yawDeg: 152, pitchDeg: 5, dist: 1.38, lookY: 1.48, fov: 32 })`);

    // 7: In-play 3P close follow (Training walk, M4, rear-right 3/4)
    await page.evaluate(`(() => {
      const T = window.TT;
      AG403.setupTrainingPose('m4');
      T.setVelDbg(0, 3.2);
      for (let i = 0; i < 22; i++) T.stepFrame(1 / 60);
      return true;
    })()`);
    await take('07-inplay-3p-training-follow', '07 In-play 3P follow (Training walk, M4)', `AG403.framePlayer({ yawDeg: 158, pitchDeg: 14, dist: 4.1, lookY: 1.15, fov: 48, sideShift: 0.45 })`);

    // 8-9: Switch to Match mode for real outdoor in-play 3P views
    console.log('[AG-403] Switching to Match mode for outdoor in-play 3P baseline...');
    engine.opt.training = false;
    engine.opt.match = true;
    await engine.load();
    await page.evaluate(`(${installPlayerHelpers.toString()})()`);

    // 8: True default live 3P gameplay camera outdoors in Day near HQ
    await page.evaluate(`(() => {
      const T = window.TT;
      T.flightHold(true);
      T.setViewFirstDbg(false);
      T.setWorldTime(0.5);
      T.setHp(99999);
      if (T.grantWeaponDbg) {
        try {
          T.grantWeaponDbg('m4');
          const idx = T.WEAPON_ORDER ? T.WEAPON_ORDER.indexOf('m4') : -1;
          if (idx >= 0) T.setWeapon(idx);
        } catch {}
      }
      const px = 4, pz = 14;
      T.player.position.set(px, T.sampleHeight(px, pz), pz);
      T.setAimYawDbg(Math.PI * 0.85);
      T.setShotView(null);
      AG403.hideHud();
      for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
      return true;
    })()`);
    await take('08-inplay-3p-day-default-cam', '08 In-play default 3P camera (Day outside HQ)', null);

    // 9: Outdoor combat scale comparison (Player vs Shambler in-play 3P follow at dusk/night)
    await page.evaluate(`(() => {
      const T = window.TT;
      T.flightHold(true);
      T.setViewFirstDbg(false);
      T.devJumpToNight(1, true);
      T.setHp(99999);
      if (T.flashlight && !T.flashlight.visible && T.toggleFlashlightDbg) T.toggleFlashlightDbg();
      const px = 4, pz = 14;
      T.player.position.set(px, T.sampleHeight(px, pz), pz);
      T.pinAimDbg(() => { T.aimTarget.set(px, T.sampleHeight(px, pz) + 1.2, pz - 15); T.setAimYawDbg(Math.PI); });
      T.clearZombies();
      T.spawnZombie(px - 0.6, pz - 5.0, 'shambler', true, true);
      AG403.hideHud();
      for (let i = 0; i < 40; i++) T.stepFrame(1 / 60);
      T.setWorldTime(0.76);
      T.stepFrame(0);
      return true;
    })()`);
    await take('09-inplay-3p-combat-scale', '09 In-play 3P combat scale vs Shambler (dusk)', `AG403.framePlayer({ yawDeg: 156, pitchDeg: 15, dist: 4.8, lookY: 1.15, fov: 48, sideShift: 0.65 })`);

    const sheetRel = await engine.sheet(thumbs, { cols: 3, tile: 640, sheetFile: 'qa/AG-403/player-baseline-sheet.jpg' }, []);
    console.log(`[AG-403] Sheet -> ${sheetRel}`);
    metrics.sheet = sheetRel;

    if (page.errors && page.errors.length) metrics.errors = page.errors.slice();
  } catch (err) {
    console.error('[AG-403] ERROR:', err?.stack || err);
    metrics.fatalError = String(err?.stack || err);
    process.exitCode = 1;
  } finally {
    await engine.close();
    fs.writeFileSync(path.join(OUT_ROOT, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n', 'utf8');
    console.log('[AG-403] Done; closed browser and wrote qa/AG-403/metrics.json');
  }
}

run();
