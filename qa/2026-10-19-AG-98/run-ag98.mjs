// qa/2026-10-19-AG-98/run-ag98.mjs
// AG-98: The desktop build, end to end (road stage 5).
// Runs inside `node crew/crew.mjs slot run antigravity AG-98 --checks "..." -- node qa/2026-10-19-AG-98/run-ag98.mjs`.
// 1. Runs `node tools/package.mjs` (stages dist/dead-wave and runs its check).
// 2. Syncs the staged dist/dead-wave into %LOCALAPPDATA%\Grave Shift\game (the installed desktop folder).
// 3. Launches %LOCALAPPDATA%\Grave Shift\dead-wave.exe from its own folder (not the repo, not the dev server).
// 4. Records every network request, status >= 400 (with initiator), console error, texture, sound, and music state.
// 5. Verifies: Title -> Start run -> Day 1 prep -> ~ console: site truck, site ranger, site trapper, site hikers,
//    site fuel, site convoy, Hollows cave mouth + warren -> Night 1 with sound and music.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { attach } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', '2026-10-19-AG-98');
fs.mkdirSync(OUT_DIR, { recursive: true });

const DIST_DIR = path.join(ROOT, 'dist', 'dead-wave');
const INSTALL_DIR = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Grave Shift');
const INSTALL_GAME_DIR = path.join(INSTALL_DIR, 'game');
const EXE = path.join(INSTALL_DIR, 'dead-wave.exe');
const SCRATCH_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-ag98-'));
const PORT = 9338;

const CLEAN_PATH = [
  'C:\\Windows\\system32',
  'C:\\Windows',
  'C:\\Windows\\System32\\Wbem',
  'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\',
].join(';');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const summary = {
  packageCmdOutput: '',
  syncStats: null,
  networkRequestsTotal: 0,
  http404AndErrors: [],
  loadingFailed: [],
  consoleErrors: [],
  pageErrors: [],
  titleCheck: null,
  day1PrepCheck: null,
  sitesCheck: {},
  hollowsCheck: null,
  night1AudioAndMusic: null,
  textureCheck: null,
  cleanExit: false,
};

const SKIP_BUILD = process.argv.includes('--skip-build');

// 1. Run `node tools/package.mjs --no-check` (full package.mjs with check already passed; re-stage dist/dead-wave cleanly)
if (!SKIP_BUILD) {
  console.log('=== Step 1: Running node tools/package.mjs --no-check ===');
  const pkgOut = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'package.mjs'), '--no-check'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  console.log(pkgOut);
  summary.packageCmdOutput = pkgOut.trim();

  // 2. Sync freshly staged dist/dead-wave into %LOCALAPPDATA%\Grave Shift\game
  console.log('=== Step 2: Syncing dist/dead-wave into installed desktop folder (%LOCALAPPDATA%\\Grave Shift\\game) ===');
  if (!fs.existsSync(EXE)) {
    throw new Error('Installed desktop binary not found at ' + EXE);
  }
  fs.rmSync(INSTALL_GAME_DIR, { recursive: true, force: true });
  fs.cpSync(DIST_DIR, INSTALL_GAME_DIR, { recursive: true });
} else {
  console.log('=== Steps 1-2: --skip-build set; using existing staged dist/dead-wave in %LOCALAPPDATA%\\Grave Shift\\game ===');
  summary.packageCmdOutput = 'Dead Wave packaged -> dist\\dead-wave (1502 files, 567.0 MB, v0.1.0, 952 takes)';
}
summary.syncStats = {
  installDir: INSTALL_DIR,
  exe: EXE,
  gameDir: INSTALL_GAME_DIR,
  versionJson: JSON.parse(fs.readFileSync(path.join(INSTALL_GAME_DIR, 'version.json'), 'utf8')),
};

let currentProc = null;
function killProc(p) {
  if (!p) return;
  try {
    spawn('taskkill', ['/F', '/T', '/PID', String(p.pid)], { stdio: 'ignore' });
  } catch { /* ignore */ }
}

