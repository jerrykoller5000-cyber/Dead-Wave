// qa/2026-10-19-AG-86/run-cpu-prof.mjs
// Runs the exact Night 20 --gfx high --prof scenario from tools/bench.mjs
// plus CDP Profiler (DevTools CPU profile over the measured 30 seconds)
// because tools/bench.mjs on disk (15,258 bytes, mtime 20:41:19Z) did not have --cpu synced yet.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SECONDS = 30;
const NIGHT = 20;
const GFX = 'high';

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
const url = `${server.origin}/index.html?debug=1`;
console.log(`bench-cpu: ${url}`);
console.log(`bench-cpu: scenario night ${NIGHT} for ${SECONDS}s (gfx=${GFX}, prof=true, cpu=true)\n`);

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
  P.reset(); P.spikeMs = 50; P.on = true;
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
  return { ok: true, gpu };
})()`;

const PROF_END = `(() => {
  const P = TT.profDbg;
  const rep = P.report();
  P.on = false;
  const G = window.__benchGpu || { samples: [] };
  G.on = false;
  const be = TT.renderer && TT.renderer.backend;
  if (be && be.isWebGPUBackend) be.trackTimestamp = false;
  return { rep, gpu: G.samples.slice() };
})()`;

function median(nums) {
  if (!nums.length) return 0;
  const s = nums.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function summarizeCpuProfile(profile, frames) {
  const nodes = new Map((profile.nodes || []).map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes || []) {
    for (const c of n.children || []) parent.set(c, n.id);
  }
  const fnKey = (id) => {
    const n = nodes.get(id);
    const cf = n?.callFrame || {};
    const name = cf.functionName || '(anonymous)';
    const rawUrl = cf.url || '';
    const file = rawUrl ? rawUrl.split('/').pop().split('?')[0] : '';
    const line = typeof cf.lineNumber === 'number' && cf.lineNumber >= 0 ? cf.lineNumber + 1 : '';
    return file ? `${name} (${file}:${line})` : name;
  };
  const samples = profile.samples || [];
  const deltas = profile.timeDeltas || [];
  const selfMap = new Map();
  const totalMap = new Map();
  let totalUs = 0;
  let activeUs = 0;

  for (let i = 0; i < samples.length; i++) {
    const dt = deltas[i] ?? 1000;
    if (dt <= 0) continue;
    totalUs += dt;
    const leafId = samples[i];
    const leafKey = fnKey(leafId);
    if (leafKey !== '(idle)' && leafKey !== '(program)') {
      activeUs += dt;
    }
    selfMap.set(leafKey, (selfMap.get(leafKey) || 0) + dt);

    const seenKeys = new Set();
    let cur = leafId;
    let guard = 0;
    while (cur != null && guard++ < 512) {
      const k = fnKey(cur);
      seenKeys.add(k);
      cur = parent.get(cur);
    }
    for (const k of seenKeys) {
      totalMap.set(k, (totalMap.get(k) || 0) + dt);
    }
  }

  const r2 = (n) => Math.round(n * 100) / 100;
  const r1 = (n) => Math.round(n * 10) / 10;
  const fCount = Math.max(1, frames || 1);

  const formatList = (map, limit) => {
    return [...map.entries()]
      .filter(([k]) => k !== '(root)' && k !== '(idle)')
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([fn, us]) => ({
        fn,
        ms: r1(us / 1000),
        frameMs: r2(us / 1000 / fCount),
        pct: r1((100 * us) / Math.max(1, activeUs))
      }));
  };

  return {
    samples: samples.length,
    totalMs: r1(totalUs / 1000),
    activeMs: r1(activeUs / 1000),
    self: formatList(selfMap, 25),
    total: formatList(totalMap, 30)
  };
}

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
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
    TT.applyGraphicsPreset(${JSON.stringify(GFX)});
    return TT.getGfx();
  })()`);
  console.log(`bench-cpu: graphics ${applied}`);

  await startMatch(page);
  const jumped = await page.evaluate(`(() => {
    TT.runDevCommand('godmode');
    const ok = !!TT.devJumpToNight(${NIGHT}, true);
    const st = TT.getWaveDirectorState();
    return { ok, phase: st.phase, day: st.day, pushes: st.pace ? st.pace.pushes : 0 };
  })()`);
  if (!jumped.ok || jumped.phase !== 'wave') {
    throw new Error('devJumpToNight refused night ' + NIGHT);
  }
  let state = null;
  for (let i = 0; i < 40; i++) {
    state = await page.evaluate(ADVANCE, 180000);
    console.log(`bench-cpu: night ${state.day} push ${state.push == null ? '?' : state.push + 1}/${state.pushes}  out ${state.zombies}  spawned ${state.spawned}/${state.total}`);
    if (state.done) break;
  }
  await page.evaluate('new Promise(r => setTimeout(r, 3000))');

  const profStart = await page.evaluate(PROF_START);
  console.log(`bench-cpu: profiler on, GPU timestamps ${profStart.gpu}`);

  await page.send('Profiler.enable');
  await page.send('Profiler.setSamplingInterval', { interval: 200 });
  await page.send('Profiler.start');

  await page.evaluate('TT.resetPerf()');
  const t0 = Date.now();
  const windows = [];
  while (Date.now() - t0 < SECONDS * 1000) {
    const snap = await page.evaluate(SAMPLE);
    if (snap) windows.push(snap);
    await new Promise((r) => setTimeout(r, 1000));
  }

  const { profile } = await page.send('Profiler.stop', {}, 180000);
  const got = await page.evaluate(PROF_END);

  const tail = windows.slice(-10);
  const paced = tail.filter((w) => w.fps > 0);
  const use = paced.length ? paced : tail;
  const avg = (key) => use.reduce((sum, w) => sum + (w[key] || 0), 0) / (use.length || 1);
  const final = windows.at(-1) || { worst: 0, hitches: 0 };
  const counted = (use.some((w) => w.draws > 0) ? use : windows).filter((w) => w.draws > 0);
  const drawRows = counted.length ? counted : use;
  const end = await page.evaluate(`(() => {
    const pc = TT.getWaveDirectorState ? TT.getWaveDirectorState() : null;
    const pace = pc && pc.pace;
    return {
      zombies: (TT.zombies || []).filter((z) => z.alive).length,
      phase: pc ? pc.phase : null,
      day: pc ? pc.day : null,
      push: pace ? pace.push : null,
      pushes: pace ? pace.pushes : null,
      gfx: TT.getGfx ? TT.getGfx() : null
    };
  })()`);

  const round1 = (n) => Math.round(n * 10) / 10;
  const r2 = (n) => Math.round(n * 100) / 100;
  const line = {
    scenario: 'night',
    seconds: SECONDS,
    fps: round1(avg('fps')),
    low: round1(avg('low')),
    worst: round1(final.worst || 0),
    hitches: final.hitches || 0,
    draws: Math.round(median(drawRows.map((w) => w.draws || 0))),
    triangles: Math.round(median(drawRows.map((w) => w.triangles || 0))),
    zombies: end.zombies,
    gfx: end.gfx,
    windows: use.length,
    night: NIGHT,
    push: end.push,
    pushes: end.pushes,
    last: end.push != null && end.pushes != null && end.push === end.pushes - 1
  };

  const phases = (got.rep && got.rep.phases) || [];
  const tickMs = phases.reduce((s, p) => s + p.avg, 0);
  const frameMs = line.fps > 0 ? 1000 / line.fps : 0;
  const gpu = got.gpu || [];
  const frames = got.rep ? got.rep.frames : 0;
  line.prof = {
    frames,
    frameMs: r2(frameMs),
    tickMs: r2(tickMs),
    outsideMs: r2(frameMs - tickMs),
    top: phases.slice(0, 12).map((p) => ({ k: p.k, avg: r2(p.avg), max: r2(p.max) })),
    spikes: ((got.rep && got.rep.spikes) || []).slice(0, 8),
    gpuMs: gpu.length ? r2(median(gpu)) : (profStart.gpu === 'on' ? 'no samples' : profStart.gpu),
    gpuSamples: gpu.length
  };
  line.cpu = summarizeCpuProfile(profile, frames);

  console.log('\ntop 25 functions by self time:');
  for (const r of line.cpu.self) {
    console.log(`  ${String(r.frameMs.toFixed(2)).padStart(6)} ms/f  (${String(r.pct.toFixed(1)).padStart(5)}%, ${String(r.ms.toFixed(1)).padStart(7)} ms)  ${r.fn}`);
  }
  console.log('\ntop 30 functions by total time:');
  for (const r of line.cpu.total) {
    console.log(`  ${String(r.frameMs.toFixed(2)).padStart(6)} ms/f  (${String(r.pct.toFixed(1)).padStart(5)}%, ${String(r.ms.toFixed(1)).padStart(7)} ms)  ${r.fn}`);
  }
  console.log('\nJSON_LINE:');
  console.log(JSON.stringify(line));
} finally {
  await browser.close();
  await server.close();
}
