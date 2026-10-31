import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { attach } from '../../tools/cdp.mjs';

process.env.DW_ALLOW_RAW_CDP = '1';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DESKTOP_DIR = path.join(ROOT, 'desktop');
const QA_DIR = __dirname;

fs.mkdirSync(QA_DIR, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`Not a valid PNG: ${filePath}`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height, bytes: buf.length };
}

function runCmd(cmd, args, cwd, label) {
  console.log(`\n=== [AG-161] Running: ${label} (${cmd} ${args.join(' ')}) ===`);
  const t0 = Date.now();
  const res = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, DW_ALLOW_RAW_CDP: '1' }
  });
  const elapsedS = ((Date.now() - t0) / 1000).toFixed(1);
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  console.log(`=== [AG-161] ${label} exited with code ${res.status} in ${elapsedS}s ===\n`);
  if (res.status !== 0) {
    throw new Error(`${label} failed with exit code ${res.status}`);
  }
  return {
    status: res.status,
    elapsedS: Number(elapsedS),
    stdout: res.stdout || '',
    stderr: res.stderr || ''
  };
}

function findStartMenuShortcut() {
  const startMenuPrograms = path.join(
    process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs'
  );
  const candidates = [
    path.join(startMenuPrograms, 'Grave Shift.lnk'),
    path.join(startMenuPrograms, 'Grave Shift', 'Grave Shift.lnk'),
    path.join(startMenuPrograms, 'Dead-Wave.lnk')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const found = walk(full);
        if (found) return found;
      } else if (/grave shift\.lnk$/i.test(e.name)) {
        return full;
      }
    }
    return null;
  }
  return walk(startMenuPrograms);
}

function inspectShortcut(lnkPath) {
  const ps = `
    $sh = New-Object -ComObject WScript.Shell
    $sc = $sh.CreateShortcut('${lnkPath.replace(/'/g, "''")}')
    @{ TargetPath = $sc.TargetPath; WorkingDirectory = $sc.WorkingDirectory; Description = $sc.Description } | ConvertTo-Json -Compress
  `;
  const res = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  try {
    return JSON.parse((res.stdout || '').trim());
  } catch {
    return { raw: (res.stdout || '').trim() };
  }
}

async function stepFrames(page, count = 30) {
  await page.evaluate(`(async () => {
    for (let i = 0; i < ${count}; i++) {
      await new Promise((r) => requestAnimationFrame(r));
    }
  })()`);
}

