// qa/2026-10-31-AG-162/run.mjs
// AG-162: Night 20 High, old (82d75118 worktree) and new (1.1 HEAD) back to back, twice,
// each with a 10s Chrome CDP trace (devtools.timeline, disabled-by-default-devtools.timeline.frame, cc, viz, gpu),
// plus new with the HUD's DOM hidden (display:none on #hud, and display:none on all non-canvas overlays).

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
import { analyzeTrace } from './analyze.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(dir, '../..');
const oldDir = 'C:/Users/Zero/Desktop/dw-cu184/old';

if (!fs.existsSync(path.join(oldDir, 'index.html'))) {
  throw new Error(`Missing 82d75118 worktree at ${oldDir}`);
}

const plan = [
  { name: 'throwaway-new', cwd: repoDir, trace: false, hudMode: 'normal' },
  { name: 'old-1', cwd: oldDir, trace: true, hudMode: 'normal' },
  { name: 'new-1', cwd: repoDir, trace: true, hudMode: 'normal' },
  { name: 'old-2', cwd: oldDir, trace: true, hudMode: 'normal' },
  { name: 'new-2', cwd: repoDir, trace: true, hudMode: 'normal' },
  { name: 'new-nohud', cwd: repoDir, trace: true, hudMode: 'nohud' },
  { name: 'new-nooverlay', cwd: repoDir, trace: true, hudMode: 'nooverlay' }
];

function seat() {
  const ps = `
    $c = (Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 1 -MaxSamples 3).CounterSamples | Measure-Object CookedValue -Average
    $lp = (Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average
    $top = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } | Sort-Object PercentProcessorTime -Descending | Select-Object -First 8 Name, PercentProcessorTime
    [pscustomobject]@{ cpuPct = [math]::Round($c.Average, 1); loadPct = $lp; top = $top } | ConvertTo-Json -Compress -Depth 4`;
  try {
    return JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8', timeout: 60000 }));
  } catch (e) {
    return { error: String(e).slice(0, 200) };
  }
}

async function startMatch(page) {
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'Bench';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  const prep = await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  if (!prep) throw new Error('match never reached prep');
  const landed = await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  if (!landed) throw new Error('insertion never finished');
}

const SAMPLE = `(() => {
  const read = () => {
    const info = (TT.renderer && TT.renderer.info && TT.renderer.info.render) || {};
    const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
    return { draws, triangles: info.triangles || 0 };
  };
  let best = read();
  const again = read();
  if (again.draws > best.draws) best = again;
  const snap = TT.perfSnapshot() || { fps: 0, low: 0, worst: 0, hitches: 0, frames: 0 };
  return Object.assign({}, snap, best);
})()`;

const ADVANCE = `(() => {
  const st = () => TT.getWaveDirectorState();
  const up = () => (TT.zombies || []).filter((z) => z.alive && !z.dying).length;
  const cap = TT.MAX_ZOMBIES || 48;
  let steps = 0;
  while (steps++ < 250) {
    const pc = st().pace;
    const onLast = !!(pc && pc.pushes > 0 && pc.push === pc.pushes - 1 && !pc.inLull);
    if (onLast) {
      if (up() >= cap) break;
      if (pc.left <= 0 && up() > 0) break;
      TT.spawnWaveBatch(0.25);
      continue;
    }
    if (!pc || pc.inLull || up() > 6) TT.clearZombies();
    TT.spawnWaveBatch(0.5);
  }
  const pc = st().pace;
  const onLast = !!(pc && pc.pushes > 0 && pc.push === pc.pushes - 1 && !pc.inLull);
  const out = up() >= cap || (pc && pc.left <= 0 && up() > 0);
  return {
    done: onLast && out,
    day: st().day,
    phase: st().phase,
    push: pc ? pc.push : null,
    pushes: pc ? pc.pushes : null,
    left: pc ? pc.left : null,
    zombies: up(),
    spawned: st().waveSpawned,
    total: st().waveTotal
  };
})()`;

