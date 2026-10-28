import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(ROOT, 'qa/2026-10-28-AG-144');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await fs.promises.mkdir(OUT_DIR, { recursive: true });
  const server = await serve(ROOT, 0);
  let browser = null;
  try {
    const size = [1600, 900];
    browser = await launch({
      headless: false,
      args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=' + size.join(',')],
    });
    const page = await browser.newPage({ width: size[0], height: size[1] });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch {}

    const url = `${server.origin}/index.html?debug=1&raf=timer`;
    await page.goto(url, { timeout: 240000 });
    await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
        return true;
      })()`);
      await sleep(300);
    }
    if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) {
      throw new Error('Game did not finish loading');
    }
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
    await sleep(600);

    // Start a Hunt match
    await page.evaluate(`(async () => {
      const T = window.TT;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const n = document.getElementById('playerName'); if (n) n.value = 'Camera';
      document.getElementById('modeHunt').click();
      for (let i = 0; i < 120 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
      for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
      await wait(400);
      return T.getPhase && T.getPhase();
    })()`, 300000);

    await page.evaluate(`import('/tools/camera-rig.js').then((m) => { window.CamRig = m.install(); return true; })`);

    // Hide HUD and set bright daytime
    const setupInfo = await page.evaluate(`(() => {
      const T = window.TT;
      T.unlockAllBuilds();
      T.addCash(50000);
      if (T.clearZombies) T.clearZombies();
      if (T.setWorldTime) T.setWorldTime(0.46);

      // Hide HUD elements
      const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
      const keep = new Set();
      for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
      for (const ch of document.body.children) {
        if (keep.has(ch)) continue;
        if (ch.style.display !== 'none') {
          ch.style.setProperty('display', 'none', 'important');
        }
      }
      const perf = document.getElementById('perf');
      if (perf) perf.style.visibility = 'hidden';

      const p = T.player.position;
      const pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
      const free = (gx, gz) => T.placeRefusalFor('wall', gx, gz) === null && T.placeRefusalFor('light', gx, gz) === null;
      const hq = T.house && T.house.group ? T.house.group.position : null;
      const hqHalf = (T.house && T.house.half) || 5;
      const clearOfHq = (x, z) => !hq || Math.abs(x - hq.x) > hqHalf + 2.0 || Math.abs(z - hq.z) > hqHalf + 2.0;
      const laneClear = (hx, gz0) => {
        for (let i = -1; i <= 6; i++) if (!clearOfHq(T.gridCentre(hx), T.gridCentre(gz0 + i))) return false;
        return true;
      };
      let gx = null, gz = null;
      const offs = [];
      for (let d = 8; d <= 20; d += 2) offs.push(d, -d);
      for (const dx of offs) {
        for (const dz of [0, 4, -4, 8, -8]) {
          const a = pgx + dx, b = pgz + dz;
          if (![0, 1, 2, 3, 4, 5].every((i) => free(a, b + i)) || ![0, 1, 2, 3, 4, 5].every((i) => free(a + 8, b + i))) continue;
          if (!laneClear(a, b) || !laneClear(a + 8, b)) continue;
          gx = a; gz = b; break;
        }
        if (gx !== null) break;
      }
      if (gx === null) throw new Error('Could not find clear strip');
      window.__agStrip = { gx, gz, hx: gx + 8 };
      return window.__agStrip;
    })()`);

    console.log('Selected strips:', setupInfo);
    const telemetry = { strip: setupInfo, ground: { beside: [], behindWalkers: [] }, raised: { beside: [], behindWalkers: [] } };
    const thumbs = [];

    async function captureFrame(relFile, label, row, extraMeta) {
      const abs = path.resolve(OUT_DIR, relFile);
      await page.screenshot(abs);
      const res = await page.send('Page.captureScreenshot', {
        format: 'jpeg',
        quality: 85,
        captureBeyondViewport: false,
        clip: { x: 0, y: 0, width: 1600, height: 900, scale: 480 / 1600 },
      });
      thumbs.push({ data: res.data, label, row });
      return { file: `qa/2026-10-28-AG-144/${relFile}`, label, ...extraMeta };
    }

    // =========================================================================
    // PART 1: GROUND TURRET BEHIND A WALL (HOLDS FIRE)
    // =========================================================================
    const groundSetup = await page.evaluate(`(() => {
      const T = window.TT;
      const { gx, gz } = window.__agStrip;
      const cx = T.gridCentre(gx);
      const cz0 = T.gridCentre(gz);
      const cz2 = T.gridCentre(gz + 2);
      const cz4 = T.gridCentre(gz + 4);

      // Park player out of sight
      T.player.position.set(cx - 35, T.sampleHeight(cx - 35, cz0), cz0);

      const gun = T.placeBuildAt('light', gx, gz, 0);
      const wall = T.placeBuildAt('wall', gx, gz + 2, 0);

      const walkers = [
        { z: T.spawnZombie(cx, cz4, 'shambler', true, true), x: cx, zz: cz4 },
        { z: T.spawnZombie(cx - 0.85, cz4 + 0.45, 'shambler', true, true), x: cx - 0.85, zz: cz4 + 0.45 },
        { z: T.spawnZombie(cx + 0.85, cz4 + 0.45, 'shambler', true, true), x: cx + 0.85, zz: cz4 + 0.45 },
      ];
      for (const w of walkers) {
        w.z.hp = 200; w.z.maxHp = 200;
        w.z.speed = 0.6; w.z.baseSpeed = 0.6;
        if (w.z.mesh) w.z.mesh.rotation.y = Math.PI;
      }

      // Keep walkers marching right behind the wall facing the turret
      window.__agHoldTimer = setInterval(() => {
        for (const w of walkers) {
          if (!w.z || !w.z.alive) continue;
          const phase = ((Date.now() % 1200) / 1200) * Math.PI * 2;
          const dz = Math.sin(phase) * 0.12;
          w.z.x = w.x;
          w.z.z = w.zz + dz;
          if (w.z.mesh) {
            w.z.mesh.position.x = w.x;
            w.z.mesh.position.z = w.zz + dz;
            w.z.mesh.rotation.y = Math.PI;
          }
        }
      }, 16);

      window.__agGround = { gun, wall, walkers, cx, cz0, cz2, cz4 };
      const muzzleY = gun.mesh.position.y + (gun.mesh.userData.muzzleLocal ? gun.mesh.userData.muzzleLocal.y : 0);
      const wallTopY = wall.mesh.position.y + 2.0;
      return { cx, cz0, cz2, cz4, muzzleY, wallTopY };
    })()`);
    telemetry.ground.setup = groundSetup;

    // Set camera beside the ground turret
    await page.evaluate(`(() => {
      const T = window.TT;
      const { cx, cz0, cz2 } = window.__agGround;
      const gy = T.sampleHeight(cx, cz0);
      T.setShotView({
        x: cx - 4.4,
        y: gy + 2.15,
        z: cz0 - 1.5,
        tx: cx + 0.1,
        ty: gy + 1.05,
        tz: cz2 + 0.7,
        fov: 40,
      });
    })()`);
    await sleep(250);

    for (let i = 1; i <= 4; i++) {
      await sleep(280);
      const state = await page.evaluate(`(() => {
        const { gun, walkers } = window.__agGround;
        return {
          turretFlashT: +(gun.flashT || 0).toFixed(3),
          turretFireCd: +(gun.fireCd || 0).toFixed(3),
          walkerHp: walkers.map((w) => w.z.hp),
        };
      })()`);
      const rec = await captureFrame(
        `ground-beside-${i}.png`,
        `Ground Beside #${i} (HP: ${state.walkerHp.join('/')})`,
        'ground-beside',
        state
      );
      telemetry.ground.beside.push(rec);
    }

    // Set camera behind the walkers looking toward the wall and ground turret
    await page.evaluate(`(() => {
      const T = window.TT;
      const { cx, cz0, cz4 } = window.__agGround;
      const gy = T.sampleHeight(cx, cz4);
      T.setShotView({
        x: cx + 1.5,
        y: gy + 2.35,
        z: cz4 + 4.4,
        tx: cx,
        ty: gy + 1.0,
        tz: cz0 + 0.8,
        fov: 40,
      });
    })()`);
    await sleep(250);

    for (let i = 1; i <= 4; i++) {
      await sleep(280);
      const state = await page.evaluate(`(() => {
        const { gun, walkers } = window.__agGround;
        return {
          turretFlashT: +(gun.flashT || 0).toFixed(3),
          turretFireCd: +(gun.fireCd || 0).toFixed(3),
          walkerHp: walkers.map((w) => w.z.hp),
        };
      })()`);
      const rec = await captureFrame(
        `ground-behind-walkers-${i}.png`,
        `Ground Behind Walkers #${i} (HP: ${state.walkerHp.join('/')})`,
        'ground-behind',
        state
      );
      telemetry.ground.behindWalkers.push(rec);
    }

    // Clean up Part 1 before Part 2
    await page.evaluate(`(() => {
      clearInterval(window.__agHoldTimer);
      const { gun, wall, walkers } = window.__agGround;
      for (const w of walkers) {
        if (w.z) { w.z.alive = false; if (w.z.mesh) w.z.mesh.visible = false; }
      }
      if (gun) { gun.hp = 0; if (gun.mesh) gun.mesh.visible = false; }
      if (wall) { wall.hp = 0; if (wall.mesh) wall.mesh.visible = false; }
      if (window.TT.clearZombies) window.TT.clearZombies();
    })()`);
    await sleep(200);

    // =========================================================================
    // PART 2: RAISED TURRET ON PLATFORM FIRING OVER A WALL AT WALKERS
    // =========================================================================
    const raisedSetup = await page.evaluate(`(() => {
      const T = window.TT;
      const { hx, gz } = window.__agStrip;
      const cx = T.gridCentre(hx);
      const cz0 = T.gridCentre(gz);
      const cz2 = T.gridCentre(gz + 2);
      const cz4 = T.gridCentre(gz + 4);

      // Park player out of sight
      T.player.position.set(cx - 35, T.sampleHeight(cx - 35, cz0), cz0);

      // Build 3 support walls + platform + raised turret
      const w1 = T.placeBuildAt('wall', hx, gz, 1);
      const w2 = T.placeBuildAt('wall', hx, gz, 2);
      const w3 = T.placeBuildAt('wall', hx, gz, 3);
      const plat = T.placeBuildAt('platform', hx, gz, 0);
      const gun = T.placeBuildAt('light', hx, gz, 0);
      const wall = T.placeBuildAt('wall', hx, gz + 2, 0);

      const walkers = [
        { z: T.spawnZombie(cx, cz4, 'shambler', true, true), x: cx, zz: cz4 },
        { z: T.spawnZombie(cx - 0.85, cz4 + 0.45, 'shambler', true, true), x: cx - 0.85, zz: cz4 + 0.45 },
        { z: T.spawnZombie(cx + 0.85, cz4 + 0.45, 'shambler', true, true), x: cx + 0.85, zz: cz4 + 0.45 },
      ];
      for (const w of walkers) {
        w.z.hp = 900; w.z.maxHp = 900;
        w.z.speed = 0.6; w.z.baseSpeed = 0.6;
        if (w.z.mesh) w.z.mesh.rotation.y = Math.PI;
      }

      window.__agHoldTimer = setInterval(() => {
        for (const w of walkers) {
          if (!w.z || !w.z.alive) continue;
          const phase = ((Date.now() % 1200) / 1200) * Math.PI * 2;
          const dz = Math.sin(phase) * 0.12;
          w.z.x = w.x;
          w.z.z = w.zz + dz;
          if (w.z.mesh) {
            w.z.mesh.position.x = w.x;
            w.z.mesh.position.z = w.zz + dz;
            w.z.mesh.rotation.y = Math.PI;
          }
        }
      }, 16);

      window.__agRaised = { gun, plat, wall, walkers, cx, cz0, cz2, cz4 };
      const muzzleY = gun.mesh.position.y + (gun.mesh.userData.muzzleLocal ? gun.mesh.userData.muzzleLocal.y : 0);
      const wallTopY = wall.mesh.position.y + 2.0;
      return {
        cx, cz0, cz2, cz4,
        platLevel: plat && plat.level,
        gunLevel: gun && gun.level,
        muzzleY: +muzzleY.toFixed(3),
        wallTopY: +wallTopY.toFixed(3),
        clearanceM: +(muzzleY - wallTopY).toFixed(3),
      };
    })()`);
    telemetry.raised.setup = raisedSetup;
    console.log('Raised setup:', raisedSetup);

    // Camera 1: Beside the raised turret (shows platform, raised gun, intervening wall, and walkers behind it)
    await page.evaluate(`(() => {
      const T = window.TT;
      const { cx, cz0, cz2 } = window.__agRaised;
      const gy = T.sampleHeight(cx, cz0);
      T.setShotView({
        x: cx - 5.2,
        y: gy + 3.4,
        z: cz0 - 1.8,
        tx: cx + 0.1,
        ty: gy + 1.75,
        tz: cz2 + 0.8,
        fov: 42,
      });
    })()`);
    await sleep(220);

    for (let i = 1; i <= 4; i++) {
      // Wait for an active shot flash so each frame catches the raised turret actively firing over the wall
      const state = await page.evaluate(`(async () => {
        const { gun, walkers } = window.__agRaised;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        await wait(160);
        const t0 = Date.now();
        while ((gun.flashT || 0) <= 0.01 && Date.now() - t0 < 450) {
          await wait(12);
        }
        return {
          turretFlashT: +(gun.flashT || 0).toFixed(3),
          turretRecoil: +(gun.recoil || 0).toFixed(3),
          walkerHp: walkers.map((w) => Math.round(w.z.hp)),
        };
      })()`);
      const rec = await captureFrame(
        `raised-beside-${i}.png`,
        `Raised Beside #${i} (HP: ${state.walkerHp.join('/')})`,
        'raised-beside',
        state
      );
      telemetry.raised.beside.push(rec);
    }

    // Camera 2: Behind the walkers looking toward the wall and raised turret firing over it
    await page.evaluate(`(() => {
      const T = window.TT;
      const { cx, cz0, cz4 } = window.__agRaised;
      const gy = T.sampleHeight(cx, cz4);
      T.setShotView({
        x: cx + 1.6,
        y: gy + 2.6,
        z: cz4 + 4.8,
        tx: cx,
        ty: gy + 1.65,
        tz: cz0 + 0.6,
        fov: 42,
      });
    })()`);
    await sleep(200);

    for (let i = 1; i <= 4; i++) {
      const state = await page.evaluate(`(async () => {
        const { gun, walkers } = window.__agRaised;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        await wait(160);
        const t0 = Date.now();
        while ((gun.flashT || 0) <= 0.01 && Date.now() - t0 < 450) {
          await wait(12);
        }
        return {
          turretFlashT: +(gun.flashT || 0).toFixed(3),
          turretRecoil: +(gun.recoil || 0).toFixed(3),
          walkerHp: walkers.map((w) => Math.round(w.z.hp)),
        };
      })()`);
      const rec = await captureFrame(
        `raised-behind-walkers-${i}.png`,
        `Raised Behind Walkers #${i} (HP: ${state.walkerHp.join('/')})`,
        'raised-behind',
        state
      );
      telemetry.raised.behindWalkers.push(rec);
    }

    // Build 4x4 contact sheet in-page
    const rows = [
      thumbs.slice(0, 4),
      thumbs.slice(4, 8),
      thumbs.slice(8, 12),
      thumbs.slice(12, 16),
    ];
    const sheetB64 = await page.evaluate(`(async (rows, tw) => {
      const load = (d) => new Promise((r) => {
        if (!d) return r(null);
        const i = new Image();
        i.onload = () => r(i);
        i.onerror = () => r(null);
        i.src = 'data:image/jpeg;base64,' + d;
      });
      const imgs = await Promise.all(rows.flat().map((t) => load(t.data)));
      const first = imgs.find(Boolean), th = first ? Math.round(tw * first.height / first.width) : Math.round(tw * 9 / 16);
      const cols = 4, c = document.createElement('canvas');
      c.width = cols * tw; c.height = rows.length * th;
      const g = c.getContext('2d');
      g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
      let k = 0;
      rows.forEach((row, y) => row.forEach((t, x) => {
        const im = imgs[k++], px = x * tw, py = y * th;
        if (im) g.drawImage(im, px, py, tw, th);
        g.fillStyle = '#000b'; g.fillRect(px, py + th - 28, tw, 28);
        g.fillStyle = '#f4ecd0'; g.font = '600 15px Arial, sans-serif';
        g.fillText(t.label, px + 8, py + th - 9, tw - 16);
        g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(px, py, tw, th);
      }));
      return c.toDataURL('image/jpeg', 0.88).split(',')[1];
    })(${JSON.stringify(rows)}, 440)`, 60000);

    await fs.promises.writeFile(path.join(OUT_DIR, 'sheet.jpg'), Buffer.from(sheetB64, 'base64'));
    await fs.promises.writeFile(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(telemetry, null, 2));
    console.log('Saved 16 PNGs, sheet.jpg, and telemetry.json to qa/2026-10-28-AG-144/');
  } finally {
    try { await browser?.close(); } catch {}
    try { await server?.close(); } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
