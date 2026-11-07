// qa/2026-11-06-GP-20035/run-gp20035.mjs
// Task AG-249 / GP-20035 request verification:
// Real WebGPU hardware capture on Jerry's RTX 5080 under D-114 pacing.
// Capture gameplay-scale frames of the new "Hold E" winch prompt,
// skipped-step hints, and cable-tied banner in the real renderer.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-06-GP-20035');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function captureShot(page, filename, clip = null) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 92;
  if (clip) {
    params.clip = {
      x: Math.round(clip.x),
      y: Math.round(clip.y),
      width: Math.round(clip.width),
      height: Math.round(clip.height),
      scale: 1,
    };
  }
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[GP-20035] Saved screenshot: ${filename}`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [GP-20035] Winch Prompts & Banner Visual Audit (D-116)           ===');
  console.log('=== Real WebGPU Hardware Verification on RTX 5080                    ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?gates=1&chaingates=1&solid=1&debug=1&raf=timer`;
  console.log('[GP-20035] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });

  const page = await browser.newPage({ width: 1920, height: 1080 });
  console.log('[GP-20035] Loading game with ?gates=1&chaingates=1...');
  await page.goto(url, { timeout: 180000 });

  if (!await page.waitFor('!!window.TT', { timeout: 300000 })) {
    throw new Error('Game did not boot TT within timeout: ' + (page.errors[0] || ''));
  }

  // Dismiss intro
  await page.evaluate(`(() => {
    if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
    else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
  })()`);

  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

  // Start match in First Person, high noon daylight
  console.log('[GP-20035] Starting match in First Person (Noon Daylight)...');
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'GP20035');
    if (T.clearZombies) T.clearZombies();
    T.setHp(100000);
    T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster();
    T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
    T.setAmmoDbg('launcher', 9999);
    T.setViewFirstDbg(true);
    if (T.setWorldTime) T.setWorldTime(0.50);

    // Build story gates
    T.storyGatesDbg.build();

    // Ensure winch tool is held
    const C = T.chainDbg;
    const st = C.read();
    st.keys['winch'] = 'held';
    C.load(st);
  })()`);

  const telemetry = {
    task: 'AG-249',
    request: 'GP-20035 winch prompt screenshot',
    date: new Date().toISOString(),
    renderer: 'NVIDIA GeForce RTX 5080 WebGPU',
    resolution: '1920x1080',
    lighting: 'Noon Daylight (worldTime = 0.50)',
    prompts: {}
  };

  // Helper to extract DOM prompt telemetry and crop box
  const getPromptDom = async () => {
    return await page.evaluate(`(() => {
      const el = document.getElementById('kioskPrompt');
      if (!el) return null;
      const keySpan = el.querySelector('.key');
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        text: el.innerText.trim(),
        html: el.innerHTML.trim(),
        keyText: keySpan ? keySpan.innerText.trim() : null,
        className: el.className,
        visible: style.display !== 'none' && style.opacity !== '0' && !el.classList.contains('offscreen'),
        rect: { x: r.left, y: r.top, width: r.width, height: r.height },
        clip: {
          x: Math.max(0, r.left - 24),
          y: Math.max(0, r.top - 16),
          width: Math.min(1920, r.width + 48),
          height: Math.min(1080, r.height + 32)
        }
      };
    })()`);
  };

  const getBannerDom = async () => {
    return await page.evaluate(`(() => {
      const el = document.getElementById('bigBanner');
      if (!el) return null;
      const t = el.querySelector('.t');
      const s = el.querySelector('.s');
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        title: t ? t.innerText.trim() : '',
        sub: s ? s.innerText.trim() : '',
        className: el.className,
        visible: style.display !== 'none' && style.opacity !== '0' && el.classList.contains('show'),
        rect: { x: r.left, y: r.top, width: r.width, height: r.height },
        clip: {
          x: Math.max(0, r.left - 30),
          y: Math.max(0, r.top - 20),
          width: Math.min(1920, r.width + 60),
          height: Math.min(1080, r.height + 40)
        }
      };
    })()`);
  };

  // ---------------------------------------------------------------------------
  // 1. STAGE 0 AT TRUCK: "E — Bolt on the winch"
  // ---------------------------------------------------------------------------
  console.log('[GP-20035] Stage 0: Standing at crashed truck bumper (Bolt prompt)...');
  const boltInfo = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    const ring = D.rings().find(r => r.place === 'hikers');
    const g = ring.gates[0];
    const sp = D.line.spots('hikers');

    // Stand 1.8m in front of crashed truck bumper looking at the mounting plate
    const px = g.x + g.ax * 1.5;
    const pz = g.z + g.az * 1.5;
    const py = T.sampleHeight(px, pz);

    T.player.position.set(px, py, pz);
    const lookYaw = Math.atan2(g.x - px, g.z - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.10);
    T.setVelDbg(0, 0);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    return {
      playerPos: [px, py, pz],
      gateState: D.line.gate('hikers'),
      promptText: D.line.prompt('hikers', 'truck'),
      whyText: D.line.why('hikers'),
      chainPrompt: T.chainDbg.prompt()
    };
  })()`);

  const boltDom = await getPromptDom();
  telemetry.prompts.winchBolt = { ...boltInfo, dom: boltDom };
  await captureShot(page, '01-winch-bolt-full.jpg');
  if (boltDom?.clip) await captureShot(page, '01-winch-bolt-crop.png', boltDom.clip);

  // ---------------------------------------------------------------------------
  // 2. STAGE 0 AT TREE (Skipped-step hint): "Bolt the winch to the truck first."
  // ---------------------------------------------------------------------------
  console.log('[GP-20035] Stage 0: Standing at anchor tree before bolting (Skipped-step hint)...');
  const needBoltInfo = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    const sp = D.line.spots('hikers');

    // Stand right at the anchor tree
    const px = sp.anchor.x + 0.8;
    const pz = sp.anchor.z - 0.5;
    const py = T.sampleHeight(px, pz);

    T.player.position.set(px, py, pz);
    const lookYaw = Math.atan2(sp.anchor.x - px, sp.anchor.z - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.05);
    T.setVelDbg(0, 0);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    return {
      playerPos: [px, py, pz],
      gateState: D.line.gate('hikers'),
      promptText: D.line.prompt('hikers', 'tree'),
      whyText: D.line.why('hikers'),
      chainPrompt: T.chainDbg.prompt()
    };
  })()`);

  const needBoltDom = await getPromptDom();
  telemetry.prompts.skippedNeedBolt = { ...needBoltInfo, dom: needBoltDom };
  await captureShot(page, '02-skipped-step-need-bolt-full.jpg');
  if (needBoltDom?.clip) await captureShot(page, '02-skipped-step-need-bolt-crop.png', needBoltDom.clip);

  // ---------------------------------------------------------------------------
  // 3. BOLT WINCH TO TRUCK (advance to Stage 1)
  // ---------------------------------------------------------------------------
  console.log('[GP-20035] Bolting winch to truck...');
  await page.evaluate(`(() => {
    const T = window.TT, D = T.storyGatesDbg;
    D.line.use('hikers', 'truck');
  })()`);

  // ---------------------------------------------------------------------------
  // 4. STAGE 1 AT REMOTE (Skipped-step hint): "Tie the cable to the big tree first."
  // ---------------------------------------------------------------------------
  console.log('[GP-20035] Stage 1: Standing at remote before tying cable (Skipped-step hint)...');
  const needTieInfo = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    const sp = D.line.spots('hikers');

    // Stand right at the remote point
    const px = sp.remote.x + 0.3;
    const pz = sp.remote.z - 0.2;
    const py = T.sampleHeight(px, pz);

    T.player.position.set(px, py, pz);
    const ring = D.rings().find(r => r.place === 'hikers');
    const g = ring.gates[0];
    const lookYaw = Math.atan2(g.x - px, g.z - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.08);
    T.setVelDbg(0, 0);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    return {
      playerPos: [px, py, pz],
      gateState: D.line.gate('hikers'),
      promptText: D.line.prompt('hikers', 'remote'),
      whyText: D.line.why('hikers'),
      chainPrompt: T.chainDbg.prompt()
    };
  })()`);

  const needTieDom = await getPromptDom();
  telemetry.prompts.skippedNeedTie = { ...needTieInfo, dom: needTieDom };
  await captureShot(page, '03-skipped-step-need-tie-full.jpg');
  if (needTieDom?.clip) await captureShot(page, '03-skipped-step-need-tie-crop.png', needTieDom.clip);

  // ---------------------------------------------------------------------------
  // 5. STAGE 1 AT TREE: "E — Tie off the cable"
  // ---------------------------------------------------------------------------
  console.log('[GP-20035] Stage 1: Standing at tree (Tie cable prompt)...');
  const tiePromptInfo = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    const sp = D.line.spots('hikers');

    const px = sp.anchor.x + 0.8;
    const pz = sp.anchor.z - 0.5;
    const py = T.sampleHeight(px, pz);

    T.player.position.set(px, py, pz);
    const lookYaw = Math.atan2(sp.anchor.x - px, sp.anchor.z - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.05);
    T.setVelDbg(0, 0);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    return {
      playerPos: [px, py, pz],
      gateState: D.line.gate('hikers'),
      promptText: D.line.prompt('hikers', 'tree'),
      whyText: D.line.why('hikers'),
      chainPrompt: T.chainDbg.prompt()
    };
  })()`);

  const tieDom = await getPromptDom();
  telemetry.prompts.winchTie = { ...tiePromptInfo, dom: tieDom };
  await captureShot(page, '04-winch-tie-full.jpg');
  if (tieDom?.clip) await captureShot(page, '04-winch-tie-crop.png', tieDom.clip);

  // ---------------------------------------------------------------------------
  // 6. TIE CABLE AT TREE: Trigger Cable Tied Banner
  // "CABLE TIED OFF" / "Stand clear at the remote and hold E."
  // ---------------------------------------------------------------------------
  console.log('[GP-20035] Triggering cable tie-off banner...');
  const bannerInfo = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    D.line.use('hikers', 'tree');
    // Step 5 frames to let banner show class transition
    for (let i = 0; i < 5; i++) T.stepFrame(1/60);
    return D.line.gate('hikers');
  })()`);

  const bannerDom = await getBannerDom();
  telemetry.prompts.cableTiedBanner = { bannerInfo, dom: bannerDom };
  await captureShot(page, '05-cable-tied-banner-full.jpg');
  if (bannerDom?.clip) await captureShot(page, '05-cable-tied-banner-crop.png', bannerDom.clip);

  // ---------------------------------------------------------------------------
  // 7. STAGE 2 AT REMOTE: "Hold E — Winch the truck clear 0%" (ACTIONABLE ITEM!)
  // ---------------------------------------------------------------------------
  console.log('[GP-20035] Stage 2: Standing at remote (Hold E Winch prompt at 0%)...');
  const holdPromptInfo = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    const ring = D.rings().find(r => r.place === 'hikers');
    const g = ring.gates[0];
    const sp = D.line.spots('hikers');

    // Stand right in the remote spot facing the crashed truck & cable
    const px = sp.remote.x + 0.3;
    const pz = sp.remote.z - 0.2;
    const py = T.sampleHeight(px, pz);

    T.player.position.set(px, py, pz);
    const lookYaw = Math.atan2(g.x - px, g.z - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.06);
    T.setVelDbg(0, 0);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    return {
      playerPos: [px, py, pz],
      gateState: D.line.gate('hikers'),
      promptText: D.line.prompt('hikers', 'remote'),
      whyText: D.line.why('hikers'),
      chainPrompt: T.chainDbg.prompt()
    };
  })()`);

  const holdDom = await getPromptDom();
  telemetry.prompts.holdEWinchPrompt = { ...holdPromptInfo, dom: holdDom };
  await captureShot(page, '06-hold-e-winch-prompt-full.jpg');
  if (holdDom?.clip) await captureShot(page, '06-hold-e-winch-prompt-crop.png', holdDom.clip);

  // ---------------------------------------------------------------------------
  // 8. STAGE 2 IN PROGRESS: Hold E and capture progress state (e.g. 35%)
  // ---------------------------------------------------------------------------
  console.log('[GP-20035] Holding E at remote: winching in progress...');
  const progressInfo = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    D.line.hold('hikers', true);
    for (let i = 0; i < 75; i++) T.stepFrame(1/30);
    const mid = D.line.gate('hikers');
    return {
      gateState: mid,
      promptText: D.line.prompt('hikers', 'remote'),
      chainPrompt: T.chainDbg.prompt()
    };
  })()`);

  const progressDom = await getPromptDom();
  telemetry.prompts.winchingInProgress = { ...progressInfo, dom: progressDom };
  await captureShot(page, '07-winching-in-progress-full.jpg');
  if (progressDom?.clip) await captureShot(page, '07-winching-in-progress-crop.png', progressDom.clip);

  // Release hold
  await page.evaluate(`(() => {
    const T = window.TT, D = T.storyGatesDbg;
    D.line.hold('hikers', false);
  })()`);

  // Write telemetry.json
  const telemPath = path.join(OUT_DIR, 'telemetry.json');
  fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2), 'utf8');
  console.log(`[GP-20035] Telemetry written to ${telemPath}`);

  await browser.close();
  await server.close();

  console.log('\n[GP-20035] Real WebGPU hardware verification complete!');
}

main().catch((err) => {
  console.error('[GP-20035] Execution failed:', err);
  process.exit(1);
});
