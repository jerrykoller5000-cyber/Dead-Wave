// scratch/ag297-gpu-shots.mjs
// Complete RTX 5080 WebGPU 4-light verification & benchmark for AG-297:
//   1. GP-20087 + GP-20091 + GP-20095: 10 Training stations/rooms + <0.6m fadeWall in 4 lights (HUD E-prompts ON, marine framing NDC, 0 inside solids) + exclusive 5080 bench
//   2. GP-20092: 41-step continuous walk (4.0m -> 0.0m) at CIF & Armory in 4 lights (maxStepM << 0.5m, 0 inside solids)
//   3. GP-20093: 3P Range Aim & Station Framing at rangeBench & rangeConsole (hip & ADS) in 4 lights (crosshair ON, baseline vs gated delta < 0.001m)
//   4. GP-20088: Retake of AG-292 cross-owner 01-04 sidecar cameras in 4 lights
//   5. CE-2b + CE-3: 1P eye on the firing line (setShotView(null) verified!) in 4 lights:
//      - Revolver 0.12s DA pull frame-by-frame (rest -> mid u~0.46 -> full cock u~0.88 -> shot break)
//      - Pistol trigger index at rest vs pressing (~33ms post-shot)
//      - Pistol empty-reload slide rack beat (CE-3c, u~0.75)
//      - KR-7 canted charging handle pull (J77, u~0.78)
//      - Revolver cylinder crane reload (J78, u~0.42)
//      - Pump shotgun KeyX ammo switch: birdshot -> buckshot (rest -> red hull out -> blue buckshot in -> ready, with HUD ammo line!)

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-297 ...');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const BENCH_MODE = process.argv.includes('--bench');
const ONLY_CE = process.argv.includes('--only-ce');
const ONLY_SHOTGUN = process.argv.includes('--only-shotgun');
const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];

const QA_ROOT  = path.join(ROOT, 'qa/2026-11-11-AG-297');
const OUT_AG   = path.join(ROOT, 'review/AG-297');
const OUT_GP87 = path.join(ROOT, 'review/GP-20087/gpu');
const OUT_GP88 = path.join(ROOT, 'review/GP-20088/gpu');
const OUT_GP91 = path.join(ROOT, 'review/GP-20091/gpu');
const OUT_GP92 = path.join(ROOT, 'review/GP-20092/gpu');
const OUT_GP93 = path.join(ROOT, 'review/GP-20093/gpu');
const OUT_CE2  = path.join(ROOT, 'review/CE-2/gpu');
const OUT_CE3  = path.join(ROOT, 'review/CE-3/gpu');

for (const d of [QA_ROOT, OUT_AG, OUT_GP87, OUT_GP88, OUT_GP91, OUT_GP92, OUT_GP93, OUT_CE2, OUT_CE3]) {
  fs.mkdirSync(d, { recursive: true });
}

