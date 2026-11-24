// qa/AH-14/profile-perf.mjs — Exclusive RTX 5080 WebGPU cold-load & Training Area performance profiler
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'AH-14');
fs.mkdirSync(OUT_DIR, { recursive: true });

const tag = (process.argv[2] || 'before').replace(/[^a-z0-9_-]/gi, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = 1600, H = 900;

async function main() {
  const server = await serve(ROOT, 0);
  let browser = null;
  try {
    browser = await launch({
      headless: false,
      args: ['--disable-features=CalculateNativeWinOcclusion', `--window-size=${W},${H}`],
    });
    const page = await browser.newPage({ width: W, height: H });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: W + 20, height: H + 80 } });
      await page.send('Page.bringToFront');
    } catch (_) {}

    // --- PART A: COLD LOAD TIMING ---
    const tNav0 = Date.now();
    // Real rAF (no raf=timer) so we measure genuine WebGPU load & frame pacing as Jerry experiences it
    const url = `${server.origin}/index.html?debug=1`;
    await page.goto(url, { timeout: 240000 });
    const tGotoDone = Date.now() - tNav0;

    await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
    const tOpeningReady = Date.now() - tNav0;

    // Immediately skip intro video gate so we measure pure game load + shader warm-up without waiting on video playback
    for (let i = 0; i < 3; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
        return true;
      })()`);
      await sleep(150);
    }

    const hasTT = await page.waitFor('!!window.TT', { timeout: 300000 });
    if (!hasTT) throw new Error('window.TT never appeared: ' + (page.errors[0] || 'unknown'));
    const tTTReady = Date.now() - tNav0;

    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 240000 });
    const tTitleInteractive = Date.now() - tNav0;
    await sleep(400);

    // Collect boot telemetry & console load marks
    const bootConsole = (page.console || [])
      .map((c) => (typeof c === 'string' ? c : (c.text || JSON.stringify(c))))
      .filter((s) => /Grave Shift|AH14-PROF|warm-up|load:|Training|shader|pipeline|warning|error/i.test(s));

    const bootInfo = await page.evaluate(`(() => {
      const T = window.TT;
      const perfMarks = (window.DWPerf && typeof window.DWPerf.read === 'function') ? window.DWPerf.read()
        : (window.DWPerf && window.DWPerf.marks ? window.DWPerf.marks : null);
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource')
        .map(r => ({ name: r.name.replace(location.origin, ''), dur: +r.duration.toFixed(1), size: r.transferSize || 0 }))
        .sort((a, b) => b.dur - a.dur).slice(0, 15);
      const mem = T.renderer.info.memory || {};
      let glRenderer = 'unknown';
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
        glRenderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'webgpu';
      } catch (_) {}
      return {
        isWebGPU: !!(T.renderer && T.renderer.backend && T.renderer.backend.isWebGPUBackend),
        backendName: T.renderer?.backend?.constructor?.name || 'unknown',
        gpu: glRenderer,
        navDCL: nav ? +nav.domContentLoadedEventEnd.toFixed(0) : null,
        navLoad: nav ? +nav.loadEventEnd.toFixed(0) : null,
        perfMarks,
        topResources: resources,
        bootMemory: { geometries: mem.geometries || 0, textures: mem.textures || 0 },
        jsHeapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) : null,
      };
    })()`);

    console.log(`[BOOT ${tag}] goto=${tGotoDone}ms opening=${tOpeningReady}ms TT=${tTTReady}ms titleReady=${tTitleInteractive}ms backend=${bootInfo.backendName}`);
    for (const line of bootConsole) console.log('  [LOG]', line);

    // --- PART B: TRAINING AREA ENTRY TIMING ---
    const tTrainClick = Date.now();
    await page.evaluate(`(() => {
      const n = document.getElementById('playerName');
      if (n) n.value = 'AH14Perf';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
      return !!btn;
    })()`);

    const trainEntered = await page.waitFor(`(() => {
      const T = window.TT;
      if (!T || !T.trainingDbg) return false;
      const st = T.trainingDbg.state();
      const blk = document.getElementById('trainingBlackout');
      return !!(st && st.active && !st.warming && (!blk || !blk.classList.contains('on')));
    })()`, { timeout: 120000 });
    const tTrainReadyMs = Date.now() - tTrainClick;
    console.log(`[TRAINING ENTRY ${tag}] entered=${trainEntered} took=${tTrainReadyMs}ms`);
    await sleep(600);
    const trainConsole = (page.console || [])
      .map((c) => (typeof c === 'string' ? c : (c.text || JSON.stringify(c))))
      .filter((s) => /AH14-PROF|Training|trainingWarm|fire resource|armory/i.test(s));
    for (const line of trainConsole) console.log('  [TRN]', line);

    // --- PART C: DEEP SCENE GRAPH, LIGHT, MATERIAL & TEXTURE AUDIT INSIDE TRAINING ---
    const sceneAudit = await page.evaluate(`(() => {
      const T = window.TT;
      const scene = T.scene;
      const tg = T.trainingDbg.tg();
      const triCount = (g) => {
        if (!g || !g.attributes || !g.attributes.position) return 0;
        return g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      };
      const isEffectivelyVisible = (o) => {
        for (let p = o; p; p = p.parent) if (p.visible === false) return false;
        return true;
      };

      let totalVisMeshes = 0, totalVisTris = 0, totalVisCasters = 0, totalVisReceivers = 0;
      let nonTrainingVisMeshes = 0, nonTrainingVisTris = 0;
      const nonTrainingTop = [];
      const topGroups = new Map();
      const subGroups = new Map();
      const matSet = new Set(), geoSet = new Set(), texSet = new Set();
      const lights = [];

      const countNode = (map, key, m, tris, inst) => {
        let e = map.get(key);
        if (!e) { e = { meshes: 0, instanced: 0, tris: 0, casters: 0, mats: new Set() }; map.set(key, e); }
        e.meshes++;
        if (inst > 1) e.instanced += inst;
        e.tris += tris * inst;
        if (m.castShadow) e.casters++;
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach(mm => e.mats.add(mm.uuid));
          else e.mats.add(m.material.uuid);
        }
      };

      const collectTex = (mat) => {
        if (!mat) return;
        for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap']) {
          if (mat[k]) texSet.add(mat[k]);
        }
      };

      scene.traverse((o) => {
        if (o.isLight && isEffectivelyVisible(o)) {
          lights.push({
            type: o.type,
            name: o.name || '',
            intensity: +(o.intensity || 0).toFixed(2),
            castShadow: !!o.castShadow,
            shadowMap: o.shadow && o.shadow.mapSize ? [o.shadow.mapSize.x, o.shadow.mapSize.y] : null,
            distance: o.distance || null,
            pos: o.position ? [+o.position.x.toFixed(1), +o.position.y.toFixed(1), +o.position.z.toFixed(1)] : null
          });
        }
        if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite)) return;
        if (!isEffectivelyVisible(o)) return;
        const inst = o.isInstancedMesh ? (o.count || 1) : 1;
        const tris = triCount(o.geometry);
        totalVisMeshes++;
        totalVisTris += tris * inst;
        if (o.castShadow) totalVisCasters++;
        if (o.receiveShadow) totalVisReceivers++;
        if (o.geometry) geoSet.add(o.geometry.uuid);
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(mm => { matSet.add(mm.uuid); collectTex(mm); });
          else { matSet.add(o.material.uuid); collectTex(o.material); }
        }
        // Find top-level child under scene
        let top = o;
        while (top.parent && top.parent !== scene) top = top.parent;
        const topName = (top === tg.group) ? 'TRAINING_GROUP' : (top.name || top.type || 'unnamed');
        countNode(topGroups, topName, o, tris, inst);

        if (top !== tg.group) {
          nonTrainingVisMeshes++;
          nonTrainingVisTris += tris * inst;
          if (nonTrainingTop.length < 25) nonTrainingTop.push({ name: topName, child: o.name || o.type, tris: Math.round(tris * inst), castShadow: !!o.castShadow });
        } else {
          // Find direct child under tg.group
          let sub = o;
          while (sub.parent && sub.parent !== tg.group) sub = sub.parent;
          const subName = sub.name || (sub.userData && (sub.userData.trainingTag || sub.userData.kind)) || (sub.type + '#' + tg.group.children.indexOf(sub));
          countNode(subGroups, subName, o, tris, inst);
        }
      });

      const fmtMap = (m, limit = 30) => [...m.entries()]
        .map(([name, v]) => ({ name, meshes: v.meshes, instanced: v.instanced, tris: Math.round(v.tris), casters: v.casters, uniqueMats: v.mats.size }))
        .sort((a, b) => b.meshes - a.meshes)
        .slice(0, limit);

      const topByTris = [...subGroups.entries()]
        .map(([name, v]) => ({ name, meshes: v.meshes, tris: Math.round(v.tris), casters: v.casters, uniqueMats: v.mats.size }))
        .sort((a, b) => b.tris - a.tris)
        .slice(0, 20);

      // Audit material transparency / shader diversity in tg.group
      let transparentMeshes = 0, doubleSideMeshes = 0, physicalMats = 0, standardMats = 0, nodeMats = 0;
      const matList = new Set();
      tg.group.traverse((o) => {
        if (!o.isMesh || !isEffectivelyVisible(o) || !o.material) return;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) {
          if (m.transparent) transparentMeshes++;
          if (m.side === 2) doubleSideMeshes++;
          if (!matList.has(m.uuid)) {
            matList.add(m.uuid);
            if (m.isMeshPhysicalMaterial) physicalMats++;
            else if (m.isNodeMaterial) nodeMats++;
            else if (m.isMeshStandardMaterial) standardMats++;
          }
        }
      });

      return {
        totalVisMeshes,
        totalVisTris: Math.round(totalVisTris),
        totalVisCasters,
        totalVisReceivers,
        uniqueMaterials: matSet.size,
        uniqueGeometries: geoSet.size,
        uniqueTextures: texSet.size,
        nonTrainingVisMeshes,
        nonTrainingVisTris: Math.round(nonTrainingVisTris),
        tgDirectChildren: tg.group.children.length,
        tgMaterialBreakdown: { unique: matList.size, standard: standardMats, physical: physicalMats, node: nodeMats, transparentMeshes, doubleSideMeshes },
        lights,
        topGroups: fmtMap(topGroups, 20),
        tgTopByMeshes: fmtMap(subGroups, 25),
        tgTopByTris: topByTris,
        nonTrainingSample: nonTrainingTop.slice(0, 15)
      };
    })()`);

    console.log(`[SCENE AUDIT ${tag}] visMeshes=${sceneAudit.totalVisMeshes} visTris=${sceneAudit.totalVisTris} casters=${sceneAudit.totalVisCasters} uniqueMats=${sceneAudit.uniqueMaterials} lights=${sceneAudit.lights.length} nonTrainingMeshes=${sceneAudit.nonTrainingVisMeshes}`);

    // --- PART D: REAL-TIME FRAME PROFILING AT 6 TRAINING AREA SPOTS ---
    const profileSpot = async (name, setupCode, shotFile = null) => {
      const res = await page.evaluate(`(async () => {
        const T = window.TT;
        const tg = T.trainingDbg.tg();
        const O = tg.origin;
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        ${setupCode}
        // Let camera & scene settle 15 frames
        for (let i = 0; i < 15; i++) await new Promise(r => requestAnimationFrame(r));
        T.profDbg.on = true;
        T.profDbg.reset();
        window.__ah14ShadowMs = 0; window.__ah14ShadowCalls = 0;
        const dts = [];
        let last = performance.now();
        const callsSamples = [], trisSamples = [];
        for (let i = 0; i < 75; i++) {
          await new Promise(r => requestAnimationFrame(r));
          const now = performance.now();
          dts.push(now - last);
          last = now;
          const rinfo = T.renderer.info.render || {};
          callsSamples.push(rinfo.calls || 0);
          trisSamples.push(rinfo.triangles || 0);
        }
        const prof = T.profDbg.report();
        T.profDbg.on = false;
        const shadowAvgMs = +(window.__ah14ShadowMs / Math.max(1, dts.length)).toFixed(2);
        const shadowCalls = window.__ah14ShadowCalls || 0;
        dts.sort((a, b) => a - b);
        const avg = dts.reduce((a, b) => a + b, 0) / dts.length;
        const p50 = dts[Math.floor(dts.length * 0.5)];
        const p95 = dts[Math.floor(dts.length * 0.95)];
        const worst = dts[dts.length - 1];
        const mem = T.renderer.info.memory || {};
        // Note: WebGPU renderer.info.render.calls may accumulate across frames or reset per render; report delta per frame too!
        const callDelta = callsSamples.length > 1 ? Math.round((callsSamples[callsSamples.length - 1] - callsSamples[0]) / (callsSamples.length - 1)) : callsSamples[0];
        return {
          name: ${JSON.stringify(name)},
          frames: dts.length,
          avgMs: +avg.toFixed(2),
          fps: +(1000 / Math.max(0.1, avg)).toFixed(1),
          p50Ms: +p50.toFixed(2),
          p95Ms: +p95.toFixed(2),
          worstMs: +worst.toFixed(2),
          callsLast: callsSamples[callsSamples.length - 1],
          callsDeltaPerFrame: callDelta,
          trisLast: trisSamples[trisSamples.length - 1],
          geometries: mem.geometries || 0,
          textures: mem.textures || 0,
          heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) : null,
          shadowPrune: T.shadowPruneDbg ? T.shadowPruneDbg() : null,
          sunShadow: T.sunShadowDbg ? T.sunShadowDbg() : null,
          shadowAvgMs,
          shadowCalls,
          bgWarming: !!T.trainingDbg.state().bgWarming,
          topPhases: (prof.phases || []).slice(0, 12),
          spikes: (prof.spikes || []).slice(0, 5)
        };
      })()`, 120000);
      if (shotFile) {
        await page.screenshot(path.join(OUT_DIR, shotFile));
      }
      console.log(`[PERF ${tag}] ${name.padEnd(20)} fps=${String(res.fps).padEnd(5)} avg=${res.avgMs}ms p95=${res.p95Ms}ms worst=${res.worstMs}ms sh=${res.shadowAvgMs}ms(${res.shadowCalls}) calls/f=${res.callsDeltaPerFrame} tris=${res.trisLast} heap=${res.heapMB}MB bg=${res.bgWarming?1:0}`);
      console.log('   phases:', res.topPhases.slice(0, 6).map(p => `${p.k}=${p.avg}ms(max ${p.max})`).join(' | '));
      return res;
    };

    const spots = [];
    // 1. Spawn 3P looking downrange
    spots.push(await profileSpot('train-spawn-3p', `
      T.setShotView(null);
      if (T.setViewFirstDbg) T.setViewFirstDbg(false);
      T.player.position.set(tg.spawn.x, tg.floorY, tg.spawn.z);
    `, `${tag}-train-spawn-3p.png`));

    // 2. Spawn 1P (with ceiling ON + first-person viewmodel!)
    spots.push(await profileSpot('train-spawn-1p', `
      T.setShotView(null);
      if (T.setViewFirstDbg) T.setViewFirstDbg(true);
      T.player.position.set(tg.spawn.x, tg.floorY, tg.spawn.z);
    `, `${tag}-train-spawn-1p.png`));

    // 3. Armory / Kit / Kiosks 3P close-up
    spots.push(await profileSpot('train-armory-3p', `
      if (T.setViewFirstDbg) T.setViewFirstDbg(false);
      T.setShotView({ x: O.x + 11.5, y: tg.floorY + 4.2, z: O.z + 6.5, tx: O.x + 17.5, ty: tg.floorY + 1.4, tz: O.z - 2.0, fov: 50 });
    `, `${tag}-train-armory.png`));

    // 4. Build room / wide cross-room overview
    spots.push(await profileSpot('train-crossroom-3p', `
      T.setShotView({ x: O.x - 16.0, y: tg.floorY + 8.5, z: O.z - 14.0, tx: O.x + 10.0, ty: tg.floorY + 1.2, tz: O.z + 4.0, fov: 55 });
    `, null));

    // 5. Lights OFF (night/emergency lights + shadow casters)
    spots.push(await profileSpot('train-lightsoff-3p', `
      T.setShotView(null);
      if (T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
      T.player.position.set(tg.spawn.x, tg.floorY, tg.spawn.z);
    `, `${tag}-train-lightsoff.png`));

    // 6. Lights ON + 10 live zombies in Training Area
    spots.push(await profileSpot('train-10zombies-3p', `
      if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
      T.setShotView(null);
      T.runDevCommand && T.runDevCommand('godmode');
      T.trainingDbg.deployNow && T.trainingDbg.deployNow('shambler', 10);
      await wait(800);
    `, null));

    // Optional A/B ablation diagnostic (--ablate) to pinpoint exact r:render CPU/GPU bottlenecks in Training
    let ablations = null;
    if (process.argv.includes('--ablate')) {
      ablations = await page.evaluate(`(async () => {
        const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin, scene = T.scene;
        const waitBg = async () => { for (let i = 0; i < 60 && T.trainingDbg.state().bgWarming; i++) await new Promise(r => setTimeout(r, 100)); };
        await waitBg();
        const measure = async (label, frames = 40) => {
          for (let i = 0; i < 8; i++) await new Promise(r => requestAnimationFrame(r));
          T.profDbg.on = true; T.profDbg.reset();
          window.__ah14ShadowMs = 0; window.__ah14ShadowCalls = 0;
          const dts = []; let last = performance.now();
          for (let i = 0; i < frames; i++) {
            await new Promise(r => requestAnimationFrame(r));
            const now = performance.now(); dts.push(now - last); last = now;
          }
          const prof = T.profDbg.report(); T.profDbg.on = false;
          const avg = dts.reduce((a, b) => a + b, 0) / dts.length;
          const rRend = prof.phases.find(p => p.k === 'r:render')?.avg || 0;
          const rMat = prof.phases.find(p => p.k === 'r:matrices')?.avg || 0;
          const shMs = +(window.__ah14ShadowMs / frames).toFixed(2);
          const tris = T.renderer.info.render?.triangles || 0;
          return { label, fps: +(1000 / Math.max(0.1, avg)).toFixed(1), avgMs: +avg.toFixed(2), rRend, shMs, rMat, tris };
        };
        const out = [];
        // Count live zombie meshes/nodes during 10-zombie spot (still active right now!)
        let zCount = 0, zMeshes = 0, zSkinned = 0, zCasters = 0, zNodes = 0;
        for (const z of (T.zombies || [])) {
          if (!z || !z.alive || !z.mesh) continue;
          zCount++;
          z.mesh.traverse(o => { zNodes++; if (o.isMesh) { zMeshes++; if (o.isSkinnedMesh) zSkinned++; if (o.castShadow) zCasters++; } });
        }
        out.push({ zombieStats: { zCount, zMeshes, zSkinned, zCasters, zNodes } });
        out.push(await measure('10z-base'));
        // Test hiding sun shadows
        let sunL = null;
        scene.traverse(o => { if (o.isDirectionalLight && o.castShadow) sunL = o; });
        if (sunL) { sunL.castShadow = false; out.push(await measure('10z-noSunShadow')); sunL.castShadow = true; }
        // Test hiding training-containment
        const cont = tg.group.getObjectByName('training-containment');
        if (cont) { cont.visible = false; out.push(await measure('10z-noContainment')); cont.visible = true; }
        // Test hiding marine
        const mar = T.getMarine ? T.getMarine() : null;
        if (mar) { mar.visible = false; out.push(await measure('10z-noMarine')); mar.visible = true; }
        // Test hiding cutaway groups
        const cuts = tg.group.children.filter(c => /^training-cutaway-/.test(c.name) && c.visible);
        for (const c of cuts) c.visible = false;
        out.push(await measure('10z-noCutaway'));
        for (const c of cuts) c.visible = true;
        // Test crossroom spot ablations (no zombies)
        T.trainingDbg.clear && T.trainingDbg.clear();
        T.setShotView({ x: O.x - 16.0, y: tg.floorY + 8.5, z: O.z - 14.0, tx: O.x + 10.0, ty: tg.floorY + 1.2, tz: O.z + 4.0, fov: 55 });
        out.push(await measure('cross-base'));
        if (sunL) { sunL.castShadow = false; out.push(await measure('cross-noSunShadow')); sunL.castShadow = true; }
        if (cont) { cont.visible = false; out.push(await measure('cross-noContainment')); cont.visible = true; }
        if (mar) { mar.visible = false; out.push(await measure('cross-noMarine')); mar.visible = true; }
        const cuts2 = tg.group.children.filter(c => /^training-cutaway-/.test(c.name) && c.visible);
        for (const c of cuts2) c.visible = false;
        out.push(await measure('cross-noCutaway'));
        for (const c of cuts2) c.visible = true;
        // Test bloom/post off via gfxKey medium vs high? Just report current gfx & pixelRatio!
        out.push({ gfx: T.getGfx ? T.getGfx() : '?', pr: T.renderer.getPixelRatio(), w: T.renderer.domElement.width, h: T.renderer.domElement.height });
        return out;
      })()`, 120000);
      console.log('=== ABLATIONS ===');
      for (const a of ablations) console.log(' ', JSON.stringify(a));
    }

    // Clean up
    await page.evaluate(`(() => { window.TT.trainingDbg.clear && window.TT.trainingDbg.clear(); window.TT.setShotView(null); })()`);

    const report = {
      tag,
      timestamp: new Date().toISOString(),
      boot: {
        gotoMs: tGotoDone,
        openingReadyMs: tOpeningReady,
        ttReadyMs: tTTReady,
        titleInteractiveMs: tTitleInteractive,
        trainEntryMs: tTrainReadyMs,
        ...bootInfo,
        consoleLogs: bootConsole,
        trainConsoleLogs: trainConsole
      },
      sceneAudit,
      spots,
      ablations,
      pageErrors: page.errors
    };

    const outJson = path.join(OUT_DIR, `perf-${tag}.json`);
    fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\nSaved full profile to ${outJson}`);
    if (page.errors.length) console.error('PAGE ERRORS:', page.errors);
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
