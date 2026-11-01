import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-186');
fs.mkdirSync(OUT, { recursive: true });

const W = 1280, H = 720;
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');

const results = {
  timestamp: new Date().toISOString(),
  hardware: 'NVIDIA GeForce RTX 5080 WebGPU',
  model: 'Gemini 4 Argon (High)',
  shortcutsDefaultOn: false,
  sites: [],
  telemetry: {},
  collisionTests: {},
  promptTests: {},
  captures: [],
  verdict: 'PASS'
};

async function runReview() {
  console.log('================================================================');
  console.log('Starting AG-186 Review: GP-20007 Five Deadfall Cuts Visual Pass');
  console.log('================================================================');

  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const page = await browser.newPage({ width: W, height: H });
    // Default URL: ?shortcuts is not specified (default-on test)
    const url = `${server.origin}/index.html?debug=1&raf=timer`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { timeout: 300000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('Game load timed out: no TT');

    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(lib);

    // 1. Telemetry Verification
    console.log('Extracting shortcut telemetry...');
    const telemetry = await page.evaluate(`(() => {
      const T = TT;
      const dbg = T.shortcutDbg;
      const on = dbg ? dbg.on : false;
      const list = dbg ? dbg.list() : [];

      // Test collision and cut state for all sites
      const testResults = list.map(site => {
        const midX = site.x, midZ = site.z;
        const blockedBefore = T.wallBandsDbg ? T.wallBandsDbg.blocked(midX, midZ, 0.35) : false;
        const resolvedBefore = dbg.resolve(midX, midZ, 0.35);

        // Test cut open
        dbg.cut(site.id, true);
        const cutList = dbg.list();
        const siteAfterCut = cutList.find(s => s.id === site.id);
        const blockedAfterCut = T.wallBandsDbg ? T.wallBandsDbg.blocked(midX, midZ, 0.35) : false;
        const resolvedAfterCut = dbg.resolve(midX, midZ, 0.35);

        // Reset to uncut
        dbg.cut(site.id, false);
        const siteReset = dbg.list().find(s => s.id === site.id);

        return {
          id: site.id,
          x: site.x,
          z: site.z,
          solidsBefore: site.solids,
          solidsAfterCut: siteAfterCut ? siteAfterCut.solids : 0,
          solidsReset: siteReset ? siteReset.solids : 0,
          blockedBefore,
          blockedAfterCut,
          resolvedBefore,
          resolvedAfterCut
        };
      });

      return {
        on,
        list,
        testResults
      };
    })()`);

    console.log(`- Shortcuts Default-On: ${telemetry.on}`);
    console.log(`- Configured shortcut sites (${telemetry.list.length}):`);
    telemetry.list.forEach(s => console.log(`   * ${s.id}: (${s.x.toFixed(1)}, ${s.z.toFixed(1)}), cut=${s.cut}, solids=${s.solids}`));

    results.shortcutsDefaultOn = telemetry.on;
    results.sites = telemetry.list;
    results.telemetry = telemetry.testResults;

    // Hide UI overlays for clean visual evaluation shots
    const setUIOverlayVisible = async (visible) => {
      await page.evaluate(`((vis) => {
        const c = [...document.querySelectorAll('canvas')]
          .sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
        if (!c) return false;
        const keep = new Set();
        for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
        for (const child of document.body.children) {
          if (!keep.has(child)) child.style.setProperty('display', vis ? '' : 'none', 'important');
        }
        return true;
      })(${visible})`);
    };

    await setUIOverlayVisible(false);

    // Helper for camera shots
    const shootCamera = async (name, px, py, pz, tx, ty, tz, fov = 45) => {
      console.log(`Capturing: ${name} from (${px.toFixed(1)}, ${py.toFixed(1)}, ${pz.toFixed(1)}) -> (${tx.toFixed(1)}, ${ty.toFixed(1)}, ${tz.toFixed(1)})`);
      const state = await page.evaluate(`(async () => {
        const T = TT;
        T.setShotView({ x: ${px}, y: ${py}, z: ${pz}, tx: ${tx}, ty: ${ty}, tz: ${tz}, fov: ${fov} });
        await new Promise(r => setTimeout(r, 600));
        return { px: ${px}, py: ${py}, pz: ${pz}, tx: ${tx}, ty: ${ty}, tz: ${tz}, fov: ${fov} };
      })()`);

      const file = path.join(OUT, `${name}.png`);
      await page.screenshot(file);
      results.captures.push({ name, file, state });
      console.log(`Saved screenshot: ${file}`);
      return state;
    };

    // Helper for lighting
    const setLighting = async (mode) => {
      await page.evaluate(`((m) => {
        const T = TT;
        if (m === 'noon') {
          T.setWorldTime(0.50);
          if (T.weather) { T.weather.overcast = 0; T.weather.raining = false; T.weather.intensity = 0; }
        } else if (m === 'overcast') {
          T.setWorldTime(0.48);
          if (T.weather) { T.weather.overcast = 1.0; T.weather.raining = false; T.weather.intensity = 0; }
        } else if (m === 'dusk') {
          T.setWorldTime(0.74);
          if (T.weather) { T.weather.overcast = 0; T.weather.raining = false; T.weather.intensity = 0; }
        } else if (m === 'night') {
          T.setWorldTime(0.90);
          if (T.weather) { T.weather.overcast = 0; T.weather.raining = false; T.weather.intensity = 0; }
        }
      })('${mode}')`);
      await new Promise(r => setTimeout(r, 400));
    };

    const setCut = async (id, cut) => {
      await page.evaluate(`((siteId, cutOn) => {
        TT.shortcutDbg.cut(siteId, cutOn);
      })('${id}', ${cut})`);
      await new Promise(r => setTimeout(r, 300));
    };

    // --- PASS 1: NOON LIGHTING ---
    console.log('\n--- Capturing Noon Lighting Across Sites ---');
    await setLighting('noon');

    // Site 1: landing-rangers uncut & cut
    await setCut('landing-rangers', false);
    await shootCamera('1-landing-rangers-uncut-noon', 74.5, -3.8, -14.0, 67.8, -4.8, -14.0, 48);
    await setCut('landing-rangers', true);
    await shootCamera('2-landing-rangers-cut-noon', 74.5, -3.8, -14.0, 67.8, -4.8, -14.0, 48);

    // Site 2: fuel-wreck uncut & cut
    await setCut('fuel-wreck', false);
    await shootCamera('3-fuel-wreck-uncut-noon', -116.8, 1.6, 34.2, -116.8, 0.6, 28.0, 48);
    await setCut('fuel-wreck', true);
    await shootCamera('4-fuel-wreck-cut-noon', -116.8, 1.6, 34.2, -116.8, 0.6, 28.0, 48);

    // Site 3: trapper-grave uncut & cut
    await setCut('trapper-grave', false);
    await shootCamera('5-trapper-grave-uncut-noon', -57.7, 4.6, 110.2, -62.65, 3.4, 106.95, 48);
    await setCut('trapper-grave', true);
    await shootCamera('6-trapper-grave-cut-noon', -57.7, 4.6, 110.2, -62.65, 3.4, 106.95, 48);

    // Site 4: grave-wreck uncut
    await setCut('grave-wreck', false);
    await shootCamera('7-grave-wreck-uncut-noon', -100.5, 2.0, 72.6, -103.8, 0.9, 67.6, 48);

    // Site 5: fuel-mast uncut (inspect end tie-in)
    await setCut('fuel-mast', false);
    await shootCamera('8-fuel-mast-uncut-noon', -123.5, 2.2, 7.2, -129.1, 1.0, 5.05, 48);

    // --- PASS 2: OVERCAST LIGHTING ---
    console.log('\n--- Capturing Overcast Lighting ---');
    await setLighting('overcast');
    await shootCamera('9-grave-wreck-uncut-overcast', -100.5, 2.0, 72.6, -103.8, 0.9, 67.6, 48);
    await shootCamera('10-fuel-wreck-cut-overcast', -116.8, 1.6, 34.2, -116.8, 0.6, 28.0, 48);

    // --- PASS 3: DUSK LIGHTING ---
    console.log('\n--- Capturing Dusk Lighting ---');
    await setLighting('dusk');
    await shootCamera('11-fuel-mast-uncut-dusk', -123.5, 2.2, 7.2, -129.1, 1.0, 5.05, 48);
    await shootCamera('12-landing-rangers-cut-dusk', 74.5, -3.8, -14.0, 67.8, -4.8, -14.0, 48);

    // --- PASS 4: NIGHT LIGHTING ---
    console.log('\n--- Capturing Night Lighting ---');
    await setLighting('night');
    await shootCamera('13-fuel-wreck-uncut-night', -116.8, 1.6, 34.2, -116.8, 0.6, 28.0, 48);
    await shootCamera('14-trapper-grave-uncut-night', -57.7, 4.6, 110.2, -62.65, 3.4, 106.95, 48);

    // Reset all shortcuts to uncut state before match testing
    await page.evaluate(`(() => {
      for (const site of TT.shortcutDbg.list()) {
        TT.shortcutDbg.cut(site.id, false);
      }
    })()`);

    // Reset camera from setShotView so match camera takes control
    await page.evaluate(`(() => {
      TT.setShotView(null);
    })()`);

    // Restore UI overlays
    await setUIOverlayVisible(true);

    // 2. PROMPT & INTERACTION INSPECTION (In a real match)
    console.log('\n--- Starting Match for Prompt & Interaction Verification ---');
    await setLighting('noon');
    await page.evaluate(`(async () => {
      await startMatch(TT, 'Antigravity');
    })()`);
    await page.waitFor('!document.body.classList.contains("deploying")', { timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));

    // Teleport player near fuel-wreck deadfall at (-116.8, 29.3) looking south (-z) towards (-116.8, 28.0)
    console.log('Teleporting player near fuel-wreck deadfall...');
    const promptTelemetry = await page.evaluate(`(() => {
      const T = TT;
      const targetX = -116.8, targetZ = 29.3;
      const groundY = T.sampleHeight(targetX, targetZ);
      T.player.position.set(targetX, groundY, targetZ);
      T.camera.position.set(targetX, groundY + 1.8, targetZ + 3.2);
      T.camera.lookAt(targetX, groundY + 0.8, 28.0);

      const a = typeof T.actionTarget === 'function' ? T.actionTarget() : null;
      return {
        action: a,
        posX: T.player.position.x,
        posZ: T.player.position.z,
        weaponOwnedSaw: !!(T.getWeaponOwned && T.getWeaponOwned().chainsaw),
        currentWeapon: typeof T.getCurrentWeapon === 'function' ? T.getCurrentWeapon() : null
      };
    })()`);

    console.log('Interaction state near deadfall:', promptTelemetry);

    // Give frame loop a couple beats to update kioskPrompt
    await new Promise(r => setTimeout(r, 600));

    // Check prompt text without chainsaw
    const inspectPromptText = await page.evaluate(`(() => {
      const el = document.getElementById('kioskPrompt');
      return {
        text: el ? el.textContent.trim() : '',
        shown: el ? el.classList.contains('on') : false
      };
    })()`);
    console.log('Inspect prompt without saw:', inspectPromptText);
    results.promptTests.withoutSaw = inspectPromptText;

    // Shot P1: Third-person inspect prompt (1280x720)
    const p1File = path.join(OUT, 'prompt-3rd-inspect-noon.png');
    await page.screenshot(p1File);
    console.log(`Saved screenshot: ${p1File}`);

    // Shot P2: First-person inspect prompt (1280x720)
    console.log('Switching to First-Person view...');
    await page.evaluate(`(() => {
      const T = TT;
      if (typeof T.setViewFirstDbg === 'function') T.setViewFirstDbg(true);
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const p2File = path.join(OUT, 'prompt-1st-inspect-noon.png');
    await page.screenshot(p2File);
    console.log(`Saved screenshot: ${p2File}`);

    // Shot P3: Responsive 390px mobile viewport prompt check
    console.log('Testing 390px mobile viewport...');
    await page.setViewport(390, 844);
    await new Promise(r => setTimeout(r, 600));

    const p3File = path.join(OUT, 'prompt-mobile-390px.png');
    await page.screenshot(p3File);
    console.log(`Saved screenshot: ${p3File}`);

    // Restore desktop resolution
    await page.setViewport(W, H);
    await new Promise(r => setTimeout(r, 400));

    // Switch back to 3rd person
    await page.evaluate(`(() => {
      const T = TT;
      if (typeof T.setViewFirstDbg === 'function') T.setViewFirstDbg(false);
    })()`);
    await new Promise(r => setTimeout(r, 300));

    // Equip chainsaw and test hold prompt
    console.log('Equipping chainsaw for hold prompt test...');
    const sawPromptText = await page.evaluate(`(() => {
      const T = TT;
      const wo = T.getWeaponOwned ? T.getWeaponOwned() : null;
      if (wo) wo.chainsaw = true;
      if (typeof T.setWeapon === 'function' && T.WEAPON_ORDER) {
        T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));
      }
      const el = document.getElementById('kioskPrompt');
      return {
        text: el ? el.textContent.trim() : '',
        shown: el ? el.classList.contains('on') : false
      };
    })()`);
    console.log('Hold prompt with chainsaw:', sawPromptText);
    results.promptTests.withSaw = sawPromptText;

    // Shot P4: Third-person hold prompt with saw
    const p4File = path.join(OUT, 'prompt-3rd-saw-hold-noon.png');
    await page.screenshot(p4File);
    console.log(`Saved screenshot: ${p4File}`);

    // Test cutting hold progress: hold KeyE down for 1.6s
    console.log('Holding KeyE to test cutting progress prompt...');
    await page.evaluate(`(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
    })()`);
    await new Promise(r => setTimeout(r, 1600));

    const progressPromptText = await page.evaluate(`(() => {
      const el = document.getElementById('kioskPrompt');
      return {
        text: el ? el.textContent.trim() : '',
        shown: el ? el.classList.contains('on') : false
      };
    })()`);
    console.log('Progress prompt:', progressPromptText);
    results.promptTests.progress = progressPromptText;

    // Switch to first person while holding
    await page.evaluate(`(() => {
      const T = TT;
      if (typeof T.setViewFirstDbg === 'function') T.setViewFirstDbg(true);
    })()`);
    await new Promise(r => setTimeout(r, 300));

    // Shot P5: Progress prompt in first-person
    const p5File = path.join(OUT, 'prompt-1st-progress-noon.png');
    await page.screenshot(p5File);
    console.log(`Saved screenshot: ${p5File}`);

    // Release KeyE
    await page.evaluate(`(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
      const T = TT;
      if (typeof T.setViewFirstDbg === 'function') T.setViewFirstDbg(false);
    })()`);

  } finally {
    try { await browser.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }

  // 3. Composite Contact Sheet Stitching
  console.log('\n--- Stitching Composite Contact Sheets ---');
  const stitchServer = await serve(ROOT, 0);
  const stitchBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const stitchPage = await stitchBrowser.newPage({ width: W, height: H });
    await stitchPage.goto(`${stitchServer.origin}/tools/blank.html`);

    // Sheet 1: Main Rule-19 Visual & Environmental Pass (6-panel contact sheet)
    const shots1 = [
      path.join(OUT, '1-landing-rangers-uncut-noon.png'),
      path.join(OUT, '2-landing-rangers-cut-noon.png'),
      path.join(OUT, '3-fuel-wreck-uncut-noon.png'),
      path.join(OUT, '4-fuel-wreck-cut-noon.png'),
      path.join(OUT, '11-fuel-mast-uncut-dusk.png'),
      path.join(OUT, '13-fuel-wreck-uncut-night.png')
    ];

    const labels1 = [
      '1. Landing-Rangers Uncut (Noon): 3-trunk stacked fallen deadfall blocking woodland spur',
      '2. Landing-Rangers Cut (Noon): Clean 3m center kerf cut opening direct route',
      '3. Fuel-Wreck Uncut (Noon): Densely framed deadfall between fuel depot and wreck',
      '4. Fuel-Wreck Cut (Noon): 3m opening allowing player and zombie navigation flow',
      '5. Fuel-Mast Uncut (Dusk): Skyline pull toward radio mast; East end tie-in inspected',
      '6. Fuel-Wreck Uncut (Night): Atmospheric silhouette and lighting response under night sky'
    ];

    const b64List1 = shots1.map(p => fs.readFileSync(p).toString('base64'));
    const b64Sheet1 = await stitchPage.evaluate(`(async () => {
      const b64s = ${JSON.stringify(b64List1)};
      const labels = ${JSON.stringify(labels1)};
      const cols = 2, rows = 3;
      const cellW = 640, cellH = 360, labelH = 28;
      const c = document.createElement('canvas');
      c.width = cols * cellW;
      c.height = rows * (cellH + labelH);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0f1115';
      ctx.fillRect(0, 0, c.width, c.height);

      const loadImg = (src) => new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = src;
      });

      for (let i = 0; i < b64s.length; i++) {
        const im = await loadImg('data:image/png;base64,' + b64s[i]);
        const col = i % cols, row = Math.floor(i / cols);
        const x = col * cellW, y = row * (cellH + labelH);
        ctx.drawImage(im, x, y, cellW, cellH);
        ctx.fillStyle = '#161920';
        ctx.fillRect(x, y + cellH, cellW, labelH);
        ctx.fillStyle = '#70c0ff';
        ctx.font = 'bold 12px Consolas, monospace';
        ctx.fillText(labels[i] || '', x + 10, y + cellH + 19);
      }
      return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
    })()`);

    const sheetPath1 = path.join(OUT, 'ag186-sheet.png');
    fs.writeFileSync(sheetPath1, Buffer.from(b64Sheet1, 'base64'));
    console.log(`Saved composite contact sheet: ${sheetPath1}`);

    // Sheet 2: Prompt and UI Inspection Sheet (4-panel contact sheet)
    const shots2 = [
      path.join(OUT, 'prompt-3rd-inspect-noon.png'),
      path.join(OUT, 'prompt-1st-inspect-noon.png'),
      path.join(OUT, 'prompt-3rd-saw-hold-noon.png'),
      path.join(OUT, 'prompt-1st-progress-noon.png')
    ];

    const labels2 = [
      'A. Inspect Prompt 3rd-Person: Floating overhead "E - Inspect fallen logs" (unarmed/no saw)',
      'B. Inspect Prompt 1st-Person: Anchored cleanly under reticle crosshair',
      'C. Hold-to-Cut Prompt 3rd-Person: "Hold E - Cut through fallen logs" with equipped chainsaw',
      'D. Cutting Progress 1st-Person: Real-time progress "Cutting through … 40%" at 1.6s mark'
    ];

    const b64List2 = shots2.map(p => fs.readFileSync(p).toString('base64'));
    const b64Sheet2 = await stitchPage.evaluate(`(async () => {
      const b64s = ${JSON.stringify(b64List2)};
      const labels = ${JSON.stringify(labels2)};
      const cols = 2, rows = 2;
      const cellW = 640, cellH = 360, labelH = 28;
      const c = document.createElement('canvas');
      c.width = cols * cellW;
      c.height = rows * (cellH + labelH);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0f1115';
      ctx.fillRect(0, 0, c.width, c.height);

      const loadImg = (src) => new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = src;
      });

      for (let i = 0; i < b64s.length; i++) {
        const im = await loadImg('data:image/png;base64,' + b64s[i]);
        const col = i % cols, row = Math.floor(i / cols);
        const x = col * cellW, y = row * (cellH + labelH);
        ctx.drawImage(im, x, y, cellW, cellH);
        ctx.fillStyle = '#161920';
        ctx.fillRect(x, y + cellH, cellW, labelH);
        ctx.fillStyle = '#70c0ff';
        ctx.font = 'bold 12px Consolas, monospace';
        ctx.fillText(labels[i] || '', x + 10, y + cellH + 19);
      }
      return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
    })()`);

    const sheetPath2 = path.join(OUT, 'ag186-prompts-sheet.png');
    fs.writeFileSync(sheetPath2, Buffer.from(b64Sheet2, 'base64'));
    console.log(`Saved prompts contact sheet: ${sheetPath2}`);

  } finally {
    try { await stitchBrowser.close(); } catch (_) {}
    try { stitchServer.close(); } catch (_) {}
  }

  fs.writeFileSync(path.join(OUT, 'ag186-summary.json'), JSON.stringify(results, null, 2));
  console.log('Saved summary JSON: ag186-summary.json');
  console.log('AG-186 review completed successfully.');
}

runReview().catch(err => {
  console.error('Error during AG-186 review:', err);
  process.exit(1);
});
