// qa/2026-10-18-AG-83/run-ag83.mjs
// AG-83 — The installer on a clean profile, after CU-149.
// Runs inside `node crew/crew.mjs slot run antigravity AG-83 --checks "..." -- node qa/2026-10-18-AG-83/run-ag83.mjs`.
// Launches the installed binary (%LOCALAPPDATA%\Grave Shift\dead-wave.exe) as a fresh Windows user
// (clean PATH with no Node/git/repo, cwd outside repo in the install directory, clean Documents\Dead-Wave profile
// and clean WebView2 user-data folder), starts a run, plays Night 1, quits, and reopens to verify settings and best run persist.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { attach } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', '2026-10-18-AG-83');
const SHOTS_DIR = path.join(OUT_DIR, 'shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const INSTALL_DIR = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Grave Shift');
const EXE = path.join(INSTALL_DIR, 'dead-wave.exe');
const DOCS_PROFILE_DIR = path.join(os.homedir(), 'Documents', 'Dead-Wave');
const DOCS_PROFILE_FILE = path.join(DOCS_PROFILE_DIR, 'profile.json');
const WEBVIEW_TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-ag83-wv-'));
const PORT = 9335;

// Clean PATH simulating a fresh Windows user (no Node, no Git, no Cargo, no repo)
const CLEAN_PATH = [
  'C:\\Windows\\system32',
  'C:\\Windows',
  'C:\\Windows\\System32\\Wbem',
  'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\',
].join(';');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
let failed = 0;
function ok(cond, msg, detail = null) {
  const line = (cond ? 'PASS ' : 'FAIL ') + msg + (detail ? ` (${typeof detail === 'string' ? detail : JSON.stringify(detail)})` : '');
  console.log(line);
  checks.push({ pass: !!cond, msg, detail });
  if (!cond) failed++;
}

let currentProc = null;
function killProc(p) {
  if (!p) return;
  try {
    spawn('taskkill', ['/F', '/T', '/PID', String(p.pid)], { stdio: 'ignore' });
  } catch { /* gone */ }
}

