import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-06-AG-238');
const LIB_JS_PATH = path.join(ROOT, 'tools/tests/lib.js');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function captureFile(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 92;
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('[AG-238] Saved screenshot:', filename);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('======================================================================================');
  console.log('=== [AG-238] Verification: Three Volume Sliders His Way (GP-20029)                 ===');
  console.log('======================================================================================\n');

  const telemetry = {
    timestamp: new Date().toISOString(),
    agent: 'antigravity',
    task: 'AG-238',
    firstPerson: {},
    thirdPerson: {},
    persistence: {},
    uiScores: {}
  };

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-238] Server running at:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion'
    ],
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch { /* keep existing bounds */ }

    console.log('[AG-238] Navigating to game...');
    await page.goto(url, { timeout: 180000 });

    if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
      throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
    }

    // Dismiss opening
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    // Inject test helper
    const libCode = fs.readFileSync(LIB_JS_PATH, 'utf8');
    await page.evaluate(libCode);

    // Clean profile initial volume state
    await page.evaluate(`(() => {
      localStorage.removeItem('tt_vol_sfx');
      localStorage.removeItem('tt_vol_music');
      localStorage.removeItem('tt_vol_ambience');
    })()`);

    console.log('[AG-238] Starting match as JERRY...');
    await page.evaluate(`(async () => {
      await startMatch(window.TT, 'JERRY');
    })()`, 120000);

    // Stabilize match state
    await page.evaluate(`(() => {
      const T = window.TT;
      if (T.clearZombies) T.clearZombies();
      T.setHp(1e5);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.setWorldTime(0.50);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
    })()`);

    console.log('[AG-238] Match active and stabilized.');

    // Helper inside page to get volume slider metrics & inspect DOM
    const inspectSlidersFn = `(() => {
      const ids = ['volMaster', 'volMusic', 'volAmbience'];
      const numIds = ['volMasterNum', 'volMusicNum', 'volAmbienceNum'];
      const labels = ['settings.master', 'settings.music', 'settings.ambience'];
      const res = {};
      const pauseView = document.getElementById('pauseSettingsView');
      const pauseEl = document.getElementById('pause');
      const canvas = document.querySelector('canvas') || (window.TT && window.TT.renderer && window.TT.renderer.domElement);

      res.pauseVisible = pauseEl ? pauseEl.classList.contains('show') : false;
      res.settingsViewOn = pauseView ? pauseView.classList.contains('on') : false;
      res.pointerLockElement = document.pointerLockElement ? document.pointerLockElement.tagName : null;
      res.pointerIsLocked = document.pointerLockElement === canvas;
      res.menuHoldsPointer = window.TT ? window.TT.menuHoldsDbg() : null;

      res.sliders = ids.map((id, i) => {
        const input = document.getElementById(id);
        const num = document.getElementById(numIds[i]);
        const labelSpan = pauseView ? pauseView.querySelector(\`[data-dw-text="\${labels[i]}"]\`) : null;
        const rect = input ? input.getBoundingClientRect() : null;
        const labelRect = labelSpan ? labelSpan.getBoundingClientRect() : null;
        const numRect = num ? num.getBoundingClientRect() : null;
        return {
          id,
          numId: numIds[i],
          labelKey: labels[i],
          labelText: labelSpan ? labelSpan.textContent : null,
          value: input ? input.value : null,
          numText: num ? num.textContent : null,
          inputVisible: !!(rect && rect.width > 0 && rect.height > 0),
          labelVisible: !!(labelRect && labelRect.width > 0 && labelRect.height > 0),
          numVisible: !!(numRect && numRect.width > 0 && numRect.height > 0),
          rect: rect ? { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) } : null
        };
      });

      const A = window.TT.AudioSys;
      res.audioVolumes = A.getVolumes();
      res.mixState = A.mixState();
      return res;
    })()`;

    // =========================================================================
    // 1. FIRST PERSON VIEW
    // =========================================================================
    console.log('\n[AG-238] --- 1. FIRST PERSON VERIFICATION ---');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setViewFirstDbg(true);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
    })()`);

    // Open Pause -> Settings
    console.log('[AG-238] Opening Pause menu and Settings in First Person...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.openMenuDbg('pause');
      document.getElementById('settingsBtn').click();
    })()`);
    await wait(300);

    const fpInitial = await page.evaluate(inspectSlidersFn);
    console.log('[AG-238] First Person Settings Initial State:', JSON.stringify(fpInitial, null, 2));

    if (!fpInitial.settingsViewOn) throw new Error('Settings view not on in First Person');
    if (fpInitial.pointerIsLocked) throw new Error('Pointer remains locked while Settings is open in First Person');
    if (!fpInitial.menuHoldsPointer) throw new Error('menuHoldsPointer() is false while Settings is open');

    // Take screenshot in First Person with Settings open
    await captureFile(page, 'pause-settings-fp.jpg');

    // Test live drag / slider adjustment in First Person
    console.log('[AG-238] Testing live slider adjustments in First Person...');
    // We set: Master -> 40%, Music -> 25%, Ambience -> 60%
    const fpLiveAdjust = await page.evaluate(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const A = window.TT.AudioSys;

      // Adjust Music to 25%
      const mInput = document.getElementById('volMusic');
      mInput.value = '25';
      mInput.dispatchEvent(new Event('input', { bubbles: true }));
      mInput.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(180);
      const afterMusic = {
        vol: A.getVolumes().music,
        bus: A.mixState().musicVolume,
        num: document.getElementById('volMusicNum').textContent
      };

      // Adjust Ambience to 60%
      const aInput = document.getElementById('volAmbience');
      aInput.value = '60';
      aInput.dispatchEvent(new Event('input', { bubbles: true }));
      aInput.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(180);
      const afterAmbience = {
        vol: A.getVolumes().ambience,
        bus: A.mixState().ambienceVolume,
        num: document.getElementById('volAmbienceNum').textContent
      };

      // Adjust Master to 40%
      const masInput = document.getElementById('volMaster');
      masInput.value = '40';
      masInput.dispatchEvent(new Event('input', { bubbles: true }));
      masInput.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(180);
      const afterMaster = {
        vol: A.getVolumes().master,
        bus: A.mixState().masterVolume,
        num: document.getElementById('volMasterNum').textContent
      };

      return { afterMusic, afterAmbience, afterMaster };
    })()`);
    console.log('[AG-238] First Person Live Gain Adjustments:', JSON.stringify(fpLiveAdjust, null, 2));

    // Verify leaving and re-entering the menu in First Person
    console.log('[AG-238] Leaving Settings and Pause menu in First Person...');
    await page.evaluate(`(() => {
      document.getElementById('settingsBackBtn').click();
      document.getElementById('resumeBtn').click();
      for (let i = 0; i < 20; i++) window.TT.stepFrame(1 / 60);
    })()`);
    await wait(200);

    const fpResumeState = await page.evaluate(`(() => {
      const pauseEl = document.getElementById('pause');
      return {
        paused: window.TT.paused,
        pauseShow: pauseEl.classList.contains('show'),
        menuHolds: window.TT.menuHoldsDbg()
      };
    })()`);
    console.log('[AG-238] Resumed state in First Person:', JSON.stringify(fpResumeState));

    console.log('[AG-238] Re-entering Settings from Pause menu in First Person...');
    await page.evaluate(`(() => {
      window.TT.openMenuDbg('pause');
      document.getElementById('settingsBtn').click();
    })()`);
    await wait(300);

    const fpReenter = await page.evaluate(inspectSlidersFn);
    console.log('[AG-238] Re-entered Settings State in First Person:', JSON.stringify(fpReenter.sliders));

    telemetry.firstPerson = {
      initial: fpInitial,
      liveAdjust: fpLiveAdjust,
      resumeState: fpResumeState,
      reenter: fpReenter
    };

    // Leave Settings back to game
    await page.evaluate(`(() => {
      document.getElementById('settingsBackBtn').click();
      document.getElementById('resumeBtn').click();
    })()`);
    await wait(200);

    // =========================================================================
    // 2. THIRD PERSON VIEW
    // =========================================================================
    console.log('\n[AG-238] --- 2. THIRD PERSON VERIFICATION ---');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setViewFirstDbg(false);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
    })()`);

    console.log('[AG-238] Opening Pause menu and Settings in Third Person...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.openMenuDbg('pause');
      document.getElementById('settingsBtn').click();
    })()`);
    await wait(300);

    const tpInitial = await page.evaluate(inspectSlidersFn);
    console.log('[AG-238] Third Person Settings Initial State:', JSON.stringify(tpInitial, null, 2));

    if (!tpInitial.settingsViewOn) throw new Error('Settings view not on in Third Person');
    if (tpInitial.pointerIsLocked) throw new Error('Pointer remains locked while Settings is open in Third Person');

    // Take screenshot in Third Person with Settings open
    await captureFile(page, 'pause-settings-tp.jpg');

    // Test live adjustments in Third Person to different values:
    // Master -> 70%, Music -> 45%, Ambience -> 80%
    console.log('[AG-238] Testing live slider adjustments in Third Person...');
    const tpLiveAdjust = await page.evaluate(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const A = window.TT.AudioSys;

      const mInput = document.getElementById('volMusic');
      mInput.value = '45';
      mInput.dispatchEvent(new Event('input', { bubbles: true }));
      mInput.dispatchEvent(new Event('change', { bubbles: true }));

      const aInput = document.getElementById('volAmbience');
      aInput.value = '80';
      aInput.dispatchEvent(new Event('input', { bubbles: true }));
      aInput.dispatchEvent(new Event('change', { bubbles: true }));

      const masInput = document.getElementById('volMaster');
      masInput.value = '70';
      masInput.dispatchEvent(new Event('input', { bubbles: true }));
      masInput.dispatchEvent(new Event('change', { bubbles: true }));

      await wait(180);
      return {
        master: { vol: A.getVolumes().master, bus: A.mixState().masterVolume, num: document.getElementById('volMasterNum').textContent },
        music: { vol: A.getVolumes().music, bus: A.mixState().musicVolume, num: document.getElementById('volMusicNum').textContent },
        ambience: { vol: A.getVolumes().ambience, bus: A.mixState().ambienceVolume, num: document.getElementById('volAmbienceNum').textContent },
      };
    })()`);
    console.log('[AG-238] Third Person Live Adjustments:', JSON.stringify(tpLiveAdjust, null, 2));

    // Leave Settings back to game
    await page.evaluate(`(() => {
      document.getElementById('settingsBackBtn').click();
      document.getElementById('resumeBtn').click();
      for (let i = 0; i < 20; i++) window.TT.stepFrame(1 / 60);
    })()`);
    await wait(200);

    console.log('[AG-238] Re-entering Settings in Third Person...');
    await page.evaluate(`(() => {
      window.TT.openMenuDbg('pause');
      document.getElementById('settingsBtn').click();
    })()`);
    await wait(300);

    const tpReenter = await page.evaluate(inspectSlidersFn);
    console.log('[AG-238] Re-entered Settings State in Third Person:', JSON.stringify(tpReenter.sliders));

    telemetry.thirdPerson = {
      initial: tpInitial,
      liveAdjust: tpLiveAdjust,
      reenter: tpReenter
    };

    // Close Settings
    await page.evaluate(`(() => {
      document.getElementById('settingsBackBtn').click();
      document.getElementById('resumeBtn').click();
    })()`);
    await wait(200);

    // =========================================================================
    // 3. RESTART / PERSISTENCE VERIFICATION
    // =========================================================================
    console.log('\n[AG-238] --- 3. RESTART / PERSISTENCE VERIFICATION ---');
    const storageBefore = await page.evaluate(`(() => ({
      master: localStorage.getItem('tt_vol_sfx'),
      music: localStorage.getItem('tt_vol_music'),
      ambience: localStorage.getItem('tt_vol_ambience')
    }))()`);
    console.log('[AG-238] LocalStorage values before reload:', JSON.stringify(storageBefore));

    // Close the match page before opening restart page to maintain ONE active game instance
    console.log('[AG-238] Closing match page and launching fresh page to test restart persistence...');
    try { await page.send('Page.close', {}); } catch {}

    const page2 = await browser.newPage({ width: 1920, height: 1080 });
    try {
      const { windowId } = await page2.send('Browser.getWindowForTarget', {});
      await page2.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch { /* bounds */ }

    await page2.goto(url, { timeout: 120000 });
    if (!(await page2.waitFor('!!window.TT', { timeout: 120000 }))) {
      throw new Error('window.TT never appeared after reload');
    }

    // Dismiss opening if needed
    await page2.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await wait(500);

    // Check AudioSys immediately upon reload
    const freshAudioVolumes = await page2.evaluate(`(() => window.TT.AudioSys.getVolumes())()`);
    console.log('[AG-238] AudioSys volumes immediately after fresh restart:', JSON.stringify(freshAudioVolumes));

    // Open settings from title menu
    console.log('[AG-238] Opening Settings from title menu...');
    await page2.evaluate(`(() => {
      document.getElementById('menuSettingsBtn').click();
    })()`);
    await wait(300);

    const titleSettingsState = await page2.evaluate(inspectSlidersFn);
    console.log('[AG-238] Title Settings Sliders after restart:', JSON.stringify(titleSettingsState.sliders, null, 2));

    await captureFile(page2, 'settings-reloaded.jpg');

    telemetry.persistence = {
      storageBefore,
      freshAudioVolumes,
      titleSettingsState
    };

    // Clean up / restore 100% volumes
    await page2.evaluate(`(() => {
      const A = window.TT.AudioSys;
      A.setMasterVolume(1.0);
      A.setMusicVolume(1.0);
      A.setAmbienceVolume(1.0);
    })()`);

    // Save telemetry.json
    fs.writeFileSync(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(telemetry, null, 2));
    console.log('[AG-238] Telemetry saved to qa/2026-11-06-AG-238/telemetry.json');

    // Build contact sheet
    try {
      execSync('python qa/2026-11-06-AG-238/build-sheet.py', { cwd: ROOT, stdio: 'inherit' });
    } catch (e) {
      console.warn('[AG-238] build-sheet.py notice:', e.message);
    }

    console.log('\n[AG-238] ALL VERIFICATION STEPS COMPLETE.');
  } finally {
    await browser.close?.();
    await server.close?.();
  }
}

main().catch((err) => {
  console.error('[AG-238] FAILED:', err);
  process.exit(1);
});
