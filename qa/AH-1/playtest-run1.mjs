// AH-1 QA Playtest — Run 1b: Full Zone Walk, Real-Player Collision/Bump Sweep & All Menus @ 1920x1080 & 1366x768 on RTX 5080 WebGL2
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Must run inside game-test slot');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AH-1');
const RAW_DIR = path.join(OUT_DIR, 'raw');
fs.mkdirSync(RAW_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = {
  startedAt: new Date().toISOString(),
  playtestBackend: null,
  rendererString: null,
  consoleErrors: [],
  pageErrors: [],
  collisionChecks: [],
  domAudits: [],
  notes: [],
};

async function setWindowAndViewport(page, w, h) {
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: w + 16, height: h + 88 } });
  } catch {}
  await page.setViewport(w, h, 1);
  try { await page.send('Page.bringToFront', {}); } catch {}
  await sleep(200);
}

async function shot(page, name) {
  const file = path.join(RAW_DIR, `${name}.png`);
  await page.screenshot(file);
  return `qa/AH-1/raw/${name}.png`;
}

async function bootIntoTrainingWebGL(page, origin) {
  page.errors.length = 0;
  page.console.length = 0;
  await page.goto(`${origin}/index.html?debug=1&renderer=webgl`, { timeout: 180000 });
  await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 90000 });
  for (let i = 0; i < 3; i++) {
    await page.evaluate(`(() => {
      if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
      else document.getElementById('openingSkip')?.click();
      return true;
    })()`);
    await sleep(300);
  }
  const loaded = await page.waitFor('!!window.TT', { timeout: 180000 });
  assert(loaded, 'Game did not finish loading window.TT');
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await sleep(500);

  // Hide debug #perf box so bottom-right UI & HUD are unobstructed like a real player's screen
  await page.evaluate(`(() => {
    document.getElementById('perf')?.classList.remove('on');
    const n = document.getElementById('playerName');
    if (n) { n.value = 'QAPlayer'; n.blur(); }
    document.getElementById('modeTraining')?.click();
    return true;
  })()`);

  const ready = await page.waitFor(
    'window.TT?.trainingDbg?.state()?.active && !window.TT?.trainingDbg?.state()?.warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',
    { timeout: 90000 }
  );
  await sleep(1500);
  return ready;
}

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1936,1168'],
});