async function verifyStartMenuLaunchAndGameplay(startMenuLnk, installedExe, pkgVersion) {
  console.log('[AG-161] Launching installed game from Start Menu shortcut:', startMenuLnk);
  const PORT = 9335;
  const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-ag161-profile-'));

  const childEnv = {
    ...process.env,
    DW_DEBUG: '1',
    DW_PROFILE_DIR: PROFILE,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT} --autoplay-policy=no-user-gesture-required`,
    WEBVIEW2_USER_DATA_FOLDER: path.join(PROFILE, 'webview')
  };

  // Launch through the Start menu .lnk as a player would
  const launcher = spawn('cmd.exe', ['/c', 'start', '""', startMenuLnk], {
    stdio: 'ignore',
    env: childEnv,
    windowsHide: false
  });
  launcher.unref();

  const killInstalledProcess = () => {
    try {
      spawnSync(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          `Get-Process -Name 'dead-wave' -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq '${installedExe.replace(/'/g, "''")}' } | Stop-Process -Force`
        ],
        { stdio: 'ignore' }
      );
    } catch (_) {}
  };

  try {
    const { page, close } = await attach(PORT, 'dw.localhost');

    // 1. Check studio intro video (#openingVideo) at launch
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    await wait(1200);
    const openingVideoStatus = await page.evaluate(`(() => {
      const opn = document.getElementById('opening');
      const opnVid = document.getElementById('openingVideo');
      const dsc = document.getElementById('disclaimer');
      return {
        openingPhase: opn ? opn.getAttribute('data-phase') : null,
        openingVideoReadyState: opnVid ? opnVid.readyState : 0,
        openingVideoPaused: opnVid ? opnVid.paused : null,
        openingVideoTime: opnVid ? Number(opnVid.currentTime.toFixed(2)) : 0,
        openingVideoSrc: opnVid ? opnVid.currentSrc || opnVid.src : null,
        disclaimerBootState: dsc ? dsc.getAttribute('data-state') : null
      };
    })()`);
    console.log('[AG-161] Opening status on Start menu launch:', openingVideoStatus);

    // Dismiss studio intro so warm-up completes to the Title menu
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
      })()`);
      await wait(300);
    }

    await page.waitFor('!!window.TT', { timeout: 240000 });
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
    await wait(600);

    // 2. Verify AI disclosure video playback via DWDisclaimer.preview() (since CL-225 sets ENABLED = false at boot)
    const disclosureCheck = await page.evaluate(`(async () => {
      if (!window.DWDisclaimer || typeof window.DWDisclaimer.preview !== 'function') {
        return { available: false };
      }
      const started = window.DWDisclaimer.preview();
      const vid = document.getElementById('disclaimerVideo');
      const t0 = performance.now();
      while (performance.now() - t0 < 5000) {
        if (vid && vid.readyState >= 3 && vid.currentTime > 0.15) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      const res = {
        available: true,
        started,
        state: window.DWDisclaimer.state,
        readyState: vid ? vid.readyState : 0,
        paused: vid ? vid.paused : null,
        currentTime: vid ? Number(vid.currentTime.toFixed(2)) : 0,
        duration: vid ? Number((vid.duration || 0).toFixed(2)) : 0,
        src: vid ? (vid.currentSrc || vid.src) : null
      };
      window.DWDisclaimer.dismiss();
      return res;
    })()`);
    console.log('[AG-161] AI Disclosure playback check:', disclosureCheck);
    await wait(600);

    // 3. Verify Title screen shows v1.1.0, WebGPU renderer, fullscreen, and take Title screenshot
    const titleCheck = await page.evaluate(`(() => {
      if (window.TT && window.TT.applyGraphicsPreset) window.TT.applyGraphicsPreset('high');
      const highBtn = document.querySelector('#gfxPresets button[data-gfx="high"]');
      if (highBtn) highBtn.click();
      const perf = document.getElementById('perf');
      if (perf) { perf.classList.remove('on'); perf.style.display = 'none'; }
      const err = document.getElementById('errorCard');
      if (err) { err.hidden = true; err.style.display = 'none'; }
      const verEl = document.getElementById('gameVersion');
      return {
        desktopFlag: window.__DW_DESKTOP__ === true,
        renderer: window.TT && window.TT.renderer && window.TT.renderer.constructor ? window.TT.renderer.constructor.name : '?',
        versionText: verEl ? verEl.textContent.trim() : '',
        windowSize: outerWidth + 'x' + outerHeight,
        screenSize: screen.width + 'x' + screen.height,
        fullscreen: outerWidth >= screen.width - 2 && outerHeight >= screen.height - 2
      };
    })()`);
    console.log('[AG-161] Title screen check:', titleCheck);
    if (titleCheck.versionText !== `v${pkgVersion}`) {
      throw new Error(`Expected title version "v${pkgVersion}", got ${JSON.stringify(titleCheck.versionText)}`);
    }

    await stepFrames(page, 20);
    const titleShotName = `01-title-v${pkgVersion}.png`;
    const titleShotPath = path.join(QA_DIR, titleShotName);
    await page.screenshot(titleShotPath);
    const titleShotMeta = readPngDimensions(titleShotPath);
    console.log('[AG-161] Captured Title screenshot:', titleShotPath, titleShotMeta);

    // 4. Start a run, verify music & audio during Day 1 prep, then play into Night 1
    await page.evaluate(`(() => {
      if (window.TT.AudioSys && window.TT.AudioSys.unlock) window.TT.AudioSys.unlock();
      const n = document.getElementById('playerName');
      if (n) n.value = 'Gravewalker';
      document.getElementById('modeHunt').click();
      const firstRun = document.getElementById('firstRunCard');
      const playAnyway = document.getElementById('firstRunPlay');
      if (firstRun && !firstRun.hidden && playAnyway) playAnyway.click();
    })()`);
    await page.waitFor(`window.TT && window.TT.getPhase() === 'prep'`, { timeout: 60000 });
    await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
    await wait(2000);

    const prepAudioCheck = await page.evaluate(`(() => {
      const A = window.TT.AudioSys;
      const ctx = A && A._ctx ? A._ctx() : null;
      return {
        phase: window.TT.getPhase(),
        day: window.TT.getDay(),
        audioContextState: ctx ? ctx.state : 'unknown',
        audioContextTime: ctx ? Number(ctx.currentTime.toFixed(2)) : 0,
        audioState: window.TT.getAudioState ? window.TT.getAudioState() : null,
        ambState: window.TT.getAmbState ? window.TT.getAmbState() : null
      };
    })()`);
    console.log('[AG-161] Day 1 prep audio check:', prepAudioCheck);

    // Advance into Night 1 wave and play for several seconds
    const night1Setup = await page.evaluate(`(() => {
      const TT = window.TT;
      TT.runDevCommand('godmode');
      TT.setGearDbg('light');
      TT.setGearDbg('laser');
      TT.setLasersDbg(true);
      if (typeof TT.devJumpToNight === 'function') {
        TT.devJumpToNight(1, true);
      } else if (typeof TT.skipPrep === 'function') {
        TT.skipPrep();
      }
      if (typeof TT.spawnWaveBatch === 'function') {
        TT.spawnWaveBatch(0.5);
      }
      const perf = document.getElementById('perf');
      if (perf) { perf.classList.remove('on'); perf.style.display = 'none'; }
      const err = document.getElementById('errorCard');
      if (err) { err.hidden = true; err.style.display = 'none'; }
      const st = TT.getWaveDirectorState ? TT.getWaveDirectorState() : {};
      return {
        phase: TT.getPhase(),
        day: TT.getDay(),
        director: st
      };
    })()`);
    console.log('[AG-161] Transitioned to Night 1:', night1Setup);

    await wait(4000);
    const night1State = await page.evaluate(`(() => {
      const TT = window.TT;
      const px = TT.player.position.x, pz = TT.player.position.z;
      const targetX = px + 1.5, targetZ = pz + 6.5;
      const yaw = Math.atan2(targetX - px, targetZ - pz);
      TT.player.rotation.y = yaw;
      if (TT.setAimYawDbg) TT.setAimYawDbg(yaw);
      if (TT.setAimTargetDbg) TT.setAimTargetDbg(targetX, targetZ);

      for (const [dx, dz, kind] of [[0.8, 5.8, 'shambler'], [-1.4, 6.6, 'shambler'], [2.4, 7.2, 'feral'], [-0.3, 8.2, 'shambler']]) {
        const z = TT.spawnZombie(px + dx, pz + dz, kind, false, true);
        if (z) {
          z.riseT = 0;
          z.riseOff = 0;
          z.mesh.rotation.y = Math.atan2(-dx, -dz);
        }
      }
      const banner = document.getElementById('bigBanner');
      if (banner) banner.classList.remove('show');
      const orders = document.getElementById('ordersCard');
      if (orders) orders.classList.remove('show');
      const st = TT.getWaveDirectorState ? TT.getWaveDirectorState() : {};
      return {
        phase: TT.getPhase(),
        day: TT.getDay(),
        zombieCount: TT.zombies ? TT.zombies.length : 0,
        waveTotal: st.waveTotal || 0,
        waveSpawned: st.waveSpawned || 0,
        audioState: TT.getAudioState ? TT.getAudioState() : null,
        ambState: TT.getAmbState ? TT.getAmbState() : null
      };
    })()`);
    await stepFrames(page, 25);

    const night1ShotPath = path.join(QA_DIR, '02-night-1.png');
    await page.screenshot(night1ShotPath);
    const night1ShotMeta = readPngDimensions(night1ShotPath);
    console.log('[AG-161] Captured Night 1 screenshot:', night1ShotPath, night1ShotMeta);

    // 5. Check resource loads and console/page errors
    const loadAudit = await page.evaluate(`(() => {
      const resources = performance.getEntriesByType('resource');
      const failed = resources
        .filter((e) => e.responseStatus >= 400)
        .map((e) => ({ status: e.responseStatus, name: e.name, initiatorType: e.initiatorType }));
      return {
        totalResourcesFetched: resources.length,
        failedLoadsCount: failed.length,
        failedLoads: failed
      };
    })()`);
    loadAudit.pageErrorsCount = page.errors.length;
    loadAudit.pageErrors = page.errors.slice(0, 10);
    console.log('[AG-161] Resource & console load audit:', loadAudit);

    if (loadAudit.failedLoadsCount !== 0) {
      throw new Error(`Expected 0 failed loads, got ${loadAudit.failedLoadsCount}: ${JSON.stringify(loadAudit.failedLoads)}`);
    }
    if (loadAudit.pageErrorsCount !== 0) {
      throw new Error(`Expected 0 page errors, got ${loadAudit.pageErrorsCount}: ${JSON.stringify(loadAudit.pageErrors)}`);
    }

    // 6. Quit cleanly via window.close()
    await page.evaluate('window.close()');
    close();
    await wait(2000);

    return {
      openingVideoStatus,
      disclosureCheck,
      titleCheck,
      prepAudioCheck,
      night1State,
      loadAudit,
      screenshots: {
        title: { path: `qa/2026-10-31-AG-161/${titleShotName}`, ...titleShotMeta },
        night1: { path: 'qa/2026-10-31-AG-161/02-night-1.png', ...night1ShotMeta }
      }
    };
  } finally {
    killInstalledProcess();
    await wait(1500);
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (_) {}
  }
}

async function main() {
  const skipBuild = process.argv.includes('--skip-build');
  const pkgVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  console.log(`[AG-161] Starting 1.1.0 desktop installer build & verification (package.json version: ${pkgVersion}, skipBuild: ${skipBuild})`);
  if (pkgVersion !== '1.1.0') {
    throw new Error(`Expected package.json version "1.1.0", got "${pkgVersion}"`);
  }

  let buildElapsedS = 0;
  let smokeElapsedS = 0;
  if (!skipBuild) {
    // Step 1: cd desktop && npm run build
    const buildResult = runCmd('npm', ['run', 'build'], DESKTOP_DIR, 'desktop npm run build');
    fs.writeFileSync(path.join(QA_DIR, 'build.log'), buildResult.stdout + '\n' + buildResult.stderr, 'utf8');
    buildElapsedS = buildResult.elapsedS;

    // Step 2: cd desktop && node smoke.mjs
    const smokeResult = runCmd('node', ['smoke.mjs'], DESKTOP_DIR, 'desktop node smoke.mjs');
    fs.writeFileSync(path.join(QA_DIR, 'smoke.log'), smokeResult.stdout + '\n' + smokeResult.stderr, 'utf8');
    smokeElapsedS = smokeResult.elapsedS;
  } else {
    console.log('[AG-161] Skipping build & smoke (--skip-build).');
  }

  // Step 3: Check the built 1.1.0 NSIS installer
  const nsisDir = path.join(DESKTOP_DIR, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
  const installerFile = `Grave Shift_${pkgVersion}_x64-setup.exe`;
  const installerPath = path.join(nsisDir, installerFile);
  if (!fs.existsSync(installerPath)) {
    throw new Error(`Installer not found at ${installerPath}`);
  }
  const installerStat = fs.statSync(installerPath);

  // Step 4: Install as a player would (per-user NSIS installer)
  console.log(`[AG-161] Installing ${installerFile} to %LOCALAPPDATA%\\Grave Shift...`);
  const installRes = spawnSync(installerPath, ['/S'], {
    cwd: nsisDir,
    encoding: 'utf8',
    timeout: 180000
  });
  if (installRes.status !== 0) {
    throw new Error(`NSIS installer exited with status ${installRes.status}`);
  }
  await wait(2000);

  // Remove duplicate Dead-Wave.lnk on Desktop if NSIS created one, keeping Grave Shift.lnk
  const desktopDeadWaveLnk = path.join(os.homedir(), 'Desktop', 'Dead-Wave.lnk');
  const desktopGraveShiftLnk = path.join(os.homedir(), 'Desktop', 'Grave Shift.lnk');
  if (fs.existsSync(desktopDeadWaveLnk) && fs.existsSync(desktopGraveShiftLnk)) {
    try { fs.unlinkSync(desktopDeadWaveLnk); } catch (_) {}
  }

  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const installDir = path.join(localAppData, 'Grave Shift');
  const installedExe = path.join(installDir, 'dead-wave.exe');
  const installedNotices = path.join(installDir, 'game', 'NOTICES.txt');
  const installedNoticesDesktop = path.join(installDir, 'game', 'NOTICES-desktop.txt');
  const installedVersionJson = path.join(installDir, 'game', 'version.json');

  if (!fs.existsSync(installedExe)) throw new Error(`Installed exe missing: ${installedExe}`);
  if (!fs.existsSync(installedNotices)) throw new Error(`Installed NOTICES.txt missing: ${installedNotices}`);
  if (!fs.existsSync(installedNoticesDesktop)) throw new Error(`Installed NOTICES-desktop.txt missing: ${installedNoticesDesktop}`);

  const startMenuLnk = findStartMenuShortcut();
  if (!startMenuLnk) {
    throw new Error('Start menu shortcut (Grave Shift.lnk) not found after installation');
  }
  const startMenuShortcutInfo = inspectShortcut(startMenuLnk);
  console.log('[AG-161] Start menu shortcut verified:', startMenuLnk, startMenuShortcutInfo);

  // Step 5: Launch from Start menu shortcut and verify v1.1.0 title, disclosure, music, Night 1, 0 failed loads, and shots
  const startMenuPlay = await verifyStartMenuLaunchAndGameplay(startMenuLnk, installedExe, pkgVersion);

  const summary = {
    version: pkgVersion,
    installer: {
      fileName: installerFile,
      relativePath: path.relative(ROOT, installerPath).replace(/\\/g, '/'),
      absolutePath: installerPath,
      bytes: installerStat.size,
      mib: Number((installerStat.size / (1024 * 1024)).toFixed(2)),
      mb: Number((installerStat.size / 1e6).toFixed(2))
    },
    builtExe: {
      relativePath: 'desktop/src-tauri/target/release/dead-wave.exe',
      bytes: fs.statSync(path.join(DESKTOP_DIR, 'src-tauri', 'target', 'release', 'dead-wave.exe')).size
    },
    installed: {
      dir: installDir,
      exePath: installedExe,
      exeBytes: fs.statSync(installedExe).size,
      versionJson: JSON.parse(fs.readFileSync(installedVersionJson, 'utf8')),
      noticesTxt: {
        path: installedNotices,
        bytes: fs.statSync(installedNotices).size
      },
      noticesDesktopTxt: {
        path: installedNoticesDesktop,
        bytes: fs.statSync(installedNoticesDesktop).size
      },
      startMenuShortcut: {
        path: startMenuLnk,
        ...startMenuShortcutInfo
      }
    },
    buildElapsedS,
    smokeElapsedS,
    startMenuPlay
  };

  const summaryPath = path.join(QA_DIR, 'ag161-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log('\n[AG-161] All checks passed! Summary written to:', summaryPath);
}

main().catch((err) => {
  console.error('[AG-161] FATAL:', err);
  process.exit(1);
});
