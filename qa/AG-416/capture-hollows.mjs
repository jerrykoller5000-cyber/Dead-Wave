// qa/AG-416/capture-hollows.mjs — Native RTX 5080 WebGPU before/after capture + live Hollows diagnostics
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'AG-416');
fs.mkdirSync(OUT_DIR, { recursive: true });

const tag = (process.argv[2] || 'before').replace(/[^a-z0-9_-]/gi, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = 1600, H = 900;

async function main() {
  const server = await serve(ROOT, 0);
  let browser = null;
  try {
    browser = await launch({
      headless: false,
      args: ['--disable-features=CalculateNativeWinOcclusion', `--window-size=${W},${H}`],
    });
    const page = await browser.newPage({ width: W, height: H });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: W + 20, height: H + 80 } });
      await page.send('Page.bringToFront');
    } catch (_) {}

    const url = `${server.origin}/index.html?debug=1&raf=timer`;
    await page.goto(url, { timeout: 180000 });
    await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
    for (let i = 0; i < 3; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
        return true;
      })()`);
      await sleep(300);
    }
    const hasTT = await page.waitFor('!!window.TT', { timeout: 240000 });
    if (!hasTT) throw new Error('window.TT did not load: ' + (page.errors[0] || 'unknown'));
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
    await sleep(600);

    await page.evaluate(`import('/tools/camera-rig.js').then(m => { window.CamRig = m.install(); return true; })`);

    // Start a real Hunt match and equip flashlight + NVG so we can inspect everything live.
    await page.evaluate(`(async () => {
      const T = window.TT;
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'AG416Audit';
      const huntBtn = document.getElementById('modeHunt');
      if (huntBtn) huntBtn.click();
      for (let i = 0; i < 120 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
      for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
      if (T.runDevCommand) {
        T.runDevCommand('godmode');
        T.runDevCommand('giveall');
      }
      if (T.setGearDbg) {
        T.setGearDbg('nvg');
        T.setGearDbg('laserLight');
      }
      if (T.armoryDbg && T.armoryDbg.fit) {
        try { T.armoryDbg.fit('pistol', 'laserLight', true); T.armoryDbg.fit('m4', 'laserLight', true); } catch (_) {}
      }
      if (T.clearZombies) T.clearZombies();
      if (T.skipGrace) T.skipGrace();
      for (let i = 0; i < 600; i++) {
        if (!T.marine || !T.marine.getObjectByName('insertion-harness')) break;
        if (T.stepFrame) T.stepFrame(0.05);
      }
      if (T.clearZombies) T.clearZombies();
      if (T.setWorldTime) T.setWorldTime(0.45); // midday prep — the real time players enter Hollows!
      await wait(300);
      return true;
    })()`, 180000);

    await page.waitFor('(() => { try { return (window.TT.renderer.info.render.calls || 0) > 0; } catch { return true; } })()', { timeout: 20000 });
    await sleep(250);

    const metrics = {
      tag,
      timestamp: new Date().toISOString(),
      renderer: await page.evaluate(`(() => {
        const r = window.TT.renderer;
        return { isWebGPU: !!(r && r.backend && r.backend.isWebGPUBackend), name: r?.constructor?.name || 'unknown' };
      })()`),
      warrens: {},
      gameplayChecks: {},
      errors: [],
    };

    const THEMES = ['root', 'shale', 'iron', 'wet', 'hill'];

    async function waitFrames(n = 8) {
      await page.evaluate(`(async () => {
        const T = window.TT;
        for (let i = 0; i < ${n}; i++) await new Promise(r => setTimeout(r, 35));
      })()`);
    }

    async function measurePerf(samples = 18) {
      return await page.evaluate(`(async () => {
        const T = window.TT;
        const rInfo = T.renderer?.info?.render;
        const calls0 = rInfo ? (rInfo.calls | 0) : 0;
        const frame0 = rInfo ? (rInfo.frame | 0) : 0;
        const t0 = performance.now();
        for (let i = 0; i < ${samples}; i++) {
          await new Promise(r => setTimeout(r, 20));
        }
        const elapsed = Math.max(1, performance.now() - t0);
        const calls1 = rInfo ? (rInfo.calls | 0) : 0;
        const frame1 = rInfo ? (rInfo.frame | 0) : 0;
        const frames = Math.max(1, frame1 - frame0);
        const info = rInfo || {};
        return {
          fpsApprox: +(frames * 1000 / elapsed).toFixed(1),
          callsPerFrame: Math.round((calls1 - calls0) / frames),
          triangles: info.triangles | 0,
          geometries: T.renderer?.info?.memory?.geometries | 0,
        };
      })()`);
    }

    for (const theme of THEMES) {
      const info = await page.evaluate(`(async () => {
        const T = window.TT;
        const built = T.enterHollow({ theme: '${theme}', cave: ${THEMES.indexOf(theme)} });
        // Silence nest timers and freeze sleepers cleanly so shots are deterministic, keep sleepers visible!
        const F = T.belowDbg?.fight?.();
        if (F) for (const n of F.nests) n.timer = 1e9;
        // Let fade-in finish (DESCENT_FADE_S = 1.4s)
        const s0 = T.getSimTime();
        while (T.getSimTime() - s0 < 1.8) await new Promise(r => setTimeout(r, 30));

        const g = built.group.position;
        const C = built.cell || 7.5;
        const p = built.plan;
        const cellCtr = (c) => ({ x: g.x + c.i * C + C / 2, y: built.groundAt(g.x + c.i * C + C / 2, g.z + c.j * C + C / 2) ?? g.y, z: g.z + c.j * C + C / 2 });

        // Find open camera position inside a chamber looking at a target
        const openCamFrom = (target, preferredDist, lookH = 1.15, eyeH = 1.65) => {
          const dirs = [
            [0, 1], [1, 0], [0, -1], [-1, 0],
            [0.707, 0.707], [-0.707, 0.707], [0.707, -0.707], [-0.707, -0.707],
          ];
          let best = null, bestD = -1;
          for (const [dx, dz] of dirs) {
            for (let dist = preferredDist; dist >= 1.8; dist -= 0.4) {
              const cx = target.x + dx * dist, cz = target.z + dz * dist;
              const gy = built.groundAt(cx, cz);
              if (gy == null) continue;
              if (built.openAt && !built.openAt(cx, gy + eyeH, cz, 0.35)) continue;
              // Check midpoint clearance too
              const mx = (cx + target.x) * 0.5, mz = (cz + target.z) * 0.5;
              const mgy = built.groundAt(mx, mz);
              if (mgy == null || (built.openAt && !built.openAt(mx, mgy + eyeH * 0.85, mz, 0.25))) continue;
              if (dist > bestD) {
                bestD = dist;
                best = { x: cx, y: gy + eyeH, z: cz, tx: target.x, ty: target.y + lookH, tz: target.z, fov: 66 };
              }
              break;
            }
          }
          return best || { x: target.x, y: target.y + eyeH, z: target.z + 2.2, tx: target.x, ty: target.y + lookH, tz: target.z, fov: 66 };
        };

        const ch0 = p.cells[p.chambers[0]];
        const ch0Ctr = cellCtr(ch0);
        const deepSet = built.points.set;
        const sb = built.points.strongbox;
        const runeDoor = built.doors.rune;
        // Pick a camera in the 2x2 Deep looking across set piece toward strongbox + rune door!
        const ddX = runeDoor.x - deepSet.x, ddZ = runeDoor.z - deepSet.z;
        const ddL = Math.hypot(ddX, ddZ) || 1;
        let deepCam = null;
        for (const dist of [5.8, 5.0, 4.2, 3.4]) {
          const cx = deepSet.x - (ddX / ddL) * dist + (-ddZ / ddL) * 1.4;
          const cz = deepSet.z - (ddZ / ddL) * dist + (ddX / ddL) * 1.4;
          const gy = built.groundAt(cx, cz);
          if (gy != null && (!built.openAt || built.openAt(cx, gy + 1.9, cz, 0.35))) {
            deepCam = { x: cx, y: gy + 1.9, z: cz, tx: (deepSet.x + runeDoor.x) * 0.5, ty: deepSet.y + 1.5, tz: (deepSet.z + runeDoor.z) * 0.5, fov: 68 };
            break;
          }
        }
        if (!deepCam) deepCam = openCamFrom(deepSet, 5.0, 1.4, 1.85);

        const nest0 = built.points.nests[0];
        const crate0 = built.points.crates[0];
        const tag0 = built.points.tags[0];

        // Count meshes & draw inventory inside the warren group
        let meshCount = 0, triCount = 0, namedProps = [];
        built.group.traverse((o) => {
          if (o.name) namedProps.push(o.name);
          if (o.isMesh) {
            meshCount++;
            const pos = o.geometry?.attributes?.position;
            const idx = o.geometry?.index;
            triCount += idx ? idx.count / 3 : (pos ? pos.count / 3 : 0);
          }
        });

        // Inspect lighting & fog live while standing in chamber 0
        T.player.position.set(ch0Ctr.x, ch0Ctr.y + 0.05, ch0Ctr.z);
        await new Promise(r => setTimeout(r, 150));

        const sc = T.scene;
        const lights = [];
        sc.traverse((o) => {
          if (o.isLight && o.intensity > 0.001) {
            lights.push({ type: o.type, name: o.name || '', intensity: +o.intensity.toFixed(3), color: '#' + o.color.getHexString() });
          }
        });

        return {
          theme: '${theme}',
          cells: built.cells.length,
          meshCount,
          triCount: Math.round(triCount),
          hasCrateMeshes: namedProps.some(n => /supply-crate|hollow-crate/i.test(n)),
          hasTagMeshes: namedProps.some(n => /dog-tag|hollow-tag/i.test(n)),
          hasBoltMeshes: namedProps.some(n => /bolt-hole/i.test(n)),
          fog: sc.fog ? { color: '#' + sc.fog.color.getHexString(), near: +sc.fog.near.toFixed(1), far: +sc.fog.far.toFixed(1) } : null,
          bg: sc.background && sc.background.getHexString ? '#' + sc.background.getHexString() : null,
          activeLights: lights,
          ch0Ctr,
          ch0Cam: openCamFrom(ch0Ctr, 4.6, 1.25, 1.75),
          deepCam,
          deepSet,
          nest0,
          nestCam: nest0 ? openCamFrom(nest0, 3.6, 0.85, 1.55) : null,
          crate0,
          crateCam: crate0 ? openCamFrom(crate0, 2.8, 0.45, 1.45) : null,
          tag0,
          arrive: built.arrive,
          breachCam: '${theme}' === 'iron' ? (() => {
            const r = p.cells[p.ramps[0]];
            const D = [[0, -1], [1, 0], [0, 1], [-1, 0]][r.rampSide];
            const rx = g.x + r.i * C + C / 2, rz = g.z + r.j * C + C / 2;
            const bx = rx - D[0] * (C / 2 - 0.4), bz = rz - D[1] * (C / 2 - 0.4);
            const cx = bx - D[0] * 3.8, cz = bz - D[1] * 3.8;
            const gy = built.groundAt(cx, cz) ?? (g.y + 0);
            return { x: cx, y: gy + 1.65, z: cz, tx: bx, ty: gy + 1.35, tz: bz, fov: 66 };
          })() : null,
          descentCam: { x: built.arrive.x - 0.4, y: built.arrive.y + 1.7, z: built.arrive.z, tx: built.arrive.x + 8.5, ty: built.arrive.y - 0.4, tz: built.arrive.z, fov: 68 },
        };
      })()`, 60000);

      // Hide UI for scenic architecture shots
      await page.evaluate(`window.CamRig.ui(false)`);

      // 1. Chamber 0 scenic shot
      await page.evaluate(`(() => {
        const T = window.TT;
        const c = ${JSON.stringify(info.ch0Ctr)};
        T.player.position.set(c.x, c.y + 0.05, c.z);
        T.setShotView(${JSON.stringify(info.ch0Cam)});
      })()`);
      await waitFrames(10);
      await page.screenshot(path.join(OUT_DIR, `${tag}-${theme}-chamber.png`));
      const perfChamber = await measurePerf(14);

      // 2. Deep set-piece + strongbox + rune door shot
      await page.evaluate(`(() => {
        const T = window.TT;
        const d = ${JSON.stringify(info.deepSet)};
        // Stand slightly off-center so we don't photobomb the set piece, trigger set piece OFF for clean architecture view or keep it?
        // Actually setShotView parks player at chamber 0 if we want, OR let's move player near Deep entrance so accents/lamps light up!
        T.player.position.set(d.x - 4.5, d.y + 0.05, d.z);
        const gy = T.hollowState().below ? T.sampleHeight(d.x - 4.5, d.z) : d.y;
        T.player.position.y = gy + 0.05;
        T.setShotView(${JSON.stringify(info.deepCam)});
      })()`);
      await waitFrames(10);
      await page.screenshot(path.join(OUT_DIR, `${tag}-${theme}-deep.png`));
      const perfDeep = await measurePerf(14);

      // 3. Extra theme-specific signature shots
      if (theme === 'iron') {
        await page.evaluate(`(() => {
          const T = window.TT;
          const cam = ${JSON.stringify(info.breachCam)};
          T.player.position.set(cam.x, cam.y - 1.6, cam.z);
          T.setShotView(cam);
        })()`);
        await waitFrames(10);
        await page.screenshot(path.join(OUT_DIR, `${tag}-iron-breach.png`));

        await page.evaluate(`(() => {
          const T = window.TT;
          const a = ${JSON.stringify(info.arrive)};
          T.player.position.set(a.x - 1.1, a.y + 0.05, a.z + 1.2);
          T.setShotView(${JSON.stringify(info.descentCam)});
        })()`);
        await waitFrames(10);
        await page.screenshot(path.join(OUT_DIR, `${tag}-iron-descent.png`));
      }
      if (theme === 'root' && info.nestCam) {
        await page.evaluate(`(() => {
          const T = window.TT;
          const n = ${JSON.stringify(info.nest0)};
          T.player.position.set(n.x, n.y + 0.05, n.z);
          T.setShotView(${JSON.stringify(info.nestCam)});
        })()`);
        await waitFrames(10);
        await page.screenshot(path.join(OUT_DIR, `${tag}-root-nest.png`));
      }
      if (theme === 'root' && info.crateCam) {
        await page.evaluate(`(() => {
          const T = window.TT;
          const cr = ${JSON.stringify(info.crate0)};
          T.player.position.set(cr.x + 1.4, cr.y + 0.05, cr.z);
          T.setShotView(${JSON.stringify(info.crateCam)});
        })()`);
        await waitFrames(10);
        await page.screenshot(path.join(OUT_DIR, `${tag}-root-crate.png`));
      }

      if (theme === 'hill') {
        // Light the nearest pitch brazier in Chamber 0 and shoot it!
        const brCam = await page.evaluate(`(() => {
          const T = window.TT;
          const w = T.hollowState().below ? T.belowDbg : null;
          const built = T.scene.getObjectByName('warren:hill');
          const br = built?.children?.find(c => c.name && c.name.startsWith('hollow-interactive-pitch-brazier'));
          if (!br) return null;
          const g = built.position;
          const bx = br.position.x + g.x, by = br.position.y + g.y, bz = br.position.z + g.z;
          const f = ${JSON.stringify(info.ch0Ctr)};
          const dx = f.x - bx, dz = f.z - bz, dl = Math.hypot(dx, dz) || 1;
          // Stand 1.25 m in front of the brazier in open Chamber 0 space so warrenKeepIn never snaps player back to Deep!
          T.player.position.set(bx + (dx / dl) * 1.25, by + 0.05, bz + (dz / dl) * 1.25);
          if (T.doAction) T.doAction();
          return { x: bx + (dx / dl) * 3.2, y: by + 1.55, z: bz + (dz / dl) * 3.2, tx: bx, ty: by + 1.05, tz: bz, fov: 64 };
        })()`);
        if (brCam) {
          await page.evaluate(`window.TT.setShotView(${JSON.stringify(brCam)})`);
          await waitFrames(12);
          await page.screenshot(path.join(OUT_DIR, `${tag}-hill-brazier.png`));
        }
      }
      if (theme === 'iron') {
        // Shoot wall-oriented bolt-hole with feathered volumetric daylight shaft!
        const bhCam = await page.evaluate(`(() => {
          const T = window.TT;
          const built = T.scene.getObjectByName('warren:iron');
          const bh = built?.children?.find(c => c.name === 'bolt-hole-0');
          if (!bh) return null;
          const g = built.position;
          const bx = bh.position.x + g.x, by = bh.position.y + g.y, bz = bh.position.z + g.z;
          const ry = bh.rotation.y || 0;
          const cx = bx + Math.sin(ry) * 3.4, cz = bz + Math.cos(ry) * 3.4;
          T.player.position.set(cx, by + 0.05, cz);
          return { x: cx, y: by + 1.65, z: cz, tx: bx, ty: by + 1.15, tz: bz, fov: 66 };
        })()`);
        if (bhCam) {
          await page.evaluate(`window.TT.setShotView(${JSON.stringify(bhCam)})`);
          await waitFrames(10);
          await page.screenshot(path.join(OUT_DIR, `${tag}-iron-bolt.png`));
        }
      }

      metrics.warrens[theme] = {
        cells: info.cells,
        meshCount: info.meshCount,
        triCount: info.triCount,
        hasCrateMeshes: info.hasCrateMeshes,
        hasTagMeshes: info.hasTagMeshes,
        hasBoltMeshes: info.hasBoltMeshes,
        fog: info.fog,
        bg: info.bg,
        activeLights: info.activeLights,
        perfChamber,
        perfDeep,
      };

      await page.evaluate(`window.TT.setShotView(null); window.TT.leaveHollow('mouth');`);
      await waitFrames(4);
    }

    // 4. Live Gameplay Checks in Iron warren: 3P HUD+sonar, 1P Flashlight, NVG washout vs phosphor, explored cells, loot, bolt-hole!
    const gpChecks = await page.evaluate(`(async () => {
      const T = window.TT;
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const built = T.enterHollow({ theme: 'iron', cave: 2 });
      const F = T.belowDbg?.fight?.();
      if (F) for (const n of F.nests) n.timer = 1e9;
      const s0 = T.getSimTime();
      while (T.getSimTime() - s0 < 1.8) await wait(30);

      // Stand in Chamber 0 facing an open corridor
      const g = built.group.position, C = built.cell || 7.5, ch0 = built.plan.cells[built.plan.chambers[0]];
      const cx = g.x + ch0.i * C + C / 2, cz = g.z + ch0.j * C + C / 2;
      const cy = built.groundAt(cx, cz);
      T.player.position.set(cx, cy + 0.05, cz);
      T.setShotView(null);
      window.CamRig.ui(true);
      if (T.setViewFirstDbg) T.setViewFirstDbg(false);
      await wait(450);

      const exploredAfterWalk = (T.hollowState().explored || []).length;
      return {
        exploredAfterWalk,
        cx, cy, cz,
        bolt0: built.exits.boltHoles[0],
        crate0: built.points.crates[0],
        sb: built.points.strongbox,
      };
    })()`, 30000);
    await page.screenshot(path.join(OUT_DIR, `${tag}-gameplay-3p.png`));

    // Live 1P with Flashlight ON (using real toggleFlashlightDbg!)
    await page.evaluate(`(async () => {
      const T = window.TT;
      if (T.setViewFirstDbg) T.setViewFirstDbg(true);
      if (T.toggleFlashlightDbg) T.toggleFlashlightDbg();
      await new Promise(r => setTimeout(r, 400));
    })()`);
    await page.screenshot(path.join(OUT_DIR, `${tag}-gameplay-1p-light.png`));

    // Live NVG toggle check (does it enter real green phosphor night vision underground?)
    const nvgResult = await page.evaluate(`(async () => {
      const T = window.TT;
      if (T.toggleNvgDbg) T.toggleNvgDbg();
      await new Promise(r => setTimeout(r, 400));
      const cv = T.renderer.domElement;
      return {
        hasPhosphor: cv.classList.contains('nvg-phosphor'),
        hasWashout: cv.classList.contains('nvg-washout'),
        tacticalText: document.getElementById('tacticalLine')?.textContent || '',
      };
    })()`);
    await page.screenshot(path.join(OUT_DIR, `${tag}-gameplay-nvg.png`));

    // Turn off NVG, open Full Subterranean Map (Tab), shoot it, then verify bolt-hole, strongbox, rayWall & hidWorld!
    await page.evaluate(`(async () => {
      const T = window.TT;
      if (T.toggleNvgDbg) T.toggleNvgDbg();
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', key: 'Tab', bubbles: true }));
      await new Promise(r => setTimeout(r, 350));
    })()`);
    await page.screenshot(path.join(OUT_DIR, `${tag}-fullmap.png`));

    const interactChecks = await page.evaluate(`(async () => {
      const T = window.TT;
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', key: 'Tab', bubbles: true }));
      await new Promise(r => setTimeout(r, 200));
      const hidWorldCount = Array.isArray(T.belowDbg?.hidWorld?.()) ? T.belowDbg.hidWorld().length : 0;

      const bolt0 = ${JSON.stringify(gpChecks.bolt0)};
      T.player.position.set(bolt0.x, bolt0.y + 0.05, bolt0.z);
      await new Promise(r => setTimeout(r, 200));
      const boltAction = T.actionTarget ? T.actionTarget() : null;
      const boltPrompt = document.getElementById('kioskPrompt')?.textContent?.trim() || '';

      // Verify rayWall hits a warren wall from chamber center outward
      const cx = ${JSON.stringify(gpChecks.cx)}, cy = ${JSON.stringify(gpChecks.cy)}, cz = ${JSON.stringify(gpChecks.cz)};
      const wallRayHit = !!(T.belowDbg?.rayWall?.(cx, cy + 1.2, cz, cx + 18, cy + 1.2, cz)
        || T.belowDbg?.rayWall?.(cx, cy + 1.2, cz, cx, cy + 1.2, cz + 18));

      const sb = ${JSON.stringify(gpChecks.sb)};
      T.player.position.set(sb.x, sb.y + 0.05, sb.z);
      await new Promise(r => setTimeout(r, 200));
      const sbBefore = T.actionTarget ? T.actionTarget() : null;
      const gotBox = T.claimHollowHere ? T.claimHollowHere(sb.x, sb.y, sb.z) : null;
      await new Promise(r => setTimeout(r, 200));
      const sbAfterClaim = T.actionTarget ? T.actionTarget() : null;

      T.leaveHollow('mouth');
      // Quick check of Wet warren wading depth
      const wb = T.enterHollow({ theme: 'wet', cave: 3 });
      const wc = wb.plan.cells[wb.plan.chambers[0]];
      const wx = wb.group.position.x + wc.i * wb.cell + wb.cell / 2;
      const wz = wb.group.position.z + wc.j * wb.cell + wb.cell / 2;
      const wetWaterDepth = +(T.waterDepthAt ? T.waterDepthAt(wx, wz) : 0).toFixed(2);
      T.leaveHollow('mouth');

      return { hidWorldCount, wallRayHit, wetWaterDepth, boltAction, boltPrompt, sbBefore, gotBox: !!gotBox, sbAfterClaim };
    })()`);

    metrics.gameplayChecks = {
      exploredAfterWalk: gpChecks.exploredAfterWalk,
      nvg: nvgResult,
      interact: interactChecks,
    };
    metrics.errors = page.errors.slice(0, 10);

    fs.writeFileSync(path.join(OUT_DIR, `metrics-${tag}.json`), JSON.stringify(metrics, null, 2));
    console.log(JSON.stringify(metrics, null, 2));
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
