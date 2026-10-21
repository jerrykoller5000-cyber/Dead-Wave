import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch, attach } from '../../tools/cdp.mjs';

process.env.DW_ALLOW_RAW_CDP = '1';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ITCH_DIR = path.join(ROOT, 'docs', 'release', 'itch');
const QA_DIR = __dirname;

fs.mkdirSync(ITCH_DIR, { recursive: true });
fs.mkdirSync(QA_DIR, { recursive: true });

function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`Not a valid PNG: ${filePath}`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height, bytes: buf.length };
}

async function stepFrames(page, count = 30) {
  await page.evaluate(`(async () => {
    for (let i = 0; i < ${count}; i++) {
      await new Promise((r) => requestAnimationFrame(r));
    }
  })()`);
}

async function captureRemainingScreenshots() {
  console.log('[AG-104] Re-capturing 04-the-hollows.png (1920x1080), 05-dawn-survived.png (1920x1080), and cover.png (630x500) on High graphics...');
  const srv = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1920,1080']
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    await page.goto(`${srv.origin}/index.html?debug=1`, { timeout: 240000 });
    await page.waitFor('!!window.TT', { timeout: 240000 });
    await page.evaluate(`(() => {
      const dsc = document.getElementById('disclaimer');
      if (dsc && dsc.dataset.state !== 'done') {
        const s = document.getElementById('disclaimerSkip');
        if (s) s.click(); else dsc.click();
      }
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8'));

    const initInfo = await page.evaluate(`(async () => {
      if (window.TT.applyGraphicsPreset) window.TT.applyGraphicsPreset('high');
      const highBtn = document.querySelector('#gfxPresets button[data-gfx="high"]');
      if (highBtn) highBtn.click();
      await startMatch(window.TT, 'Gravewalker');
      TT.runDevCommand('godmode');
      return {
        gfx: window.TT.getGfx ? window.TT.getGfx() : null,
        backend: window.TT.getRendererBackend ? window.TT.getRendererBackend() : null
      };
    })()`);
    console.log('[AG-104] Graphics preset & backend:', initInfo);

    await page.waitFor(`window.TT && window.TT.getPhase() === 'prep' && !document.body.classList.contains('deploying')`, {
      timeout: 60000
    });

    // Ensure debug #perf, #ordersCard, and #errorCard are hidden
    await page.evaluate(`(() => {
      const perf = document.getElementById('perf');
      if (perf) {
        perf.classList.remove('on');
        perf.style.display = 'none';
      }
      const orders = document.getElementById('ordersCard');
      if (orders) orders.classList.remove('show');
      const banner = document.getElementById('bigBanner');
      if (banner) banner.classList.remove('show');
      const err = document.getElementById('errorCard');
      if (err) {
        err.hidden = true;
        err.style.display = 'none';
      }
    })()`);

    // -------------------------------------------------------------------------
    // 1. 04-the-hollows.png (1920x1080) — Delving the Hollows underground warren (Root Warren)
    // -------------------------------------------------------------------------
    const hollowInfo = await page.evaluate(`(() => {
      const TT = window.TT;
      TT.applyGraphicsPreset('high');
      TT.grantAllWeapons();
      TT.setWeapon(TT.WEAPON_ORDER.indexOf('shotgun'));
      TT.setGearDbg('light');
      TT.setGearDbg('laser');
      TT.setLasersDbg(true);
      TT.addCash(340);

      // Enter the Root Warren while phase === 'prep' and gameStarted === true!
      const built = TT.enterHollow({ cave: 0, theme: 'root' });
      if (!built) return { ok: false, phase: TT.getPhase() };

      // Stand inside the 12m x 12m Deep chamber (depth 3, roof 6.5m) facing the Rune Door & Strongbox & glowing roots
      const dc = built.points.set;
      const door = built.doors && built.doors.rune ? built.doors.rune : { x: dc.x, z: dc.z + 4 };
      const box = built.points.strongbox || { x: dc.x + 2, z: dc.z + 2 };
      const gy = built.groundAt(dc.x, dc.z);

      // Direction from center of Deep chamber toward the Rune Door / Strongbox
      const dirX = door.x - dc.x, dirZ = door.z - dc.z;
      const len = Math.hypot(dirX, dirZ) || 1;
      const ux = dirX / len, uz = dirZ / len;
      const rx = -uz, rz = ux;

      // Place the marine 2.2m back from center looking toward the Rune Door & Strongbox
      const px = dc.x - ux * 2.2 - rx * 0.6;
      const pz = dc.z - uz * 2.2 - rz * 0.6;
      const pgy = built.groundAt(px, pz) ?? gy;
      TT.player.position.set(px, pgy + 0.05, pz);

      const yaw = Math.atan2(ux, uz);
      TT.player.rotation.y = yaw;
      TT.setAimYawDbg(yaw);
      TT.setAimTargetDbg(dc.x + ux * 3.0, dc.z + uz * 3.0);

      // Place a pulsing warren nest in the Deep chamber for visual richness + 3 awake warren zombies closing in
      const nests = TT.belowDbg && TT.belowDbg.nests ? TT.belowDbg.nests() : [];
      if (nests && nests.length > 0) {
        nests[0].position.set(dc.x + ux * 2.4 + rx * 1.8, gy + 0.55, dc.z + uz * 2.4 + rz * 1.8);
      }

      const z1 = TT.spawnZombie(dc.x + ux * 1.5 - rx * 1.1, dc.z + uz * 1.5 - rz * 1.1, 'feral', true, true);
      if (z1) {
        z1.below = true; z1.sleeping = false; z1.riseT = 0; z1.riseOff = 0;
        z1.mesh.position.y = gy;
        z1.mesh.rotation.y = Math.atan2(px - z1.mesh.position.x, pz - z1.mesh.position.z);
      }
      const z2 = TT.spawnZombie(dc.x + ux * 2.6 + rx * 0.4, dc.z + uz * 2.6 + rz * 0.4, 'shambler', true, true);
      if (z2) {
        z2.below = true; z2.sleeping = false; z2.riseT = 0; z2.riseOff = 0;
        z2.mesh.position.y = gy;
        z2.mesh.rotation.y = Math.atan2(px - z2.mesh.position.x, pz - z2.mesh.position.z);
      }
      const z3 = TT.spawnZombie(dc.x + ux * 0.8 + rx * 2.2, dc.z + uz * 0.8 + rz * 2.2, 'spider', true, true);
      if (z3) {
        z3.below = true; z3.sleeping = false; z3.riseT = 0; z3.riseOff = 0;
        z3.mesh.position.y = gy;
        z3.mesh.rotation.y = Math.atan2(px - z3.mesh.position.x, pz - z3.mesh.position.z);
      }

      // Park the camera inside the 12m x 12m Deep chamber just behind and above the marine's shoulder
      // so the camera stays inside the underground chamber and frames the marine, warren walls, roots, nest, strongbox, and HUD
      TT.setShotView({
        x: px - ux * 3.1 - rx * 1.1,
        y: pgy + 2.45,
        z: pz - uz * 3.1 - rz * 1.1,
        tx: dc.x + ux * 2.2,
        ty: gy + 1.15,
        tz: dc.z + uz * 2.2,
        fov: 52
      });

      const banner = document.getElementById('bigBanner');
      if (banner) banner.classList.remove('show');
      return { ok: true, state: TT.hollowState(), dc, gy };
    })()`);
    console.log('[AG-104] Hollow setup:', hollowInfo);
    await stepFrames(page, 35);
    const shot4 = path.join(ITCH_DIR, '04-the-hollows.png');
    await page.screenshot(shot4);
    fs.copyFileSync(shot4, path.join(QA_DIR, '04-the-hollows.png'));
    console.log('[AG-104] Saved 04-the-hollows.png:', readPngDimensions(shot4));

    // Leave the Hollows cleanly
    await page.evaluate(`(() => {
      const TT = window.TT;
      TT.setShotView(null);
      if (TT.hollowState && TT.hollowState().below) TT.leaveHollow('mouth');
      TT.clearZombies();
    })()`);
    await stepFrames(page, 15);

    // -------------------------------------------------------------------------
    // 2. 05-dawn-survived.png (1920x1080) — Dawn breaking after surviving a night
    // -------------------------------------------------------------------------
    await page.evaluate(`(() => {
      const TT = window.TT;
      TT.startPrep();
      TT.clearZombies();
      TT.applyGraphicsPreset('high');
      TT.devBaseBuild();
      TT.setDay(5);
      TT.setWorldTime(0.268); // warm golden dawn sun breaking over the clearing
      TT.grantAllWeapons();
      TT.setWeapon(TT.WEAPON_ORDER.indexOf('ak'));
      TT.addCash(940);
      TT.setHp(92);
      TT.setArmor(50);

      // Stand in the yard looking across the defended clearing with fresh corpses & skulls from the night
      const px = -2.0, pz = -12.5;
      TT.player.position.set(px, TT.sampleHeight(px, pz), pz);
      const yaw = 0.45;
      TT.player.rotation.y = yaw;
      TT.setAimYawDbg(yaw);
      TT.setAimTargetDbg(px + Math.sin(yaw) * 10, pz + Math.cos(yaw) * 10);

      for (const [kx, kz, kind] of [[0.5, -9.2, 'brute'], [-1.4, -8.5, 'feral'], [2.1, -8.8, 'shambler']]) {
        const z = TT.spawnZombie(kx, kz, kind, false, true);
        if (z) {
          z.riseT = 0;
          z.riseOff = 0;
          TT.killZombie(z, false, { kind: 'bullet', dir: { x: 0, z: 1 } });
        }
      }

      // Show the authentic Dawn / Day Cleared banner in the centre-top (#bigBanner)
      const banner = document.getElementById('bigBanner');
      if (banner) {
        const t = banner.querySelector('.t');
        const s = banner.querySelector('.s');
        if (t) {
          t.textContent = 'DAY 5 CLEARED';
          t.style.color = '#7cdea0';
        }
        if (s) {
          s.textContent = 'Dawn breaks over the clearing · Bank skulls at the HQ window';
        }
        banner.classList.add('show');
      }
      const err = document.getElementById('errorCard');
      if (err) { err.hidden = true; err.style.display = 'none'; }
    })()`);
    await stepFrames(page, 35);
    const shot5 = path.join(ITCH_DIR, '05-dawn-survived.png');
    await page.screenshot(shot5);
    fs.copyFileSync(shot5, path.join(QA_DIR, '05-dawn-survived.png'));
    console.log('[AG-104] Saved 05-dawn-survived.png:', readPngDimensions(shot5));

    // -------------------------------------------------------------------------
    // 3. cover.png (630x500) — Night moment on High graphics with the title, no HUD
    // -------------------------------------------------------------------------
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 630,
      height: 500,
      deviceScaleFactor: 1,
      mobile: false
    });
    await page.evaluate(`(() => {
      window.dispatchEvent(new Event('resize'));
      const TT = window.TT;
      const banner = document.getElementById('bigBanner');
      if (banner) banner.classList.remove('show');
      const err = document.getElementById('errorCard');
      if (err) { err.hidden = true; err.style.display = 'none'; }

      TT.setWorldTime(0.0); // Midnight darkness
      TT.setWeapon(TT.WEAPON_ORDER.indexOf('m4'));
      TT.setGearDbg('light');
      TT.setGearDbg('laser');
      TT.setLasersDbg(true);

      const px = -1.8, pz = -13.5;
      const gy = TT.sampleHeight(px, pz);
      TT.player.position.set(px, gy, pz);
      const targetX = 1.6, targetZ = -8.2;
      const yaw = Math.atan2(targetX - px, targetZ - pz);
      TT.player.rotation.y = yaw;
      TT.setAimYawDbg(yaw);
      TT.setAimTargetDbg(targetX, targetZ);

      const spots = [
        [0.8, -9.2, 'feral'],
        [2.4, -8.5, 'brute'],
        [-0.8, -8.4, 'shambler'],
        [3.6, -9.8, 'bomber'],
        [-2.8, -9.4, 'spitter'],
        [1.5, -7.2, 'military'],
        [4.8, -9.2, 'demon']
      ];
      for (const [zx, zz, kind] of spots) {
        const z = TT.spawnZombie(zx, zz, kind, false, true);
        if (z) {
          z.riseT = 0;
          z.riseOff = 0;
          z.mesh.rotation.y = Math.atan2(px - zx, pz - zz);
        }
      }

      // Low dramatic angle looking across the marine's shoulder toward the lit HQ and the horde under the night sky
      TT.setShotView({
        x: -4.2,
        y: gy + 2.1,
        z: -15.8,
        tx: 1.0,
        ty: gy + 1.5,
        tz: -7.5,
        fov: 46
      });
      TT.setMouseFireDbg(true);

      // Hide all HUD elements
      for (const sel of ['#hud', '#reticle', '#hitPing', '#perf', '#lowHp', '#bloodScreen', '#hurtFlash', '#errorCard']) {
        const el = document.querySelector(sel);
        if (el) el.style.visibility = 'hidden';
      }

      // Inject clean title wordmark at top of cover frame
      let coverTitle = document.getElementById('ag104CoverTitle');
      if (!coverTitle) {
        coverTitle = document.createElement('div');
        coverTitle.id = 'ag104CoverTitle';
        coverTitle.style.cssText = [
          'position:fixed',
          'left:0',
          'right:0',
          'top:18px',
          'z-index:90',
          'text-align:center',
          'pointer-events:none',
          'background:radial-gradient(ellipse at 50% 38%, rgba(3,8,5,0.72) 0%, rgba(3,8,5,0.32) 55%, transparent 80%)',
          'padding:8px 0 16px'
        ].join(';');
        coverTitle.innerHTML =
          '<div class="dw-wordmark" style="font-size:74px; text-shadow: 0 4px 28px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.98);">Grave <span>Shift</span></div>' +
          '<div class="signal-line" style="width:260px; height:24px; margin:8px auto 0; opacity:0.9;">' +
          '<svg viewBox="0 0 400 34"><path d="M0 17H116L129 15L137 22L145 10L153 25L163 4L173 30L183 8L194 22L207 14L218 19L230 17H400"/></svg>' +
          '</div>';
        document.body.appendChild(coverTitle);
      }
    })()`);
    await stepFrames(page, 14);
    const shotCover = path.join(ITCH_DIR, 'cover.png');
    await page.screenshot(shotCover);
    fs.copyFileSync(shotCover, path.join(QA_DIR, 'cover.png'));
    console.log('[AG-104] Saved cover.png:', readPngDimensions(shotCover));
  } finally {
    await browser.close();
    await srv.close();
  }
}

async function verifyInstalledOpeningAndMusic(exePath) {
  console.log('[AG-104] Verifying opening, music, and 0 failed resource loads on installed exe:', exePath);
  const PORT = 9335;
  const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-ag104-profile-'));
  const proc = spawn(exePath, [], {
    stdio: 'ignore',
    env: {
      ...process.env,
      DW_DEBUG: '1',
      DW_PROFILE_DIR: PROFILE,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT} --autoplay-policy=no-user-gesture-required`,
      WEBVIEW2_USER_DATA_FOLDER: path.join(PROFILE, 'webview')
    }
  });
  let exited = false;
  proc.on('exit', () => { exited = true; });
  const kill = () => {
    try { spawn('taskkill', ['/F', '/T', '/PID', String(proc.pid)], { stdio: 'ignore' }); } catch (_) {}
  };

  try {
    const { page, close } = await attach(PORT, 'dw.localhost');
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    await new Promise((r) => setTimeout(r, 900));

    // Check disclaimer & opening elements
    const openingBeforeSkip = await page.evaluate(`(() => {
      const dsc = document.getElementById('disclaimer');
      const dscVid = document.getElementById('disclaimerVideo');
      const opn = document.getElementById('opening');
      const opnVid = document.getElementById('openingVideo');
      return {
        hasDisclaimer: !!dsc,
        disclaimerState: dsc ? dsc.getAttribute('data-state') : null,
        dscVideoReady: dscVid ? dscVid.readyState : 0,
        hasOpening: !!opn,
        openingPhase: opn ? opn.getAttribute('data-phase') : null,
        opnVideoReady: opnVid ? opnVid.readyState : 0
      };
    })()`);

    // Dismiss opening and wait for TT
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
      })()`);
      await new Promise((r) => setTimeout(r, 300));
    }
    await page.waitFor('!!window.TT', { timeout: 240000 });
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

    // Unlock audio and start Hunt mode to verify music & insertion
    await page.evaluate(`(() => {
      if (window.TT.AudioSys && window.TT.AudioSys.unlock) window.TT.AudioSys.unlock();
      const n = document.getElementById('playerName');
      if (n) n.value = 'Desktop';
      document.getElementById('modeHunt').click();
    })()`);
    await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 60000 });
    await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
    await new Promise((r) => setTimeout(r, 2500));

    const runtimeCheck = await page.evaluate(`(() => {
      const A = window.TT.AudioSys;
      const ctx = A && A._ctx ? A._ctx() : null;
      const audioState = window.TT.getAudioState ? window.TT.getAudioState() : null;
      const ambState = window.TT.getAmbState ? window.TT.getAmbState() : null;
      const resources = performance.getEntriesByType('resource');
      const failed = resources.filter((e) => e.responseStatus >= 400).map((e) => e.responseStatus + ' ' + e.name);
      return {
        audioContextState: ctx ? ctx.state : 'unknown',
        audioContextTime: ctx ? Number(ctx.currentTime.toFixed(2)) : 0,
        audioState,
        ambState,
        totalResourcesFetched: resources.length,
        failedLoadsCount: failed.length,
        failedLoads: failed,
        pageErrorsCount: 0
      };
    })()`);
    runtimeCheck.pageErrorsCount = page.errors.length;

    await page.evaluate('window.close()');
    close();
    return {
      openingBeforeSkip,
      runtimeCheck
    };
  } finally {
    if (!exited) kill();
    await new Promise((r) => setTimeout(r, 1500));
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (_) {}
  }
}

async function main() {
  await captureRemainingScreenshots();

  const screenshots = {};
  for (const name of [
    'cover.png',
    '01-day-scavenging.png',
    '02-building-defence.png',
    '03-night-push.png',
    '04-the-hollows.png',
    '05-dawn-survived.png'
  ]) {
    const p = path.join(ITCH_DIR, name);
    screenshots[name] = readPngDimensions(p);
  }

  if (screenshots['cover.png'].width !== 630 || screenshots['cover.png'].height !== 500) {
    throw new Error(`cover.png dimensions mismatch: ${JSON.stringify(screenshots['cover.png'])}`);
  }
  for (const name of [
    '01-day-scavenging.png',
    '02-building-defence.png',
    '03-night-push.png',
    '04-the-hollows.png',
    '05-dawn-survived.png'
  ]) {
    if (screenshots[name].width !== 1920 || screenshots[name].height !== 1080) {
      throw new Error(`${name} dimensions mismatch: ${JSON.stringify(screenshots[name])}`);
    }
  }

  const nsisDir = path.join(ROOT, 'desktop', 'src-tauri', 'target', 'release', 'bundle', 'nsis');
  const installerFile = 'Grave Shift_0.1.0_x64-setup.exe';
  const installerPath = path.join(nsisDir, installerFile);
  const installerStat = fs.statSync(installerPath);
  const installerSizeMiB = (installerStat.size / (1024 * 1024)).toFixed(2);

  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Zero', 'AppData', 'Local');
  const installDir = path.join(localAppData, 'Grave Shift');
  const installedExe = path.join(installDir, 'dead-wave.exe');
  const installedNotices = path.join(installDir, 'game', 'NOTICES.txt');
  const noticesStat = fs.statSync(installedNotices);

  const openingAndMusic = await verifyInstalledOpeningAndMusic(installedExe);
  console.log('[AG-104] Opening & music verification:', JSON.stringify(openingAndMusic, null, 2));

  const report = {
    screenshots,
    installer: {
      filename: installerFile,
      relativePath: path.relative(ROOT, installerPath).replace(/\\/g, '/'),
      absolutePath: installerPath,
      bytes: installerStat.size,
      mib: Number(installerSizeMiB),
      mbDecimal: Number((installerStat.size / 1e6).toFixed(2))
    },
    installed: {
      dir: installDir,
      exe: installedExe,
      exeBytes: fs.statSync(installedExe).size,
      noticesPath: installedNotices,
      noticesBytes: noticesStat.size
    },
    openingAndMusic
  };

  const reportPath = path.join(QA_DIR, 'ag104-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('[AG-104] Wrote report to', reportPath);
}

main().catch((err) => {
  console.error('[AG-104] ERROR:', err);
  process.exit(1);
});
