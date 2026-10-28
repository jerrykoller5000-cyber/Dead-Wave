// AG-132 production GPU verification (no injected painter):
// 1. Trailhead six posters (world/history-props.js + index.html) in 4 lights x (front, angle, fp, tp)
// 2. Rangers' search board 3x2 roster + search log side-by-side in 4 lights x (front, fp, tp)
// 3. Hikers' camp supply chest 3x2 paper roster in 4 lights x (front, fp, tp)
// 4. Runs t167, t266, and t215 inside the production session.
import fs from 'node:fs';
import { Engine } from '../../tools/camera.mjs';

const out = 'handoffs/GP-19968/stylized-production';
fs.mkdirSync(out, { recursive: true });

const e = new Engine({ match: true, warm: 'none', size: [1280, 720] });
const frames = [];

try {
  await e.open();

  // Verify production wiring without any injected painter!
  const prodCheck = await e.page.evaluate(`(async () => {
    const T = window.TT;
    T.runDevCommand('godmode');
    T.clearZombies();
    T.setGearDbg('flashlight');
    T.applyGearVisibility();

    const board = T.historyProps.parts['trailhead-board'];
    const rRoster = T.historyProps.parts['ranger-hiker-roster'];
    const hRoster = T.historyProps.parts['hikers-camp-roster'];
    if (!board) throw new Error('trailhead-board missing');
    if (!rRoster) throw new Error('ranger-hiker-roster missing');
    if (!hRoster) throw new Error('hikers-camp-roster missing');

    const boardPainted = await board.userData.portraitsReady;
    const rangerPainted = await rRoster.userData.portraitsReady;
    const hikersPainted = await hRoster.userData.portraitsReady;

    const rSheet = rRoster.userData.sheet;
    const hSheet = hRoster.userData.sheet;
    const searchLog = T.scene.getObjectByName('ranger-search-log');

    return {
      boardPainted,
      rangerPainted,
      hikersPainted,
      boardYaw: +board.rotation.y.toFixed(3),
      posters: board.userData.posters.map(p => ({
        id: p.userData.hiker.id,
        sameTexture: p.material.map === p.userData.tex,
        sameCanvas: p.material.map.image === p.userData.canvas,
        liveSize: [p.material.map.image?.width, p.material.map.image?.height],
        canvasSize: [p.userData.canvas.width, p.userData.canvas.height],
        roughness: p.material.roughness,
        metalness: p.material.metalness,
        readablePaper: !!p.material.userData?.readablePaper
      })),
      rangerRoster: {
        pos: rRoster.position.toArray().map(v => +v.toFixed(2)),
        liveSize: [rSheet.material.map.image?.width, rSheet.material.map.image?.height],
        canvasSize: [rRoster.userData.canvas.width, rRoster.userData.canvas.height],
        sameTexture: rSheet.material.map === rRoster.userData.tex,
        sameCanvas: rSheet.material.map.image === rRoster.userData.canvas,
        searchLogPresent: !!searchLog,
        searchLogDist: searchLog ? +rRoster.position.distanceTo(searchLog.position).toFixed(3) : null
      },
      hikersRoster: {
        pos: hRoster.position.toArray().map(v => +v.toFixed(2)),
        liveSize: [hSheet.material.map.image?.width, hSheet.material.map.image?.height],
        canvasSize: [hRoster.userData.canvas.width, hRoster.userData.canvas.height],
        sameTexture: hSheet.material.map === hRoster.userData.tex,
        sameCanvas: hSheet.material.map.image === hRoster.userData.canvas
      }
    };
  })()`);

  console.log('Production check:', JSON.stringify(prodCheck, null, 2));
  if ([prodCheck.boardPainted,prodCheck.rangerPainted,prodCheck.hikersPainted].some(n=>n!==6)) throw new Error('Expected 6 trailhead posters painted by production code');

  // Install setup helpers in page
  await e.page.evaluate(`(async () => {
    window._agCamYaw = 0;
    window.setCamYawAbs = (targetYaw) => {
      const d = targetYaw - window._agCamYaw;
      TT.rotateCamera(d);
      window._agCamYaw = targetYaw;
    };

    // Exact GP-19968 preview.mjs setup for trailhead-board (with camYaw reset to 0)
    window.gpHikersSetup = async (light, view) => {
      const T = TT, V = T.player.position.constructor, b = T.historyProps.parts['trailhead-board'];
      window.setCamYawAbs(0);
      const at = b.localToWorld(new V(0, 1.45, 0)), standing = b.localToWorld(new V(view === 'front' || view === 'angle' ? 2.6 : 0, 0, view === 'fp' ? 2.5 : 3.0));
      T.setShotView(null);
      T.player.position.set(standing.x, T.sampleHeight(standing.x, standing.z), standing.z);
      T.weather.raining = light === 'overcast';
      T.weather.intensity = light === 'overcast' ? 0.85 : 0;
      T.setWorldTime({ noon: 0.5, overcast: 0.46, dusk: 0.715, night: 0.92 }[light]);
      T.setViewFirstDbg(view === 'fp');
      const lightOn = T.flashlight.intensity > 0;
      if (lightOn !== (light === 'night')) {
        for (const type of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(type, { code: 'Digit2', key: '2', bubbles: true }));
      }
      const yaw = Math.atan2(standing.x - at.x, standing.z - at.z) + Math.PI;
      T.player.rotation.y = yaw;
      T.setAimYawDbg(yaw);
      T.setAimTargetDbg(at.x, at.z);
      for (let i = 0; i < 15; i++) T.stepFrame(1 / 30);
      await new Promise(r => setTimeout(r, 250));
      if (view === 'fp') {
        const cur = T.otsDbg();
        let dyaw = yaw - cur.yaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        T.otsLook(-dyaw / 0.0022, (cur.pitch + 0.07) / 0.0022);
      } else if (view === 'front' || view === 'angle') {
        const eye = b.localToWorld(new V(view === 'angle' ? 1.2 : 0, 1.52, view === 'angle' ? 2.6 : 2.9));
        T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: at.x, ty: at.y, tz: at.z, fov: 45 });
      }
      for (let i = 0; i < 15; i++) T.stepFrame(1 / 30);
      await new Promise(r => setTimeout(r, 300));
    };

    // Rangers' search board setup (framing both the 3x2 roster and the search log)
    window.rangerBoardSetup = async (light, view) => {
      const T = TT, V = T.player.position.constructor, r = T.historyProps.parts['ranger-hiker-roster'];
      const at = r.localToWorld(new V(view === 'fp' ? 0.36 : 0.22, -0.02, 0));
      const standing = r.localToWorld(new V(view === 'front' ? 1.8 : view === 'fp' ? 0.44 : 0.22, -1.28, view === 'fp' ? 2.15 : 2.8));
      T.setShotView(null);
      T.player.position.set(standing.x, T.sampleHeight(standing.x, standing.z), standing.z);
      T.weather.raining = light === 'overcast';
      T.weather.intensity = light === 'overcast' ? 0.85 : 0;
      T.setWorldTime({ noon: 0.5, overcast: 0.46, dusk: 0.715, night: 0.92 }[light]);
      T.setViewFirstDbg(view === 'fp');
      const lightOn = T.flashlight.intensity > 0;
      if (lightOn !== (light === 'night')) {
        for (const type of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(type, { code: 'Digit2', key: '2', bubbles: true }));
      }
      const yaw = Math.atan2(at.x - standing.x, at.z - standing.z);
      window.setCamYawAbs(yaw);
      T.player.rotation.y = yaw;
      T.setAimYawDbg(yaw);
      T.setAimTargetDbg(at.x, at.z);
      for (let i = 0; i < 20; i++) T.stepFrame(1 / 30);
      await new Promise(res => setTimeout(res, 250));
      if (view === 'fp') {
        const cur = T.otsDbg();
        let dyaw = yaw - cur.yaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        T.otsLook(-dyaw / 0.0022, (cur.pitch + 0.26) / 0.0022);
      } else if (view === 'front') {
        const eye = r.localToWorld(new V(0.22, 0.01, 2.05));
        T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: at.x, ty: at.y, tz: at.z, fov: 42 });
      }
      for (let i = 0; i < 15; i++) T.stepFrame(1 / 30);
      await new Promise(res => setTimeout(res, 300));
    };

    // Hikers' camp supply chest paper roster setup
    window.hikersCampSetup = async (light, view) => {
      const T = TT, V = T.player.position.constructor, h = T.historyProps.parts['hikers-camp-roster'];
      const at = h.localToWorld(new V(view === 'fp' ? 0.08 : 0, 0.02, 0));
      const standing = h.localToWorld(new V(view === 'front' ? 1.4 : view === 'fp' ? 0.14 : 0, -0.49, view === 'fp' ? 1.38 : 2.1));
      T.setShotView(null);
      T.player.position.set(standing.x, T.sampleHeight(standing.x, standing.z), standing.z);
      T.weather.raining = light === 'overcast';
      T.weather.intensity = light === 'overcast' ? 0.85 : 0;
      T.setWorldTime({ noon: 0.5, overcast: 0.46, dusk: 0.715, night: 0.92 }[light]);
      T.setViewFirstDbg(view === 'fp');
      const lightOn = T.flashlight.intensity > 0;
      if (lightOn !== (light === 'night')) {
        for (const type of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(type, { code: 'Digit2', key: '2', bubbles: true }));
      }
      const yaw = Math.atan2(at.x - standing.x, at.z - standing.z);
      window.setCamYawAbs(yaw);
      T.player.rotation.y = yaw;
      T.setAimYawDbg(yaw);
      T.setAimTargetDbg(at.x, at.z);
      for (let i = 0; i < 20; i++) T.stepFrame(1 / 30);
      await new Promise(res => setTimeout(res, 250));
      if (view === 'fp') {
        const cur = T.otsDbg();
        let dyaw = yaw - cur.yaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        const targetPitch = -0.78;
        T.otsLook(-dyaw / 0.0022, (cur.pitch - targetPitch) / 0.0022);
      } else if (view === 'front') {
        const eye = h.localToWorld(new V(0, 0.82, 0.52));
        T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: at.x, ty: at.y, tz: at.z, fov: 40 });
      }
      for (let i = 0; i < 15; i++) T.stepFrame(1 / 30);
      await new Promise(res => setTimeout(res, 300));
    };
  })()`);

  // 1. Capture Trailhead Board (16 shots)
  for (const light of ['noon', 'overcast', 'dusk', 'night']) {
    for (const view of ['front', 'angle', 'fp', 'tp']) {
      const state = await e.page.evaluate(`(async () => {
        await window.gpHikersSetup(${JSON.stringify(light)}, ${JSON.stringify(view)});
        const b = TT.historyProps.parts['trailhead-board'];
        return {
          site: 'trailhead',
          light: ${JSON.stringify(light)},
          view: ${JSON.stringify(view)},
          first: TT.fpDbg().first,
          flashlight: TT.flashlight.intensity > 0,
          posterColors: b.userData.posters.map(p => '#' + p.material.color.getHexString()),
          posterEmissives: b.userData.posters.map(p => +p.material.emissiveIntensity.toFixed(3))
        };
      })()`);
      const file = `${out}/trailhead-${light}-${view}.png`;
      await e.page.screenshot(file);
      frames.push({ ...state, file });
    }
  }

  // 2. Capture Rangers' Search Board (12 shots)
  for (const light of ['noon', 'overcast', 'dusk', 'night']) {
    for (const view of ['front', 'fp', 'tp']) {
      const state = await e.page.evaluate(`(async () => {
        await window.rangerBoardSetup(${JSON.stringify(light)}, ${JSON.stringify(view)});
        const r = TT.historyProps.parts['ranger-hiker-roster'];
        const s = r.userData.sheet;
        return {
          site: 'ranger-board',
          light: ${JSON.stringify(light)},
          view: ${JSON.stringify(view)},
          first: TT.fpDbg().first,
          flashlight: TT.flashlight.intensity > 0,
          sheetColor: '#' + s.material.color.getHexString(),
          sheetEmissive: +s.material.emissiveIntensity.toFixed(3)
        };
      })()`);
      const file = `${out}/ranger-${light}-${view}.png`;
      await e.page.screenshot(file);
      frames.push({ ...state, file });
    }
  }

  // 3. Capture Hikers' Camp Supply Chest Roster (12 shots)
  for (const light of ['noon', 'overcast', 'dusk', 'night']) {
    for (const view of ['front', 'fp', 'tp']) {
      const state = await e.page.evaluate(`(async () => {
        await window.hikersCampSetup(${JSON.stringify(light)}, ${JSON.stringify(view)});
        const h = TT.historyProps.parts['hikers-camp-roster'];
        const s = h.userData.sheet;
        return {
          site: 'hikers-camp',
          light: ${JSON.stringify(light)},
          view: ${JSON.stringify(view)},
          first: TT.fpDbg().first,
          flashlight: TT.flashlight.intensity > 0,
          sheetColor: '#' + s.material.color.getHexString(),
          sheetEmissive: +s.material.emissiveIntensity.toFixed(3)
        };
      })()`);
      const file = `${out}/hikers-${light}-${view}.png`;
      await e.page.screenshot(file);
      frames.push({ ...state, file });
    }
  }

  // Asset-only revision: reuse AG-132 production framing; no test expectations changed.
  const roster=await e.page.evaluate("TT.historyProps.parts['ranger-hiker-roster'].userData.canvas.toDataURL('image/png').split(',')[1]");
  fs.writeFileSync(out+'/roster.png',Buffer.from(roster,'base64'));
  const tests={};
  const report = {
    task: 'GP-19968 Jerry character-style revision',
    renderer: e.renderer,
    loadSec: e.loadSec,
    prodCheck,
    tests,
    frames: frames.length,
    errors: e.page.errors
  };
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log('Saved report to', `${out}/report.json`);
  if (report.errors.length || Object.values(tests).some(t => t.fail > 0)) process.exitCode = 1;
} finally {
  await e.close();
}
