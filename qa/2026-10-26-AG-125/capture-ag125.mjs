import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', '2026-10-26-AG-125');
fs.mkdirSync(OUT_DIR, { recursive: true });

const engine = new Engine({ training: false, warm: 'none', size: [1280, 720] });
const hqThumbs = [];
const telemetry = { hqFrames: [] };

try {
  const t0 = Date.now();
  await engine.open();
  telemetry.loadSec = engine.loadSec;
  telemetry.wallOpenSec = +((Date.now() - t0) / 1000).toFixed(2);
  telemetry.renderer = engine.renderer;

  const initInfo = await engine.page.evaluate(`(() => {
    const T = window.TT;
    T.runDevCommand('godmode');
    T.skipGrace();
    T.clearZombies();
    T.flightHold(true);
    T.setShotView(null);
    T.getGearOwned().flashlight = true;
    T.applyGearVisibility();
    if (T.house.tagWall?.userData?.tags) {
      for (const h of T.house.tagWall.userData.tags) h.visible = true;
    }
    for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
    const tb = T.historyProps?.parts?.['trailhead-board'];
    return {
      storyStations: T.house.storyStations,
      hqDutyBoardFront: T.HQ_DUTY_BOARD_FRONT,
      hqDutyBoardReach: T.HQ_DUTY_BOARD_REACH,
      hqRadioFront: T.HQ_RADIO_FRONT,
      hqRadioReach: T.HQ_RADIO_REACH,
      hqPanelFront: T.HQ_PANEL_FRONT,
      hasDutyBoardMesh: !!T.house.group.getObjectByName('hq-duty-board'),
      hasRadioSetMesh: !!T.house.group.getObjectByName('hq-radio-set'),
      trailheadPosterCountDirect: tb ? tb.children.filter((c) => c.name === 'missing-poster').length : 0,
      trailheadPosterCountTotal: tb?.userData?.posters?.length || 0,
      trailheadHikers: tb?.userData?.hikers?.map((h) => h.name) || []
    };
  })()`);
  telemetry.init = initInfo;

  const setLightMode = async (mode) => {
    await engine.page.evaluate(`(() => {
      const T = window.TT;
      if (${JSON.stringify(mode)} === 'noon') {
        T.loopMorning();
        T.weather.raining = false;
        T.weather.intensity = 0;
        T.setWorldTime(0.50);
      } else if (${JSON.stringify(mode)} === 'overcast') {
        T.loopMorning();
        T.weather.raining = true;
        T.weather.intensity = 0.85;
        T.setWorldTime(0.46);
      } else if (${JSON.stringify(mode)} === 'dusk') {
        T.loopMorning();
        T.weather.raining = false;
        T.weather.intensity = 0;
        T.setWorldTime(0.715);
      } else if (${JSON.stringify(mode)} === 'night') {
        T.loopNextNight();
        T.weather.raining = false;
        T.weather.intensity = 0;
        T.setWorldTime(0.92);
      }
      for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
    })()`);
  };

  const snapCanvas = async (id, label, row, targetThumbs, targetFrames) => {
    const res = await engine.page.evaluate(`(() => {
      const T = window.TT;
      for (let i = 0; i < 8; i++) T.stepFrame(1 / 60);
      const src = T.renderer.domElement;
      const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(src, 0, 0);
      const promptEl = document.getElementById('kioskPrompt');
      const promptVisible = !!(promptEl && promptEl.classList.contains('show') && !promptEl.classList.contains('offscreen'));
      const promptText = promptEl ? promptEl.textContent.trim() : '';
      if (promptVisible && promptText) {
        const r = promptEl.getBoundingClientRect();
        const sx = c.width / window.innerWidth, sy = c.height / window.innerHeight;
        const bx = r.left * sx, by = r.top * sy, bw = Math.max(120, r.width * sx), bh = Math.max(28, r.height * sy);
        ctx.save();
        ctx.fillStyle = 'rgba(16, 24, 14, 0.88)';
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 2;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = '#f4ecc5';
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(promptText, bx + bw / 2, by + bh / 2);
        ctx.restore();
      }
      const th = document.createElement('canvas'); th.width = 480; th.height = 270;
      th.getContext('2d').drawImage(c, 0, 0, 480, 270);
      return {
        png: c.toDataURL('image/png').split(',')[1],
        thumb: th.toDataURL('image/jpeg', 0.92).split(',')[1],
        meta: {
          id: ${JSON.stringify(id)},
          label: ${JSON.stringify(label)},
          promptText,
          promptVisible,
          renders: T.renderer.info.render
        }
      };
    })()`);
    fs.writeFileSync(path.join(OUT_DIR, `${id}.png`), Buffer.from(res.png, 'base64'));
    targetThumbs.push({ data: res.thumb, label, row });
    targetFrames.push(res.meta);
  };

  // --- Row 1: HQ Duty Board in 4 lights (noon, overcast, dusk, night) ---
  const hy = await engine.page.evaluate(`window.TT.house.group.position.y`);
  for (const [mode, label] of [
    ['noon', 'Duty Board: Noon'],
    ['overcast', 'Duty Board: Overcast'],
    ['dusk', 'Duty Board: Dusk'],
    ['night', 'Duty Board: Night + Lamp']
  ]) {
    await setLightMode(mode);
    await engine.page.evaluate(`(() => {
      const T = window.TT;
      T.setViewFirstDbg(false);
      T.player.position.set(-2.35, ${hy}, -6.35);
      T.player.rotation.y = Math.PI;
      T.setAimYawDbg(0);
      T.setShotView({
        x: -1.50, y: ${hy + 1.56}, z: -6.12,
        tx: -1.62, ty: ${hy + 1.54}, tz: -5.06,
        fov: 38
      });
    })()`);
    await snapCanvas(`duty-${mode}`, label, 1, hqThumbs, telemetry.hqFrames);
  }

  // --- Row 2: HQ Radio Set in 4 lights (noon, overcast, dusk, night) ---
  for (const [mode, label] of [
    ['noon', 'HQ Radio Set: Noon'],
    ['overcast', 'HQ Radio Set: Overcast'],
    ['dusk', 'HQ Radio Set: Dusk'],
    ['night', 'HQ Radio Set: Night + Dial']
  ]) {
    await setLightMode(mode);
    await engine.page.evaluate(`(() => {
      const T = window.TT;
      T.setViewFirstDbg(false);
      T.player.position.set(2.35, ${hy}, -6.35);
      T.player.rotation.y = Math.PI;
      T.setAimYawDbg(0);
      T.setShotView({
        x: 1.50, y: ${hy + 1.50}, z: -6.06,
        tx: 1.62, ty: ${hy + 1.46}, tz: -5.08,
        fov: 36
      });
    })()`);
    await snapCanvas(`radio-${mode}`, label, 2, hqThumbs, telemetry.hqFrames);
  }

  // --- Row 3a: Full South Facade Context shot ---
  await setLightMode('noon');
  await engine.page.evaluate(`(() => {
    const T = window.TT;
    T.setViewFirstDbg(false);
    T.player.position.set(-4.8, ${hy}, -8.5);
    T.player.rotation.y = Math.PI;
    T.setAimYawDbg(0);
    T.setShotView({
      x: 0.0, y: ${hy + 2.15}, z: -10.8,
      tx: 0.0, ty: ${hy + 1.85}, tz: -5.0,
      fov: 45
    });
  })()`);
  await snapCanvas('south-facade-overview', 'South Wall Context (All Stations)', 3, hqThumbs, telemetry.hqFrames);

  // Now enter active match and finish the parachute insertion completely so 3P/1P gameplay shots have no parachute!
  await engine.page.evaluate(`(async () => {
    const T = window.TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    T.flightHold(false);
    const n = document.getElementById('playerName');
    if (n) n.value = 'Hale';
    document.getElementById('modeHunt')?.click();
    for (let i = 0; i < 60 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(100);
    T.insertionDbg?.rig()?.skip?.();
    for (let i = 0; i < 80 && document.body.classList.contains('deploying'); i++) {
      T.insertionDbg?.rig()?.skip?.();
      await wait(100);
    }
    T.flightHold(true);
    for (let i = 0; i < 240; i++) T.stepFrame(1 / 60);
    if (T.house.tagWall?.userData?.tags) {
      for (const h of T.house.tagWall.userData.tags) h.visible = true;
    }
  })()`);
  await setLightMode('noon');

  // --- Row 3b: Duty Board Gameplay 3P (standing at duty.approach with floating E prompt) ---
  await engine.page.evaluate(`(() => {
    const T = window.TT;
    const p = T.house.storyStations.duty.approach;
    T.setShotView(null);
    T.setViewFirstDbg(false);
    T.player.position.set(p.x, p.y, p.z);
    T.player.rotation.y = Math.PI;
    T.setAimYawDbg(0);
    for (let i = 0; i < 90; i++) T.stepFrame(1 / 60);
  })()`);
  await snapCanvas('duty-gameplay-3p', 'Duty Board: 3P Gameplay + E', 3, hqThumbs, telemetry.hqFrames);

  // --- Row 3c: Duty Board Gameplay 1P (standing at duty.approach in first person looking straight at board) ---
  await engine.page.evaluate(`(() => {
    const T = window.TT;
    const p = T.house.storyStations.duty.approach;
    T.setShotView(null);
    T.setViewFirstDbg(true);
    T.player.position.set(p.x, p.y, p.z - 0.35);
    T.player.rotation.y = Math.PI;
    T.setAimYawDbg(0);
    for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
    const cur = T.otsDbg();
    if (cur) {
      let dyaw = 0 - cur.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      const dpitch = -0.04 - cur.pitch;
      T.otsLook(-dyaw / 0.0022, dpitch / 0.0022);
    }
    for (let i = 0; i < 25; i++) T.stepFrame(1 / 60);
  })()`);
  await snapCanvas('duty-gameplay-1p', 'Duty Board: 1P Gameplay + E', 3, hqThumbs, telemetry.hqFrames);

  // --- Row 3d: Radio Set Gameplay 1P (standing at radio.approach in first person looking straight at radio) ---
  await engine.page.evaluate(`(() => {
    const T = window.TT;
    const p = T.house.storyStations.radio.approach;
    T.setShotView(null);
    T.setViewFirstDbg(true);
    T.player.position.set(p.x, p.y, p.z - 0.35);
    T.player.rotation.y = Math.PI;
    T.setAimYawDbg(0);
    for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
    const cur = T.otsDbg();
    if (cur) {
      let dyaw = 0 - cur.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      const dpitch = -0.08 - cur.pitch;
      T.otsLook(-dyaw / 0.0022, dpitch / 0.0022);
    }
    for (let i = 0; i < 25; i++) T.stepFrame(1 / 60);
  })()`);
  await snapCanvas('radio-gameplay-1p', 'HQ Radio Set: 1P Gameplay + E', 3, hqThumbs, telemetry.hqFrames);

  await engine.sheet(
    hqThumbs.slice(0, 12),
    { cols: 4, tile: 480, sheetFile: path.join(OUT_DIR, 'ag125-hq-props-sheet.jpg') },
    []
  );

  telemetry.pageErrors = engine.page.errors;
  fs.writeFileSync(path.join(OUT_DIR, 'ag125-telemetry.json'), JSON.stringify(telemetry, null, 2));
} finally {
  await engine.close();
}
