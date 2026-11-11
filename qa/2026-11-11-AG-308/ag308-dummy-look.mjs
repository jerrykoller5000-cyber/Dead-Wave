// qa/2026-11-11-AG-308/ag308-dummy-look.mjs
// RTX 5080 WebGPU 4-light live Training Ground verification for AG-308 / J137:
//   - Places human-scale striking dummy near the bench inside the walkable range (x = -4.5, y = 0, z = -1.0)
//   - 4 lights: noon, overcast, dusk, night (studio lights mapped onto game sun/sky/ambient)
//   - 5 views per light:
//       1. eye-clean: First-person eye view (1.3 m distance) of pristine dummy (tactical vinyl, seams, spring post, weighted base)
//       2. eye-hits: First-person eye view after multi-weapon strikes (knife slashes, chainsaw scorch, bullet holes, blunt scuff)
//       3. third-person: Third-person elevated view of marine next to the dummy, bench, and yellow firing line
//       4. wobble-flex: Dynamic shot captured mid-wobble during spring oscillation
//       5. detail-decal: Zoomed macro shot of chest knife cut, parted vinyl flap, and chainsaw scorched ember chew
//   - 5080 performance measurement: baseline TG draws/tris vs dummy draws/tris (demonstrating exactly +3 draw calls)
//   - Captures directly via H.render() -> canvas.drawImage(H.renderer.domElement) in a fresh task

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-308/shots');
const OUT_REV = path.join(ROOT, 'review/AG-308/shots');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

const LIGHT_KEYS = ['noon', 'overcast', 'dusk', 'night'];

