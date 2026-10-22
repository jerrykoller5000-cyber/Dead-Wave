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
//   node tools/bench.mjs --night 20 --gfx high --prof --alloc   and who allocates (the garbage behind GC pauses)
//   node tools/bench.mjs --night 20 --gfx high --prof --gc      and V8's GC on the main thread, per spike (CL-239)
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
//   spikes    the first frames over 25 ms with their four heaviest sections, the heap they freed and the pipelines,
//             textures and geometries they built (CL-223), and whether the sun's shadow map was redrawn in it
//             (`sunShadow`, CL-237) and how many render objects it made (`newRenderObjects`, CL-238); spikeCauses
//             counts all of them by which it was
//   pipelines every render pipeline built while measuring (CL-226): how many, how many three released, and the
//             top groups by object < parents | material | state | camera, with the frames they came on
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
// --alloc (CL-219): a DevTools allocation-sampling profile over the measured seconds, the garbage included, and the line
// gets `alloc`: kB a frame allocated, by function (self) and by the function and its two callers (the 25 heaviest
// each), so the night's garbage collections (the 40-70 ms frames GP-19940 traced) can be traced to who makes garbage.
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
const ALLOC_ON = argv.includes('--alloc');
// CL-239: --gc (with --prof) traces V8's garbage collection on the page's main thread and says how much of it fell
// inside each spike frame.
const GC_ON = argv.includes('--gc');
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
// CL-223: precise performance.memory, so a spike's freedMB is the heap it really freed (Chrome rounds it otherwise).
const browser = await launch({ headless: argv.includes('--headless'), args: ['--enable-precise-memory-info'] });
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
  P.reset(); P.spikeMs = 25; P.on = true;
  // CL-223: what each spike frame built. Pipelines (three's render-pipeline cache: a material drawn the first time in
  // that state compiles one), textures and geometries uploaded (renderer.info.memory), counted between the frame's
  // begin and the next one and put on the spike PROF records. A spike that built nothing and freed no heap is code.
  const R = TT.renderer;
  // CL-232: and the node builds. Since CL-229 equal shaders share a pipeline, but a material whose node graph three hasn't
  // seen still builds it (its node builder) on the frame it is first drawn: 25-40 ms and ~10 MB with no new pipeline.
  const JB = window.__benchBuilds = window.__benchBuilds || { made: [], n: 0, on: true };
  JB.on = true; JB.made.length = 0; JB.n = 0;
  const BE = R && R.backend;
  if (BE && typeof BE.createNodeBuilder === 'function' && !BE.__cl232) {
    const cnb = BE.createNodeBuilder;
    BE.createNodeBuilder = function (object, renderer) {
      const j = window.__benchBuilds;
      if (j && j.on) { j.n++; if (j.made.length < 400) { try {
        const path = []; for (let n = object; n && path.length < 4; n = n.parent) path.push(n.name || n.type);
        const m = object && object.material;
        let root = object; while (root && !root.userData?.typeKey) root = root.parent;
        j.made.push({ frame: P.frame, obj: path.join(' < '), kind: object ? object.type : '', count: (object && object.count) || 0, mat: m ? (m.type || '') + (m.name ? ':' + m.name : '') : '',
          zombieKind: root?.userData?.typeKey || null, zombieVariant: root?.userData?.variant ? { ...root.userData.variant } : null,
          zombieSkinIndex: root?.userData?.skinMeshes?.indexOf(object) ?? null,
          materialState: m && root?.userData?.typeKey ? { emissive: m.emissive?.getHex?.() ?? null,
            emissiveIntensity: m.emissiveIntensity ?? null, transparent: !!m.transparent, side: m.side,
            roughness: m.roughness ?? null, metalness: m.metalness ?? null, version: m.version,
            attributes: Object.keys(object.geometry?.attributes || {}) } : null });
      } catch (e) {} } }
      return cnb.call(this, object, renderer);
    };
    BE.__cl232 = true;
  }
  // CL-238: and the render objects. three keeps one per object, material, render context (a pass, a shadow map) and
  // lights node; a new one (a mesh drawn the first time in that pass, or again after its lights or material key
  // changed) makes its bindings and finds its pipeline, which costs CPU in r:render with no build and no pipeline.
  // AG-111's r:render 15-18 ms spikes, about 3 s apart, built nothing: this says whether they made render objects.
  const JR = window.__benchRO = window.__benchRO || { made: [], n: 0, on: true };
  JR.on = true; JR.made.length = 0; JR.n = 0;
  const RO = R && R._objects;
  if (RO && typeof RO.createRenderObject === 'function' && !RO.__cl238) {
    const cro = RO.createRenderObject;
    RO.createRenderObject = function (nodes, geometries, renderer, object, material, scene, camera) {
      const j = window.__benchRO;
      if (j && j.on) { j.n++; if (j.made.length < 4000) { try {
        const path = []; for (let n = object; n && path.length < 3; n = n.parent) path.push(n.name || n.type);
        const cam = !camera ? '' : camera === TT.camera ? 'scene' : camera.isOrthographicCamera ? 'ortho' : camera.type;
        j.made.push({ frame: P.frame, obj: path.join(' < '), mat: material ? material.type : '', cam });
      } catch (e) {} } }
      return cro.apply(this, arguments);
    };
    RO.__cl238 = true;
  }
  const counts = () => { const m = (R && R.info && R.info.memory) || {}; return [(R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0, m.textures || 0, m.geometries || 0, (window.__benchBuilds && window.__benchBuilds.n) || 0, window.__dwSunShadowN || 0, (window.__benchRO && window.__benchRO.n) || 0]; };
  if (!P.__cl223) {
    const begin = P.begin; let last = counts(), lastT = performance.now();
    P.begin = function () { const n0 = this.spikes.length, tb = performance.now(); begin.call(this); const now = counts();
      if (this.spikes.length > n0) { const sp = this.spikes[this.spikes.length - 1]; sp.newPipelines = now[0] - last[0]; sp.newTextures = now[1] - last[1]; sp.newGeometries = now[2] - last[2]; sp.newBuilds = now[3] - last[3]; sp.sunShadow = now[4] - last[4]; sp.newRenderObjects = now[5] - last[5]; sp.t0 = +lastT.toFixed(2); sp.t1 = +tb.toFixed(2); }
      last = now; lastT = tb; };
    P.__cl223 = true;
  }
  // CL-226: who the new pipelines are for. AG-105 found 21-26 of a night's ~30 spikes each built one (22-48 ms in
  // r:render, about 10 MB of heap: the node builder), all through the night, not only at its start. Each one built is
  // journalled with the object (its name or type, up to three parents), the material, the state that goes into the
  // pipeline's key, which camera drew it (the scene's, or another: a shadow or a pass) and whether its shaders were new.
  // A release (three drops a pipeline when its last user moves to another) is counted: a pair that keeps coming back
  // is churn, one state toggled back and forth.
  const PL = R && R._pipelines;
  const J = window.__benchPipes = { made: [], released: 0, on: true };
  if (PL && typeof PL._getRenderPipeline === 'function' && !PL.__cl226) {
    const make = PL._getRenderPipeline, release = PL._releasePipeline;
    PL._getRenderPipeline = function (ro, sv, sf, key, promises) {
      const j = window.__benchPipes;
      if (j && j.on && j.made.length < 400) { try {
        const o = ro.object, m = ro.material, path = [];
        for (let n = o; n && path.length < 4; n = n.parent) path.push(n.name || n.type);
        j.made.push({ frame: P.frame, obj: path.join(' < '), kind: o ? o.type : '', mat: m ? m.type + (m.name ? ':' + m.name : '') : '',
          state: m ? [m.transparent ? 'transparent' : 'opaque', 'side' + m.side, m.depthWrite ? 'zw' : 'no-zw', m.blending !== 1 ? 'blend' + m.blending : '', m.alphaTest > 0 ? 'alphaTest' : ''].filter(Boolean).join(' ') : '',
          cam: ro.camera === TT.camera ? 'scene' : ((ro.camera && ro.camera.type) || '?'), newShaders: (sv.usedTimes === 0 ? 'v' : '') + (sf.usedTimes === 0 ? 'f' : '') });
      } catch (e) {} }
      return make.call(this, ro, sv, sf, key, promises);
    };
    PL._releasePipeline = function (pl) { const j = window.__benchPipes; if (j && j.on) j.released++; return release.call(this, pl); };
    PL.__cl226 = true;
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
  // CL-226: the pipelines journal, grouped by what they were for, the most made first.
  const J = window.__benchPipes || { made: [], released: 0 };
  J.on = false;
  const groups = new Map();
  for (const x of J.made) { const k = x.obj + ' | ' + x.mat + ' | ' + x.state + ' | ' + x.cam; const g = groups.get(k) || { k, n: 0, newShaders: 0, frames: [] }; g.n++; if (x.newShaders) g.newShaders++; if (g.frames.length < 6) g.frames.push(x.frame); groups.set(k, g); }
  const pipes = { made: J.made.length, released: J.released, withNewShaders: J.made.filter((x) => x.newShaders).length, top: [...groups.values()].sort((a, b) => b.n - a.n).slice(0, 15), first: J.made.slice(0, 12) };
  // CL-232: the node builds, grouped the same way.
  const JB = window.__benchBuilds || { made: [], n: 0 };
  JB.on = false;
  const bg = new Map();
  for (const x of JB.made) { const k = x.obj + ' | ' + x.kind + (x.count > 1 ? ' x' + x.count : '') + ' | ' + x.mat; const g = bg.get(k) || { k, n: 0, frames: [] }; g.n++; if (g.frames.length < 6) g.frames.push(x.frame); bg.set(k, g); }
  const builds = { made: JB.n, top: [...bg.values()].sort((a, b) => b.n - a.n).slice(0, 15),
    zombieAndEcho: JB.made.filter((x) => /zombie-skin|feral-motion-echo/.test(x.obj)) };
  // CL-238: the render objects, grouped by object | material | camera, the most made first; and for each of the first
  // eight spikes, what it made (its top five groups).
  const JR = window.__benchRO || { made: [], n: 0 };
  JR.on = false;
  const rg = new Map(), byFrame = new Map();
  for (const x of JR.made) {
    const k = x.obj + ' | ' + x.mat + ' | ' + x.cam;
    const g = rg.get(k) || { k, n: 0, frames: [] }; g.n++; if (g.frames.length < 6 && g.frames[g.frames.length - 1] !== x.frame) g.frames.push(x.frame); rg.set(k, g);
    const f = byFrame.get(x.frame) || new Map(); f.set(k, (f.get(k) || 0) + 1); byFrame.set(x.frame, f);
  }
  const spikeRO = (rep.spikes || []).slice(0, 8).map((sp) => { const f = byFrame.get(sp.frame); return { frame: sp.frame, n: f ? [...f.values()].reduce((a, b) => a + b, 0) : 0, top: f ? [...f.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => n + ' ' + k) : [] }; });
  const renderObjects = { made: JR.n, perFrame: +(JR.n / Math.max(1, rep.frames || 1)).toFixed(2), top: [...rg.values()].sort((a, b) => b.n - a.n).slice(0, 15), spikes: spikeRO };
  return { rep, gpu: G.samples.slice(), pipes, builds, renderObjects };
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

// CL-239: the main thread's GC events (complete events, or begin/end pairs) by name, and their overlap with each spike
// frame [t0, t1] (performance.now ms, put on the trace clock by the 'dw-gc-sync' mark).
function gcSummary(tr, spikes, frames) {
  const ev = tr.events;
  const threadName = new Map();
  for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') threadName.set(e.pid + ':' + e.tid, e.args && e.args.name);
  const sync = ev.find((e) => e.name === 'dw-gc-sync' && /user_timing/.test(e.cat || ''));
  const main = sync ? sync.pid + ':' + sync.tid : [...threadName.entries()].find(([, n]) => n === 'CrRendererMain')?.[0];
  const off = sync && tr.sync != null ? sync.ts - tr.sync * 1000 : null;   // trace us = perf ms * 1000 + off
  const isGc = (e) => /GC|Scavenge|Mark|Sweep|Compact|Evacuat/i.test(e.name) && /gc|v8|devtools\.timeline/.test(e.cat || '');
  const spans = [], open = new Map();
  for (const e of ev) {
    if (!isGc(e) || (e.pid + ':' + e.tid) !== main) continue;
    if (e.ph === 'X') spans.push({ name: e.name, a: e.ts, b: e.ts + (e.dur || 0) });
    else if (e.ph === 'B') open.set(e.name, e.ts);
    else if (e.ph === 'E' && open.has(e.name)) { spans.push({ name: e.name, a: open.get(e.name), b: e.ts }); open.delete(e.name); }
  }
  // Nested events (a phase inside its cycle) would count twice: the totals keep only the outermost span at each instant.
  spans.sort((x, y) => x.a - y.a);
  const outer = []; for (const sp of spans) { const l = outer[outer.length - 1]; if (l && sp.a < l.b) { if (sp.b > l.b) l.b = sp.b; } else outer.push({ a: sp.a, b: sp.b }); }
  const byName = {};
  for (const sp of spans) { const k = byName[sp.name] || (byName[sp.name] = { n: 0, ms: 0 }); k.n++; k.ms += (sp.b - sp.a) / 1000; }
  for (const k in byName) byName[k].ms = Math.round(byName[k].ms * 10) / 10;
  const totalMs = outer.reduce((s, o) => s + (o.b - o.a), 0) / 1000;
  const overlap = (a, b, list) => list.reduce((s, o) => s + Math.max(0, Math.min(b, o.b) - Math.max(a, o.a)), 0) / 1000;
  const perSpike = off == null ? [] : spikes.filter((sp) => sp.t0 != null).slice(0, 60).map((sp) => {
    const a = sp.t0 * 1000 + off, b = sp.t1 * 1000 + off;
    const names = {}; for (const x of spans) { const o = Math.max(0, Math.min(b, x.b) - Math.max(a, x.a)) / 1000; if (o > 0.05) names[x.name] = Math.round(((names[x.name] || 0) + o) * 10) / 10; }
    return { frame: sp.frame, ms: sp.ms, wallMs: Math.round((sp.t1 - sp.t0) * 10) / 10, gcMs: Math.round(overlap(a, b, outer) * 10) / 10, names };
  });
  const withGc = perSpike.filter((x) => x.gcMs >= 1).length;
  return { synced: off != null, mainThread: threadName.get(main) || main || null, events: ev.length, totalMs: Math.round(totalMs * 10) / 10,
    perFrameMs: Math.round(totalMs / Math.max(1, frames) * 100) / 100, byName, spikesWithGc: withGc + '/' + perSpike.length, spikes: perSpike };
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
  // CL-239: GB-218 found AG-111's 3-second spikes are every phase of one frame at 2.5-3x its own average at once (render,
  // matrices, zombies, the marine), nothing built, the heap growing ~1 MB a spike and ~10 MB freed a few frames later:
  // the look of V8 marking the heap (write barriers and marking steps on the main thread) or another process. This
  // records the GC on the page's main thread and lines it up with the spike frames (their t0/t1, by a sync mark).
  let gcTrace = null;
  if (GC_ON && PROF_ON) {
    gcTrace = { events: [], done: null };
    gcTrace.done = new Promise((resolve) => {
      page.conn.onEvent((msg) => {
        if (msg.sessionId !== page.sessionId) return;
        if (msg.method === 'Tracing.dataCollected') { for (const e of msg.params.value || []) gcTrace.events.push(e); }
        if (msg.method === 'Tracing.tracingComplete') resolve();
      });
    });
    await page.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { recordMode: 'recordAsMuchAsPossible',
      includedCategories: ['disabled-by-default-v8.gc', 'blink.user_timing', '__metadata'] } });
    gcTrace.sync = await page.evaluate(`(() => { performance.mark('dw-gc-sync'); const m = performance.getEntriesByName('dw-gc-sync').pop(); return m ? m.startTime : null; })()`);
    console.log('bench: GC trace on');
  }
  if (ALLOC_ON) {
    await page.send('HeapProfiler.enable');
    await page.send('HeapProfiler.startSampling', { samplingInterval: 16384, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    console.log('bench: allocation sampling on');
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
  const allocProfile = ALLOC_ON ? (await page.send('HeapProfiler.stopSampling', {}, 180000)).profile : null;
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
    if (gcTrace) {
      await page.send('Tracing.end', {}, 180000);
      await Promise.race([gcTrace.done, new Promise((r) => setTimeout(r, 120000))]);
      got.gc = gcSummary(gcTrace, (got.rep && got.rep.spikes) || [], (got.rep && got.rep.frames) || 1);
    }
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
      // CL-223: every spike over 25 ms (up to PROF's 60) sorted by what it did: built pipelines, uploaded textures or
      // geometry, freed 2 MB or more of heap (a garbage collection), or none of these (the game's own code).
      spikeCauses: (() => { const all = (got.rep && got.rep.spikes) || [], c = { spikes: all.length, pipelines: 0, builds: 0, uploads: 0, sunShadow: 0, gc: 0, code: 0 };
        for (const sp of all) { if (sp.newPipelines > 0) c.pipelines++; else if (sp.newBuilds > 0) c.builds++; else if (sp.newTextures > 0 || sp.newGeometries > 0) c.uploads++; else if (sp.sunShadow > 0) c.sunShadow++; else if (sp.freedMB >= 2) c.gc++; else c.code++; }
        return c; })(),
      gpuMs: gpu.length ? r2(median(gpu)) : (profStart.gpu === 'on' ? 'no samples' : profStart.gpu),
      gpuSamples: gpu.length,
      // CL-226: every pipeline built while measuring, and what for (the PROF_END journal)
      pipelines: got.pipes || null,
      // CL-232: every node build while measuring (a material's node graph compiled), grouped by object | kind | material
      builds: got.builds || null,
      // CL-238: every render object made while measuring (object | material | camera), and what each spike made
      renderObjects: got.renderObjects || null,
      // CL-239 (--gc): V8's GC on the page's main thread while measuring, and how much of it fell in each spike frame
      gc: got.gc || null
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
  if (allocProfile) {
    // Each node: a call frame, the bytes sampled as allocated in it (selfSize), its callees (children).
    const frames = (line.prof && line.prof.frames) || Math.max(1, Math.round(line.fps * SECONDS));
    const keyOf = (cf) => `${cf.functionName || '(anonymous)'} ${(cf.url || '').split('/').pop().split('?')[0]}:${(cf.lineNumber ?? -1) + 1}`;
    const self = new Map(), stacks = new Map();
    let all = 0;
    const walk = (n, chain) => {
      const k = keyOf(n.callFrame || {});
      const here = chain.concat(k);
      if (n.selfSize) {
        all += n.selfSize;
        self.set(k, (self.get(k) || 0) + n.selfSize);
        const st = here.slice(-3).reverse().join(' < ');
        stacks.set(st, (stacks.get(st) || 0) + n.selfSize);
      }
      for (const c of n.children || []) walk(c, here);
    };
    if (allocProfile.head) walk(allocProfile.head, []);
    const kb = (b) => Math.round(b / 1024 / frames * 10) / 10;
    const rank = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, b]) => ({ k, kb: kb(b) }));
    line.alloc = { frames, kbPerFrame: kb(all), mbPerSecond: Math.round(all / 1048576 / SECONDS * 10) / 10, self: rank(self), stacks: rank(stacks) };
    console.log(`alloc  ${line.alloc.kbPerFrame} kB a frame (${line.alloc.mbPerSecond} MB/s); by function:`);
    for (const a of line.alloc.self.slice(0, 15)) console.log(`  ${String(a.kb).padStart(7)} kB  ${a.k}`);
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
