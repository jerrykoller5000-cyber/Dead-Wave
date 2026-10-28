import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Engine } from '../../tools/camera.mjs';

const out = 'qa/2026-10-26-AG-135';
fs.mkdirSync(out, { recursive: true });

async function makeSheet(page, tiles, outPath, cols = 4, tw = 480) {
  const payload = tiles.map((t) => ({
    label: t.label,
    data: fs.readFileSync(t.file).toString('base64')
  }));
  const jpgB64 = await page.evaluate(`(async (items, cols, tw) => {
    const load = (d) => new Promise((r) => {
      const i = new Image();
      i.onload = () => r(i);
      i.onerror = () => r(null);
      i.src = 'data:image/png;base64,' + d;
    });
    const imgs = await Promise.all(items.map((x) => load(x.data)));
    const first = imgs.find(Boolean);
    const th = first ? Math.round(tw * first.height / first.width) : Math.round(tw * 9 / 16);
    const rows = Math.ceil(items.length / cols);
    const c = document.createElement('canvas');
    c.width = cols * tw;
    c.height = rows * th;
    const g = c.getContext('2d');
    g.fillStyle = '#0d0f12';
    g.fillRect(0, 0, c.width, c.height);
    for (let idx = 0; idx < items.length; idx++) {
      const col = idx % cols, row = Math.floor(idx / cols);
      const x = col * tw, y = row * th;
      const im = imgs[idx];
      if (im) g.drawImage(im, x, y, tw, th);
      g.fillStyle = 'rgba(0,0,0,0.72)';
      g.fillRect(x, y + th - 26, tw, 26);
      g.fillStyle = '#f2ead7';
      g.font = 'bold 13px Consolas, monospace';
      g.fillText(items[idx].label, x + 8, y + th - 8);
    }
    return c.toDataURL('image/jpeg', 0.92).split(',')[1];
  })(${JSON.stringify(payload)}, ${cols}, ${tw})`, 120000);
  fs.writeFileSync(outPath, Buffer.from(jpgB64, 'base64'));
}

const e = new Engine({ match: true, warm: 'none', size: [1280, 720] });

