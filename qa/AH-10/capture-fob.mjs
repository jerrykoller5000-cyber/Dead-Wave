// qa/AH-10/capture-fob.mjs — 18-view RTX 5080 WebGPU capture + perf audit for FOB Threshold structure textures.
// Usage: node crew/crew.mjs slot run antigravity2 AH-10 --exclusive --checks "AH-10 FOB BEFORE" -- node qa/AH-10/capture-fob.mjs before
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const TAG = process.argv[2] || 'before';
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AH-10', TAG);
fs.mkdirSync(OUT_DIR, { recursive: true });

class FobCapture extends Engine {
  async load() {
    const t0 = Date.now();
    const page = this.page;
    await page.goto(this.server.origin + '/index.html?debug=1', { waitUntil: 'none' });
    if (!await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 60000 })) {
      throw new Error('Opening unavailable: ' + JSON.stringify(page.errors));
    }
    await page.evaluate('window.DWOpening?.dismissForTesting?.()');
    if (!await page.waitFor('!!window.TT && !window.DWOpening?.active', { timeout: 100000 })) {
      throw new Error('Game ready timeout: ' + JSON.stringify(page.errors));
    }
    this.backend = await page.evaluate('TT.getRendererBackend()');
    await page.evaluate(`(async () => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const T = window.TT;
      const n = document.getElementById('playerName'); if (n) n.value = 'AH-10';
      document.getElementById('modeHunt')?.click();
      for (let i = 0; i < 120 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
      for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
      await wait(400);
      try { T.runDevCommand('nodead'); } catch {}
      try { T.runDevCommand('godmode'); } catch {}
      try { T.clearZombies(); } catch {}
      // Wait for HQ stencil fonts to repaint
      for (let i = 0; i < 40; i++) {
        const d = T.house?.group?.getObjectByName('hq-designation');
        const m = T.house?.mural;
        if ((!d || d.userData.letteringReady) && (!m || m.userData.letteringReady)) break;
        await wait(100);
      }
      return T.getPhase?.();
    })()`, 180000);
    await page.evaluate("import('/tools/camera-rig.js').then(m => { window.CamRig = m.install(); return true; })");
    this.renderer = await page.evaluate('CamRig.renderer()');
    this.mode = 'world';
    this.loadSec = (Date.now() - t0) / 1000;
  }
}

const VIEWS = [
  { id: '01-south-facade-wide', time: 'noon', pos: [2.8, 3.8, -16.5], look: [0, 3.0, -5.0], fov: 50 },
  { id: '02-south-mural-banner-close', time: 'noon', pos: [0.0, 3.3, -10.4], look: [0, 3.2, -5.0], fov: 44 },
  { id: '03-south-duty-teleprinter-close', time: 'noon', pos: [-0.2, 1.55, -8.3], look: [0.0, 1.35, -5.05], fov: 48 },
  { id: '04-south-alarm-damaged-close', time: 'noon', pos: [3.2, 2.0, -8.6], look: [3.2, 1.8, -5.05], fov: 44 },
  { id: '05-damaged-terminal-close', time: 'noon', pos: [-3.4, 2.05, -7.8], look: [-3.25, 1.92, -5.05], fov: 42 },
  { id: '06-west-face-wide', time: 'noon', pos: [-15.8, 3.5, 0.2], look: [-5.0, 2.5, 0.0], fov: 50 },
  { id: '07-west-kiosk-ladder-close', time: 'noon', pos: [-9.2, 2.0, 1.1], look: [-5.1, 1.85, 1.1], fov: 48 },
  { id: '08-west-intake-close', time: 'noon', pos: [-9.0, 2.1, -2.2], look: [-5.05, 1.9, -2.2], fov: 46 },
  { id: '09-north-face-wide', time: 'noon', pos: [-1.5, 3.5, 15.5], look: [-0.4, 2.6, 5.0], fov: 50 },
  { id: '10-north-lockdown-door-close', time: 'noon', pos: [0.4, 1.8, 8.9], look: [0.0, 1.65, 5.05], fov: 46 },
  { id: '11-east-face-wide', time: 'noon', pos: [15.8, 3.5, 0.4], look: [5.0, 2.5, 0.0], fov: 50 },
  { id: '12-east-armory-cif-close', time: 'noon', pos: [10.4, 2.3, 0.4], look: [5.05, 2.2, 0.2], fov: 52 },
  { id: '13-roof-deck-overview', time: 'noon', pos: [-10.5, 11.4, -10.5], look: [0.4, 6.2, 0.5], fov: 50 },
  { id: '14-roof-klaxon-fans-close', time: 'noon', pos: [-3.4, 7.1, -3.4], look: [1.5, 6.6, 0.8], fov: 52 },
  { id: '15-corner-armor-close', time: 'noon', pos: [-8.3, 2.5, -8.3], look: [-4.9, 2.2, -4.9], fov: 42 },
  { id: '16-south-dusk', time: 'dusk', pos: [-10.2, 4.0, -13.5], look: [-0.5, 2.7, -2.5], fov: 50 },
  { id: '17-south-night', time: 'night', pos: [9.2, 3.6, -13.5], look: [0.2, 2.6, -3.0], fov: 50 },
  { id: '18-west-rain', time: 'noon', rain: true, pos: [-11.5, 3.8, -11.5], look: [-2.0, 2.7, -2.0], fov: 50 },
];