const PROF_START = `(() => {
  const P = TT.profDbg;
  if (!P) return { ok: false, why: 'TT.profDbg is missing' };
  P.reset(); P.spikeMs = 25; P.on = true;
  const R = TT.renderer;
  const JB = window.__benchBuilds = window.__benchBuilds || { made: [], n: 0, on: true };
  JB.on = true; JB.made.length = 0; JB.n = 0;
  const BE = R && R.backend;
  if (BE && typeof BE.createNodeBuilder === 'function' && !BE.__cl232) {
    const cnb = BE.createNodeBuilder;
    BE.createNodeBuilder = function (object, renderer) {
      const j = window.__benchBuilds;
      if (j && j.on) j.n++;
      return cnb.call(this, object, renderer);
    };
    BE.__cl232 = true;
  }
  const JR = window.__benchRO = window.__benchRO || { made: [], n: 0, on: true };
  JR.on = true; JR.made.length = 0; JR.n = 0;
  const RO = R && R._objects;
  if (RO && typeof RO.createRenderObject === 'function' && !RO.__cl238) {
    const cro = RO.createRenderObject;
    RO.createRenderObject = function () {
      const j = window.__benchRO;
      if (j && j.on) j.n++;
      return cro.apply(this, arguments);
    };
    RO.__cl238 = true;
  }
  const counts = () => {
    const m = (R && R.info && R.info.memory) || {};
    return [
      (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0,
      m.textures || 0,
      m.geometries || 0,
      (window.__benchBuilds && window.__benchBuilds.n) || 0,
      window.__dwSunShadowN || 0,
      (window.__benchRO && window.__benchRO.n) || 0
    ];
  };
  if (!P.__cl223) {
    const begin = P.begin; let last = counts(), lastT = performance.now();
    P.begin = function () {
      const n0 = this.spikes.length, tb = performance.now();
      begin.call(this);
      const now = counts();
      if (this.spikes.length > n0) {
        const sp = this.spikes[this.spikes.length - 1];
        sp.newPipelines = now[0] - last[0];
        sp.newTextures = now[1] - last[1];
        sp.newGeometries = now[2] - last[2];
        sp.newBuilds = now[3] - last[3];
        sp.sunShadow = now[4] - last[4];
        sp.newRenderObjects = now[5] - last[5];
        sp.t0 = +lastT.toFixed(2);
        sp.t1 = +tb.toFixed(2);
      }
      last = now; lastT = tb;
    };
    P.__cl223 = true;
  }
  const be = TT.renderer && TT.renderer.backend;
  let gpu = 'unavailable';
  try {
    if (be && be.isWebGPUBackend && be.device && be.device.features && be.device.features.has('timestamp-query')) {
      be.trackTimestamp = true;
      gpu = 'on';
    }
  } catch (e) { gpu = 'unavailable: ' + e.message; }
  const G = window.__benchGpu = { on: gpu === 'on', samples: [], busy: false };
  if (G.on) {
    const tickGpu = () => {
      if (!G.on) return;
      if (!G.busy) {
        G.busy = true;
        Promise.resolve(TT.renderer.resolveTimestampsAsync('render')).then((ms) => {
          if (typeof ms === 'number' && ms > 0 && ms < 1000) G.samples.push(ms);
        }).catch(() => {}).finally(() => { G.busy = false; });
      }
      requestAnimationFrame(tickGpu);
    };
    requestAnimationFrame(tickGpu);
  }
  window.__ag162StartT = performance.now();
  return { ok: true, gpu };
})()`;

const PROF_SNAP_20 = `(() => {
  performance.mark('ag162-win-start');
  const P = TT.profDbg;
  const R = TT.renderer;
  const m = (R && R.info && R.info.memory) || {};
  return {
    now: performance.now(),
    frame: P.frame,
    t: Object.assign({}, P.t),
    spikesLen: P.spikes.length,
    textures: m.textures || 0,
    geometries: m.geometries || 0,
    ro: (window.__benchRO && window.__benchRO.n) || 0,
    builds: (window.__benchBuilds && window.__benchBuilds.n) || 0
  };
})()`;

const PROF_END_30 = `(() => {
  performance.mark('ag162-win-end');
  const now30 = performance.now();
  const P = TT.profDbg;
  const frame30 = P.frame;
  const t30 = Object.assign({}, P.t);
  const R = TT.renderer;
  const m = (R && R.info && R.info.memory) || {};
  const rep = P.report();
  P.on = false;
  const G = window.__benchGpu || { samples: [] };
  G.on = false;
  const be = TT.renderer && TT.renderer.backend;
  if (be && be.isWebGPUBackend) be.trackTimestamp = false;
  if (window.__benchBuilds) window.__benchBuilds.on = false;
  if (window.__benchRO) window.__benchRO.on = false;
  return {
    startT: window.__ag162StartT || 0,
    now30,
    frame30,
    t30,
    textures: m.textures || 0,
    geometries: m.geometries || 0,
    ro: (window.__benchRO && window.__benchRO.n) || 0,
    builds: (window.__benchBuilds && window.__benchBuilds.n) || 0,
    rep,
    gpu: G.samples.slice()
  };
})()`;