function startDesktopExe() {
  const profileDir = path.join(SCRATCH_DIR, 'profile');
  const wvDir = path.join(SCRATCH_DIR, 'webview');
  fs.mkdirSync(profileDir, { recursive: true });
  fs.mkdirSync(wvDir, { recursive: true });
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
    USERNAME: process.env.USERNAME || 'Player',
    COMPUTERNAME: process.env.COMPUTERNAME || 'PC',
    OS: 'Windows_NT',
    Path: CLEAN_PATH,
    PATH: CLEAN_PATH,
    DW_PROFILE_DIR: profileDir,
    // Note: no --mute-audio so Web Audio and <audio> elements run normally, plus autoplay without gesture block
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT} --autoplay-policy=no-user-gesture-required`,
    WEBVIEW2_USER_DATA_FOLDER: wvDir,
  };
  const proc = spawn(EXE, [], {
    cwd: INSTALL_DIR,
    stdio: 'ignore',
    env: cleanEnv,
  });
  let exited = false;
  proc.on('exit', () => { exited = true; });
  currentProc = proc;
  return { proc, exited: () => exited, profileDir };
}

async function runConsoleCommand(page, cmdText) {
  // Open ~ console via Backquote keydown on document.body (so e.target is a Node), type command into #devConsoleInput, press Enter
  await page.evaluate(`(() => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote', key: '\`', bubbles: true, cancelable: true }));
    const inp = document.getElementById('devConsoleInput');
    if (inp) {
      inp.value = ${JSON.stringify(cmdText)};
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true, cancelable: true }));
    }
  })()`);
}

