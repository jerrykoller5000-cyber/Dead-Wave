// tools/bench.mjs — frame-time numbers for a named scenario.
//
//   node tools/bench.mjs                         megaswarm, 500 shamblers, 30 s
//   node tools/bench.mjs --scenario day5         day 5, start the wave, then 30 s
//   node tools/bench.mjs --scenario build        place ten walls through tryPlace, then 30 s
//   node tools/bench.mjs --night 5               night 5's last push, horde out, then 30 s
//   node tools/bench.mjs --night 20 --gfx high   same, on the High preset
//   node tools/bench.mjs --seconds 8 --headless  short run
//   node tools/bench.mjs --night 20 --gfx high --prof   and where each frame's time goes
//   node tools/bench.mjs --night 20 --gfx high --prof --cpu   and which functions (a DevTools CPU profile)
//
// One JSON line per scenario (the line AG-82 reads): fps, 1% low, worst frame,
// frames over 50 ms, draw calls and triangles. Draw calls and triangles come
// from renderer.info the same way tools/scene-counts.mjs reads them.
//
// --prof (CL-213, the CU-156 spec): over the same measured seconds the game's own
// profiler (TT.profDbg, PROF in index.html) is on, and the line gets `prof`:
//   frameMs   the mean frame (1000 / fps)
//   tickMs    the JS the game's tick runs, the sum of every PROF section
//   outsideMs frameMs - tickMs: the browser, the compositor, and waiting on the GPU
//   top       the 12 heaviest sections, mean and worst ms per frame
//   spikes    the first frames over 50 ms with their four heaviest sections
//   gpuMs     the GPU time of one frame's render passes, from WebGPU timestamp
//             queries ('unavailable' on the WebGL backend or without timestamp-query)
// The game's frame is unchanged apart from the marks (a timer read each) and the
// timestamp queries; nothing in index.html had to change.
//
// --cpu (CL-211): a DevTools CPU profile over the measured seconds (sampled every 0.5 ms),
// and the line gets `cpu`: ms per frame of the 25 heaviest functions by self time and the
// 30 heaviest by total time (everything they call), each with its file and line, so the
// renderer's own cost can be split (three's render lists, node updates, matrices, skins).
// --census (with --cpu, or alone): the scene the renderer walks: Object3Ds, meshes, bones, grouped by top-level child.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const num = (flag, d) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? Number(argv[i + 1]) || d : d;
};
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : '';
};
const SECONDS = num('--seconds', 30);
const COUNT = num('--count', 500);
const GFX = flag('--gfx');
const NIGHT_ARG = flag('--night');
const SCENARIO_ARG = flag('--scenario');
const PROF_ON = argv.includes('--prof');
const CPU_ON = argv.includes('--cpu');
const CENSUS_ON = CPU_ON || argv.includes('--census');
let SCENARIO = SCENARIO_ARG || 'megaswarm';
let NIGHT = null;
if (NIGHT_ARG !== '') {
  NIGHT = Number(NIGHT_ARG);
  if (!Number.isInteger(NIGHT) || NIGHT < 1 || NIGHT > 20) {
    throw new Error('--night needs a night from 1 to 20');
  }
  if (SCENARIO_ARG && SCENARIO_ARG !== 'night') throw new Error('--night is its own scenario');
  SCENARIO = 'night';
}
if (GFX && !['low', 'medium', 'high', 'max'].includes(GFX)) {
  throw new Error('--gfx needs low, medium, high or max');
}

const server = await serve(ROOT, 0);
const browser = await launch({ headless: argv.includes('--headless') });
// Real animation frames. The raf=timer mode is clamped to one frame a second in a
// throttled tab, which left every one-second window empty.
const url = `${server.origin}/index.html?debug=1`;
console.log(`bench: ${url}`);
console.log(`bench: scenario ${SCENARIO}${SCENARIO === 'night' ? ' ' + NIGHT : ''} for ${SECONDS}s\n`);

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

// renderer.info the way scene-counts.mjs reads it, plus the one-second fps window.
// The counters reset at the start of a frame, so a single read can land on zero;
// two reads, and the larger draw count, is the frame that actually drew.
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

// Jump to night N, start it, then walk the director to the last push and let that
// push's horde out (the field fills to the cap; a short push stops when it is out).
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