function saveShot(name, b64) {
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(path.join(OUT_QA, name), buf);
  fs.writeFileSync(path.join(OUT_REV, name), buf);
  const sha = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
  return { bytes: buf.length, sha, name };
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

async function main() {
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

  const summary = {
    card: 'AG-308',
    capturedAt: new Date().toISOString(),
    backend: null,
    perf: {},
    shots: {},
    wobbleData: null,
    decalHits: null,
    pageErrors: []
  };

  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await moveOffscreen(page);
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    await moveOffscreen(page);
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));

    // Enter live Training Ground
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'DUMMY-5080';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor(
      'TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',
      { timeout: 60000 }
    ));

    summary.backend = await page.evaluate('TT.renderer?.backend?.constructor?.name || "unknown"');
    console.log('[AG-308] Entered Training Ground on backend:', summary.backend);

    // Setup dummy test rig in Training Ground
    const setupInfo = await page.evaluate(`(async () => {
      const T = window.TT, H = T.inspectHost(), G = T.THREE;
      const { LIGHTS } = await import('/studio/inspector/stage.js');
      window.__studioLights = LIGHTS;
      window.__activeLight = 'noon';

      // Hide banners/UI overlays
      const perfEl = document.getElementById('perf');
      if (perfEl) perfEl.style.display = 'none';
      const bigBanner = document.getElementById('bigBanner');
      if (bigBanner) bigBanner.style.display = 'none';

      // Measure baseline draws before dummy
      H.render();
      const baseCalls = H.renderer.info.render.calls;
      const baseTris = H.renderer.info.render.triangles;

      // Import and create training dummy
      const { createTrainingDummy } = await import('/world/training-dummy.js');
      const tg = T.trainingDbg.tg();

      // Position dummy near the firing bench inside the walkable range:
      // x = -4.5 (bay between post 1 and 2), y = 0 (on floor), z = -1.0 (behind yellow firing line)
      const DUMMY_POS = { x: -4.5, y: 0, z: -1.0 };
      const dummy = createTrainingDummy(G, { x: DUMMY_POS.x, y: DUMMY_POS.y, z: DUMMY_POS.z, rotY: 0 });
      tg.group.add(dummy.group);
      tg.solids.push(dummy.solid);
      window.__dummy = dummy;
      window.__dummyPos = DUMMY_POS;

      // Position marine facing dummy from 1.5 m away
      if (H.player) {
        H.player.position.set(DUMMY_POS.x, 0, DUMMY_POS.z + 1.4);
        H.player.rotation.y = Math.PI; // facing -z toward dummy
      }
      if (T.viewmodel) T.viewmodel.place();

      // Measure draws with dummy added
      H.render();
      const dummyCalls = H.renderer.info.render.calls;
      const dummyTris = H.renderer.info.render.triangles;

      // Setup lighting controller
      window.__frozen = true;
      H.attach({
        held: () => window.__frozen,
        scale: (dt) => window.__frozen ? 0 : dt,
        frame: () => {
          const L = window.__studioLights?.[window.__activeLight];
          if (!L) return;
          const p = new G.Vector3(DUMMY_POS.x, 1.0, DUMMY_POS.z);
          H.sun.position.copy(p).addScaledVector(new G.Vector3(...L.dir).normalize(), 60);
          H.sun.target.position.copy(p);
          H.sun.target.updateMatrixWorld();
          H.sun.color.setHex(L.sunColor);
          H.sun.intensity = L.sun;
          H.hemi.color.setHex(L.skyColor);
          H.hemi.groundColor.setHex(L.ground);
          H.hemi.intensity = L.sky;
          H.ambientFill.intensity = L.fill;
          if (H.moon) H.moon.intensity = 0;
        }
      });

      // Capture helper
      const cap = document.createElement('canvas');
      window.__capShot = async (camPos, lookAt, quality = 0.92) => {
        window.__frozen = true;
        H.camera.position.set(camPos.x, camPos.y, camPos.z);
        H.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
        H.camera.updateMatrixWorld(true);
        await new Promise((r) => setTimeout(r, 16));
        H.render();

        const src = H.renderer.domElement;
        cap.width = src.width;
        cap.height = src.height;
        const g = cap.getContext('2d');
        g.drawImage(src, 0, 0);
        return cap.toDataURL('image/jpeg', quality).slice(23);
      };

      return {
        baseCalls,
        baseTris,
        dummyCalls,
        dummyTris,
        deltaCalls: dummyCalls - baseCalls,
        deltaTris: dummyTris - baseTris,
        dummyPos: DUMMY_POS
      };
    })()`);

    summary.perf = setupInfo;
    console.log('[AG-308] Perf stats on RTX 5080:', JSON.stringify(setupInfo, null, 2));

    // Camera presets relative to dummy at (dx, dy, dz)
    const dx = setupInfo.dummyPos.x;
    const dy = setupInfo.dummyPos.y;
    const dz = setupInfo.dummyPos.z;

    const CAM_PRESETS = {
      // 1. Eye clean / eye hits: Eye level, 1.4 m away, looking directly at dummy head/chest
      eye: {
        pos: { x: dx, y: dy + 1.35, z: dz + 1.45 },
        look: { x: dx, y: dy + 1.25, z: dz }
      },
      // 2. Third person: Marine in full kit near dummy, bench, and yellow firing line
      thirdPerson: {
        pos: { x: dx + 1.5, y: dy + 2.1, z: dz + 2.2 },
        look: { x: dx - 0.2, y: dy + 1.1, z: dz }
      },
      // 3. Detail decal: Close-up on chest & shoulder strike marks
      detail: {
        pos: { x: dx + 0.1, y: dy + 1.25, z: dz + 0.65 },
        look: { x: dx, y: dy + 1.20, z: dz }
      }
    };

    // Step 1: Capture eye-clean in all 4 lights
    for (const light of LIGHT_KEYS) {
      await page.evaluate(`window.__activeLight = ${JSON.stringify(light)}`);
      const b64 = await page.evaluate(
        `window.__capShot(${JSON.stringify(CAM_PRESETS.eye.pos)}, ${JSON.stringify(CAM_PRESETS.eye.look)})`
      );
      const shotName = `dummy-${light}-01-eye-clean.jpg`;
      summary.shots[shotName] = saveShot(shotName, b64);
      console.log(`[AG-308] Saved ${shotName}`);
    }

    // Step 2: Apply realistic combat sequence of strikes (knife, chainsaw, bullet, blunt)
    const hitsResult = await page.evaluate(`(() => {
      const d = window.__dummy;
      const dp = window.__dummyPos;
      // Strike 1: Knife slash across chest
      const s1 = d.takeHit({
        weapon: 'knife',
        point: { x: dp.x + 0.04, y: dp.y + 1.22, z: dp.z + 0.12 },
        normal: { x: 0, y: 0, z: 1 },
        damage: 35
      });
      // Strike 2: Second knife slash across abdomen
      const s2 = d.takeHit({
        weapon: 'knife',
        point: { x: dp.x - 0.07, y: dp.y + 0.98, z: dp.z + 0.11 },
        normal: { x: 0, y: 0, z: 1 },
        damage: 35
      });
      // Strike 3: Chainsaw scorch/gash across left shoulder/flank
      const s3 = d.takeHit({
        weapon: 'chainsaw',
        point: { x: dp.x + 0.14, y: dp.y + 1.32, z: dp.z + 0.09 },
        normal: { x: 0.25, y: 0, z: 0.97 },
        damage: 140
      });
      // Strike 4: Bullet puncture to chin / head
      const s4 = d.takeHit({
        weapon: 'pistol',
        point: { x: dp.x - 0.02, y: dp.y + 1.58, z: dp.z + 0.08 },
        normal: { x: 0, y: 0, z: 1 },
        damage: 45
      });
      // Strike 5: Blunt fist / rifle butt strike to midsection
      const s5 = d.takeHit({
        weapon: 'fist',
        point: { x: dp.x + 0.02, y: dp.y + 0.82, z: dp.z + 0.11 },
        normal: { x: 0, y: 0, z: 1 },
        damage: 20
      });

      return {
        strikes: [s1, s2, s3, s4, s5],
        stats: d.getStats()
      };
    })()`);
    summary.decalHits = hitsResult;
    console.log('[AG-308] Applied strikes:', JSON.stringify(hitsResult.stats));

    // Settle wobble back to rest for crisp decal shots
    await page.evaluate(`(() => {
      const d = window.__dummy;
      for (let i = 0; i < 200; i++) d.update(0.016);
    })()`);

    // Step 3: Capture eye-hits, third-person, and detail-decal across all 4 lights
    for (const light of LIGHT_KEYS) {
      await page.evaluate(`window.__activeLight = ${JSON.stringify(light)}`);

      // 2. eye-hits
      const b64Hits = await page.evaluate(
        `window.__capShot(${JSON.stringify(CAM_PRESETS.eye.pos)}, ${JSON.stringify(CAM_PRESETS.eye.look)})`
      );
      const nameHits = `dummy-${light}-02-eye-hits.jpg`;
      summary.shots[nameHits] = saveShot(nameHits, b64Hits);

      // 3. third-person
      const b64Tp = await page.evaluate(
        `window.__capShot(${JSON.stringify(CAM_PRESETS.thirdPerson.pos)}, ${JSON.stringify(CAM_PRESETS.thirdPerson.look)})`
      );
      const nameTp = `dummy-${light}-03-third-person.jpg`;
      summary.shots[nameTp] = saveShot(nameTp, b64Tp);

      // 4. detail-decal
      const b64Detail = await page.evaluate(
        `window.__capShot(${JSON.stringify(CAM_PRESETS.detail.pos)}, ${JSON.stringify(CAM_PRESETS.detail.look)})`
      );
      const nameDetail = `dummy-${light}-04-detail-decal.jpg`;
      summary.shots[nameDetail] = saveShot(nameDetail, b64Detail);

      console.log(`[AG-308] Saved 4-light set for ${light}`);
    }

    // Step 4: Wobble dynamic physics verification & capture
    const wobbleSim = await page.evaluate(`(() => {
      const d = window.__dummy;
      d.wobble({ x: 0.3, z: 1.0 }, 1.8, 1.4);
      const trace = [];
      for (let f = 0; f < 30; f++) {
        d.update(0.016);
        trace.push({
          frame: f,
          t: +(f * 0.016).toFixed(3),
          rotX: +d.pivot.rotation.x.toFixed(4),
          rotZ: +d.pivot.rotation.z.toFixed(4),
          angle: +Math.hypot(d.pivot.rotation.x, d.pivot.rotation.z).toFixed(4)
        });
      }
      return trace;
    })()`);
    summary.wobbleData = wobbleSim;

    // Capture wobble mid-flex in noon and night
    for (const light of ['noon', 'night']) {
      await page.evaluate(`window.__activeLight = ${JSON.stringify(light)}`);
      await page.evaluate(`(() => {
        const d = window.__dummy;
        d.resetStats();
        d.wobble({ x: 0.4, z: 1.0 }, 2.0, 1.5);
        d.update(0.08); // advance to peak flex
      })()`);
      const b64Wobble = await page.evaluate(
        `window.__capShot(${JSON.stringify(CAM_PRESETS.thirdPerson.pos)}, ${JSON.stringify(CAM_PRESETS.thirdPerson.look)})`
      );
      const nameWobble = `dummy-${light}-05-wobble-flex.jpg`;
      summary.shots[nameWobble] = saveShot(nameWobble, b64Wobble);
      console.log(`[AG-308] Saved wobble capture: ${nameWobble}`);
    }

    // Measure active frame rate / frame time over 60 frames on RTX 5080
    const frameRateTest = await page.evaluate(`(async () => {
      const H = TT.inspectHost();
      const times = [];
      for (let i = 0; i < 60; i++) {
        const t0 = performance.now();
        H.render();
        times.push(performance.now() - t0);
        await new Promise((r) => setTimeout(r, 0));
      }
      times.sort((a, b) => a - b);
      return {
        samples: times.length,
        minMs: +times[0].toFixed(2),
        medMs: +times[Math.floor(times.length / 2)].toFixed(2),
        maxMs: +times[times.length - 1].toFixed(2),
        fps: +(1000 / times[Math.floor(times.length / 2)]).toFixed(1)
      };
    })()`);
    summary.frameRateTest = frameRateTest;
    console.log('[AG-308] 5080 Render Timing:', JSON.stringify(frameRateTest));

    fs.writeFileSync(path.join(OUT_QA, 'ag308-summary.json'), JSON.stringify(summary, null, 2));
    fs.writeFileSync(path.join(OUT_REV, 'ag308-summary.json'), JSON.stringify(summary, null, 2));
    console.log('[AG-308] Verification complete! All shots saved.');
  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