try {
  await e.open();

  await e.page.evaluate(`(async () => {
    const T = window.TT;
    T.runDevCommand('godmode');
    T.clearZombies();
    T.weather.raining = false;
    T.weather.intensity = 0;
    T.setWorldTime(0.42);
    const D = T.trapperDbg;
    for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
    D.update(0.05);
  })()`);

  const report = {
    task: 'AG-135',
    renderer: await e.page.evaluate(`window.TT.getGpuString ? window.TT.getGpuString() : 'WebGPU'`),
    cellarChecks: {},
    stairWalk: {},
    overheadZombies: {}
  };

  const lights = [
    { id: 'noon', t: 0.42, rain: false },
    { id: 'overcast', t: 0.42, rain: true },
    { id: 'dusk', t: 0.76, rain: false },
    { id: 'night', t: 0.04, rain: false }
  ];

  // 1. Capture Shut vs Open Cellar Doors across 4 lights (noon, overcast, dusk, night):
  const doorSheetTiles = [];
  for (const state of ['shut', 'open']) {
    for (const L of lights) {
      await e.page.evaluate(`(() => {
        const T = window.TT, D = T.trapperDbg, R = D.trapper;
        T.clearZombies();
        if (T.setViewFirstDbg) T.setViewFirstDbg(false);
        T.weather.raining = ${L.rain};
        T.weather.intensity = ${L.rain ? 0.65 : 0};
        T.setWorldTime(${L.t});
        if ('${state}' === 'shut') {
          D.path.reset();
          D.syncCellar(false);
        } else {
          D.path.unlock();
          D.syncCellar(true);
        }
        R.setCutaway(false);
        const mw = R.toWorld(-0.85, 1.55);
        T.player.position.set(mw.x, R.cy0 + 0.02, mw.z);
        T.player.rotation.y = R.group.rotation.y + Math.PI - 0.35;
        const camW = R.toWorld(0.18, 1.65);
        const lookW = R.toWorld(0.0, -1.25);
        T.setShotView({ x: camW.x, y: R.cy0 + 1.58, z: camW.z, tx: lookW.x, ty: R.cy0 - 0.18, tz: lookW.z, fov: 46 });
        for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
      })()`);
      const file = `${out}/cellar-${state}-${L.id}.png`;
      await e.page.screenshot(file);
      doorSheetTiles.push({ label: `cellar-${state} (${L.id})`, file });
    }
  }
  await makeSheet(e.page, doorSheetTiles, `${out}/cellar-doors-4lights-sheet.jpg`, 4, 480);

  // 2. Verify physical stair walk from surface approach (lz = 1.20) down the 8-step stairwell into the cellar (lz = -3.85):
  report.stairWalk = await e.page.evaluate(`(() => {
    const T = window.TT, D = T.trapperDbg, R = D.trapper;
    T.setShotView(null);
    D.path.unlock();
    D.syncCellar(true);
    const traceDown = [];
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const lz = 1.20 + (-3.85 - 1.20) * (i / steps);
      const w = R.toWorld(0, lz);
      const prevY = i === 0 ? R.cy0 : traceDown[i - 1].y;
      T.player.position.set(w.x, prevY + 0.25, w.z);
      for (let k = 0; k < 8; k++) T.stepFrame(1 / 60);
      const p = T.player.position;
      const loc = R.toLocal(p.x, p.z);
      traceDown.push({
        targetLz: +lz.toFixed(2),
        actualLx: +loc.x.toFixed(2),
        actualLz: +loc.z.toFixed(2),
        y: +p.y.toFixed(2),
        relY: +(p.y - R.cy0).toFixed(2),
        inCellar: D.inCellar(p.x, p.y, p.z)
      });
    }
    const bottomSample = traceDown[traceDown.length - 1];
    const midStairSample = traceDown[Math.floor(steps * 0.45)];
    return {
      startRelY: traceDown[0].relY,
      midStairRelY: midStairSample.relY,
      bottomRelY: bottomSample.relY,
      bottomActualLz: bottomSample.actualLz,
      bottomInCellar: bottomSample.inCellar,
      expectedFloorRelY: D.TRAPPER.CELLAR_FLOOR_Y,
      traceCount: traceDown.length
    };
  })()`);

  // 3. Capture marine walking down the 8-step stairwell (noon):
  await e.page.evaluate(`(() => {
    const T = window.TT, D = T.trapperDbg, R = D.trapper;
    T.clearZombies();
    if (T.setViewFirstDbg) T.setViewFirstDbg(false);
    T.weather.raining = false;
    T.weather.intensity = 0;
    T.setWorldTime(0.42);
    D.path.unlock();
    D.syncCellar(true);
    R.setCutaway(false);
    const stW = R.toWorld(0, -1.05);
    const stY = R.cy0 - 1.02;
    T.player.position.set(stW.x, stY, stW.z);
    T.player.rotation.y = R.group.rotation.y + Math.PI;
    const camW = R.toWorld(0.45, 0.85);
    const lookW = R.toWorld(-0.05, -1.65);
    T.setShotView({ x: camW.x, y: R.cy0 + 1.45, z: camW.z, tx: lookW.x, ty: R.cy0 - 1.05, tz: lookW.z, fov: 46 });
    for (let i = 0; i < 8; i++) T.stepFrame(1 / 60);
    R.setCutaway(false);
    T.renderFrame();
  })()`);
  const stairShot = `${out}/cellar-stairs-descent-noon.png`;
  await e.page.screenshot(stairShot);

  // 4. Capture 3P Cutaway Interior across 4 lights (noon, overcast, dusk, night):
  const interiorTiles = [{ label: 'stairs-descent (noon)', file: stairShot }];
  for (const L of lights) {
    await e.page.evaluate(`(() => {
      const T = window.TT, D = T.trapperDbg, R = D.trapper;
      T.clearZombies();
      if (T.setViewFirstDbg) T.setViewFirstDbg(false);
      T.weather.raining = ${L.rain};
      T.weather.intensity = ${L.rain ? 0.65 : 0};
      T.setWorldTime(${L.t});
      T.runDevCommand('site trapper cellar');
      const camW = R.toWorld(0.95, -2.35);
      const lookW = R.toWorld(-0.25, -4.05);
      T.setShotView({
        x: camW.x, y: R.cy0 + 0.32, z: camW.z,
        tx: lookW.x, ty: R.cy0 + D.TRAPPER.CELLAR_FLOOR_Y + 0.68, tz: lookW.z,
        fov: 54
      });
      for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
      R.setCutaway(true);
      T.renderFrame();
    })()`);
    const file = `${out}/cellar-interior-3p-${L.id}.png`;
    await e.page.screenshot(file);
    interiorTiles.push({ label: `interior-3p (${L.id})`, file });
  }

  // 5. Capture 1P Enclosed Interior looking across the riveted iron walls, bunk, lantern, shelves & horseshoes:
  await e.page.evaluate(`(() => {
    const T = window.TT, D = T.trapperDbg, R = D.trapper;
    T.clearZombies();
    T.weather.raining = false;
    T.weather.intensity = 0;
    T.setWorldTime(0.42);
    if (T.setViewFirstDbg) T.setViewFirstDbg(true);
    T.runDevCommand('site trapper cellar');
    const eyeW = R.toWorld(0.32, -2.55);
    const lookW = R.toWorld(-0.35, -4.65);
    T.setShotView({
      x: eyeW.x, y: R.cy0 + D.TRAPPER.CELLAR_FLOOR_Y + 1.52, z: eyeW.z,
      tx: lookW.x, ty: R.cy0 + D.TRAPPER.CELLAR_FLOOR_Y + 0.95, tz: lookW.z,
      fov: 56
    });
    for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
    R.setCutaway(false);
    T.renderFrame();
  })()`);
  const fpWallsFile = `${out}/cellar-interior-1p-walls-noon.png`;
  await e.page.screenshot(fpWallsFile);
  interiorTiles.push({ label: 'interior-1p-walls (noon)', file: fpWallsFile });

  // 6. Capture the signature story-chain.md §4 Day 8 beat:
  //    "standing in the cellar while the dead walk past overhead" (1P looking up through the iron bar grate skylight + 3P dusk cutaway):
  report.overheadZombies = await e.page.evaluate(`(() => {
    const T = window.TT, D = T.trapperDbg, R = D.trapper;
    T.clearZombies();
    T.weather.raining = false;
    T.weather.intensity = 0;
    T.setWorldTime(0.42);
    if (T.setViewFirstDbg) T.setViewFirstDbg(true);
    T.runDevCommand('site trapper cellar');
    const spots = [[-0.28, -3.35], [0.22, -3.55], [-0.05, -3.82]];
    const roofY = R.cy0 + D.TRAPPER.CELLAR_ROOF_Y;
    for (let i = 0; i < spots.length; i++) {
      const w = R.toWorld(spots[i][0], spots[i][1]);
      const z = T.spawnZombie(w.x, w.z, null, true, true);
      if (z && z.mesh) {
        z.x = w.x; z.z = w.z;
        z.mesh.position.set(w.x, roofY, w.z);
      }
    }
    for (let k = 0; k < 4; k++) D.update(0.03);
    for (let i = 0; i < T.zombies.length; i++) {
      const z = T.zombies[i];
      const w = R.toWorld(spots[i % spots.length][0], spots[i % spots.length][1]);
      if (z && z.mesh) {
        z.x = w.x; z.z = w.z;
        z.mesh.position.set(w.x, roofY, w.z);
        z.mesh.updateMatrixWorld(true);
      }
    }
    const eyeW = R.toWorld(0.15, -4.45);
    const lookW = R.toWorld(-0.05, -3.45);
    T.setShotView({
      x: eyeW.x, y: R.cy0 + D.TRAPPER.CELLAR_FLOOR_Y + 1.38, z: eyeW.z,
      tx: lookW.x, ty: R.cy0 + 0.55, tz: lookW.z,
      fov: 58
    });
    R.setCutaway(false);
    T.renderFrame();
    return {
      zombieCount: T.zombies.length,
      zombieYs: T.zombies.map((z) => +(z.mesh.position.y - R.cy0).toFixed(2)),
      playerRelY: +(T.player.position.y - R.cy0).toFixed(2),
      roofCapVisibleIn1P: R.cellarRoofCap.visible
    };
  })()`);
  const fpGrateZombiesFile = `${out}/cellar-interior-1p-grate-zombies-noon.png`;
  await e.page.screenshot(fpGrateZombiesFile);
  interiorTiles.push({ label: '1p-grate-dead-overhead', file: fpGrateZombiesFile });

  // Also capture 3P dusk view showing both the marine in the iron-lined cellar below and the dead walking past on the grate above:
  await e.page.evaluate(`(() => {
    const T = window.TT, D = T.trapperDbg, R = D.trapper;
    T.setWorldTime(0.76);
    if (T.setViewFirstDbg) T.setViewFirstDbg(false);
    const spots = [[-0.28, -3.35], [0.24, -3.55], [-0.05, -3.82]];
    const roofY = R.cy0 + D.TRAPPER.CELLAR_ROOF_Y;
    for (let i = 0; i < T.zombies.length; i++) {
      const z = T.zombies[i];
      const w = R.toWorld(spots[i % spots.length][0], spots[i % spots.length][1]);
      if (z && z.mesh) {
        z.x = w.x; z.z = w.z;
        z.mesh.position.set(w.x, roofY, w.z);
        z.mesh.updateMatrixWorld(true);
      }
    }
    const camW = R.toWorld(0.98, -2.25);
    const lookW = R.toWorld(-0.15, -3.75);
    T.setShotView({
      x: camW.x, y: R.cy0 + 0.48, z: camW.z,
      tx: lookW.x, ty: R.cy0 - 1.15, tz: lookW.z,
      fov: 54
    });
    for (let k = 0; k < 4; k++) T.stepFrame(1 / 60);
    for (let i = 0; i < T.zombies.length; i++) {
      const z = T.zombies[i];
      const w = R.toWorld(spots[i % spots.length][0], spots[i % spots.length][1]);
      if (z && z.mesh) {
        z.x = w.x; z.z = w.z;
        z.mesh.position.set(w.x, roofY, w.z);
        z.mesh.updateMatrixWorld(true);
      }
    }
    R.setCutaway(true);
    T.renderFrame();
  })()`);
  const tpOverheadFile = `${out}/cellar-interior-3p-zombies-overhead-dusk.png`;
  await e.page.screenshot(tpOverheadFile);
  await e.page.evaluate(`(() => { const T = window.TT; T.clearZombies(); T.setShotView(null); })()`);
  interiorTiles.push({ label: '3p-dead-overhead (dusk)', file: tpOverheadFile });

  await makeSheet(e.page, interiorTiles, `${out}/cellar-interior-sheet.jpg`, 4, 480);

  // 7. Collect draw call & state summary:
  report.cellarChecks = await e.page.evaluate(`(() => {
    const T = window.TT, D = T.trapperDbg, R = D.trapper;
    const cs = D.cellarSpot();
    D.path.reset(); D.syncCellar(false);
    const shutState = {
      doorsOpen: D.doorsOpen(),
      doorLRotZ: +R.doorL.rotation.z.toFixed(3),
      doorRRotZ: +R.doorR.rotation.z.toFixed(3),
      doorBarVisible: R.doorBar.visible,
      hasDoorCollider: T.worldSolids.includes(R.doorCollider)
    };
    D.path.unlock(); D.syncCellar(true);
    const openState = {
      doorsOpen: D.doorsOpen(),
      doorLRotZ: +R.doorL.rotation.z.toFixed(3),
      doorRRotZ: +R.doorR.rotation.z.toFixed(3),
      doorBarVisible: R.doorBar.visible,
      hasDoorCollider: T.worldSolids.includes(R.doorCollider)
    };
    return {
      shutState,
      openState,
      cellarSpot: cs ? { x: +cs.x.toFixed(2), y: +cs.y.toFixed(2), z: +cs.z.toFixed(2), yaw: +cs.yaw.toFixed(2) } : null,
      cellarSpotInCellar: cs ? D.inCellar(cs.x, cs.y, cs.z) : false,
      groupDraws: T.drawsOf(R.group).length
    };
  })()`);

  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await e.close();
}

execFileSync(
  process.execPath,
  ['tools/tests/run-all.mjs', '--jobs', '1', '--agent', 'antigravity', '--task', 'AG-135', 't268', 't52', 't55', 't167', 't292', 't215'],
  { stdio: 'inherit', env: process.env }
);