// --prof: the game's profiler on, and GPU timestamps if the backend can take them.
// three requests every adapter feature at init, so 'timestamp-query' is already on the
// device when the adapter has it; the backend only needs its flag. Its query pool keeps
// one pair per render context, so a resolve gives the passes of about one frame.
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

// --census (CL-211; on with --cpu): what the renderer walks every frame. Every Object3D under the scene, grouped by
// its top-level child's name: how many, how many nodes, how many recompose their matrix (matrixAutoUpdate), meshes, bones.
const CENSUS = `(() => {
  const sc = TT.scene, rows = new Map(), all = { nodes: 0, auto: 0, meshes: 0, shown: 0, casters: 0, bones: 0, top: sc.children.length, culledTops: 0, culledNodes: 0, zombieNodes: 0 };
  const zm = new Set((TT.zombies || []).map((z) => z.mesh).filter(Boolean));
  const nameIn = (c) => { let n = ''; c.traverse((o) => { if (!n && o !== c && o.name) n = o.name; }); return n; };
  for (const c of sc.children) {
    const ud = c.userData || {};
    let key = c.name || ud.kind || ud.type || '';
    if (!key) { const inner = nameIn(c); key = c.type + (inner ? '>' + inner : ''); }
    if (zm.has(c)) key = 'zombie (' + key + ')';
    const r = rows.get(key) || { k: key, count: 0, nodes: 0, auto: 0, meshes: 0, bones: 0, culled: 0 };
    r.count++;
    const culled = !!(ud._cull && ud._cull.hidden);
    if (culled) { r.culled++; all.culledTops++; }
    c.traverse((o) => {
      r.nodes++; all.nodes++;
      if (culled) all.culledNodes++;
      if (zm.has(c)) all.zombieNodes++;
      if (o.matrixAutoUpdate) { r.auto++; all.auto++; }
      if (o.isBone) { r.bones++; all.bones++; }
      if (o.isMesh || o.isLine || o.isPoints) { r.meshes++; all.meshes++; if (o.visible) all.shown++; if (o.castShadow) all.casters++; }
    });
    rows.set(key, r);
  }
  return { ...all, groups: [...rows.values()].sort((x, y) => y.nodes - x.nodes).slice(0, 30) };
})()`;
// --census, the draws: for two frames, every renderObject the main camera draws, counted by the top-level thing it
// belongs to (named as above); the shadow pass's draws are counted apart.
const CENSUS_DRAWS = `new Promise((resolve) => {
  const r = TT.renderer, sc = TT.scene, orig = r.renderObject, rows = new Map(), parts = new Map(), names = new Map();
  const zm = new Set((TT.zombies || []).map((z) => z.mesh).filter(Boolean));
  const nameIn = (c) => { let n = ''; c.traverse((o) => { if (!n && o !== c && o.name) n = o.name; }); return n; };
  const keyOf = (c) => {
    if (names.has(c)) return names.get(c);
    const ud = c.userData || {};
    let key = c.name || ud.kind || ud.type || '';
    if (!key) { const inner = nameIn(c); key = c.type + (inner ? '>' + inner : ''); }
    if (zm.has(c)) key = 'zombie (' + key + ')';
    names.set(c, key); return key;
  };
  let main = 0, shadow = 0, frames = 0;
  r.renderObject = function (object, scene, camera, ...rest) {
    if (camera && camera.isPerspectiveCamera) {
      main++;
      let t = object, part = null; while (t.parent && t.parent !== sc) { if (t.name && t !== object) part = t.name; t = t.parent; }
      const k = keyOf(t); rows.set(k, (rows.get(k) || 0) + 1);
      const pk = k + ' / ' + (part || object.name || '(unnamed)'); parts.set(pk, (parts.get(pk) || 0) + 1);
    } else shadow++;
    return orig.call(this, object, scene, camera, ...rest);
  };
  const done = () => { r.renderObject = orig; resolve({ frames, main: main / Math.max(1, frames), shadow: shadow / Math.max(1, frames), byGroup: [...rows].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, n]) => ({ k, n: n / Math.max(1, frames) })), byPart: [...parts].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, n]) => ({ k, n: n / Math.max(1, frames) })) }); };
  const step = () => { frames++; if (frames >= 2) done(); else requestAnimationFrame(step); };
  requestAnimationFrame(() => { main = shadow = 0; rows.clear(); parts.clear(); requestAnimationFrame(step); });
  setTimeout(() => { if (r.renderObject !== orig) done(); }, 5000);
})`;
// --cpu: self and total time per function from a DevTools profile.
function cpuSummary(profile) {
  const nodes = new Map((profile.nodes || []).map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes || []) for (const c of n.children || []) parent.set(c, n.id);
  const keyOf = (n) => {
    const cf = (n && n.callFrame) || {};
    const file = (cf.url || '').split('/').pop().split('?')[0] || '';
    return `${cf.functionName || '(anonymous)'} ${file}:${(cf.lineNumber ?? -1) + 1}`;
  };
  const self = new Map(), total = new Map(), edges = new Map();   // edges: 'caller\u0000callee' -> time
  const samples = profile.samples || [], deltas = profile.timeDeltas || [];
  let all = 0, idle = 0;
  for (let i = 0; i < samples.length; i++) {
    const dt = deltas[i] ?? 500;
    all += dt;
    const n = nodes.get(samples[i]);
    const k = keyOf(n);
    if (/^\((idle|program|garbage collector)\)/.test(k)) { if (k.startsWith('(idle')) idle += dt; }
    self.set(k, (self.get(k) || 0) + dt);
    const seen = new Set(), seenEdge = new Set();
    let below = null;
    for (let id = samples[i]; id != null; id = parent.get(id)) {
      const kk = keyOf(nodes.get(id));
      if (below != null && below !== kk) {
        const e = kk + '\u0000' + below;
        if (!seenEdge.has(e)) { seenEdge.add(e); edges.set(e, (edges.get(e) || 0) + dt); }
      }
      below = kk;
      if (seen.has(kk)) continue;
      seen.add(kk);
      total.set(kk, (total.get(kk) || 0) + dt);
    }
  }
  return { all, idle, self, total, edges };
}

