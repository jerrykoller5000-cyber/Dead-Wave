// qa/AG-412/capture-caves.mjs — 30-view RTX 5080 WebGPU capture + metrics for all 6 cave entrances.
// Usage: node crew/crew.mjs slot run antigravity AG-412 --checks "AG-412 caves BEFORE" -- node qa/AG-412/capture-caves.mjs before
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const TAG = process.argv[2] || 'before';
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AG-412', TAG);
fs.mkdirSync(OUT_DIR, { recursive: true });

class CaveCapture extends Engine {
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
      const n = document.getElementById('playerName'); if (n) n.value = 'AG-412';
      document.getElementById('modeHunt')?.click();
      for (let i = 0; i < 120 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
      for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
      await wait(400);
      try { T.runDevCommand('nodead'); } catch {}
      try { T.runDevCommand('godmode'); } catch {}
      try { T.clearZombies(); } catch {}
      return T.getPhase?.();
    })()`, 180000);
    await page.evaluate("import('/tools/camera-rig.js').then(m => { window.CamRig = m.install(); return true; })");
    this.renderer = await page.evaluate('CamRig.renderer()');
    this.mode = 'world';
    this.loadSec = (Date.now() - t0) / 1000;
  }
}

const THEMES = ['root', 'shale', 'iron', 'wet', 'hill', 'chalk'];
const VIEWS = [];
let idx = 1;
const pad2 = (n) => String(n).padStart(2, '0');
for (const theme of THEMES) {
  VIEWS.push({ id: `${pad2(idx++)}-${theme}-hero-noon`, theme, kind: 'hero', time: 'noon', lx: 4.4, ly: 2.7, lz: 13.8, tx: 0.0, ty: 2.6, tz: -0.4, fov: 50 });
  VIEWS.push({ id: `${pad2(idx++)}-${theme}-close-noon`, theme, kind: 'close', time: 'noon', lx: -1.8, ly: 1.75, lz: 6.9, tx: 0.0, ty: 2.0, tz: -0.6, fov: 50 });
  VIEWS.push({ id: `${pad2(idx++)}-${theme}-flank-noon`, theme, kind: 'flank', time: 'noon', lx: -5.4, ly: 2.2, lz: 9.8, tx: 0.4, ty: 2.1, tz: 0.2, fov: 50 });
  VIEWS.push({ id: `${pad2(idx++)}-${theme}-night`, theme, kind: 'night', time: 'night', lx: 3.4, ly: 2.35, lz: 11.8, tx: 0.0, ty: 2.4, tz: -0.5, fov: 50 });
}
for (const theme of ['iron', 'hill', 'chalk']) {
  VIEWS.push({ id: `${pad2(idx++)}-${theme}-dusk`, theme, kind: 'dusk', time: 'dusk', lx: 4.4, ly: 2.7, lz: 13.8, tx: 0.0, ty: 2.6, tz: -0.4, fov: 50 });
}
for (const theme of ['wet', 'root', 'shale']) {
  VIEWS.push({ id: `${pad2(idx++)}-${theme}-rain`, theme, kind: 'rain', time: 'noon', rain: true, lx: 4.4, ly: 2.7, lz: 13.8, tx: 0.0, ty: 2.6, tz: -0.4, fov: 50 });
}

const cam = new CaveCapture({ onscreen: true, size: '1920x1080' });
try {
  await cam.open();
  const page = cam.page;

  const meta = await page.evaluate(`(() => {
    const T = window.TT;
    const v = new T.THREE.Vector3();
    const caves = T.POI.caves.map((c) => {
      c.group.updateMatrixWorld(true);
      let tris = 0, meshes = 0, rMax = 0;
      c.group.traverse((o) => {
        if (!o.isMesh || !o.geometry?.attributes?.position) return;
        meshes++;
        const p = o.geometry.attributes.position;
        tris += (o.geometry.index ? o.geometry.index.count : p.count) / 3;
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
          rMax = Math.max(rMax, Math.hypot(v.x, v.z));
        }
      });
      return {
        theme: c.theme, x: +c.x.toFixed(2), gy: +c.gy.toFixed(2), z: +c.z.toFixed(2), yaw: +c.yaw.toFixed(4),
        w: c.design.w, h: c.design.h, groupTris: Math.round(tris), groupMeshes: meshes, rMax: +rMax.toFixed(2),
      };
    });
    const dressGrp = T.scene.getObjectByName('cave-entrance-dressing');
    let dressTris = 0, dressMeshes = 0, dressRMax = 0;
    if (dressGrp) {
      dressGrp.updateMatrixWorld(true);
      dressGrp.traverse((o) => {
        if (!o.isMesh || !o.geometry?.attributes?.position) return;
        dressMeshes++;
        const p = o.geometry.attributes.position;
        dressTris += (o.geometry.index ? o.geometry.index.count : p.count) / 3;
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
          dressRMax = Math.max(dressRMax, Math.hypot(v.x, v.z));
        }
      });
    }
    return {
      caves,
      totalCaveGroupTris: caves.reduce((a, b) => a + b.groupTris, 0),
      dressTris: Math.round(dressTris),
      dressMeshes,
      dressRMax: +dressRMax.toFixed(2),
      memTextures: T.renderer?.info?.memory?.textures || 0,
      memGeos: T.renderer?.info?.memory?.geometries || 0,
    };
  })()`);
  console.log(`[AG-412 ${TAG}] Backend=${cam.backend} loadSec=${cam.loadSec.toFixed(2)} caveGroupTris=${meta.totalCaveGroupTris}/60000 dressTris=${meta.dressTris}`);

  const byTheme = Object.fromEntries(meta.caves.map((c) => [c.theme, c]));
  const worldCam = async (v) => {
    const c = byTheme[v.theme];
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
    const wx = +(c.x + rx * v.lx + fx * v.lz).toFixed(2);
    const wz = +(c.z + rz * v.lx + fz * v.lz).toFixed(2);
    const camGround = await page.evaluate(`TT.sampleHeight(${wx}, ${wz})`);
    return {
      x: wx,
      y: +(Math.max(c.gy, camGround) + v.ly).toFixed(2),
      z: wz,
      tx: +(c.x + rx * v.tx + fx * v.tz).toFixed(2),
      ty: +(c.gy + v.ty).toFixed(2),
      tz: +(c.z + rz * v.tx + fz * v.tz).toFixed(2),
      fov: v.fov,
    };
  };

  const measurePerf = async (name, v) => {
    const c = await worldCam(v);
    return await page.evaluate(`(async () => {
      const T = window.TT;
      // Place player nearby (out of view behind cam) so distance-culled cave props stay visible
      const cx = ${c.x}, cz = ${c.z}, tx = ${c.tx}, tz = ${c.tz};
      const dx = cx - tx, dz = cz - tz, l = Math.hypot(dx, dz) || 1;
      const px = cx + (dx / l) * 3.5, pz = cz + (dz / l) * 3.5;
      T.player.position.set(px, T.sampleHeight(px, pz), pz);
      await CamRig.aim({ cam: ${JSON.stringify(c)}, time: ${JSON.stringify(v.time)}, ui: false, settle: 200 });
      return await new Promise((resolve) => {
        const times = []; let last = performance.now();
        const step = (now) => {
          times.push(now - last); last = now;
          if (times.length < 90) requestAnimationFrame(step);
          else {
            const s = [...times].sort((a, b) => a - b);
            const meanMs = times.reduce((a, b) => a + b, 0) / times.length;
            resolve({ name: ${JSON.stringify(name)}, frames: times.length, meanMs: +meanMs.toFixed(2), meanFps: +(1000 / meanMs).toFixed(1), medianMs: +s[45].toFixed(1), p99Ms: +s[88].toFixed(1) });
          }
        };
        requestAnimationFrame(() => { last = performance.now(); requestAnimationFrame(step); });
      });
    })()`, 30000);
  };

  const perf = {
    iron: await measurePerf('iron_hero_noon', VIEWS.find((v) => v.theme === 'iron' && v.kind === 'hero')),
    root: await measurePerf('root_hero_noon', VIEWS.find((v) => v.theme === 'root' && v.kind === 'hero')),
  };

  for (const v of VIEWS) {
    const c = await worldCam(v);
    const rainOn = v.rain
      ? `try { T.runDevCommand('storm'); T.windDbg?.update?.(0.2); } catch {} await wait(260);`
      : `try { T.runDevCommand('clear'); } catch {}`;
    const nightPre = v.time === 'night'
      ? `try { T.updateFirstPeopleDbg?.(10, { night: true, silenced: false }); } catch {} try { if (T.firstPeople) { T.firstPeople.level = 1; } } catch {} await wait(160);`
      : '';
    const pre = `
      const cx = ${c.x}, cz = ${c.z}, tx = ${c.tx}, tz = ${c.tz};
      const dx = cx - tx, dz = cz - tz, l = Math.hypot(dx, dz) || 1;
      const px = cx + (dx / l) * 3.8, pz = cz + (dz / l) * 3.8;
      T.player.position.set(px, T.sampleHeight(px, pz), pz);
      ${rainOn}
      ${nightPre}
    `;
    await page.evaluate(`(async () => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const T = window.TT;
      await CamRig.aim({ cam: ${JSON.stringify(c)}, time: ${JSON.stringify(v.time)}, ui: false, pre: ${JSON.stringify(pre)}, settle: 170 });
    })()`, 30000);
    const outPath = path.join(OUT_DIR, `${v.id}.png`);
    await page.screenshot(outPath);
    const kb = Math.round(fs.statSync(outPath).size / 1024);
    console.log(`  shot ${v.id} (${kb} KB)`);
  }

  const summary = {
    tag: TAG, backend: cam.backend, loadSec: +cam.loadSec.toFixed(2),
    pageErrors: page.errors.length, pageErrorList: page.errors.slice(0, 10),
    ...meta,
    perf,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== SUMMARY ===\n' + JSON.stringify(summary, null, 2));
  execFileSync('python', ['qa/AG-412/make-sheets.py', TAG], { cwd: ROOT, stdio: 'inherit' });
} finally {
  await cam.close();
}
