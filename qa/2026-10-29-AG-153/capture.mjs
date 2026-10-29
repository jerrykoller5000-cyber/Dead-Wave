import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', '2026-10-29-AG-153');
fs.mkdirSync(OUT_DIR, { recursive: true });

const engine = new Engine({ training: false, warm: 'none', size: [1280, 720] });
const thumbs = [];
const telemetry = { frames: [] };

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

    const db = T.house.group.getObjectByName('hq-duty-board');
    const rs = T.house.group.getObjectByName('hq-radio-set');
    const summarize = (grp) => {
      if (!grp) return null;
      return {
        name: grp.name,
        childCount: grp.children.length,
        children: grp.children.map(c => {
          const tri = c.geometry ? (c.geometry.index ? c.geometry.index.count / 3 : (c.geometry.attributes.position ? c.geometry.attributes.position.count / 3 : 0)) : 0;
          return {
            name: c.name || c.type,
            type: c.type,
            triangles: tri,
            material: c.material ? (c.material.name || c.material.type) : 'none',
            hasVertexColors: !!(c.material && c.material.vertexColors)
          };
        })
      };
    };

    return {
      dutyBoard: summarize(db),
      radioSet: summarize(rs),
      hqDutyBoardFront: T.HQ_DUTY_BOARD_FRONT,
      hqDutyBoardReach: T.HQ_DUTY_BOARD_REACH,
      hqRadioFront: T.HQ_RADIO_FRONT,
      hqRadioReach: T.HQ_RADIO_REACH,
      houseFolded: T.house.folded
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
      } else if (${JSON.stringify(mode)} === 'night') {
        T.loopNextNight();
        T.weather.raining = false;
        T.weather.intensity = 0;
        T.setWorldTime(0.92);
      }
      for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
    })()`);
  };

  const snapCanvas = async (id, label, row) => {
    const res = await engine.page.evaluate(`(() => {
      const T = window.TT;
      for (let i = 0; i < 8; i++) T.stepFrame(1 / 60);
      const src = T.renderer.domElement;
      const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(src, 0, 0);

      const tc = document.createElement('canvas');
      const tw = 480, th = Math.round(src.height * (tw / src.width));
      tc.width = tw; tc.height = th;
      const tctx = tc.getContext('2d');
      tctx.drawImage(c, 0, 0, tw, th);

      return {
        png: c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, ''),
        thumb: tc.toDataURL('image/jpeg', 0.86).replace(/^data:image\\/jpeg;base64,/, ''),
        meta: {
          id: ${JSON.stringify(id)},
          label: ${JSON.stringify(label)},
          time: T.getWorldTime ? T.getWorldTime() : null,
          triangles: T.renderer.info.render.triangles,
          calls: T.renderer.info.render.calls
        }
      };
    })()`);

    fs.writeFileSync(path.join(OUT_DIR, `${id}.png`), Buffer.from(res.png, 'base64'));
    thumbs.push({ data: res.thumb, label, row });
    telemetry.frames.push(res.meta);
  };

  const hy = await engine.page.evaluate(`window.TT.house.group.position.y`);

  // 1. Duty Board close-up (Noon)
  await setLightMode('noon');
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
  await snapCanvas('duty-noon', 'Duty Board: Noon Close-up', 1);

  // 2. Duty Board close-up (Night + glowing lamp)
  await setLightMode('night');
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
  await snapCanvas('duty-night', 'Duty Board: Night Close-up', 1);

  // 3. Radio Set close-up (Noon)
  await setLightMode('noon');
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
  await snapCanvas('radio-noon', 'Radio Set: Noon Close-up', 2);

  // 4. Radio Set close-up (Night + illuminated dial)
  await setLightMode('night');
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
  await snapCanvas('radio-night', 'Radio Set: Night Close-up', 2);

  // 5. South Facade Overview (standard view of all south wall stations)
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
  await snapCanvas('south-facade-overview', 'South Facade Overview', 3);

  // Contact sheet
  await engine.sheet(
    thumbs,
    { cols: 3, tile: 480, sheetFile: path.join(OUT_DIR, 'ag153-sheet.jpg') },
    []
  );

  telemetry.pageErrors = engine.page.errors;
  fs.writeFileSync(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(telemetry, null, 2));
  console.log('Capture completed successfully. Telemetry:', JSON.stringify(telemetry.init, null, 2));
} finally {
  await engine.close();
}