try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await setWindowAndViewport(page, 1920, 1080);

  console.log('[AH-1] Booting RTX 5080 WebGL2 into Training Ground...');
  const glReady = await bootIntoTrainingWebGL(page, server.origin);
  assert(glReady, 'WebGL2 Training failed to become ready');

  const backendInfo = await page.evaluate(`(() => {
    let glRenderer = '';
    try {
      const gl = TT.renderer?.getContext?.();
      const dbg = gl?.getExtension?.('WEBGL_debug_renderer_info');
      if (dbg) glRenderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
    } catch {}
    return {
      backend: TT.getRendererBackend?.() || 'unknown',
      glRenderer,
      draws: TT.renderer?.info?.render?.calls ?? 0,
      tris: TT.renderer?.info?.render?.triangles ?? 0,
    };
  })()`);
  report.playtestBackend = backendInfo.backend;
  report.rendererString = backendInfo.glRenderer;
  console.log('[AH-1] Playtest active on:', JSON.stringify(backendInfo));

  // Install JSON-safe QA helper
  await page.evaluate(`(() => {
    window.__QA = {
      K(code, up = false) {
        window.dispatchEvent(new KeyboardEvent(up ? 'keyup' : 'keydown', { code, key: code, bubbles: true, cancelable: true }));
      },
      async closeAll() {
        const click = (s) => document.querySelector(s)?.click();
        const shown = (s) => { const e = document.querySelector(s); return !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; };
        if (shown('#rangeDrillHud')) { this.K('Escape'); await new Promise((r) => setTimeout(r, 250)); }
        if (document.querySelector('#fullMap.show')) { this.K('Escape'); await new Promise((r) => setTimeout(r, 200)); }
        this.K('Tab', true); this.K('KeyQ', true); this.K('KeyB', true);
        if (TT.closeWheelDbg) TT.closeWheelDbg();
        if (TT.setPlaceMode) TT.setPlaceMode(null);
        document.getElementById('pauseQuitView')?.classList.remove('on');
        document.getElementById('pauseMainView')?.classList.remove('hide');
        click('#shopClose');
        click('#cifClose');
        document.querySelector('#trainingPanel .tp-close')?.click();
        if (shown('#rangeConsole')) click('#rangeConsole [data-close]');
        if (shown('#pause')) {
          click('#resetCancelBtn');
          click('#settingsBackBtn');
          click('#tipsBackBtn');
          click('#skillsBackBtn');
          click('#resumeBtn');
        }
        await new Promise((r) => setTimeout(r, 250));
        return true;
      },
      async lookFrom(lx, lz, yawDeg, pitchDeg, firstPerson = true, waitMs = 350) {
        const O = TT.trainingDbg.tg().origin;
        TT.setViewFirstDbg(firstPerson);
        TT.player.position.set(O.x + lx, O.y, O.z + lz);
        TT.setVelDbg(0, 0);
        const yawRad = yawDeg * Math.PI / 180;
        const pitchRad = pitchDeg * Math.PI / 180;
        TT.player.rotation.y = yawRad;
        TT.setAimYawDbg(yawRad);
        TT.setOtsAimDbg(yawRad, pitchRad);
        await new Promise((r) => setTimeout(r, waitMs));
        return true;
      },
      async walkBump(name, lx, lz, yawDeg, ms = 900, extraKey = null) {
        const O = TT.trainingDbg.tg().origin;
        TT.setViewFirstDbg(true);
        TT.player.position.set(O.x + lx, O.y, O.z + lz);
        TT.setVelDbg(0, 0);
        const yawRad = yawDeg * Math.PI / 180;
        TT.player.rotation.y = yawRad;
        TT.setAimYawDbg(yawRad);
        TT.setOtsAimDbg(yawRad, 0);
        await new Promise((r) => setTimeout(r, 120));
        const start = { x: +(TT.player.position.x - O.x).toFixed(3), z: +(TT.player.position.z - O.z).toFixed(3), y: +(TT.player.position.y - O.y).toFixed(3) };
        this.K('KeyW', false);
        if (extraKey) this.K(extraKey, false);
        await new Promise((r) => setTimeout(r, ms));
        this.K('KeyW', true);
        if (extraKey) this.K(extraKey, true);
        await new Promise((r) => setTimeout(r, 80));
        const hit = { x: +(TT.player.position.x - O.x).toFixed(3), z: +(TT.player.position.z - O.z).toFixed(3), y: +(TT.player.position.y - O.y).toFixed(3) };
        this.K('KeyS', false);
        await new Promise((r) => setTimeout(r, 400));
        this.K('KeyS', true);
        await new Promise((r) => setTimeout(r, 80));
        const backed = { x: +(TT.player.position.x - O.x).toFixed(3), z: +(TT.player.position.z - O.z).toFixed(3), y: +(TT.player.position.y - O.y).toFixed(3) };
        const backDist = +Math.hypot(backed.x - hit.x, backed.z - hit.z).toFixed(3);
        return { name, start, hit, backed, backDist, stuck: backDist < 0.15 };
      }
    };
    return true;
  })()`);

  // =========================================================================
  // 1. ZONE-BY-ZONE WALK & 1P/3P VISUAL INSPECTION
  // =========================================================================
  console.log('[AH-1] Step 1: Capturing every zone view on RTX 5080 WebGL2...');
  await page.evaluate('__QA.closeAll()');

  const views = [
    // --- ZONE 1: FIRING RANGE ---
    { id: 'z1-range-overview-1p', lx: 0, lz: -2.0, yaw: 0, pitch: -2, fp: true },
    { id: 'z1-range-overview-3p', lx: 0, lz: -2.0, yaw: 0, pitch: -5, fp: false },
    { id: 'z1-range-ceiling-up', lx: 0, lz: -2.5, yaw: 0, pitch: 58, fp: true },
    { id: 'z1-range-ceiling-duct-east', lx: 4.5, lz: -5.0, yaw: 65, pitch: 48, fp: true },
    { id: 'z1-range-ceiling-pipe-west', lx: -4.5, lz: -5.0, yaw: -65, pitch: 48, fp: true },
    { id: 'z1-firing-bench-wire-mesh', lx: 0, lz: -1.1, yaw: 0, pitch: 18, fp: true },
    { id: 'z1-firing-bench-left-corner', lx: 6.2, lz: -1.3, yaw: 35, pitch: -10, fp: true },
    { id: 'z1-firing-bench-right-corner', lx: -6.2, lz: -1.3, yaw: -35, pitch: -10, fp: true },
    { id: 'z1-range-console-close', lx: -5.2, lz: -2.2, yaw: -45, pitch: -15, fp: true },
    { id: 'z1-melee-dummy-close', lx: -3.2, lz: -3.2, yaw: -45, pitch: -8, fp: true },
    // Back wall of Range (z = -12)
    { id: 'z1-backwall-lockers', lx: -5.8, lz: -9.4, yaw: 180, pitch: -5, fp: true },
    { id: 'z1-backwall-monitor-stencil', lx: -1.5, lz: -8.5, yaw: 180, pitch: 12, fp: true },
    { id: 'z1-backwall-rack-daysboard', lx: 3.5, lz: -9.2, yaw: 180, pitch: -2, fp: true },
    { id: 'z1-backwall-rack-closeup', lx: 2.3, lz: -10.5, yaw: 180, pitch: -4, fp: true },
    // East wall stations (CIF z=-10.2, Kiosk z=-6.6, Armory z=-3.0)
    { id: 'z2-cif-station-front', lx: 4.6, lz: -10.2, yaw: 90, pitch: 4, fp: true },
    { id: 'z2-cif-station-top-ceiling', lx: 3.5, lz: -10.2, yaw: 90, pitch: 38, fp: true },
    { id: 'z2-kiosk-station-front', lx: 4.6, lz: -6.6, yaw: 90, pitch: 4, fp: true },
    { id: 'z2-armory-station-front', lx: 4.2, lz: -3.0, yaw: 90, pitch: 4, fp: true },
    { id: 'z2-armory-rack-pegs-high', lx: 5.2, lz: -3.0, yaw: 90, pitch: 28, fp: true },
    { id: 'z2-armory-side-angle', lx: 5.5, lz: -5.2, yaw: 55, pitch: 8, fp: true },
    { id: 'z2-stations-wide-wall', lx: 0.5, lz: -6.6, yaw: 90, pitch: 10, fp: true },
    // Doorway & Light Switch (x = -8, z = -9.5..-6.5)
    { id: 'z3-doorway-from-range', lx: -4.8, lz: -8.0, yaw: -90, pitch: 12, fp: true },
    { id: 'z3-doorway-lintel-shutter-range', lx: -5.5, lz: -8.0, yaw: -90, pitch: 42, fp: true },
    { id: 'z3-lightswitch-close', lx: -6.5, lz: -5.95, yaw: -90, pitch: -5, fp: true },
    { id: 'z3-doorway-from-buildroom', lx: -11.8, lz: -8.0, yaw: 90, pitch: 15, fp: true },
    { id: 'z3-doorway-lintel-shutter-build', lx: -11.5, lz: -8.0, yaw: 90, pitch: 45, fp: true },
    // --- ZONE 4: BUILD ROOM / HANGAR, PILLARS & WALL MINIGUNS ---
    { id: 'z4-buildroom-overview', lx: -14.0, lz: -6.0, yaw: -35, pitch: 5, fp: true },
    { id: 'z4-buildroom-ceiling-trusses', lx: -24.0, lz: 0.0, yaw: 0, pitch: 55, fp: true },
    { id: 'z4-pillar-east-lamp-intersect', lx: -11.5, lz: 0.0, yaw: 90, pitch: 38, fp: true },
    { id: 'z4-pillar-west-lamp-intersect', lx: -40.5, lz: 12.0, yaw: -90, pitch: 38, fp: true },
    { id: 'z4-pillar-footplate-close', lx: -10.5, lz: 6.0, yaw: 90, pitch: -25, fp: true },
    { id: 'z4-wall-minigun-east', lx: -13.0, lz: 8.0, yaw: 90, pitch: 38, fp: true },
    { id: 'z4-wall-minigun-south', lx: -26.0, lz: -6.5, yaw: 180, pitch: 42, fp: true },
    // --- ZONE 5: MEDICAL BAY / INFIRMARY & FENCE ---
    { id: 'z5-infirmary-wide', lx: -33.5, lz: -6.5, yaw: -135, pitch: -5, fp: true },
    { id: 'z5-infirmary-fence-se-corner', lx: -35.0, lz: -10.8, yaw: -120, pitch: -10, fp: true },
    { id: 'z5-infirmary-fence-nw-wall-gap', lx: -42.5, lz: -6.8, yaw: -175, pitch: -10, fp: true },
    { id: 'z5-infirmary-cot-stretcher', lx: -37.2, lz: -7.2, yaw: -135, pitch: -15, fp: true },
    { id: 'z5-infirmary-cabinet-iv-o2', lx: -38.0, lz: -7.2, yaw: -155, pitch: -8, fp: true },
    // --- ZONE 6: HQ PANEL & SKULL INTAKE WINDOW ---
    { id: 'z6-skull-window-front', lx: -39.5, lz: -3.0, yaw: -90, pitch: 5, fp: true },
    { id: 'z6-hq-panel-front', lx: -39.5, lz: 3.0, yaw: -90, pitch: 5, fp: true },
    { id: 'z6-west-stations-wide-pillars', lx: -35.0, lz: 0.0, yaw: -90, pitch: 12, fp: true },
    // --- ZONE 7: CONTAINMENT GATE & NO-BUILD ZONE ---
    { id: 'z7-containment-gate-wide', lx: -26.0, lz: 18.0, yaw: 0, pitch: 8, fp: true },
    { id: 'z7-containment-gate-close', lx: -26.0, lz: 23.5, yaw: 0, pitch: 5, fp: true },
    { id: 'z7-nobuild-stencil-floor', lx: -26.0, lz: 14.0, yaw: 0, pitch: -28, fp: true },
    { id: 'z7-gate-pilaster-hydraulics', lx: -22.2, lz: 24.5, yaw: 5, pitch: -5, fp: true },
  ];

  for (const v of views) {
    await page.evaluate(`__QA.lookFrom(${v.lx}, ${v.lz}, ${v.yaw}, ${v.pitch}, ${v.fp})`);
    await shot(page, v.id);
  }

  // Test targets fallen forward & backward
  await page.evaluate(`(async () => {
    const tg = TT.trainingDbg.tg();
    tg.hitTarget(0, 1);
    tg.hitTarget(1, -1);
    await new Promise((r) => setTimeout(r, 400));
    await __QA.lookFrom(4.5, -1.0, 10, -6, true, 300);
    return true;
  })()`);
  await shot(page, 'z1-targets-fallen-both-ways');

  // Test lights OFF
  await page.evaluate(`(async () => {
    const D = TT.trainingDbg;
    if (D.lights().on) D.toggleLights();
    await __QA.lookFrom(-3.0, -5.5, -55, 5, true, 500);
    return true;
  })()`);
  await shot(page, 'z3-lights-off-range-switch');

  await page.evaluate(`__QA.lookFrom(-26.0, 8.0, 0, 5, true, 500)`);
  await shot(page, 'z4-lights-off-buildroom');

  await page.evaluate(`(() => { const D = TT.trainingDbg; if (!D.lights().on) D.toggleLights(); return true; })()`);
  await sleep(300);

  // Test zombie spawn -> open containment gate leaves & closed security shutter
  console.log('[AH-1] Step 2: Testing zombie spawn, open containment gate, security shutter, collisions & infirmary...');
  await page.evaluate(`(async () => {
    await __QA.closeAll();
    const D = TT.trainingDbg;
    D.act('trainingPanel');
    await new Promise((r) => setTimeout(r, 400));
    document.querySelector('#trainingPanel .tp-spawn')?.click();
    await new Promise((r) => setTimeout(r, 250));
    document.querySelector('#trainingPanel .tp-close')?.click();
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const g = D.tg().releaseGate;
      if (g.leaves[0] && Math.abs(g.leaves[0].position.x) > 1.5) break;
    }
    await __QA.lookFrom(-26.0, 20.5, 0, 4, true, 250);
    return true;
  })()`);
  await shot(page, 'z7-containment-gate-OPEN-leaves');

  await page.evaluate(`__QA.lookFrom(-11.5, -8.0, 90, 5, true, 300)`);
  await shot(page, 'z3-doorway-shutter-CLOSED');

  await page.evaluate(`(async () => {
    const D = TT.trainingDbg;
    D.act('trainingPanel');
    await new Promise((r) => setTimeout(r, 250));
    document.querySelector('#trainingPanel .tp-clear:not(.tp-clear-layout)')?.click();
    await new Promise((r) => setTimeout(r, 200));
    document.querySelector('#trainingPanel .tp-close')?.click();
    await new Promise((r) => setTimeout(r, 2000));
    return true;
  })()`);

  // Collision / bump checks
  const bumps = [
    ['firing-bench-center', 0, -2.0, 0, 900, null],
    ['firing-bench-jump', 0, -2.0, 0, 900, 'Space'],
    ['firing-bench-crouch', 0, -2.0, 0, 900, 'ControlLeft'],
    ['range-console', -6.2, -2.8, 0, 900, null],
    ['melee-dummy', -4.5, -4.5, 45, 900, null],
    ['back-lockers', -5.8, -9.8, 180, 900, null],
    ['locker-swing-door', -5.9, -10.2, 180, 900, null],
    ['back-weapon-rack', 2.3, -10.0, 180, 900, null],
    ['cif-counter', 5.2, -10.2, 90, 900, null],
    ['supply-kiosk', 5.2, -6.6, 90, 900, null],
    ['armory-bench', 5.0, -3.0, 90, 900, null],
    ['doorway-through-west', -6.8, -8.0, -90, 900, null],
    ['doorway-north-jamb', -6.8, -6.6, -90, 900, null],
    ['infirmary-fence-east', -35.0, -10.0, -90, 900, null],
    ['infirmary-fence-north', -40.0, -6.8, 180, 900, null],
    ['infirmary-fence-nw-gap', -43.1, -6.8, 180, 900, null],
    ['infirmary-fence-se-gap', -35.0, -11.15, -90, 900, null],
    ['skull-window', -41.5, -3.0, -90, 900, null],
    ['hq-zombie-panel', -41.5, 3.0, -90, 900, null],
    ['containment-gate', -26.0, 25.0, 0, 900, null],
    ['east-pillar-z0', -9.8, 0.0, 90, 900, null],
  ];
  for (const [name, lx, lz, yaw, ms, extra] of bumps) {
    const res = await page.evaluate(`__QA.walkBump(${JSON.stringify(name)}, ${lx}, ${lz}, ${yaw}, ${ms}, ${JSON.stringify(extra)})`);
    report.collisionChecks.push(res);
  }

  // Pressed-against-station pitch down -60 check
  await page.evaluate(`(async () => {
    await __QA.walkBump('armory-pitch-down', 5.2, -3.0, 90, 700, null);
    TT.setOtsAimDbg(Math.PI / 2, -60 * Math.PI / 180);
    await new Promise((r) => setTimeout(r, 300));
    return true;
  })()`);
  await shot(page, 'z2-armory-pressed-pitch-down60-1p');

  // Player death & wake-up inside Infirmary Bay (JSON-safe!)
  await page.evaluate(`(async () => {
    await __QA.lookFrom(-26.0, 0.0, 0, 0, false, 200);
    TT.damagePlayer(9999);
    await new Promise((r) => setTimeout(r, 3200));
    return true;
  })()`);
  await shot(page, 'z5-infirmary-wakeup-after-death');

  const infirmaryExit = await page.evaluate(`(async () => {
    const O = TT.trainingDbg.tg().origin;
    // Wait until wake animation finishes so movement is unlocked
    for (let i = 0; i < 25; i++) {
      const st = TT.trainingDbg.state();
      if (!st.waking && !st.recovering) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    const p0 = { x: +(TT.player.position.x - O.x).toFixed(2), z: +(TT.player.position.z - O.z).toFixed(2) };
    TT.player.rotation.y = 0;
    TT.setAimYawDbg(0);
    TT.setOtsAimDbg(0, 0);
    __QA.K('KeyW', false);
    await new Promise((r) => setTimeout(r, 1400));
    __QA.K('KeyW', true);
    await new Promise((r) => setTimeout(r, 600));
    const p1 = { x: +(TT.player.position.x - O.x).toFixed(2), z: +(TT.player.position.z - O.z).toFixed(2) };
    return { wakePos: p0, exitedPos: p1, distMoved: +Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2) };
  })()`);
  report.notes.push({ infirmaryExit });

  // =========================================================================
  // 3. ALL MENUS & PANELS AUDIT AT 1920x1080 AND 1366x768
  // =========================================================================
  console.log('[AH-1] Step 3: Auditing every menu & panel at 1920x1080 and 1366x768...');

  await page.evaluate(`(() => {
    window.__auditUI = function(menuName, rootSel) {
      const vw = window.innerWidth, vh = window.innerHeight;
      const issues = [];
      const vis = (el) => {
        if (!el || el.hidden) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
        const r = el.getBoundingClientRect();
        return r.width > 1 && r.height > 1;
      };
      const root = rootSel ? document.querySelector(rootSel) : document.body;
      if (rootSel && !vis(root)) {
        return { menuName, vw, vh, visible: false, issues: [{ kind: 'not-visible', sel: rootSel }] };
      }
      if (root && root !== document.body) {
        const rr = root.getBoundingClientRect();
        if (rr.left < -1 || rr.top < -1 || rr.right > vw + 1 || rr.bottom > vh + 1) {
          issues.push({ kind: 'modal-outside-viewport', rect: { l: Math.round(rr.left), t: Math.round(rr.top), r: Math.round(rr.right), b: Math.round(rr.bottom) } });
        }
      }
      const els = [...(root || document.body).querySelectorAll('button, label, h1, h2, h3, h4, p, span, div, select, input')].filter(vis);
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const tag = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
        if (r.right > vw + 2 || r.bottom > vh + 2 || r.left < -2 || r.top < -2) {
          let inVertScroll = false;
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const pcs = getComputedStyle(p);
            if ((pcs.overflowY === 'auto' || pcs.overflowY === 'scroll') && p.scrollHeight > p.clientHeight) { inVertScroll = true; break; }
          }
          if (!inVertScroll || r.right > vw + 2 || r.left < -2) {
            issues.push({ kind: 'off-viewport', el: tag, text: (el.innerText || '').trim().slice(0, 40), rect: { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) } });
          }
        }
        if ((cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 3 && el.children.length === 0) {
          issues.push({ kind: 'text-truncated', el: tag, text: (el.innerText || '').trim().slice(0, 50), scrollW: el.scrollWidth, clientW: el.clientWidth });
        }
        const fsPx = parseFloat(cs.fontSize);
        if (fsPx > 0 && fsPx < 10.5 && (el.innerText || '').trim().length > 0 && el.children.length === 0) {
          issues.push({ kind: 'tiny-font', el: tag, px: fsPx, text: (el.innerText || '').trim().slice(0, 40) });
        }
      }
      const btns = [...(root || document.body).querySelectorAll('button')].filter(vis);
      for (let i = 0; i < btns.length; i++) {
        for (let j = i + 1; j < btns.length; j++) {
          const a = btns[i].getBoundingClientRect(), b = btns[j].getBoundingClientRect();
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ox > 3 && oy > 3 && !btns[i].contains(btns[j]) && !btns[j].contains(btns[i])) {
            issues.push({
              kind: 'button-overlap',
              a: (btns[i].innerText || btns[i].id || 'btn').trim().slice(0, 25),
              b: (btns[j].innerText || btns[j].id || 'btn').trim().slice(0, 25),
              overlap: { x: Math.round(ox), y: Math.round(oy) }
            });
          }
        }
      }
      const hudIds = ['#hudTopLeft', '#hudBottomRight', '#ammoHud', '#coinHud', '#minimap', '#interactPrompt', '#trainingHint', '#rangeDrillHud', '#bigBanner'];
      const visibleHuds = [];
      for (const h of hudIds) {
        const he = document.querySelector(h);
        if (vis(he)) {
          const hr = he.getBoundingClientRect();
          visibleHuds.push({ sel: h, zIndex: getComputedStyle(he).zIndex, rect: { l: Math.round(hr.left), t: Math.round(hr.top), r: Math.round(hr.right), b: Math.round(hr.bottom) } });
        }
      }
      return { menuName, vw, vh, visible: true, issueCount: issues.length, issues: issues.slice(0, 25), visibleHuds };
    };
    return true;
  })()`);

  const menuCases = [
    { key: '01-hud-1p', sel: null, open: `await __QA.closeAll(); await __QA.lookFrom(0, -1.5, 0, 0, true, 500);` },
    { key: '02-pause', sel: '#pause', open: `await __QA.closeAll(); await __QA.lookFrom(0, -1.5, 0, 0, true, 250); __QA.K('Escape'); await new Promise(r=>setTimeout(r,400));` },
    { key: '03-settings', sel: '#pause', open: `await __QA.closeAll(); __QA.K('Escape'); await new Promise(r=>setTimeout(r,300)); document.querySelector('#settingsBtn')?.click(); await new Promise(r=>setTimeout(r,400));` },
    { key: '04-tips', sel: '#pause', open: `await __QA.closeAll(); __QA.K('Escape'); await new Promise(r=>setTimeout(r,300)); document.querySelector('#tipsBtn')?.click(); await new Promise(r=>setTimeout(r,400));` },
    { key: '05-skills', sel: '#pause', open: `await __QA.closeAll(); __QA.K('Escape'); await new Promise(r=>setTimeout(r,300)); document.querySelector('#skillsBtn')?.click(); await new Promise(r=>setTimeout(r,400));` },
    { key: '06-hq-zombie-panel', sel: '#trainingPanel', open: `await __QA.closeAll(); await __QA.lookFrom(-41.5, 3.0, -90, 0, true, 250); TT.trainingDbg.act('trainingPanel'); await new Promise(r=>setTimeout(r,500));` },
    { key: '07-range-console', sel: '#rangeConsole', open: `await __QA.closeAll(); await __QA.lookFrom(-5.5, -1.5, -35, -10, true, 250); TT.trainingDbg.act('rangeConsole'); await new Promise(r=>setTimeout(r,600));` },
    { key: '08-armory', sel: '#cif', open: `await __QA.closeAll(); await __QA.lookFrom(5.5, -3.0, 90, 0, true, 250); TT.trainingDbg.act('armory'); await new Promise(r=>setTimeout(r,1000));` },
    { key: '09-cif', sel: '#cif', open: `await __QA.closeAll(); await __QA.lookFrom(5.5, -10.2, 90, 0, true, 250); TT.trainingDbg.act('cif'); await new Promise(r=>setTimeout(r,900));` },
    { key: '10-supply-kiosk-supplies', sel: '#shop', open: `await __QA.closeAll(); await __QA.lookFrom(5.5, -6.6, 90, 0, true, 250); TT.trainingDbg.act('kiosk'); await new Promise(r=>setTimeout(r,500));` },
    { key: '11-supply-kiosk-builds', sel: '#shop', open: `await __QA.closeAll(); await __QA.lookFrom(5.5, -6.6, 90, 0, true, 250); TT.trainingDbg.act('kiosk'); await new Promise(r=>setTimeout(r,350)); [...document.querySelectorAll('#shopTabs button')].at(-1)?.click(); await new Promise(r=>setTimeout(r,400));` },
    { key: '12-weapon-wheel', sel: '#wheel', open: `await __QA.closeAll(); await __QA.lookFrom(0, -1.5, 0, 0, true, 250); __QA.K('KeyQ', false); await new Promise(r=>setTimeout(r,600));` },
    { key: '13-build-wheel', sel: '#wheel', open: `await __QA.closeAll(); await __QA.lookFrom(-26, 0, 0, 0, true, 250); __QA.K('KeyB', false); await new Promise(r=>setTimeout(r,600));` },
    { key: '14-full-map', sel: '#fullMap', open: `await __QA.closeAll(); await __QA.lookFrom(-20, 0, 0, 0, true, 250); __QA.K('Tab', false); await new Promise(r=>setTimeout(r,600));` },
  ];

  for (const [w, h, tag] of [[1920, 1080, '1920x1080'], [1366, 768, '1366x768']]) {
    await setWindowAndViewport(page, w, h);
    for (const m of menuCases) {
      await page.evaluate(`(async () => { ${m.open} return true; })()`);
      const audit = await page.evaluate(`__auditUI(${JSON.stringify(m.key + '@' + tag)}, ${JSON.stringify(m.sel)})`);
      audit.screenshot = await shot(page, `menu-${m.key}-${tag}`);
      report.domAudits.push(audit);
    }
    await page.evaluate('__QA.closeAll()');
  }

  report.pageErrors = [...page.errors];
  report.consoleErrors = page.console.filter((c) => c.type === 'error' || c.type === 'warning').slice(0, 80);
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT_DIR, 'run1-diagnostics.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log('[AH-1] Run 1b complete! Saved qa/AH-1/run1-diagnostics.json');
} finally {
  await browser.close().catch(() => {});
  await server.close().catch(() => {});
}