const DOM_INSPECT = `(() => {
  const anims = (document.getAnimations ? document.getAnimations() : []).map((a) => {
    const t = a.effect && a.effect.target;
    return {
      playState: a.playState,
      id: a.id || a.animationName || '',
      target: t ? (t.id ? '#' + t.id : (t.tagName + (t.className ? '.' + String(t.className).replace(/\\s+/g, '.') : ''))) : null
    };
  });
  const hud = document.getElementById('hud');
  const reticle = document.getElementById('reticle');
  const objHud = document.getElementById('objectiveHud');
  const markerCount = objHud ? objHud.querySelectorAll('[data-objective-marker], .objective-marker, button').length : 0;
  const pic = TT.pictureDbg ? TT.pictureDbg() : null;
  return {
    activeAnimations: anims,
    hudDisplay: hud ? getComputedStyle(hud).display : null,
    reticleDisplay: reticle ? getComputedStyle(reticle).display : null,
    objectiveHudChildren: objHud ? objHud.children.length : 0,
    markerCount,
    pictureDbg: pic
  };
})()`;

function median(nums) {
  if (!nums.length) return 0;
  const s = nums.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;

const summary = [];
const summaryFile = path.join(dir, 'summary.json');

for (const item of plan) {
  const { name, cwd, trace: traceOn, hudMode } = item;
  const before = seat();
  fs.writeFileSync(path.join(dir, `${name}.seat.json`), JSON.stringify(before, null, 2), 'utf8');
  console.log(`\n=== AG-162 ${name} (${cwd}, hud=${hudMode}, trace=${traceOn}) seat before: cpu ${before.cpuPct}% load ${before.loadPct}% ===`);

  const server = await serve(cwd, 0);
  const browser = await launch({ headless: false, args: ['--enable-precise-memory-info'] });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    const url = `${server.origin}/index.html?debug=1`;
    await page.goto(url, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 250))');
    }
    const ready = await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
    if (!ready) throw new Error('TT never appeared');
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

    const applied = await page.evaluate(`(() => {
      TT.applyGraphicsPreset('high');
      return TT.getGfx();
    })()`);
    if (applied !== 'high') throw new Error('graphics preset high did not apply');

    await startMatch(page);
    const jumped = await page.evaluate(`(() => {
      TT.runDevCommand('godmode');
      const ok = !!TT.devJumpToNight(20, true);
      const st = TT.getWaveDirectorState();
      return { ok, phase: st.phase, day: st.day, pushes: st.pace ? st.pace.pushes : 0 };
    })()`);
    if (!jumped.ok || jumped.phase !== 'wave') {
      throw new Error('devJumpToNight refused night 20 (' + JSON.stringify(jumped) + ')');
    }

    let state = null;
    for (let i = 0; i < 40; i++) {
      state = await page.evaluate(ADVANCE, 180000);
      if (state.done) break;
    }
    if (!state || !state.done) {
      throw new Error('night 20 never reached its last push with the horde out (' + JSON.stringify(state) + ')');
    }
    console.log(`AG-162 ${name}: night ${state.day} push ${state.push + 1}/${state.pushes} out ${state.zombies} spawned ${state.spawned}/${state.total}`);

    await page.evaluate('new Promise(r => setTimeout(r, 3000))');

    let hudEvalResult = null;
    if (hudMode === 'nohud') {
      hudEvalResult = await page.evaluate(`(() => {
        const h = document.getElementById('hud');
        if (h) h.style.display = 'none';
        return { mode: 'nohud', hudDisplay: h ? getComputedStyle(h).display : null };
      })()`);
      console.log(`AG-162 ${name}: applied HUD root display:none`, JSON.stringify(hudEvalResult));
    } else if (hudMode === 'nooverlay') {
      hudEvalResult = await page.evaluate(`(() => {
        let count = 0;
        for (const el of document.body.children) {
          if (el.tagName !== 'CANVAS') {
            el.style.display = 'none';
            count++;
          }
        }
        return { mode: 'nooverlay', hiddenChildren: count };
      })()`);
      console.log(`AG-162 ${name}: applied all non-canvas overlays display:none`, JSON.stringify(hudEvalResult));
    }

    const profStart = await page.evaluate(PROF_START);
    if (!profStart || !profStart.ok) throw new Error('--prof: ' + (profStart && profStart.why));
    await page.evaluate('TT.resetPerf()');

    const windows = [];
    // First 20 seconds (warm / settle into full surround)
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      const snap = await page.evaluate(SAMPLE);
      if (snap) windows.push(snap);
      await new Promise((r) => setTimeout(r, 1000));
    }

    let traceCollector = null;
    if (traceOn) {
      traceCollector = { events: [], done: null };
      traceCollector.done = new Promise((resolve) => {
        page.conn.onEvent((msg) => {
          if (msg.sessionId !== page.sessionId) return;
          if (msg.method === 'Tracing.dataCollected') {
            for (const e of msg.params.value || []) traceCollector.events.push(e);
          }
          if (msg.method === 'Tracing.tracingComplete') resolve();
        });
      });
      await page.send('Tracing.start', {
        transferMode: 'ReportEvents',
        traceConfig: {
          recordMode: 'recordAsMuchAsPossible',
          includedCategories: [
            'devtools.timeline',
            'disabled-by-default-devtools.timeline.frame',
            'cc',
            'viz',
            'gpu',
            'blink.user_timing',
            'disabled-by-default-v8.gc',
            '__metadata'
          ]
        }
      });
      await new Promise((r) => setTimeout(r, 200));
    }

    const snap20 = await page.evaluate(PROF_SNAP_20);

    // Last 10 seconds (measured window + 10s trace)
    const t20 = Date.now();
    const windows10 = [];
    while (Date.now() - t20 < 10000) {
      const snap = await page.evaluate(SAMPLE);
      if (snap) {
        windows.push(snap);
        windows10.push(snap);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    const got30 = await page.evaluate(PROF_END_30);

    let traceSummary = null;
    if (traceCollector) {
      await page.send('Tracing.end', {}, 180000);
      await Promise.race([traceCollector.done, new Promise((r) => setTimeout(r, 120000))]);
      const tracePath = path.join(dir, `${name}.trace.json`);
      fs.writeFileSync(tracePath, JSON.stringify({ traceEvents: traceCollector.events }), 'utf8');
      traceSummary = analyzeTrace(traceCollector.events);
      fs.writeFileSync(path.join(dir, `${name}.trace-summary.json`), JSON.stringify(traceSummary, null, 2), 'utf8');
    }

    const domState = await page.evaluate(DOM_INSPECT);

    // Compute exact bench.mjs metrics + exact last-10s window metrics
    const tail = windows10.length ? windows10 : windows.slice(-10);
    const use = tail.filter((w) => w.fps > 0);
    const avg = (key) => use.reduce((sum, w) => sum + (w[key] || 0), 0) / (use.length || 1);
    const final = windows.at(-1) || { worst: 0, hitches: 0 };
    const drawRows = use.filter((w) => w.draws > 0);

    const fps = r1(avg('fps'));
    const low = r1(avg('low'));
    const worst = r1(final.worst || 0);
    const hitches = final.hitches || 0;
    const draws = Math.round(median((drawRows.length ? drawRows : use).map((w) => w.draws || 0)));
    const triangles = Math.round(median((drawRows.length ? drawRows : use).map((w) => w.triangles || 0)));

    const phases30 = (got30.rep && got30.rep.phases) || [];
    const tickMs30 = r2(phases30.reduce((s, p) => s + p.avg, 0));
    const frameMs10 = fps > 0 ? r2(1000 / fps) : 0;
    const outsideMsBench = r2(frameMs10 - tickMs30);

    // Compute exact last-10s PROF tickMs (frames between snap20 and got30)
    const frames10 = Math.max(1, got30.frame30 - snap20.frame);
    const wallMs10 = got30.now30 - snap20.now;
    const wallFrameMs10 = r2(wallMs10 / frames10);
    let sumT10 = 0;
    const phases10 = [];
    for (const k of Object.keys(got30.t30)) {
      const d = (got30.t30[k] || 0) - (snap20.t[k] || 0);
      sumT10 += d;
      phases10.push({ k, avg: r2(d / frames10) });
    }
    phases10.sort((a, b) => b.avg - a.avg);
    const tickMs10 = r2(sumT10 / frames10);
    const outsideMs10Exact = r2(wallFrameMs10 - tickMs10);

    // Also compute first-20s PROF tickMs & wallFrameMs20
    const frames20 = Math.max(1, snap20.frame);
    const wallMs20 = snap20.now - got30.startT;
    const wallFrameMs20 = r2(wallMs20 / frames20);
    let sumT20 = 0;
    for (const k of Object.keys(snap20.t)) sumT20 += snap20.t[k] || 0;
    const tickMs20 = r2(sumT20 / frames20);
    const outsideMs20Exact = r2(wallFrameMs20 - tickMs20);

    const allSpikes = (got30.rep && got30.rep.spikes) || [];
    const spikesInLast10 = allSpikes.slice(snap20.spikesLen);
    const spikeCauses = (() => {
      const c = { spikes: allSpikes.length, spikesLast10s: spikesInLast10.length, pipelines: 0, builds: 0, uploads: 0, sunShadow: 0, gc: 0, code: 0 };
      for (const sp of allSpikes) {
        if (sp.newPipelines > 0) c.pipelines++;
        else if (sp.newBuilds > 0) c.builds++;
        else if (sp.newTextures > 0 || sp.newGeometries > 0) c.uploads++;
        else if (sp.sunShadow > 0) c.sunShadow++;
        else if (sp.freedMB >= 2) c.gc++;
        else c.code++;
      }
      return c;
    })();

    const gpu = got30.gpu || [];
    const gpuMs = gpu.length ? r2(median(gpu)) : 'unavailable';

    const record = {
      name,
      cwd,
      hudMode,
      cpuBefore: before.cpuPct,
      loadBefore: before.loadPct,
      fps,
      low,
      worst,
      hitches,
      draws,
      triangles,
      gpuMs,
      benchProf: {
        frames30s: got30.frame30,
        frameMs10s: frameMs10,
        tickMs30s: tickMs30,
        outsideMsBench,
        top30s: phases30.slice(0, 10)
      },
      windowSplit: {
        first20s: {
          frames: frames20,
          wallFrameMs: wallFrameMs20,
          tickMs: tickMs20,
          outsideMs: outsideMs20Exact,
          spikes: snap20.spikesLen
        },
        last10s: {
          frames: frames10,
          wallFrameMs: wallFrameMs10,
          tickMs: tickMs10,
          outsideMs: outsideMs10Exact,
          spikes: spikesInLast10.length,
          newTextures: got30.textures - snap20.textures,
          newGeometries: got30.geometries - snap20.geometries,
          newRenderObjects: got30.ro - snap20.ro,
          newBuilds: got30.builds - snap20.builds,
          top10s: phases10.slice(0, 10)
        }
      },
      spikeCauses,
      spikes: allSpikes.slice(0, 12),
      domState,
      traceSummary
    };

    const logLines = [
      `run: ${name} (${cwd}, hudMode=${hudMode})`,
      `fps    ${fps.toFixed(1)}   low ${low.toFixed(1)}   worst ${worst.toFixed(1)} ms   draws ${draws}   tris ${triangles}`,
      `bench  frame ${frameMs10} ms = tick30s ${tickMs30} ms + outside ${outsideMsBench} ms   gpu ${gpuMs} ms`,
      `first20s (${frames20}f): wallFrame ${wallFrameMs20} ms = tick ${tickMs20} ms + outside ${outsideMs20Exact} ms (${snap20.spikesLen} spikes)`,
      `last10s  (${frames10}f): wallFrame ${wallFrameMs10} ms = tick ${tickMs10} ms + outside ${outsideMs10Exact} ms (${spikesInLast10.length} spikes)`,
      traceSummary ? `trace10s (${traceSummary.rafCount}f): frame ${traceSummary.mainThreadSummary.frameMs} ms | rAF ${traceSummary.mainThreadSummary.rafMsPerFrame} ms | mainOutRafBusy ${traceSummary.mainThreadSummary.mainOutsideRafBusyMsPerFrame} ms (renderPipe ${traceSummary.mainThreadSummary.renderPipelineSumMsPerFrame} ms) | waitForFrame ${traceSummary.mainThreadSummary.waitForFrameIdleMsPerFrame} ms | Compositor ${traceSummary.compositorSummary.busyMsPerFrame} ms | Viz ${traceSummary.vizSummary.busyMsPerFrame} ms | CrGpuMain ${traceSummary.gpuMainSummary.busyMsPerFrame} ms` : 'trace: off',
      JSON.stringify(record)
    ];
    fs.writeFileSync(path.join(dir, `${name}.log`), logLines.join('\n') + '\n', 'utf8');
    console.log(logLines.slice(0, 6).join('\n'));

    summary.push(record);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
  } finally {
    await browser.close();
    await server.close();
  }
}

console.log('\nAG-162: all 7 runs finished cleanly.');