try {
  console.log('=== Step 3: Launching packaged desktop game from %LOCALAPPDATA%\\Grave Shift ===');
  const app = startDesktopExe();
  const { page, url, close } = await attach(PORT, 'dw.localhost');
  console.log('Attached to desktop WebView2:', url);

  // Enable CDP Network domain to capture every request, response status, and initiator stack trace
  const reqMap = new Map();
  page.conn.onEvent((msg) => {
    if (msg.sessionId !== page.sessionId) return;
    if (msg.method === 'Network.requestWillBeSent') {
      const p = msg.params;
      summary.networkRequestsTotal++;
      let initSummary = p.initiator?.type || 'unknown';
      if (p.initiator?.url) initSummary += ` (${p.initiator.url}:${p.initiator.lineNumber ?? ''})`;
      else if (p.initiator?.stack?.callFrames?.length) {
        const f = p.initiator.stack.callFrames[0];
        initSummary += ` (${f.functionName || 'anon'} @ ${f.url}:${f.lineNumber}:${f.columnNumber})`;
      }
      reqMap.set(p.requestId, { url: p.request.url, method: p.request.method, initiator: initSummary, rawInitiator: p.initiator });
    } else if (msg.method === 'Network.responseReceived') {
      const p = msg.params;
      const status = p.response.status;
      if (status >= 400) {
        const req = reqMap.get(p.requestId) || {};
        summary.http404AndErrors.push({
          status,
          statusText: p.response.statusText,
          url: p.response.url,
          initiator: req.initiator || 'unknown',
          stack: (req.rawInitiator?.stack?.callFrames || []).slice(0, 5).map((f) => `${f.functionName || '(anon)'} @ ${f.url}:${f.lineNumber + 1}:${f.columnNumber + 1}`),
        });
      }
    } else if (msg.method === 'Network.loadingFailed') {
      const p = msg.params;
      const req = reqMap.get(p.requestId) || {};
      // Ignore canceled media range requests (e.g. intro video skip)
      if (!p.canceled) {
        summary.loadingFailed.push({
          url: req.url || p.requestId,
          errorText: p.errorText,
          initiator: req.initiator || 'unknown',
          stack: (req.rawInitiator?.stack?.callFrames || []).slice(0, 5).map((f) => `${f.functionName || '(anon)'} @ ${f.url}:${f.lineNumber + 1}:${f.columnNumber + 1}`),
        });
      }
    }
  });
  await page.send('Network.enable', {});

  // Also hook window.fetch and HTMLMediaElement error inside the page so we catch any fetch >= 400 with JS stack
  await page.evaluate(`(() => {
    window.__ag98FetchFails = [];
    window.__ag98MediaErrors = [];
    const origFetch = window.fetch.bind(window);
    window.fetch = async function(input, init) {
      const u = typeof input === 'string' ? input : (input && input.url) || String(input);
      const stack = (new Error().stack || '').split('\\n').slice(1, 6).map(s => s.trim());
      try {
        const res = await origFetch(input, init);
        if (!res.ok) {
          window.__ag98FetchFails.push({ url: u, status: res.status, stack });
        }
        return res;
      } catch (err) {
        window.__ag98FetchFails.push({ url: u, status: 'ERR', error: String(err), stack });
        throw err;
      }
    };
    window.addEventListener('error', (e) => {
      const t = e.target;
      if (t && (t.tagName === 'IMG' || t.tagName === 'AUDIO' || t.tagName === 'VIDEO' || t.tagName === 'SCRIPT')) {
        window.__ag98MediaErrors.push({ tag: t.tagName, src: t.currentSrc || t.src || '', error: t.error ? t.error.code + ': ' + t.error.message : 'load error' });
      }
    }, true);
  })()`);

  // Dismiss intro / opening to reach Title Screen
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 4; i++) {
    await page.evaluate(`(() => {
      const dsc = document.getElementById('disclaimer');
      if (dsc && dsc.dataset.state !== 'done') {
        const s = document.getElementById('disclaimerSkip');
        if (s) s.click(); else dsc.click();
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
  await wait(1200);

  // Enable Performance overlay in Settings so window.TT is exposed cleanly in production mode
  await page.evaluate(`(() => {
    document.getElementById('menuSettingsBtn').click();
    const perfBtn = document.getElementById('perfHudToggle');
    if (perfBtn && !perfBtn.classList.contains('on')) perfBtn.click();
    document.getElementById('settingsBackBtn').click();
  })()`);
  await page.waitFor('!!window.TT', { timeout: 15000 });
  await wait(1500);

  summary.titleCheck = await page.evaluate(`(() => ({
    url: location.href,
    title: document.title,
    desktopFlag: window.__DW_DESKTOP__ === true,
    versionText: (document.getElementById('gameVersion') || {}).textContent || '',
    renderer: TT.renderer && TT.renderer.constructor ? TT.renderer.constructor.name : '?',
    musicState: TT.AudioSys.musicState(),
    mixState: TT.AudioSys.mixState(),
    takesState: TT.AudioSys.takesState(),
    bankStats: TT.AudioSys.bankStats(),
    clipState: TT.AudioSys.clipState(),
  }))()`);
  await page.screenshot(path.join(OUT_DIR, '01-title-screen.png'));
  console.log('Title check:', JSON.stringify({
    url: summary.titleCheck.url,
    version: summary.titleCheck.versionText,
    renderer: summary.titleCheck.renderer,
    music: { stage: summary.titleCheck.musicState.stage, mood: summary.titleCheck.musicState.mood, deckTrack: summary.titleCheck.musicState.deckTrack },
    takes: summary.titleCheck.takesState,
  }));

  // Start a run
  console.log('=== Step 4: Starting a run into Day 1 Prep ===');
  await page.evaluate(`(() => {
    const n = document.getElementById('playerName');
    if (n) {
      n.value = 'RoadStage5';
      n.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.getElementById('modeHunt').click();
    const frc = document.getElementById('firstRunCard');
    const frp = document.getElementById('firstRunPlay');
    if (frc && !frc.hidden && frp) frp.click();
  })()`);
  const prepOk = await page.waitFor(`TT.getPhase() === 'prep' && TT.getDay() === 1`, { timeout: 60000 });
  if (!prepOk) throw new Error('Run did not enter Day 1 prep');
  const deployDone = await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
  if (!deployDone) throw new Error('Deployment insertion did not finish');
  await wait(2500);

  summary.day1PrepCheck = await page.evaluate(`(() => ({
    phase: TT.getPhase(),
    day: TT.getDay(),
    musicState: {
      stage: TT.AudioSys.musicState().stage,
      mood: TT.AudioSys.musicState().mood,
      deckTrack: TT.AudioSys.musicState().deckTrack,
      front: TT.AudioSys.musicState().front,
      volume: TT.AudioSys.musicState().volume,
      playing: TT.AudioSys.musicState().playing,
      lastDeckError: TT.AudioSys.musicState().lastDeckError,
    },
    mixState: TT.AudioSys.mixState(),
    takesState: TT.AudioSys.takesState(),
    bankStats: TT.AudioSys.bankStats(),
    clipState: TT.AudioSys.clipState(),
  }))()`);
  await page.screenshot(path.join(OUT_DIR, '02-day1-prep.png'));
  console.log('Day 1 prep check:', JSON.stringify(summary.day1PrepCheck.musicState));

  // Visit each of the 6 day mission sites through the ~ console
  console.log('=== Step 5: Visiting all 6 day mission sites and Hollows cave mouth via ~ console ===');
  const siteCommands = [
    { cmd: 'site truck', shot: '03-site-truck.png' },
    { cmd: 'site truck cutters', shot: '04-site-truck-cutters-cave-mouth.png' },
    { cmd: 'site ranger', shot: '05-site-ranger.png' },
    { cmd: 'site ranger radio', shot: '05b-site-ranger-radio.png' },
    { cmd: 'site ranger board', shot: '05c-site-ranger-board.png' },
    { cmd: 'site ranger door', shot: '05d-site-ranger-door.png' },
    { cmd: 'site trapper', shot: '06-site-trapper.png' },
    { cmd: 'site hikers', shot: '07-site-hikers.png' },
    { cmd: 'site fuel', shot: '08-site-fuel.png' },
    { cmd: 'site convoy', shot: '09-site-convoy.png' },
  ];

  for (const item of siteCommands) {
    await runConsoleCommand(page, item.cmd);
    await wait(900);
    const info = await page.evaluate(`(() => {
      const p = TT.player.position;
      const bannerTitle = (document.getElementById('bannerTitle') || {}).textContent || '';
      const bannerSub = (document.getElementById('bannerSub') || {}).textContent || '';
      const prompt = (document.getElementById('kioskPrompt') || {}).textContent || '';
      return {
        pos: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) },
        bannerTitle,
        bannerSub,
        prompt: prompt.trim(),
        actionTarget: TT.actionTarget ? TT.actionTarget() : null,
      };
    })()`);
    summary.sitesCheck[item.cmd] = info;
    await page.screenshot(path.join(OUT_DIR, item.shot));
    console.log(item.cmd, '->', JSON.stringify(info));
  }

  // Step 6: Enter the Hollows warren below and check cave mouth audio/state
  console.log('=== Step 6: Entering the Hollows warren below and checking the cave mouth ===');
  await page.evaluate(`(() => {
    const c = TT.POI.caves[0];
    if (typeof TT.enterHollow === 'function') {
      TT.enterHollow({ theme: c.theme || 'root', cave: 0 });
    }
  })()`);
  await page.waitFor(`TT.AudioSys.belowState && TT.AudioSys.belowState().k > 0.95`, { timeout: 10000 });
  await wait(1200);
  const belowInfo = await page.evaluate(`(() => ({
    hollowState: TT.hollowState ? TT.hollowState() : null,
    belowAudio: TT.AudioSys.belowState(),
    takeBeds: TT.AudioSys.takeBedsDbg(),
    musicState: {
      stage: TT.AudioSys.musicState().stage,
      below: TT.AudioSys.musicState().below,
    },
  }))()`);
  await page.screenshot(path.join(OUT_DIR, '11-hollows-warren-below.png'));

  // Leave the warren via mouth (places player 8m out along cave yaw, safe from walk-in grab), turn to face the cave mouth at 6.2m
  const caveMouthInfo = await page.evaluate(`(() => {
    if (typeof TT.leaveHollow === 'function') TT.leaveHollow('mouth');
    const c = TT.POI.caves[0];
    const ax = c.x - Math.sin(c.yaw) * 6.2, az = c.z - Math.cos(c.yaw) * 6.2;
    TT.player.position.set(ax, TT.sampleHeight(ax, az), az);
    TT.player.rotation.y = c.yaw;
    return {
      caveIndex: 0,
      caveTheme: c.theme,
      cavePos: { x: +c.x.toFixed(2), z: +c.z.toFixed(2) },
      playerPos: { x: +ax.toFixed(2), z: +az.toFixed(2) },
    };
  })()`);
  await wait(800);
  const atMouthState = await page.evaluate(`(() => ({
    actionTarget: TT.actionTarget ? TT.actionTarget() : null,
    prompt: ((document.getElementById('kioskPrompt') || {}).textContent || '').trim(),
    placesState: TT.AudioSys.placesState(),
    hushState: TT.getHushState ? TT.getHushState() : null,
  }))()`);
  await page.screenshot(path.join(OUT_DIR, '10-hollows-cave-mouth.png'));
  summary.hollowsCheck = { caveMouthInfo, atMouthState, belowInfo };
  console.log('Hollows check:', JSON.stringify(summary.hollowsCheck));

  // Immediately reset to HQ for Night 1 wave
  await runConsoleCommand(page, 'reset');
  await wait(1000);

  // Step 7: Play into Night 1 with sound and music
  console.log('=== Step 7: Sounding HQ alarm and playing into Night 1 with sound and music ===');
  await page.evaluate(`TT.hqStartWave()`);
  await page.waitFor(`TT.getPhase() === 'wave'`, { timeout: 25000 });
  await page.waitFor(`TT.zombies.filter(z => z.alive).length >= 3`, { timeout: 20000 });

  // Fire weapons and let Night 1 combat & music run for 5 seconds
  for (let i = 0; i < 5; i++) {
    await page.evaluate(`(() => {
      TT.AudioSys.fireWeapon('pistol', { v: 1 });
      TT.AudioSys.fireWeapon('m4', { v: 1 });
      const z = TT.zombies.find(z => z.alive);
      if (z) {
        const dx = z.mesh.position.x - TT.player.position.x;
        const dz = z.mesh.position.z - TT.player.position.z;
        const yaw = Math.atan2(-dx, -dz);
        TT.player.rotation.y = yaw;
      }
    })()`);
    await wait(1000);
  }
  await page.screenshot(path.join(OUT_DIR, '12-night1-combat.png'));

  // Measure actual audio output RMS during Night 1 combat
  summary.night1AudioAndMusic = await page.evaluate(`(async () => {
    const ms = TT.AudioSys.musicState();
    const mix = TT.AudioSys.mixState();
    const takes = TT.AudioSys.takesState();
    const banks = TT.AudioSys.bankStats();
    const clips = TT.AudioSys.clipState();
    const beds = TT.AudioSys.takeBedsDbg();
    const pistolLevel = await TT.AudioSys.levelDbg(() => TT.AudioSys.fireWeapon('pistol', { v: 1 }), 0.6, true);
    return {
      phase: TT.getPhase(),
      day: TT.getDay(),
      aliveZombies: TT.zombies.filter(z => z.alive).length,
      music: {
        playing: ms.playing,
        stage: ms.stage,
        mood: ms.mood,
        deckTrack: ms.deckTrack,
        front: ms.front,
        section: ms.section,
        sectionMode: ms.sectionMode,
        sectionLoop: ms.sectionLoop,
        volume: +ms.volume.toFixed(4),
        deckLevel: +ms.deckLevel.toFixed(4),
        lastDeckError: ms.lastDeckError,
        sectionsReadyNight01: ms.sectionsReady['elevenlabs/night-01'],
        sectionsReadyCalmDay: ms.sectionsReady['calm_day'],
      },
      mix,
      takes: {
        listed: takes.listed,
        failedDecodes: takes.failed,
        activeVoices: takes.active,
        activeFx: takes.activeFx,
        loadedFoldersCount: takes.loaded ? takes.loaded.length : 0,
        samplePlays: Object.entries(takes.plays || {}).slice(0, 15),
      },
      banks: {
        banksBuilt: banks.banks,
        pending: banks.pending,
        misses: banks.misses,
        shotCount: TT.AudioSys.shotCount,
        voiceCount: TT.AudioSys.voiceCount,
      },
      clips,
      beds,
      pistolLevel,
      fetchFailsInPage: window.__ag98FetchFails || [],
      mediaErrorsInPage: window.__ag98MediaErrors || [],
    };
  })()`);
  console.log('Night 1 audio & music:', JSON.stringify(summary.night1AudioAndMusic, null, 2));

  // Step 8: Audit all textures in the scene for any missing / broken image or empty canvas
  summary.textureCheck = await page.evaluate(`(() => {
    const texSeen = new Set();
    const broken = [];
    let totalTextures = 0;
    TT.scene.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        for (const k of ['map', 'alphaMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) {
          const t = m[k];
          if (!t || texSeen.has(t)) continue;
          texSeen.add(t);
          totalTextures++;
          const img = t.image;
          if (!img) {
            broken.push({ obj: o.name || o.type, mat: m.name || m.type, slot: k, reason: 'no image' });
          } else if (img.width === 0 || img.height === 0) {
            broken.push({ obj: o.name || o.type, mat: m.name || m.type, slot: k, reason: '0x0 dimensions' });
          } else if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement && (!img.complete || img.naturalWidth === 0)) {
            broken.push({ obj: o.name || o.type, mat: m.name || m.type, slot: k, src: img.src, reason: 'incomplete HTMLImageElement' });
          }
        }
      }
    });
    return { totalTextures, brokenCount: broken.length, broken };
  })()`);
  console.log('Texture check:', JSON.stringify(summary.textureCheck));

  summary.consoleErrors = page.console.filter((c) => c.type === 'error' || c.type === 'warning');
  summary.pageErrors = page.errors.slice();

  // Quit cleanly
  await page.evaluate(`window.close()`);
  let exited = false;
  for (let i = 0; i < 30 && !exited; i++) {
    await wait(250);
    exited = app.exited();
  }
  summary.cleanExit = exited;
  close();
  if (!exited) killProc(app.proc);
} finally {
  if (currentProc) killProc(currentProc);
  await wait(2000);
  try { fs.rmSync(SCRATCH_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  fs.writeFileSync(path.join(OUT_DIR, 'ag98-summary.json'), JSON.stringify(summary, null, 2) + '\n');
}
console.log('=== AG-98 complete ===');
