// qa/2026-11-11-AG-304/ag304-top10-breakdown.mjs
// Exact subsystem + step-by-step profiler of the Training Ground entry blackout (1P & 3P) on RTX 5080 WebGPU.
// Measures synchronous setup steps + per-subsystem Three.js/WebGPU compile CPU & async Dawn pipeline wall time,
// producing a ranked Top-10 breakdown JSON + markdown table for CLAUDE DIRECTOR.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-304');
const OUT_REV = path.join(ROOT, 'review/AG-304');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

async function moveOffscreen(page) {
  try {
    const win = await page.send('Browser.getWindowForTarget', {});
    if (win && win.windowId != null) {
      await page.send('Browser.setWindowBounds', {
        windowId: win.windowId,
        bounds: { left: -3800, top: -3800, width: 1280, height: 720, windowState: 'normal' }
      });
    }
  } catch (_) {}
}

async function profileMode(browser, origin, mode) {
  const page = await browser.newPage({ width: 1280, height: 720 });
  try {
    await moveOffscreen(page);
    await page.goto(`${origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    await moveOffscreen(page);
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));

    // Set 1P or 3P preference prior to clicking modeTraining
    await page.evaluate(`(() => {
      try {
        localStorage.setItem('dw_view_first', ${mode === '1P' ? "'1'" : "'0'"});
      } catch (_) {}
      TT.setViewFirstDbg(${mode === '1P' ? 'true' : 'false'});
    })()`);

    // Install zero-mutation profiler hooks on TT.renderer + WebGPU device + scene
    await page.evaluate(`(() => {
      const T = window.TT;
      const r = T.renderer;
      const dev = r.backend && r.backend.device;
      const buckets = new Map();
      const ensureBucket = (name) => {
        if (!buckets.has(name)) {
          buckets.set(name, {
            name,
            objects: 0,
            uniqueMats: new Set(),
            uniqueGeoms: new Set(),
            cpuMs: 0,
            newAsyncPipes: 0,
            asyncPipeResolveSpanMs: 0,
            firstPipeAt: Infinity,
            lastPipeDoneAt: 0
          });
        }
        return buckets.get(name);
      };

      const pistolGeomIds = new Set();
      if (T.weaponMeshes && T.weaponMeshes.pistol) {
        T.weaponMeshes.pistol.traverse((m) => {
          if (m.geometry && m.geometry.id != null) pistolGeomIds.add(m.geometry.id);
        });
      }

      const classifyObj = (o, mat) => {
        const names = [];
        for (let p = o; p; p = p.parent) {
          if (p.name) names.push(p.name);
        }
        const chain = names.join(' <- ');
        // Viewmodel 1P
        if (T.viewmodelDbg && T.viewmodelDbg()) {
          const vmRoot = T.viewmodelDbg().root;
          for (let p = o; p; p = p.parent) {
            if (p === vmRoot) {
              if (chain.includes('vm-warmup') || chain.includes('vm-bg-warm')) {
                const isPistol = o.geometry && pistolGeomIds.has(o.geometry.id);
                return isPistol
                  ? '1P Starter Pistol (vm-warmup pistol)'
                  : '1P Other 11 Weapons (vm-warmup 11 gun clones)';
              }
              if (o.isSkinnedMesh) return '1P Viewmodel Arms (SkinnedMesh sleeves & gloves)';
              return '1P Viewmodel Blade & Grenade Hands';
            }
          }
        }
        // Check 3P weaponMeshes
        if (T.weaponMeshes) {
          for (const [wk, wRoot] of Object.entries(T.weaponMeshes)) {
            for (let p = o; p; p = p.parent) {
              if (p === wRoot) {
                return wk === 'pistol'
                  ? '3P Starter Pistol (weaponMeshes.pistol)'
                  : '3P Other 11 Weapons (weaponMeshes + offhand)';
              }
            }
          }
        }
        if (chain.includes('training-cutaway-warm-keepers')) {
          return 'Training Room Solid Keeper Proxies (cutawayKeepers)';
        }
        if (chain.includes('training-marine-fade-pipeline-keepers')) {
          return 'Marine Fade Pipeline Keepers (SkinnedMesh fade)';
        }
        if (chain.includes('training-perimeter') || (mat && String(mat.name || '').includes('perimeter'))) {
          return 'Training Perimeter Fence (solid + fade)';
        }
        if (chain.includes('training-armory') || chain.includes('training-cif') || chain.includes('training-kiosk') || chain.includes('training-hqPanel') || chain.includes('training-skullWindow')) {
          return 'Training Copied HQ Stations (CIF/Armory/Kiosk/Panel/Skull)';
        }
        if (T.marine) {
          for (let p = o; p; p = p.parent) {
            if (p === T.marine) {
              return o.isSkinnedMesh ? '3P Marine Body & Rig (SkinnedMesh)' : '3P Carried Gear, Slings & Pouches';
            }
          }
        }
        if (mat && mat.transparent && chain.includes('training')) {
          return 'Training Cutaway / Containment Fade Materials';
        }
        const tg = T.trainingDbg && T.trainingDbg.tg && T.trainingDbg.tg();
        if (tg && tg.group) {
          for (let p = o; p; p = p.parent) {
            if (p === tg.group) {
              if (o.isInstancedMesh) return 'Training VFX Warmup (Impacts / Char / Wreck / Instanced)';
              return mat && mat.transparent
                ? 'Training Cutaway / Containment Fade Materials'
                : 'Training Ground Architecture & Props (tg.group)';
            }
          }
        }
        if (o && o.isInstancedMesh) return 'World / VFX Empty InstancedMesh Warmup';
        return 'Other Scene / World Keepers';
      };

      let activeBucket = null;
      let hookDepth = 0;
      const phases = [];

      // Hook RenderObjects.get & Nodes.getForRender & Bindings.getForRender & Pipelines.getForRender
      // Guarded by hookDepth so nested renderer calls never double-count cpuMs.
      const origObjGet = r._objects.get.bind(r._objects);
      r._objects.get = function(object, material, ...rest) {
        const bName = classifyObj(object, material);
        const b = ensureBucket(bName);
        activeBucket = b;
        b.objects++;
        if (material && material.id != null) b.uniqueMats.add(material.id);
        if (object && object.geometry && object.geometry.id != null) b.uniqueGeoms.add(object.geometry.id);
        const outer = hookDepth++ === 0;
        const t0 = outer ? performance.now() : 0;
        try {
          return origObjGet(object, material, ...rest);
        } finally {
          hookDepth--;
          if (outer) b.cpuMs += (performance.now() - t0);
        }
      };

      const origNodesGet = r._nodes.getForRender.bind(r._nodes);
      r._nodes.getForRender = function(ro) {
        const b = ensureBucket(classifyObj(ro.object, ro.material));
        activeBucket = b;
        const outer = hookDepth++ === 0;
        const t0 = outer ? performance.now() : 0;
        try {
          return origNodesGet(ro);
        } finally {
          hookDepth--;
          if (outer) b.cpuMs += (performance.now() - t0);
        }
      };

      const origBindingsGet = r._bindings.getForRender.bind(r._bindings);
      r._bindings.getForRender = function(ro) {
        const b = ensureBucket(classifyObj(ro.object, ro.material));
        activeBucket = b;
        const outer = hookDepth++ === 0;
        const t0 = outer ? performance.now() : 0;
        try {
          return origBindingsGet(ro);
        } finally {
          hookDepth--;
          if (outer) b.cpuMs += (performance.now() - t0);
        }
      };

      const origPipesGet = r._pipelines.getForRender.bind(r._pipelines);
      r._pipelines.getForRender = function(ro, promises) {
        const b = ensureBucket(classifyObj(ro.object, ro.material));
        activeBucket = b;
        const pLenBefore = promises ? promises.length : 0;
        const outer = hookDepth++ === 0;
        const t0 = outer ? performance.now() : 0;
        try {
          const res = origPipesGet(ro, promises);
          if (promises && promises.length > pLenBefore) {
            const added = promises.length - pLenBefore;
            b.newAsyncPipes += added;
            const startAt = performance.now();
            if (startAt < b.firstPipeAt) b.firstPipeAt = startAt;
            for (let i = pLenBefore; i < promises.length; i++) {
              promises[i] = Promise.resolve(promises[i]).then((v) => {
                const endAt = performance.now();
                if (endAt > b.lastPipeDoneAt) b.lastPipeDoneAt = endAt;
                b.asyncPipeResolveSpanMs = +(b.lastPipeDoneAt - b.firstPipeAt).toFixed(1);
                return v;
              });
            }
          }
          return res;
        } finally {
          hookDepth--;
          if (outer) b.cpuMs += (performance.now() - t0);
        }
      };

      const origCompileAsync = r.compileAsync.bind(r);
      r.compileAsync = function(sc, cam, targetSc) {
        const t0 = performance.now();
        const p = origCompileAsync(sc, cam, targetSc);
        const syncMs = performance.now() - t0;
        const rec = { phase: 'renderer.compileAsync (sync CPU)', ms: +syncMs.toFixed(1), asyncTotalMs: 0 };
        phases.push(rec);
        return Promise.resolve(p).then((v) => {
          rec.asyncTotalMs = +(performance.now() - t0).toFixed(1);
          phases.push({ phase: 'Dawn async pipeline queue wait (beyond sync CPU)', ms: +(rec.asyncTotalMs - syncMs).toFixed(1) });
          return v;
        });
      };

      const origRender = r.render.bind(r);
      r.render = function(...args) {
        if (T.trainingDbg.state().warming) {
          const t0 = performance.now();
          const res = origRender(...args);
          phases.push({ phase: 'warmFrame / render during blackout', ms: +(performance.now() - t0).toFixed(1) });
          return res;
        }
        return origRender(...args);
      };

      if (dev && dev.queue && typeof dev.queue.onSubmittedWorkDone === 'function') {
        const origQ = dev.queue.onSubmittedWorkDone.bind(dev.queue);
        dev.queue.onSubmittedWorkDone = function() {
          if (T.trainingDbg.state().warming) {
            const t0 = performance.now();
            return origQ().then((v) => {
              phases.push({ phase: 'device.queue.onSubmittedWorkDone()', ms: +(performance.now() - t0).toFixed(1) });
              return v;
            });
          }
          return origQ();
        };
      }

      window.__agProfStart = () => {
        buckets.clear();
        phases.length = 0;
        const tClick0 = performance.now();
        document.getElementById('playerName').value = 'PROF-' + ${JSON.stringify(mode)};
        document.getElementById('modeTraining').click();
        const clickSyncMs = +(performance.now() - tClick0).toFixed(1);
        phases.unshift({ phase: 'startTraining() + enterTraining() sync build (room/stations/colliders)', ms: clickSyncMs });
        window.__tClick0 = tClick0;
      };

      window.__agProfRead = () => {
        const rows = [...buckets.values()].map((b) => ({
          name: b.name,
          objects: b.objects,
          uniqueMats: b.uniqueMats.size,
          uniqueGeoms: b.uniqueGeoms.size,
          cpuMs: +b.cpuMs.toFixed(1),
          newAsyncPipes: b.newAsyncPipes,
          asyncPipeSpanMs: b.asyncPipeResolveSpanMs
        })).sort((a, b) => b.cpuMs - a.cpuMs);
        return {
          totalBlackoutWallMs: +(window.__tLift - window.__tClick0).toFixed(1),
          phases,
          bucketsByCpuMs: rows
        };
      };
    })()`);

    await page.evaluate(`window.__agProfStart()`);
    assert(await page.waitFor(
      'TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',
      { timeout: 60000 }
    ));
    await page.evaluate(`(() => { window.__tLift = performance.now(); })()`);
    return await page.evaluate(`window.__agProfRead()`);
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ]
  });
  try {
    console.log('[AG-304 Top-10] Profiling Cold 1P blackout...');
    const p1 = await profileMode(browser, server.origin, '1P');
    console.log('[AG-304 Top-10] 1P wallMs:', p1.totalBlackoutWallMs);

    console.log('[AG-304 Top-10] Profiling Cold 3P blackout...');
    const p3 = await profileMode(browser, server.origin, '3P');
    console.log('[AG-304 Top-10] 3P wallMs:', p3.totalBlackoutWallMs);

    const out = { capturedAt: new Date().toISOString(), mode1P: p1, mode3P: p3 };
    const js = JSON.stringify(out, null, 2);
    fs.writeFileSync(path.join(OUT_QA, 'blackout-top10-breakdown.json'), js);
    fs.writeFileSync(path.join(OUT_REV, 'blackout-top10-breakdown.json'), js);
    console.log('[AG-304 Top-10] Saved blackout-top10-breakdown.json');
  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