const cam = new FobCapture({ onscreen: true, size: '1920x1080' });
try {
  await cam.open();
  const page = cam.page;

  const meta = await page.evaluate(`(() => {
    const T = window.TT;
    const hqDraws = T.drawsOf ? T.drawsOf(T.house.group) : [];
    const kioskDraws = T.drawsOf && T.KIOSK?.group ? T.drawsOf(T.KIOSK.group) : [];
    return {
      hy: T.house.group.position.y,
      hqDrawCount: hqDraws.length,
      hqTexturedDraws: hqDraws.filter(d => d.map).length,
      kioskDrawCount: kioskDraws.length,
      memTextures: T.renderer?.info?.memory?.textures || 0,
      memGeos: T.renderer?.info?.memory?.geometries || 0,
    };
  })()`);
  console.log(`[AH-10 ${TAG}] Backend=${cam.backend} loadSec=${cam.loadSec.toFixed(2)} hqDraws=${meta.hqDrawCount} (textured=${meta.hqTexturedDraws})`);

  const measurePerf = async (name, v) => {
    const c = { x: v.pos[0], y: +(v.pos[1] + meta.hy).toFixed(2), z: v.pos[2], tx: v.look[0], ty: +(v.look[1] + meta.hy).toFixed(2), tz: v.look[2], fov: v.fov };
    return await page.evaluate(`(async () => {
      await CamRig.aim({ cam: ${JSON.stringify(c)}, time: ${JSON.stringify(v.time)}, ui: false, settle: 200 });
      return await new Promise((resolve) => {
        const times = []; let last = performance.now();
        const step = (now) => {
          times.push(now - last); last = now;
          if (times.length < 120) requestAnimationFrame(step);
          else {
            const s = [...times].sort((a, b) => a - b);
            const meanMs = times.reduce((a, b) => a + b, 0) / times.length;
            resolve({ name: ${JSON.stringify(name)}, frames: times.length, meanMs: +meanMs.toFixed(2), meanFps: +(1000 / meanMs).toFixed(1), medianMs: +s[60].toFixed(1), p99Ms: +s[118].toFixed(1) });
          }
        };
        requestAnimationFrame(() => { last = performance.now(); requestAnimationFrame(step); });
      });
    })()`, 30000);
  };

  const perf = {
    south: await measurePerf('south_facade_wide', VIEWS[0]),
    roof: await measurePerf('roof_deck_overview', VIEWS[12]),
  };

  for (const v of VIEWS) {
    const c = { x: v.pos[0], y: +(v.pos[1] + meta.hy).toFixed(2), z: v.pos[2], tx: v.look[0], ty: +(v.look[1] + meta.hy).toFixed(2), tz: v.look[2], fov: v.fov };
    const pre = v.rain
      ? `try { T.runDevCommand('storm'); T.windDbg?.update?.(0.2); } catch {} await wait(350);`
      : v.time === 'night'
        ? `try { if (!T.flashlightOn) T.toggleFlashlightDbg?.(); } catch {} await wait(200);`
        : '';
    await page.evaluate(`(async () => {
      await CamRig.aim({ cam: ${JSON.stringify(c)}, time: ${JSON.stringify(v.time)}, ui: false, pre: ${JSON.stringify(pre)}, settle: 160 });
    })()`, 30000);
    const outPath = path.join(OUT_DIR, `${v.id}.png`);
    await page.screenshot(outPath);
    const kb = Math.round(fs.statSync(outPath).size / 1024);
    console.log(`  shot ${v.id} (${kb} KB)`);
  }

  const summary = {
    tag: TAG, backend: cam.backend, loadSec: +cam.loadSec.toFixed(2),
    pageErrors: page.errors.length, pageErrorList: page.errors.slice(0, 10),
    hqDrawCount: meta.hqDrawCount, hqTexturedDraws: meta.hqTexturedDraws,
    kioskDrawCount: meta.kioskDrawCount, memTextures: meta.memTextures,
    perf,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== SUMMARY ===\n' + JSON.stringify(summary, null, 2));
  execFileSync('python', ['qa/AH-10/make-sheets.py', TAG], { cwd: ROOT, stdio: 'inherit' });
} finally {
  await cam.close();
}