function median(nums) {
  if (!nums.length) return 0;
  const s = nums.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
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

  let placed = null;
  if (GFX) {
    const applied = await page.evaluate(`(() => {
      if (!TT.GFX_PRESETS || !TT.GFX_PRESETS[${JSON.stringify(GFX)}]) return '';
      TT.applyGraphicsPreset(${JSON.stringify(GFX)});
      return TT.getGfx();
    })()`);
    if (applied !== GFX) throw new Error('graphics preset ' + GFX + ' did not apply');
    console.log(`bench: graphics ${applied}`);
  }

  if (SCENARIO === 'megaswarm') {
    const made = await page.evaluate(`TT.spawnMegaswarm(${COUNT | 0})`);
    console.log(`bench: spawned ${made}`);
  } else if (SCENARIO === 'day5') {
    await startMatch(page);
    const wave = await page.evaluate(`(() => {
      TT.setDay(4);
      TT.startPrep();
      TT.skipPrep();
      const preview = TT.getWavePreview(TT.getDay());
      return { day: TT.getDay(), phase: TT.getPhase(), preview };
    })()`);
    console.log(`bench: day ${wave.day} phase ${wave.phase} preview ${JSON.stringify(wave.preview)}`);
  } else if (SCENARIO === 'build') {
    await startMatch(page);
    placed = await page.evaluate(`(() => {
      TT.unlockAllBuilds(); TT.addCash(100000);
      const p = TT.player.position;
      const gx = TT.gridIndex(p.x), gz = TT.gridIndex(p.z);
      TT.setPlaceMode('wall');
      const c = TT.camera.position;
      // South of the landing spot: gz + 3 runs through the HQ cabin.
      const tz = TT.gridCentre(gz - 3);
      const aim = (gxCell) => {
        const tx = TT.gridCentre(gxCell);
        const ty = TT.sampleHeight(tx, tz);
        TT.setAimRay(c.x, c.y, c.z, tx - c.x, ty - c.y, tz - c.z);
      };
      aim(gx - 4);
      TT.beginPlaceClick();
      aim(gx + 5);
      TT.updateGhostPreview();
      const before = TT.builds.length;
      TT.commitBuildDrag();
      return TT.builds.length - before;
    })()`);
    console.log(`bench: placed ${placed} walls`);
  } else if (SCENARIO === 'night') {
    await startMatch(page);
    const jumped = await page.evaluate(`(() => {
      TT.runDevCommand('godmode');
      const ok = !!TT.devJumpToNight(${NIGHT}, true);
      const st = TT.getWaveDirectorState();
      return { ok, phase: st.phase, day: st.day, pushes: st.pace ? st.pace.pushes : 0 };
    })()`);
    if (!jumped.ok || jumped.phase !== 'wave') {
      throw new Error('devJumpToNight refused night ' + NIGHT + ' (' + JSON.stringify(jumped) + ')');
    }
    let state = null;
    for (let i = 0; i < 40; i++) {
      state = await page.evaluate(ADVANCE, 180000);
      console.log(`bench: night ${state.day} push ${state.push == null ? '?' : state.push + 1}/${state.pushes}  out ${state.zombies}  spawned ${state.spawned}/${state.total}`);
      if (state.done) break;
    }
    if (!state || !state.done) {
      throw new Error('night ' + NIGHT + ' never reached its last push with the horde out (' + JSON.stringify(state) + ')');
    }
    // The alarm brings night on over a couple of seconds. Measure after that, so the
    // frame is the night and not the sky tween.
    await page.evaluate('new Promise(r => setTimeout(r, 3000))');
  } else {
    throw new Error('unknown scenario ' + SCENARIO + ' (megaswarm, day5, build, night)');
  }

  let profStart = null;
  if (PROF_ON) {
    profStart = await page.evaluate(PROF_START);
    if (!profStart || !profStart.ok) throw new Error('--prof: ' + (profStart && profStart.why));
    console.log(`bench: profiler on, GPU timestamps ${profStart.gpu}`);
  }
  if (CPU_ON) {
    await page.send('Profiler.enable');
    await page.send('Profiler.setSamplingInterval', { interval: 500 });
    await page.send('Profiler.start');
    console.log('bench: CPU profile on');
  }
  await page.evaluate('TT.resetPerf()');
  const t0 = Date.now();
  const windows = [];
  while (Date.now() - t0 < SECONDS * 1000) {
    const snap = await page.evaluate(SAMPLE);
    if (snap) windows.push(snap);
    await new Promise((r) => setTimeout(r, 1000));
  }
  const cpuProfile = CPU_ON ? (await page.send('Profiler.stop', {}, 180000)).profile : null;
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
  const line = {
    scenario: SCENARIO,
    seconds: SECONDS,
    fps: round1(avg('fps')),
    low: round1(avg('low')),
    worst: round1(final.worst || 0),
    hitches: final.hitches || 0,
    draws: Math.round(median(drawRows.map((w) => w.draws || 0))),
    triangles: Math.round(median(drawRows.map((w) => w.triangles || 0))),
    zombies: end.zombies,
    gfx: end.gfx,
    windows: use.length
  };
  if (SCENARIO === 'night') {
    line.night = NIGHT;
    line.push = end.push;
    line.pushes = end.pushes;
    line.last = end.push != null && end.pushes != null && end.push === end.pushes - 1;
  }
  if (PROF_ON) {
    const got = await page.evaluate(PROF_END);
    const r2 = (n) => Math.round(n * 100) / 100;
    const phases = (got.rep && got.rep.phases) || [];
    const tickMs = phases.reduce((s, p) => s + p.avg, 0);
    const frameMs = line.fps > 0 ? 1000 / line.fps : 0;
    const gpu = got.gpu || [];
    line.prof = {
      frames: got.rep ? got.rep.frames : 0,
      frameMs: r2(frameMs),
      tickMs: r2(tickMs),
      outsideMs: r2(frameMs - tickMs),
      top: phases.slice(0, 12).map((p) => ({ k: p.k, avg: r2(p.avg), max: r2(p.max) })),
      spikes: ((got.rep && got.rep.spikes) || []).slice(0, 8),
      gpuMs: gpu.length ? r2(median(gpu)) : (profStart.gpu === 'on' ? 'no samples' : profStart.gpu),
      gpuSamples: gpu.length
    };
  }
  if (cpuProfile) {
    const sum = cpuSummary(cpuProfile);
    const frames = (line.prof && line.prof.frames) || Math.max(1, Math.round(line.fps * SECONDS));
    const per = (us) => Math.round(us / 1000 / frames * 100) / 100;
    const rank = (m, n) => [...m.entries()].filter(([k]) => !/^\((root|program|idle)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, us]) => ({ k, ms: per(us) }));
    line.cpu = {
      frames,
      sampledMs: per(sum.all),
      idleMs: per(sum.idle),
      self: rank(sum.self, 25),
      total: rank(sum.total, 30)
    };
    // CL-211: who calls the 12 heaviest by self time, and what the game's own big callers spend their time in
    const edgeList = [...sum.edges.entries()].map(([e, us]) => { const [a, b] = e.split('\u0000'); return { a, b, us }; });
    const top = (rows, n) => rows.sort((x, y) => y.us - x.us).slice(0, n);
    line.cpu.callers = {};
    const watched = /^(computeBoundingSphere|computeBoundingBox|updateWorldMatrix|setFromObject|raycast|intersectObjects?|traverse) /;
    const keys = new Set([...line.cpu.self.slice(0, 12).map((s) => s.k), ...[...sum.total.keys()].filter((k) => watched.test(k))]);
    for (const k of keys) {
      const rows = top(edgeList.filter((e) => e.b === k), 4).map((e) => ({ k: e.a, ms: per(e.us) }));
      if (rows.length && rows[0].ms >= 0.02) line.cpu.callers[k] = rows;
    }
    line.cpu.callees = {};
    for (const name of ['updateZombies', 'tick', 'renderFrame', 'updateWorldAnimations', 'bend']) {
      for (const k of [...sum.total.keys()].filter((k) => k.startsWith(name + ' '))) {
        line.cpu.callees[k] = top(edgeList.filter((e) => e.a === k), 10).map((e) => ({ k: e.b, ms: per(e.us) }));
      }
    }
  }
  if (CENSUS_ON) { line.census = await page.evaluate(CENSUS); line.census.draws = await page.evaluate(CENSUS_DRAWS, 20000); }
  if (SCENARIO === 'megaswarm') line.count = COUNT;
  if (SCENARIO === 'build') line.placed = placed;
  console.log(`fps    ${line.fps.toFixed(1)}   (mean of last ${use.length} s)`);
  console.log(`low    ${line.low.toFixed(1)}   (1% low, same windows)`);
  console.log(`worst  ${line.worst.toFixed(1)} ms`);
  console.log(`hitch  ${line.hitches}   (frames over 50 ms, whole run)`);
  console.log(`draws  ${line.draws}`);
  console.log(`tris   ${line.triangles}`);
  if (line.prof) {
    const p = line.prof;
    console.log(`frame  ${p.frameMs} ms = tick ${p.tickMs} ms + outside ${p.outsideMs} ms   gpu ${p.gpuMs}${typeof p.gpuMs === 'number' ? ' ms' : ''}`);
    for (const s of p.top) console.log(`  ${s.k.padEnd(34)} ${s.avg.toFixed(2).padStart(6)} ms   worst ${s.max.toFixed(1)}`);
  }
  if (line.cpu) {
    console.log(`cpu    ${line.cpu.sampledMs} ms sampled per frame, ${line.cpu.idleMs} idle; by total time:`);
    for (const s of line.cpu.total.slice(0, 20)) console.log(`  ${s.ms.toFixed(2).padStart(6)} ms  ${s.k}`);
  }
  if (line.census) {
    const c = line.census;
    console.log(`scene  ${c.nodes} nodes (${c.auto} recompose each frame), ${c.meshes} meshes (${c.shown} shown, ${c.casters} cast shadows), ${c.bones} bones, ${c.top} top-level (${c.culledTops} culled, ${c.culledNodes} nodes under them), the dead ${c.zombieNodes} nodes`);
    for (const g of c.groups.slice(0, 15)) console.log(`  ${String(g.nodes).padStart(6)} nodes  ${String(g.count).padStart(4)} x ${g.k}   (${g.auto} auto, ${g.meshes} meshes, ${g.bones} bones)`);
    if (c.draws) { console.log(`draws  ${c.draws.main} a frame by the camera, ${c.draws.shadow} by the shadow pass; by owner:`); for (const g of c.draws.byGroup.slice(0, 15)) console.log(`  ${String(g.n).padStart(6)}  ${g.k}`); }
  }
  console.log(JSON.stringify(line));
} finally {
  await browser.close();
  await server.close();
}