function startInstalledExe(runLabel) {
  const wvDir = path.join(WEBVIEW_TEMP, runLabel);
  fs.mkdirSync(wvDir, { recursive: true });
  // Build clean environment: strip node/npm/repo variables, keep only standard Windows user env vars + WebView2 CDP port
  const cleanEnv = {
    SystemRoot: process.env.SystemRoot || 'C:\\Windows',
    windir: process.env.windir || 'C:\\Windows',
    SystemDrive: process.env.SystemDrive || 'C:',
    USERPROFILE: process.env.USERPROFILE || os.homedir(),
    HOMEDRIVE: process.env.HOMEDRIVE || 'C:',
    HOMEPATH: process.env.HOMEPATH || ('\\Users\\' + path.basename(os.homedir())),
    APPDATA: process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
    LOCALAPPDATA: process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
    TEMP: process.env.TEMP || os.tmpdir(),
    TMP: process.env.TMP || os.tmpdir(),
    USERNAME: process.env.USERNAME || 'FreshUser',
    COMPUTERNAME: process.env.COMPUTERNAME || 'PC',
    OS: 'Windows_NT',
    Path: CLEAN_PATH,
    PATH: CLEAN_PATH,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT} --mute-audio`,
    WEBVIEW2_USER_DATA_FOLDER: wvDir,
  };
  const proc = spawn(EXE, [], {
    cwd: INSTALL_DIR,
    stdio: 'ignore',
    env: cleanEnv,
  });
  let exited = false;
  let exitCode = null;
  proc.on('exit', (code) => {
    exited = true;
    exitCode = code;
  });
  currentProc = proc;
  return { proc, exited: () => exited, exitCode: () => exitCode, wvDir };
}

function readDiskProfile() {
  try {
    return JSON.parse(fs.readFileSync(DOCS_PROFILE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

async function dismissIntroToTitle(page) {
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 4; i++) {
    await page.evaluate(`(() => {
      const dsc = document.getElementById('disclaimer');
      if (dsc && dsc.dataset.state !== 'done') {
        const s = document.getElementById('disclaimerSkip');
        if (s) s.click();
        else dsc.click();
      }
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') {
        DWOpening.dismissForTesting();
      } else {
        const b = document.getElementById('openingSkip');
        if (b) b.click();
      }
    })()`);
    await wait(350);
  }
  await page.waitFor('window.DWOpening && window.DWOpening.active === false', { timeout: 180000 });
  await page.waitFor(`!document.body.classList.contains('opening')`, { timeout: 30000 });
}

if (!fs.existsSync(EXE)) {
  console.error('Installed exe not found at: ' + EXE);
  process.exit(2);
}

// Ensure Documents\Dead-Wave starts completely clean
const hadExistingProfile = fs.existsSync(DOCS_PROFILE_FILE);
let backupProfileContent = null;
if (hadExistingProfile) {
  backupProfileContent = fs.readFileSync(DOCS_PROFILE_FILE);
}
fs.rmSync(DOCS_PROFILE_DIR, { recursive: true, force: true });

const reportData = {
  installerPath: path.join(ROOT, 'desktop', 'src-tauri', 'target', 'release', 'bundle', 'nsis', 'Grave Shift_0.1.0_x64-setup.exe'),
  installDir: INSTALL_DIR,
  exePath: EXE,
  docsProfileFile: DOCS_PROFILE_FILE,
  cleanPath: CLEAN_PATH,
  run1: {},
  run2: {},
  checks,
};

try {
  ok(fs.existsSync(EXE), 'Installed binary exists at %LOCALAPPDATA%\\Grave Shift\\dead-wave.exe');
  ok(fs.existsSync(path.join(INSTALL_DIR, 'game', 'index.html')), 'Installed game/index.html exists next to dead-wave.exe');
  ok(fs.existsSync(path.join(INSTALL_DIR, 'uninstall.exe')), 'Uninstaller uninstall.exe exists in install directory');
  ok(!fs.existsSync(DOCS_PROFILE_FILE), 'Documents\\Dead-Wave\\profile.json does not exist before first launch');

  // =========================================================================
  // RUN 1: Fresh user launch, configure Settings, start run, play Night 1, F5 reload check, Quit
  // =========================================================================
  console.log('--- Launching Run 1 (clean profile, no Node/repo in PATH or cwd) ---');
  let app1 = startInstalledExe('run1');
  let { page, url, close } = await attach(PORT, 'dw.localhost');
  reportData.run1.initialUrl = url;
  ok(url === 'http://dw.localhost/index.html', 'Desktop shell opens production URL http://dw.localhost/index.html (no ?debug=1)', url);

  await dismissIntroToTitle(page);
  await wait(800);

  const titleState1 = await page.evaluate(`(() => ({
    title: document.title,
    desktopFlag: window.__DW_DESKTOP__ === true,
    versionText: (document.getElementById('gameVersion') || {}).textContent || '',
    wordmarkText: (document.querySelector('#modeSelect .dw-wordmark') || {}).textContent || '',
    bestRecordHidden: document.getElementById('menuBestRecord') ? document.getElementById('menuBestRecord').hidden : null,
    bestRecordText: (document.getElementById('menuBestRecord') || {}).textContent || '',
    localStorageKeys: Object.keys(localStorage),
    outerSize: outerWidth + 'x' + outerHeight,
    screenSize: screen.width + 'x' + screen.height,
    isFullscreen: outerWidth >= screen.width - 2 && outerHeight >= screen.height - 2,
  }))()`);
  reportData.run1.titleState = titleState1;

  ok(titleState1.desktopFlag, 'Desktop init script ran (window.__DW_DESKTOP__ === true)');
  ok(titleState1.title === 'Grave Shift', 'Window title is "Grave Shift"', titleState1.title);
  ok(titleState1.versionText === 'v0.1.0', 'Title screen shows version v0.1.0', titleState1.versionText);
  ok(titleState1.bestRecordHidden === true, 'Clean profile has #menuBestRecord hidden on first boot', titleState1.bestRecordText);
  ok(titleState1.isFullscreen, 'Window opens fullscreen on first boot', `${titleState1.outerSize} of ${titleState1.screenSize}`);

  await page.screenshot(path.join(SHOTS_DIR, '01-title-clean-profile.png'));

  // Open Settings from Title Screen and customize settings + enable perfHudToggle so window.TT attaches
  await page.evaluate(`(() => {
    document.getElementById('menuSettingsBtn').click();
  })()`);
  await wait(400);

  const defaultSettings = await page.evaluate(`(() => ({
    volMusic: document.getElementById('volMusic').value,
    volSfx: document.getElementById('volSfx').value,
    lookSens: document.getElementById('lookSens').value,
    lookSensNum: document.getElementById('lookSensNum').textContent,
    aimFov: document.getElementById('aimFov').value,
    aimTilt: document.getElementById('aimTilt').value,
    gfxActive: (document.querySelector('#gfxPresets button.on') || {}).dataset?.gfx || null,
    autoTiltActive: (document.querySelector('#autoTiltSeg button.on') || {}).dataset?.tilt || null,
    followCursorOn: document.getElementById('followCursorToggle').classList.contains('on'),
    perfHudOn: document.getElementById('perfHudToggle').classList.contains('on'),
  }))()`);
  reportData.run1.defaultSettings = defaultSettings;

  // Modify settings like a player
  const changedSettings = await page.evaluate(`(() => {
    const setSlider = (id, val) => {
      const el = document.getElementById(id);
      el.value = String(val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setSlider('volMusic', 55);
    setSlider('volSfx', 65);
    setSlider('lookSens', 150);
    setSlider('aimFov', 45);
    setSlider('aimTilt', 8);
    const gfxBtn = document.querySelector('#gfxPresets button[data-gfx="medium"]');
    if (gfxBtn) gfxBtn.click();
    const tiltBtn = document.querySelector('#autoTiltSeg button[data-tilt="strong"]');
    if (tiltBtn) tiltBtn.click();
    const perfBtn = document.getElementById('perfHudToggle');
    if (perfBtn && !perfBtn.classList.contains('on')) perfBtn.click();
    return {
      volMusic: document.getElementById('volMusic').value,
      volMusicNum: document.getElementById('volMusicNum').textContent,
      volSfx: document.getElementById('volSfx').value,
      volSfxNum: document.getElementById('volSfxNum').textContent,
      lookSens: document.getElementById('lookSens').value,
      lookSensNum: document.getElementById('lookSensNum').textContent,
      aimFov: document.getElementById('aimFov').value,
      aimFovNum: document.getElementById('aimFovNum').textContent,
      aimTilt: document.getElementById('aimTilt').value,
      aimTiltNum: document.getElementById('aimTiltNum').textContent,
      gfxActive: (document.querySelector('#gfxPresets button.on') || {}).dataset?.gfx || null,
      autoTiltActive: (document.querySelector('#autoTiltSeg button.on') || {}).dataset?.tilt || null,
      perfHudOn: document.getElementById('perfHudToggle').classList.contains('on'),
    };
  })()`);
  reportData.run1.changedSettings = changedSettings;
  await wait(400);
  await page.screenshot(path.join(SHOTS_DIR, '02-settings-configured.png'));

  // Close settings back to menu
  await page.evaluate(`document.getElementById('settingsBackBtn').click()`);
  await wait(300);

  // Because perfHudToggle turned showPerf on, window.TT is now attached on the next frame!
  ok(await page.waitFor('!!window.TT', { timeout: 10000 }), 'Enabling Performance overlay attaches window.TT without needing ?debug=1');
  const rendererKind = await page.evaluate('TT.renderer && TT.renderer.constructor ? TT.renderer.constructor.name : "?"');
  ok(/WebGPU/i.test(rendererKind), 'Renderer is WebGPU on Jerry\'s GPU', rendererKind);

  // Start a run as "FreshUser"
  console.log('--- Starting Run 1 and deploying into Day 1 ---');
  await page.evaluate(`(() => {
    const n = document.getElementById('playerName');
    if (n) n.value = 'FreshUser';
    document.getElementById('modeHunt').click();
  })()`);

  ok(await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 60000 }), 'Run started and entered Day 1 prep phase');
  ok(await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 }), 'Helicopter insertion completed');
  await wait(1500);
  await page.screenshot(path.join(SHOTS_DIR, '03-day1-prep-orders.png'));

  // Sound the HQ alarm to start Night 1 (without touching any debug hook so the run remains eligible for records/badges!)
  console.log('--- Sounding alarm for Night 1 ---');
  await page.evaluate(`TT.hqStartWave()`);
  ok(await page.waitFor(`TT.getPhase() === 'wave'`, { timeout: 25000 }), 'Night 1 alarm sequence completed and Night 1 wave started');

  // Wait for the first shamblers to spawn so we can take a real Night 1 combat screenshot
  await page.waitFor(`TT.zombies.filter(z => z.alive).length >= 4`, { timeout: 20000 });
  await wait(800);
  await page.screenshot(path.join(SHOTS_DIR, '04-night1-combat.png'));

  // Play through Night 1: kill all 15 shamblers as they spawn and collect skulls until Night 1 clears into Day 2 prep
  console.log('--- Fighting Night 1 wave (15 shamblers) ---');
  const tWave0 = Date.now();
  while (Date.now() - tWave0 < 60000) {
    const state = await page.evaluate(`(() => {
      for (const z of TT.zombies) {
        if (z.alive) TT.killZombie(z, true);
      }
      return {
        phase: TT.getPhase(),
        alive: TT.zombies.filter(z => z.alive).length,
        finisher: !!TT.getWaveFinisher(),
        loopCine: !!TT.getLoopCine(),
      };
    })()`);
    if (state.phase === 'prep' && !state.finisher && !state.loopCine) break;
    await wait(300);
  }

  const afterNight1 = await page.evaluate(`(() => ({
    phase: TT.getPhase(),
    skullsInBag: TT.getSkullBag().length,
    coinsText: (document.getElementById('coins') || {}).textContent || '',
    skullsText: (document.getElementById('skulls') || {}).textContent || '',
    hpText: (document.getElementById('hpNum') || {}).textContent || '',
  }))()`);
  reportData.run1.afterNight1 = afterNight1;
  ok(afterNight1.phase === 'prep', 'Night 1 cleared and transitioned to Day 2 prep', afterNight1);
  await wait(800);
  await page.screenshot(path.join(SHOTS_DIR, '05-night1-cleared-day2.png'));

  // Walk to HQ window to bank skulls so skullsTurnedIn > 0 as well!
  await page.evaluate(`(() => {
    const w = TT.HQ_WINDOW_FRONT;
    if (w) {
      TT.player.position.set(w.x, TT.sampleHeight(w.x, w.z), w.z);
    }
  })()`);
  await wait(3500); // Let skull intake bank the skulls at the HQ window

  // Now open Pause -> Quit to menu -> Confirm Quit
  console.log('--- Quitting run to menu via Pause -> Quit -> Confirm ---');
  await page.evaluate(`(() => {
    document.getElementById('quitMenuBtn').click();
  })()`);
  await wait(300);
  const quitPromptOpen = await page.evaluate(`document.getElementById('pauseQuitView').classList.contains('on')`);
  ok(quitPromptOpen, 'Quit to menu shows confirmation prompt first (CU-150)');
  await page.screenshot(path.join(SHOTS_DIR, '06-quit-confirm-modal.png'));

  await page.evaluate(`document.getElementById('quitConfirmBtn').click()`);
  await wait(600);

  const afterQuitToMenu = await page.evaluate(`(() => ({
    phase: TT.getPhase(),
    bestRunRaw: localStorage.getItem('tt_best_run'),
    bestRun: JSON.parse(localStorage.getItem('tt_best_run') || 'null'),
    bestRecordHidden: document.getElementById('menuBestRecord').hidden,
    bestRecordText: document.getElementById('menuBestRecord').textContent,
  }))()`);
  reportData.run1.afterQuitToMenu = afterQuitToMenu;
  ok(
    afterQuitToMenu.bestRun && afterQuitToMenu.bestRun.runs === 1 && afterQuitToMenu.bestRun.day >= 2 && afterQuitToMenu.bestRun.kills >= 15,
    'Quitting after Night 1 records best run in localStorage (tt_best_run)',
    afterQuitToMenu.bestRun
  );
  ok(!afterQuitToMenu.bestRecordHidden && afterQuitToMenu.bestRecordText.length > 0, 'Title screen displays best run on #menuBestRecord', afterQuitToMenu.bestRecordText);

  // Verify CU-149 real F5 / reload in the rebuilt exe before closing:
  console.log('--- Testing real reload (F5 / location.reload()) in rebuilt exe (CU-149) ---');
  await page.evaluate(`location.reload()`);
  await wait(1500);
  await dismissIntroToTitle(page);
  await wait(500);

  const afterReload = await page.evaluate(`(() => ({
    bestRun: JSON.parse(localStorage.getItem('tt_best_run') || 'null'),
    bestRecordHidden: document.getElementById('menuBestRecord').hidden,
    bestRecordText: document.getElementById('menuBestRecord').textContent,
    volMusic: localStorage.getItem('tt_vol_music'),
    gfx: localStorage.getItem('tt_gfx'),
  }))()`);
  reportData.run1.afterReload = afterReload;
  ok(
    afterReload.bestRun && afterReload.bestRun.runs === 1 && afterReload.bestRun.kills >= 15 && afterReload.gfx === 'medium',
    'In-session reload (F5) preserves newer localStorage values over empty launch snapshot (CU-149 verified)',
    afterReload
  );

  // Check for any missing resources or page errors during Run 1
  const missingUrls1 = await page.evaluate(`performance.getEntriesByType('resource').filter((e) => e.responseStatus >= 400).map((e) => e.responseStatus + ' ' + e.name)`);
  ok(missingUrls1.length === 0, 'Zero missing resources (HTTP >= 400) over dw: protocol', missingUrls1);
  ok(page.errors.length === 0, 'Zero page errors during Run 1', page.errors);

  // Wait 1.5s to ensure background writer flushed too, then click Quit button (#menuQuitBtn -> window.close() -> quit_game)
  await wait(1500);
  console.log('--- Clicking #menuQuitBtn to quit the desktop application ---');
  await page.evaluate(`document.getElementById('menuQuitBtn').click()`);
  let exited1 = false;
  for (let i = 0; i < 30 && !exited1; i++) {
    await wait(250);
    exited1 = app1.exited();
  }
  ok(exited1, 'Clicking Quit on title screen cleanly terminates dead-wave.exe');
  close();
  if (!exited1) killProc(app1.proc);
  await wait(2000);

  // Check Documents\Dead-Wave\profile.json on disk!
  const diskProfile1 = readDiskProfile();
  reportData.run1.diskProfile = diskProfile1;
  ok(!!diskProfile1, 'Documents\\Dead-Wave\\profile.json was created on disk', DOCS_PROFILE_FILE);
  if (diskProfile1) {
    fs.copyFileSync(DOCS_PROFILE_FILE, path.join(OUT_DIR, 'profile-after-run1.json'));
    const diskBest = JSON.parse(diskProfile1.tt_best_run || 'null');
    ok(diskBest && diskBest.runs === 1 && diskBest.day >= 2 && diskBest.kills >= 15, 'profile.json on disk has tt_best_run with Day 2 and >=15 kills', diskBest);
    ok(
      diskProfile1.tt_vol_music === '0.55' &&
      diskProfile1.tt_vol_sfx === '0.65' &&
      diskProfile1.tt_look_sens === '1.5' &&
      diskProfile1.tt_aim_fov === '45' &&
      diskProfile1.tt_aim_tilt === '8' &&
      diskProfile1.tt_gfx === 'medium' &&
      diskProfile1.tt_auto_tilt === 'strong' &&
      diskProfile1.tt_perf_hud === '1',
      'profile.json on disk has all customized settings',
      {
        tt_vol_music: diskProfile1.tt_vol_music,
        tt_vol_sfx: diskProfile1.tt_vol_sfx,
        tt_look_sens: diskProfile1.tt_look_sens,
        tt_aim_fov: diskProfile1.tt_aim_fov,
        tt_aim_tilt: diskProfile1.tt_aim_tilt,
        tt_gfx: diskProfile1.tt_gfx,
        tt_auto_tilt: diskProfile1.tt_auto_tilt,
        tt_perf_hud: diskProfile1.tt_perf_hud,
      }
    );
  }

  // =========================================================================
  // RUN 2: Reopen with a fresh WebView2 cache to prove profile.json seeds everything
  // =========================================================================
  console.log('--- Launching Run 2 (reopen to verify settings and best run are kept) ---');
  let app2 = startInstalledExe('run2');
  ({ page, url, close } = await attach(PORT, 'dw.localhost'));
  await dismissIntroToTitle(page);
  await wait(800);

  const reopenTitleState = await page.evaluate(`(() => ({
    bestRecordHidden: document.getElementById('menuBestRecord').hidden,
    bestRecordText: document.getElementById('menuBestRecord').textContent,
    bestRun: JSON.parse(localStorage.getItem('tt_best_run') || 'null'),
    badgesHtml: document.getElementById('menuBadges') ? document.getElementById('menuBadges').innerHTML.length : 0,
    perfHudVisible: document.getElementById('perf').classList.contains('on'),
  }))()`);
  reportData.run2.titleState = reopenTitleState;

  ok(!reopenTitleState.bestRecordHidden && /\b(1[5-9]|[2-9]\d)\s+kills\b/i.test(reopenTitleState.bestRecordText), 'Reopened title screen shows saved Best Run banner', reopenTitleState.bestRecordText);
  ok(reopenTitleState.bestRun && reopenTitleState.bestRun.runs === 1 && reopenTitleState.bestRun.kills >= 15, 'Reopened localStorage has tt_best_run seeded from Documents\\Dead-Wave\\profile.json', reopenTitleState.bestRun);
  ok(reopenTitleState.perfHudVisible === true, 'Reopened game remembers Performance overlay setting (on)');

  await page.screenshot(path.join(SHOTS_DIR, '07-reopened-title-best-run.png'));

  // Open Settings on Run 2 to verify every UI control reflects the kept settings
  await page.evaluate(`document.getElementById('menuSettingsBtn').click()`);
  await wait(400);

  const reopenSettingsState = await page.evaluate(`(() => ({
    volMusic: document.getElementById('volMusic').value,
    volMusicNum: document.getElementById('volMusicNum').textContent,
    volSfx: document.getElementById('volSfx').value,
    volSfxNum: document.getElementById('volSfxNum').textContent,
    lookSens: document.getElementById('lookSens').value,
    lookSensNum: document.getElementById('lookSensNum').textContent,
    aimFov: document.getElementById('aimFov').value,
    aimFovNum: document.getElementById('aimFovNum').textContent,
    aimTilt: document.getElementById('aimTilt').value,
    aimTiltNum: document.getElementById('aimTiltNum').textContent,
    gfxActive: (document.querySelector('#gfxPresets button.on') || {}).dataset?.gfx || null,
    autoTiltActive: (document.querySelector('#autoTiltSeg button.on') || {}).dataset?.tilt || null,
    perfHudOn: document.getElementById('perfHudToggle').classList.contains('on'),
  }))()`);
  reportData.run2.settingsState = reopenSettingsState;

  ok(
    reopenSettingsState.volMusic === '55' &&
    reopenSettingsState.volSfx === '65' &&
    reopenSettingsState.lookSens === '150' &&
    reopenSettingsState.lookSensNum === '1.5x' &&
    reopenSettingsState.aimFov === '45' &&
    reopenSettingsState.aimTilt === '8' &&
    reopenSettingsState.gfxActive === 'medium' &&
    reopenSettingsState.autoTiltActive === 'strong' &&
    reopenSettingsState.perfHudOn === true,
    'Reopened Settings UI controls match all saved settings',
    reopenSettingsState
  );

  await page.screenshot(path.join(SHOTS_DIR, '08-reopened-settings-kept.png'));
  ok(page.errors.length === 0, 'Zero page errors during Run 2', page.errors);

  // Quit Run 2 cleanly
  await page.evaluate(`document.getElementById('settingsBackBtn').click()`);
  await wait(200);
  await page.evaluate(`document.getElementById('menuQuitBtn').click()`);
  let exited2 = false;
  for (let i = 0; i < 30 && !exited2; i++) {
    await wait(250);
    exited2 = app2.exited();
  }
  ok(exited2, 'Second run exited cleanly via Quit');
  close();
  if (!exited2) killProc(app2.proc);
} catch (err) {
  ok(false, 'Unhandled exception: ' + (err && err.stack || err));
} finally {
  if (currentProc) killProc(currentProc);
  await wait(2500);
  try { fs.rmSync(WEBVIEW_TEMP, { recursive: true, force: true }); } catch { /* ignore */ }
  // Restore previous Documents\Dead-Wave state
  if (hadExistingProfile && backupProfileContent) {
    fs.mkdirSync(DOCS_PROFILE_DIR, { recursive: true });
    fs.writeFileSync(DOCS_PROFILE_FILE, backupProfileContent);
  } else {
    try { fs.rmSync(DOCS_PROFILE_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(reportData, null, 2) + '\n');
}

console.log(failed ? `AG-83 verification: ${failed} FAILED` : `AG-83 verification: all ${checks.length} checks PASSED`);
process.exit(failed ? 1 : 0);