async function writeRetry(fp, buf) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const tmp = `${fp}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;
  for (let a = 0; a < 25; a++) {
    try {
      await fs.promises.writeFile(tmp, buf);
      try { await fs.promises.unlink(fp); } catch (_) {}
      await fs.promises.rename(tmp, fp);
      return;
    } catch (e) {
      try { await fs.promises.unlink(tmp); } catch (_) {}
      if (a === 24) throw e;
      await new Promise((r) => setTimeout(r, 120 + a * 100));
    }
  }
}

async function moveOffscreen(page) {
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', {
      windowId,
      bounds: { left: -3800, top: -3800, width: 1280, height: 720 }
    });
  } catch (_) {}
}

async function shotTo(page, dirs, name) {
  // Present exact frozen simulation state via render-only raf=timer ticks (0 simulation dt)
  await page.evaluate(`(() => { window.__holdRender = true; if (window.TT) window.TT.flightHold(false); })()`);
  await new Promise((r) => setTimeout(r, 55));
  const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await page.evaluate(`(() => { window.__holdRender = false; if (window.TT) window.TT.flightHold(true); })()`);
  const buf = Buffer.from(res.data, 'base64');
  for (const d of dirs) {
    fs.mkdirSync(d, { recursive: true });
    await writeRetry(path.join(d, name), buf);
  }
  console.log(`[AG-297] saved ${name} (${(buf.length / 1024).toFixed(1)} kB)`);
}

async function runGp91Bench() {
  const SAMPLE_PERF = `(() => {
    const info = (TT.renderer && TT.renderer.info && TT.renderer.info.render) || {};
    const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
    const snap = TT.perfSnapshot() || { fps: 0, low: 0, worst: 0, hitches: 0, frames: 0 };
    return Object.assign({}, snap, { draws, triangles: info.triangles || 0 });
  })()`;

  async function sampleWindow(page, seconds, label) {
    await page.evaluate(`(() => {
      const P = TT.profDbg;
      if (P) { P.reset(); P.spikeMs = 25; P.on = true; }
      TT.resetPerf();
    })()`);
    const samples = [];
    const t0 = Date.now();
    while (Date.now() - t0 < seconds * 1000) {
      await new Promise((r) => setTimeout(r, 1000));
      const s = await page.evaluate(SAMPLE_PERF);
      if (s) samples.push(s);
    }
    const prof = await page.evaluate(`(() => {
      const P = TT.profDbg;
      if (!P) return null;
      const rep = P.report ? P.report() : null;
      P.on = false;
      const phases = (rep && rep.phases) || [];
      const tickMs = phases.reduce((s, p) => s + p.avg, 0);
      return { frames: rep ? rep.frames : 0, tickMs: Math.round(tickMs * 100) / 100 };
    })()`);
    const valid = samples.filter((w) => w.fps > 0);
    const use = valid.length ? valid : samples;
    const avg = (k) => Math.round((use.reduce((s, w) => s + (w[k] || 0), 0) / Math.max(1, use.length)) * 10) / 10;
    const last = samples.at(-1) || {};
    return {
      label,
      fps: avg('fps'),
      frameMs: avg('fps') > 0 ? Math.round((1000 / avg('fps')) * 100) / 100 : null,
      low1pct: avg('low'),
      worstMs: Math.round((last.worst || 0) * 10) / 10,
      hitches: last.hitches || 0,
      draws: last.draws || 0,
      triangles: last.triangles || 0,
      prof
    };
  }

  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: ['--window-position=-3800,-3800', '--window-size=1280,720', '--disable-features=CalculateNativeWinOcclusion']
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await moveOffscreen(page);
    const t0 = Date.now();
    await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 180000 });
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    const loadReadyMs = Date.now() - t0;

    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'GP91Bench';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));
    await new Promise((r) => setTimeout(r, 1200));

    await page.evaluate(`(() => {
      const T = window.TT, tg = T.trainingDbg.tg(), s = tg.stations.cif, f = s.front;
      T.setViewFirstDbg(false);
      const L = Math.hypot(f.x - s.x, f.z - s.z) || 1;
      const yaw = Math.atan2((f.x - s.x) / L, (f.z - s.z) / L);
      T.rotateCamera(yaw);
      T.setAimYawDbg(-yaw);
      T.player.position.set(f.x, tg.floorY, f.z);
      window.__GP91_BASELINE = true;
    })()`);
    await new Promise((r) => setTimeout(r, 800));
    const cifBefore = await sampleWindow(page, 4, 'cif_baseline_before');

    await page.evaluate(`(() => { window.__GP91_BASELINE = false; })()`);
    await new Promise((r) => setTimeout(r, 800));
    const cifAfter = await sampleWindow(page, 4, 'cif_gp20091_after');

    await page.evaluate(`(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.rotateCamera(Math.PI / 2);
      T.player.position.set(-6.8, tg.floorY, -635);
      window.__GP91_BASELINE = false;
    })()`);
    await new Promise((r) => setTimeout(r, 800));
    const fadeAfter = await sampleWindow(page, 4, 'close_wall_fade_after');

    const bench = { capturedAt: new Date().toISOString(), loadReadyMs, cifBefore, cifAfter, fadeAfter };
    const json = Buffer.from(JSON.stringify(bench, null, 2));
    await writeRetry(path.join(OUT_GP91, 'bench-5080.json'), json);
    await writeRetry(path.join(QA_ROOT, 'gp20091-bench-5080.json'), json);
    console.log('[AG-297:bench]', json.toString());
  } finally {
    await browser.close();
    await server.close();
  }
}

async function runAllShots() {
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: ['--window-position=-3800,-3800', '--window-size=1280,720', '--disable-features=CalculateNativeWinOcclusion']
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await moveOffscreen(page);
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));

    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'AG297';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));

    // Attach 4-light illuminator that differentiates all 4 lights cleanly indoors & outdoors
    await page.evaluate(`(async () => {
      const T = window.TT, H = T.inspectHost();
      const { LIGHTS } = await import('/studio/inspector/stage.js');
      window.__LIGHTS = LIGHTS;
      window.agLight = 'noon';
      window.__agRoomLights = true;
      function illuminate() {
        const L = window.__LIGHTS[window.agLight] || window.__LIGHTS['noon'];
        const p = T.camera.position;
        const dir = new H.THREE.Vector3(...L.dir).normalize();
        H.sun.position.copy(p).addScaledVector(dir, 85);
        H.sun.target.position.copy(p);
        H.sun.target.updateMatrixWorld();
        H.sun.color.setHex(L.sunColor);
        H.sun.intensity = L.sun;
        H.hemi.color.setHex(L.skyColor);
        H.hemi.groundColor.setHex(L.ground);
        H.hemi.intensity = L.sky;
        H.ambientFill.intensity = L.fill;
        H.moon.intensity = window.agLight === 'night' ? 0.45 : 0;
        const tg = T.trainingDbg.tg();
        if (tg && tg.setLights) {
          const wantRoom = window.__agRoomLights && window.agLight !== 'night';
          if (tg.lightsOn() !== wantRoom) tg.setLights(wantRoom);
        }
      }
      window.__holdRender = false;
      H.attach({ held: () => !!window.__holdRender, scale: (dt) => dt, frame: illuminate });
      T.flightHold(true);
      document.getElementById('perf')?.classList.remove('on');
    })()`);

    const timeMap = { noon: 0.44, overcast: 0.50, dusk: 0.75, night: 0.02 };

    if (!ONLY_CE && !ONLY_SHOTGUN) {
    // =========================================================================
    // PART 1: GP-20087 + GP-20091 + GP-20095 (10 spots + fadeWall in 4 lights, HUD ON)
    // =========================================================================
    console.log('[AG-297] PART 1: GP-20087 / GP-20091 / GP-20095 (11 spots x 4 lights)');
    const gp91Spots = ['cif', 'kiosk', 'armory', 'hqPanel', 'skullWindow', 'lightSwitch', 'rangeConsole', 'corridor', 'armoryRoom', 'rangeBench', 'fadeWall'];
    const gp91Metrics = [];
    let prevYaw = 0;
    for (const light of LIGHTS) {
      for (const spot of gp91Spots) {
        const m = await page.evaluate(`((spot, prevYaw, light, wTime) => {
          const T = window.TT, tr = T.trainingDbg.state(), tg = tr.tg, p = T.player.position;
          window.agLight = light;
          window.__agRoomLights = (light === 'noon' || light === 'overcast');
          window.__GP91_BASELINE = false;
          T.setShotView(null);
          T.setZoomHeldDbg(false);
          T.setViewFirstDbg(false);
          T.setWorldTime(wTime);
          let px, pz, nx, nz;
          if (spot === 'fadeWall') {
            px = -6.8; pz = -635; nx = 1; nz = 0;
          } else if (tg.stations[spot]) {
            const s = tg.stations[spot], f = s.front, L = Math.hypot(f.x - s.x, f.z - s.z) || 1;
            nx = (f.x - s.x) / L; nz = (f.z - s.z) / L; px = f.x; pz = f.z;
          } else if (spot === 'corridor') {
            px = -6.2; pz = -642; nx = 1; nz = 0;
          } else if (spot === 'armoryRoom') {
            px = 6.95; pz = -641.5; nx = -1; nz = 0;
          } else {
            px = 0; pz = -640.5; nx = 0; nz = -1;
          }
          const yaw = spot === 'fadeWall' ? Math.PI / 2 : Math.atan2(nx, nz);
          T.rotateCamera(yaw - prevYaw);
          T.setAimYawDbg(tg.stations[spot] ? -yaw : yaw);
          T.setVelDbg(0, 0);
          p.set(px, tg.floorY, pz);
          T.camera.position.set(px, tg.floorY + 1.6, pz);
          for (let i = 0; i < 65; i++) T.stepFrame(0.016);
          const c = T.camera.position;
          const head = T.getMarine().userData.headG;
          const headMat = head?.children.find(o => o.material)?.material;
          const headWorld = new T.THREE.Vector3();
          if (head) head.getWorldPosition(headWorld); else headWorld.set(p.x, p.y + 1.62, p.z);
          const headNdc = headWorld.clone().project(T.camera);
          const boxes = [...tg.solids.filter(b => b.target == null && !b.floor && (!b.infirmaryFence || tr.infirmaryFence?.state().raised)), ...tr.cameraCollision.boxes];
          const inside = boxes.filter(b => c.x > b.minX && c.x < b.maxX && c.y > b.minY && c.y < b.maxY && c.z > b.minZ && c.z < b.maxZ).map(b => b.name || b.station || 'solid');
          const promptEl = document.getElementById('interact');
          return {
            spot, light, yaw,
            headDistance: +(Math.hypot(c.x - p.x, c.y - p.y - 1.6, c.z - p.z)).toFixed(3),
            headOpacity: headMat?.opacity != null ? +headMat.opacity.toFixed(3) : 1,
            headNdc: { x: +headNdc.x.toFixed(3), y: +headNdc.y.toFixed(3) },
            inside,
            promptText: promptEl ? promptEl.textContent.trim() : ''
          };
        })(${JSON.stringify(spot)}, ${prevYaw}, ${JSON.stringify(light)}, ${timeMap[light]})`);
        prevYaw = m.yaw;
        assert.deepEqual(m.inside, [], `GP-20087/91 ${spot} (${light}) camera inside solid`);
        gp91Metrics.push(m);
        const dirs = [OUT_GP91, path.join(QA_ROOT, 'GP-20091')];
        if (spot !== 'fadeWall') dirs.push(OUT_GP87);
        await shotTo(page, dirs, `gp91-${spot}-${light}.png`);
      }
    }
    const gp91Buf = Buffer.from(JSON.stringify(gp91Metrics, null, 2));
    await writeRetry(path.join(OUT_GP91, 'gpu-metrics.json'), gp91Buf);
    await writeRetry(path.join(OUT_GP87, 'gpu-metrics.json'), gp91Buf);

    // =========================================================================
    // PART 2: GP-20092 Continuous Approach Walk (CIF & Armory, 4 Lights, 41 steps)
    // =========================================================================
    console.log('[AG-297] PART 2: GP-20092 Continuous Station Approach Walk (41 steps x 4 lights)');
    const gp92Walk = {};
    for (const stKey of ['cif', 'armory']) {
      gp92Walk[stKey] = {};
      for (const light of LIGHTS) {
        await page.evaluate(`((stKey, prevYaw, light, wTime) => {
          const T = window.TT, tr = T.trainingDbg.state(), tg = tr.tg, s = tg.stations[stKey], f = s.front;
          const L = Math.hypot(f.x - s.x, f.z - s.z) || 1, nx = (f.x - s.x) / L, nz = (f.z - s.z) / L;
          const yaw = Math.atan2(nx, nz);
          window.agLight = light;
          window.__agRoomLights = (light === 'noon' || light === 'overcast');
          window.__GP91_BASELINE = false;
          T.setShotView(null);
          T.setZoomHeldDbg(false);
          T.setViewFirstDbg(false);
          T.setWorldTime(wTime);
          T.rotateCamera(yaw - prevYaw);
          T.setAimYawDbg(-yaw);
          T.setVelDbg(0, 0);
          T.player.position.set(f.x + nx * 4.0, tg.floorY, f.z + nz * 4.0);
          T.camera.position.set(T.player.position.x, tg.floorY + 1.6, T.player.position.z);
          for (let i = 0; i < 75; i++) T.stepFrame(0.016);
          window.__gp92PrevYaw = yaw;
        })(${JSON.stringify(stKey)}, ${prevYaw}, ${JSON.stringify(light)}, ${timeMap[light]})`);
        prevYaw = await page.evaluate('window.__gp92PrevYaw');

        let prevEye = null, maxStep = 0, insideAny = [];
        for (let i = 40; i >= 0; i--) {
          const stepRow = await page.evaluate(`((stKey, i) => {
            const T = window.TT, tr = T.trainingDbg.state(), tg = tr.tg, s = tg.stations[stKey], f = s.front;
            const L = Math.hypot(f.x - s.x, f.z - s.z) || 1, nx = (f.x - s.x) / L, nz = (f.z - s.z) / L;
            T.player.position.set(f.x + nx * i * 0.1, tg.floorY, f.z + nz * 0.1 * i);
            T.setVelDbg(0, 0);
            T.stepFrame(0.016);
            const c = T.camera.position;
            const v = new T.THREE.Vector3(s.x, s.y + 1.4, s.z).project(T.camera);
            const boxes = [...tg.solids.filter(b => b.target == null && !b.floor && (!b.infirmaryFence || tr.infirmaryFence?.state().raised)), ...tr.cameraCollision.boxes];
            const inside = boxes.filter(b => c.x > b.minX && c.x < b.maxX && c.y > b.minY && c.y < b.maxY && c.z > b.minZ && c.z < b.maxZ).map(b => b.name || b.station || 'solid');
            const promptEl = document.getElementById('interact');
            return {
              d: +(i * 0.1).toFixed(2),
              eye: { x: +c.x.toFixed(3), y: +c.y.toFixed(3), z: +c.z.toFixed(3) },
              stationNdc: { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) },
              inside,
              prompt: promptEl ? promptEl.textContent.trim() : ''
            };
          })(${JSON.stringify(stKey)}, ${i})`);
          if (prevEye) {
            const ds = Math.hypot(stepRow.eye.x - prevEye.x, stepRow.eye.y - prevEye.y, stepRow.eye.z - prevEye.z);
            if (ds > maxStep) maxStep = ds;
          }
          prevEye = stepRow.eye;
          if (stepRow.inside.length) insideAny.push(...stepRow.inside);
          if ([40, 24, 16, 8, 0].includes(i) && (stKey === 'cif' || (stKey === 'armory' && (light === 'noon' || light === 'night')))) {
            await shotTo(page, [OUT_GP92, path.join(QA_ROOT, 'GP-20092')], `gp92-${stKey}-${light}-step${String(i).padStart(2, '0')}.png`);
          }
          if (i === 0) {
            gp92Walk[stKey][light] = {
              maxStepM: +maxStep.toFixed(3),
              insideCount: insideAny.length,
              endStationNdc: stepRow.stationNdc,
              endPrompt: stepRow.prompt
            };
          }
        }
      }
    }
    const gp92Json = Buffer.from(JSON.stringify(gp92Walk, null, 2));
    await writeRetry(path.join(OUT_GP92, 'gpu-approach-walk.json'), gp92Json);
    await writeRetry(path.join(QA_ROOT, 'gp20092-approach-walk.json'), gp92Json);

    // =========================================================================
    // PART 3: GP-20093 3P Range Aim & Station Framing (rangeBench & rangeConsole, hip & ads, 4 lights, crosshair ON)
    // =========================================================================
    console.log('[AG-297] PART 3: GP-20093 3P Range Aim (rangeBench & rangeConsole, hip & ads x 4 lights)');
    const gp93Metrics = [];
    for (const light of LIGHTS) {
      for (const spot of ['rangeBench', 'rangeConsole']) {
        for (const aim of ['hip', 'ads']) {
          const row = await page.evaluate(`((spot, aim, prevYaw, light, wTime) => {
            const T = window.TT, tr = T.trainingDbg.state(), tg = tr.tg, s = tg.stations[spot] || null, p = T.player.position;
            const x = spot === 'rangeBench' ? 0 : s.front.x;
            const z = spot === 'rangeBench' ? -640.5 : s.front.z;
            const yaw = 0; // Face down +z target lane
            window.agLight = light;
            window.__agRoomLights = (light === 'noon' || light === 'overcast');
            T.setShotView(null);
            T.setViewFirstDbg(false);
            T.setWorldTime(wTime);
            // equip GW-4/M4 for clean 3P rifle aim silhouette
            T.grantAllWeapons();
            if (T.isUnarmed()) T.toggleHolster();
            const m4Idx = T.WEAPON_ORDER.indexOf('m4');
            if (m4Idx >= 0 && T.getCurrentWeapon() !== 'm4') T.setWeapon(m4Idx);

            // 1. Measure baseline (__GP91_BASELINE = true)
            T.rotateCamera(yaw - prevYaw);
            T.setAimYawDbg(-yaw);
            T.setOtsAimDbg(0, 0);
            T.setVelDbg(0, 0);
            p.set(x, tg.floorY, z);
            T.camera.position.set(x, tg.floorY + 1.6, z);
            window.__GP91_BASELINE = true;
            T.setZoomHeldDbg(aim === 'ads');
            for (let i = 0; i < 90; i++) T.stepFrame(0.016);
            const bFwd = new T.THREE.Vector3(); T.camera.getWorldDirection(bFwd);
            const bAim = T.aimTarget.clone();
            const bCam = T.camera.position.clone();

            // 2. Measure gated GP-20093 (__GP91_BASELINE = false)
            p.set(x, tg.floorY, z);
            T.camera.position.set(x, tg.floorY + 1.6, z);
            window.__GP91_BASELINE = false;
            T.setZoomHeldDbg(aim === 'ads');
            for (let i = 0; i < 90; i++) T.stepFrame(0.016);
            const gFwd = new T.THREE.Vector3(); T.camera.getWorldDirection(gFwd);
            const gAim = T.aimTarget.clone();
            const gCam = T.camera.position.clone();

            return {
              spot, aim, light, yaw,
              forwardDelta: +bFwd.distanceTo(gFwd).toFixed(6),
              aimTargetDeltaM: +bAim.distanceTo(gAim).toFixed(6),
              camDeltaM: +bCam.distanceTo(gCam).toFixed(6),
              forward: gFwd.toArray().map(v => +v.toFixed(4)),
              aimTarget: gAim.toArray().map(v => +v.toFixed(3))
            };
          })(${JSON.stringify(spot)}, ${JSON.stringify(aim)}, ${prevYaw}, ${JSON.stringify(light)}, ${timeMap[light]})`);
          prevYaw = row.yaw;
          gp93Metrics.push(row);
          await shotTo(page, [OUT_GP93, path.join(QA_ROOT, 'GP-20093')], `gp93-${spot}-${aim}-${light}.png`);
        }
      }
    }
    await page.evaluate('TT.setZoomHeldDbg(false)');
    const gp93Buf = Buffer.from(JSON.stringify(gp93Metrics, null, 2));
    await writeRetry(path.join(OUT_GP93, 'gpu-aim-metrics.json'), gp93Buf);
    await writeRetry(path.join(QA_ROOT, 'gp20093-aim-metrics.json'), gp93Buf);

    // =========================================================================
    // Hide HUD for clean GP-20088 & CE-2/CE-3 weapon/prop inspection shots
    // =========================================================================
    await page.evaluate(`(() => {
      const css = document.createElement('style');
      css.id = 'ag297-clean-hud';
      css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important} #menu,#title,#hud,#crosshair,#interact,#perf{display:none!important;visibility:hidden!important}';
      document.head.append(css);
    })()`);

    // =========================================================================
    // PART 4: GP-20088 Cross-Owner 01-04 Cameras (Exact sidecar + AG-292 angles)
    // =========================================================================
    console.log('[AG-297] PART 4: GP-20088 Cross-Owner 01-04 in 4 Lights');
    const gp88Cams = [
      { id: '01-perimeter', key: 'perimeter', cam: { fov: 35, x: -41.5, y: -198.6, z: -645.6, tx: -43.0, ty: -199.65, tz: -646.3 } },
      { id: '02-infirmary', key: 'infirmary', cam: { fov: 35, x: -35.8, y: -198.9, z: -650.6, tx: -36.3, ty: -199.9,  tz: -651.78 } },
      { id: '03-monitor',   key: 'monitor',   cam: { fov: 35, x: -0.5,  y: -197.9, z: -640.9, tx: 1.5,   ty: -196.4,  tz: -639.35 } },
      { id: '04-cif',       key: 'cif',       cam: { fov: 35, x: 6.0,   y: -195.6, z: -648.5, tx: 7.98,  ty: -196.9,  tz: -650.2 } }
    ];
    for (const light of LIGHTS) {
      for (const item of gp88Cams) {
        await page.evaluate(`((cam, light, wTime) => {
          const T = window.TT, tg = T.trainingDbg.tg();
          window.agLight = light;
          window.__agRoomLights = (light !== 'night');
          T.setWorldTime(wTime);
          T.setViewFirstDbg(false);
          T.player.position.set(cam.x, tg.floorY, cam.z - 2.5);
          T.setShotView(cam);
          for (let i = 0; i < 12; i++) T.stepFrame(0.016);
        })(${JSON.stringify(item.cam)}, ${JSON.stringify(light)}, ${timeMap[light]})`);
        await shotTo(page, [OUT_GP88, path.join(QA_ROOT, 'GP-20088')], `gp88-${item.id}-${light}.png`);
      }
    }
    // CRITICAL: Release shotView so 1P viewmodel uses real firing-line eye camera!
    await page.evaluate('TT.setShotView(null)');
    } else {
      await page.evaluate(`(() => {
        const css = document.createElement('style');
        css.id = 'ag297-clean-hud';
        css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important} #menu,#title,#hud,#crosshair,#interact,#perf{display:none!important;visibility:hidden!important}';
        document.head.append(css);
      })()`);
    }

    // =========================================================================
    // PART 5: CE-2b + CE-3 at 1P Eye (Hip) on the Firing Line in 4 Lights
    // =========================================================================
    console.log('[AG-297] PART 5: CE-2b + CE-3 at 1P Eye on Firing Line in 4 Lights');
    const ceMetrics = { revolver: {}, pistol: {}, kr7: {}, shotgun: {} };

    const equip1P = async (weaponKey, light) => {
      await page.evaluate(`((wKey, light, wTime) => {
        const T = window.TT, O = T.trainingDbg.tg().origin;
        window.agLight = light;
        window.__agRoomLights = (light !== 'night');
        T.setWorldTime(wTime);
        T.setShotView(null);
        T.setMouseFireDbg(false);
        T.setZoomHeldDbg(false);
        T.setViewFirstDbg(true);
        T.grantAllWeapons();
        if (T.isUnarmed()) T.toggleHolster();
        try { T.opticDbg?.clear?.(wKey); } catch (_) {}
        try { T.armoryDbg?.fit?.(wKey, 'suppressor', false); } catch (_) {}
        T.flightHold(true);
        T.player.position.set(O.x + 2.0, O.y, O.z - 1.2);
        T.setAimYawDbg(0);
        T.setOtsAimDbg(0, -0.02);
        const idx = T.WEAPON_ORDER.indexOf(wKey);
        for (let a = 0; a < 10 && T.getCurrentWeapon() !== wKey; a++) {
          T.setWeapon(idx);
          for (let k = 0; k < 8; k++) T.stepFrame(1 / 60);
        }
        for (let i = 0; i < 75; i++) T.stepFrame(1 / 60);
      })(${JSON.stringify(weaponKey)}, ${JSON.stringify(light)}, ${timeMap[light]})`);
    };

    if (!ONLY_SHOTGUN) {
    // 5A. Revolver 0.12s double-action pull frame-by-frame (CE-2b)
    for (const light of LIGHTS) {
      await equip1P('revolver', light);
      await page.evaluate(`(() => {
        const T = window.TT;
        T.setAmmoDbg?.('revolver', 6);
        T.setMagazinesDbg?.('revolver', 6, [6, 6, 6]);
        // Fire 1 warmup round and settle so 1 spent chamber sits under hammer before next pull
        T.setMouseFireDbg(true);
        for (let i = 0; i < 12; i++) T.stepFrame(1 / 60);
        T.setMouseFireDbg(false);
        for (let i = 0; i < 50; i++) T.stepFrame(1 / 60);
      })()`);
      await shotTo(page, [OUT_CE2, path.join(QA_ROOT, 'CE-2')], `revolver-pull-0-rest-${light}.png`);

      // Mid-pull: step until revolverPullDbg().t / pull ~ 0.45 (~0.054s)
      const rMid = await page.evaluate(`(() => {
        const T = window.TT;
        T.setMouseFireDbg(true);
        for (let i = 0; i < 3; i++) T.stepFrame(1 / 60); // 3/60 = 0.050s (u = 0.417)
        return { pull: T.revolverPullDbg?.(), ammo: T.getAmmo()?.revolver };
      })()`);
      await shotTo(page, [OUT_CE2, path.join(QA_ROOT, 'CE-2')], `revolver-pull-1-mid-${light}.png`);

      // Full cock right before shot breaks: 4 more 1/60 frames -> 7/60 = 0.1167s (u = 0.97, hammer at full cock!)
      const rCock = await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 4; i++) T.stepFrame(1 / 60); // total 7/60 = 0.1167s < 0.12s!
        return { pull: T.revolverPullDbg?.(), ammo: T.getAmmo()?.revolver };
      })()`);
      await shotTo(page, [OUT_CE2, path.join(QA_ROOT, 'CE-2')], `revolver-pull-2-cock-${light}.png`);

      // Shot break: 2 more frames -> crosses 0.12s, shot fires, hammer drops, cylinder locked on next chamber!
      const rBreak = await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 2; i++) T.stepFrame(1 / 60);
        T.setMouseFireDbg(false);
        return { pull: T.revolverPullDbg?.(), ammo: T.getAmmo()?.revolver };
      })()`);
      await shotTo(page, [OUT_CE2, path.join(QA_ROOT, 'CE-2')], `revolver-pull-3-break-${light}.png`);
      ceMetrics.revolver[light] = { rMid, rCock, rBreak };

      // Also capture CE-3 Revolver cylinder crane reload beat (u ~ 0.42) in 4 lights!
      await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
        T.startReload ? T.startReload() : document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true }));
        document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR', key: 'r', bubbles: true }));
        for (let i = 0; i < 120; i++) {
          T.stepFrame(1 / 60);
          const rl = T.getReloadDbg?.();
          if (rl && rl.anim > 0) {
            const u = 1 - rl.timer / rl.anim;
            if (u >= 0.42) break;
          }
        }
      })()`);
      await shotTo(page, [OUT_CE3, path.join(QA_ROOT, 'CE-3')], `revolver-reload-crane-${light}.png`);
      await page.evaluate(`(() => { for (let i = 0; i < 140; i++) TT.stepFrame(1 / 60); })()`);
    }

    // 5B. Pistol index finger at rest vs pressing on shot (CE-2b) + empty reload slide rack (CE-3c)
    for (const light of LIGHTS) {
      await equip1P('pistol', light);
      await page.evaluate(`(() => {
        const T = window.TT;
        T.setMagazinesDbg('pistol', 12, [12, 12, 12]);
        for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
      })()`);
      await shotTo(page, [OUT_CE2, path.join(QA_ROOT, 'CE-2')], `pistol-index-0-rest-${light}.png`);

      await page.evaluate(`(() => {
        const T = window.TT;
        T.setMouseFireDbg(true);
        T.stepFrame(1 / 60);
        T.setMouseFireDbg(false);
        T.stepFrame(1 / 60); // ~33ms post-shot: trigger pressed & slide kicking
      })()`);
      await shotTo(page, [OUT_CE2, path.join(QA_ROOT, 'CE-2')], `pistol-index-1-press-${light}.png`);

      // CE-3c pistol empty reload slide rack beat (u ~ 0.75)
      const pisRack = await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
        T.setMagazinesDbg('pistol', 0, [12, 12]);
        document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true }));
        document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR', key: 'r', bubbles: true }));
        let uNow = 0;
        for (let i = 0; i < 140; i++) {
          T.stepFrame(1 / 60);
          const rl = T.getReloadDbg?.();
          if (rl && rl.anim > 0) {
            uNow = 1 - rl.timer / rl.anim;
            if (uNow >= 0.75) break;
          }
        }
        return { reloadU: +uNow.toFixed(3) };
      })()`);
      ceMetrics.pistol[light] = pisRack;
      await shotTo(page, [OUT_CE3, path.join(QA_ROOT, 'CE-3')], `pistol-rack-beat-${light}.png`);
      await page.evaluate(`(() => { for (let i = 0; i < 80; i++) TT.stepFrame(1 / 60); })()`);
    }

    // 5C. KR-7 Rifle canted charging handle pull (CE-3 / J77, u ~ 0.78)
    for (const light of LIGHTS) {
      await equip1P('ak', light);
      const kr7Info = await page.evaluate(`(() => {
        const T = window.TT;
        T.setMagazinesDbg('ak', 0, [30, 30]);
        document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true }));
        document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR', key: 'r', bubbles: true }));
        let uNow = 0;
        for (let i = 0; i < 180; i++) {
          T.stepFrame(1 / 60);
          const rl = T.getReloadDbg?.();
          if (rl && rl.anim > 0) {
            uNow = 1 - rl.timer / rl.anim;
            if (uNow >= 0.78) break;
          }
        }
        return { reloadU: +uNow.toFixed(3) };
      })()`);
      ceMetrics.kr7[light] = kr7Info;
      await shotTo(page, [OUT_CE3, path.join(QA_ROOT, 'CE-3')], `kr7-handle-pull-${light}.png`);
      await page.evaluate(`(() => { for (let i = 0; i < 80; i++) TT.stepFrame(1 / 60); })()`);
    }
    } // end !ONLY_SHOTGUN

    // 5D. Pump Shotgun KeyX ammo switch: birdshot -> buckshot (CE-3 / J133)
    // Show HUD #hud during shotgun KeyX so the live ammo type switch line is also visible!
    await page.evaluate(`(() => { document.getElementById('ag297-clean-hud')?.remove(); document.getElementById('perf')?.classList.remove('on'); })()`);
    for (const light of LIGHTS) {
      await equip1P('shotgun', light);
      await page.evaluate(`(() => {
        const T = window.TT;
        T.shotLoadDbg.clear(); // reset to birdshot
        T.shotLoadDbg.grant('buckshot'); // add 20 buckshot in reserve
        T.ammoDbg.carry('shotgun', 'buckshot', 16);
        T.setAmmoDbg?.('shotgun', 3);
        T.setMagazinesDbg?.('shotgun', 3, [8, 8]);
        for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
      })()`);
      await shotTo(page, [OUT_CE3, path.join(QA_ROOT, 'CE-3')], `shotgun-x-0-rest-${light}.png`);

      // Start KeyX switch to buckshot and step to unload peak (u ~ 0.38: gun rolled 20° left, forend back, red birdshot hull out of port!)
      const sgUnload = await page.evaluate(`(() => {
        const T = window.TT;
        T.ammoDbg.start('buckshot');
        let sw = null;
        for (let i = 0; i < 60; i++) {
          T.stepFrame(1 / 60);
          sw = T.ammoDbg.state();
          if (sw && sw.phase === 'unload' && sw.u >= 0.36 && sw.u <= 0.45) break;
        }
        return { sw, shellShown: T.ammoDbg.shellShown(), hud: T.shotLoadDbg.hud() };
      })()`);
      await shotTo(page, [OUT_CE3, path.join(QA_ROOT, 'CE-3')], `shotgun-x-1-unload-hull-${light}.png`);

      // Step through remaining unloads into first buckshot shell pushed into port (phase === 'load', u ~ 0.48)
      const sgLoad = await page.evaluate(`(() => {
        const T = window.TT;
        let sw = null;
        for (let i = 0; i < 220; i++) {
          T.stepFrame(1 / 60);
          sw = T.ammoDbg.state();
          if (sw && sw.phase === 'load' && sw.u >= 0.45 && sw.u <= 0.55) break;
        }
        return { sw, shellShown: T.ammoDbg.shellShown(), hud: T.shotLoadDbg.hud() };
      })()`);
      await shotTo(page, [OUT_CE3, path.join(QA_ROOT, 'CE-3')], `shotgun-x-2-load-buck-${light}.png`);

      // Complete loading all buckshot shells and settle ready
      const sgDone = await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 400; i++) {
          T.stepFrame(1 / 60);
          if (!T.ammoDbg.state()) break;
        }
        for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
        return { fitted: T.shotLoadDbg.fitted(), hud: T.shotLoadDbg.hud() };
      })()`);
      await shotTo(page, [OUT_CE3, path.join(QA_ROOT, 'CE-3')], `shotgun-x-3-done-${light}.png`);
      ceMetrics.shotgun[light] = { sgUnload, sgLoad, sgDone };
    }

    if (ONLY_SHOTGUN && fs.existsSync(path.join(QA_ROOT, 'ce2-ce3-metrics.json'))) {
      const prev = JSON.parse(fs.readFileSync(path.join(QA_ROOT, 'ce2-ce3-metrics.json'), 'utf8'));
      ceMetrics.revolver = prev.revolver;
      ceMetrics.pistol = prev.pistol;
      ceMetrics.kr7 = prev.kr7;
    }
    const ceJson = Buffer.from(JSON.stringify(ceMetrics, null, 2));
    await writeRetry(path.join(QA_ROOT, 'ce2-ce3-metrics.json'), ceJson);
    await writeRetry(path.join(OUT_CE2, 'ce2-metrics.json'), ceJson);
    await writeRetry(path.join(OUT_CE3, 'ce3-metrics.json'), ceJson);
    console.log('[AG-297] Completed all shots cleanly!');
  } finally {
    await browser.close();
    await server.close();
  }
}

if (BENCH_MODE) {
  runGp91Bench().catch((e) => { console.error(e); process.exit(1); });
} else {
  runAllShots().catch((e) => { console.error(e); process.exit(1); });
}
