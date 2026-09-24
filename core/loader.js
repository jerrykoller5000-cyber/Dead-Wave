// Load channel and the hidden-tab frame pump. No game state.
// CU-4 slice. The page still calls DWLoad._begin() when the world build starts.
// === Load stages =============================================================
// The load runs these steps in this order. Each step belongs to one of four stable
// stages (terrain, world, zombies, shaders); a stage's units are its steps, so
// completedUnits/totalUnits are real counts, not a guessed percentage. 'world' stays
// active while 'zombies' runs inside it, because that is what actually happens.
// `mark` is the loadMark() name that ends the step; the last step ends in
// endLivePreRoll(). `percent`/`label` only feed the current splash until the UI
// module reads the channel instead; they are not part of the contract.
const LOAD_STEPS = [
  { id: 'terrain', stage: 'terrain', mark: 'terrain+water+sky built',             percent: 24,  label: 'Loading world' },
  { id: 'rocks',   stage: 'world',   mark: 'rocks',                               percent: 32,  label: 'Loading world' },
  { id: 'trees',   stage: 'world',   mark: 'trees',                               percent: 43,  label: 'Loading world' },
  { id: 'actors',  stage: 'zombies', mark: 'player+weapons+zombie types',         percent: 55,  label: 'Preparing equipment' },
  { id: 'foliage', stage: 'world',   mark: 'foliage scattered',                   percent: 64,  label: 'Loading world' },
  { id: 'pois',    stage: 'world',   mark: 'POIs+minimap+foliage chunks',         percent: 72,  label: 'Preparing scene' },
  { id: 'setup',   stage: 'world',   mark: 'contact shading + rest of setup',     percent: 80,  label: 'Preparing scene' },
  { id: 'compile', stage: 'shaders', mark: 'post + pools + compile + warm frame', percent: 90,  label: 'Preparing scene' },
  { id: 'loop',    stage: 'shaders', mark: 'ready',                               percent: 96,  label: 'Finishing up' },
  { id: 'warmup',  stage: 'shaders', mark: null,                                  percent: 100, label: 'Ready' },
];
// The load channel (contract in docs/contracts.md): DWLoad.snapshot() for the state
// now, DWLoad.subscribe(fn) for every event after (fn gets the snapshot at once, so a
// late subscriber misses nothing), and the same events as window 'dw-load' events.
export const DWLoad = window.DWLoad = (() => {
  const loadId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  const stages = {};
  for (const s of LOAD_STEPS) {
    const st = stages[s.stage] || (stages[s.stage] = { state: 'waiting', completedUnits: 0, totalUnits: 0, startedAt: null, finishedAt: null });
    st.totalUnits++;
  }
  const steps = LOAD_STEPS.map(s => ({ id: s.id, stageId: s.stage, state: 'waiting', startedAt: null, finishedAt: null }));
  let state = 'loading', sequence = 0, errorCode = null;
  const subs = new Set();
  const clone = () => ({ loadId, state, sequence, errorCode, stages: JSON.parse(JSON.stringify(stages)), steps: steps.map(s => ({ ...s })) });
  function emit(stageId, substageId, st, extra = {}) {
    const g = stages[stageId];
    const ev = { loadId, sequence: ++sequence, stageId, substageId, state: st,
      completedUnits: g ? g.completedUnits : undefined, totalUnits: g ? g.totalUnits : undefined,
      unitId: substageId, at: performance.now(), ...extra };
    const snap = clone();
    for (const fn of subs) { try { fn(snap, ev); } catch (e) { console.info('Dead-Wave: load subscriber failed.', e); } }
    try { window.dispatchEvent(new CustomEvent('dw-load', { detail: ev })); } catch (_) {}
  }
  function begin(i) {
    const s = steps[i], g = stages[s.stageId], t = performance.now();
    if (s.state !== 'waiting' || state !== 'loading') return;
    if (g.state === 'waiting') { g.state = 'active'; g.startedAt = t; emit(s.stageId, null, 'begin'); }
    s.state = 'active'; s.startedAt = t; emit(s.stageId, s.id, 'begin');
  }
  function end(i) {
    const s = steps[i], g = stages[s.stageId], t = performance.now();
    if (s.state !== 'active' || state !== 'loading') return;
    s.state = 'complete'; s.finishedAt = t; g.completedUnits++;
    emit(s.stageId, s.id, 'end', { startedAt: s.startedAt, finishedAt: t });
    if (g.completedUnits === g.totalUnits) { g.state = 'complete'; g.finishedAt = t; emit(s.stageId, null, 'end', { startedAt: g.startedAt, finishedAt: t }); }
    const L = LOAD_STEPS[i];
    window.DWOpening?.progress(L.percent, L.label);
    if (i + 1 < steps.length) begin(i + 1);
    else { state = 'ready'; emit('ready', null, 'end'); }
  }
  function fail(code) {
    if (state !== 'loading') return;
    errorCode = code || 'error';
    const t = performance.now();
    for (const s of steps) if (s.state === 'active') { s.state = 'failed'; s.finishedAt = t; }
    for (const [id, g] of Object.entries(stages)) if (g.state === 'active') { g.state = 'failed'; g.finishedAt = t; emit(id, null, 'error', { errorCode }); }
    state = 'failed'; emit('load', null, 'error', { errorCode });
  }
  // An uncaught error or rejection during the load fails the active stages; the
  // splash's own Retry already listens for the same thing.
  const onErr = () => fail('uncaught-error');
  window.addEventListener('error', onErr);
  window.addEventListener('unhandledrejection', onErr);
  return {
    loadId,
    stageIds: Object.keys(stages),
    snapshot: clone,
    subscribe(fn) { subs.add(fn); try { fn(clone(), null); } catch (e) { console.info('Dead-Wave: load subscriber failed.', e); } return () => subs.delete(fn); },
    // Engine side only (the loader); not for UI.
    _endMark(mark) { const i = LOAD_STEPS.findIndex(s => s.mark === mark); if (i < 0) return false; end(i); return true; },
    _endStep(id) { const i = LOAD_STEPS.findIndex(s => s.id === id); if (i >= 0) end(i); },
    _begin() { begin(0); },
    _stopWatchingErrors() { window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onErr); },
  };
})();
// Hand the browser a turn between stages so the splash keeps painting. A hidden tab
// paints nothing and throttles timers (once a second, then once a minute after five
// minutes hidden), so there the hop is a MessageChannel message, which isn't throttled.
const _yieldCh = new MessageChannel(), _yieldQ = [];
_yieldCh.port1.onmessage = () => { const r = _yieldQ.shift(); if (r) r(); };
export function yieldToBrowser() {
  if (document.visibilityState === 'hidden') return new Promise(r => { _yieldQ.push(r); _yieldCh.port2.postMessage(0); });
  return new Promise(r => setTimeout(r, 0));
}
// three's WebGL2 backend polls parallel shader compiles with requestAnimationFrame
// (vendor/three/three.webgpu.js, createRenderPipeline), which a hidden tab never runs,
// so on that backend compileAsync() would not settle in a background tab. While the
// load awaits such work, rAF is lent a stand-in: each callback is queued on the real
// rAF and also, whenever the tab is hidden, on a MessageChannel. Whichever comes
// first runs it, once, so a tab that hides or shows mid-await never strands a poll.
// The real rAF is back the moment the await ends; a callback still queued then is
// left on the real rAF, exactly as if the stand-in had never been there.
export async function whileHiddenFramesRun(work) {
  const realRAF = window.requestAnimationFrame, realCAF = window.cancelAnimationFrame;
  const ch = new MessageChannel(), q = new Map(), real = new Map(); let nextId = 1e9, posted = false; // ids apart from the browser's
  const kick = () => { if (!posted && q.size && document.visibilityState === 'hidden') { posted = true; ch.port2.postMessage(0); } };
  ch.port1.onmessage = () => { posted = false; const t = performance.now(); for (const run of [...q.values()]) run(t); kick(); };
  document.addEventListener('visibilitychange', kick);
  window.requestAnimationFrame = (f) => {
    const id = ++nextId;
    const run = (t) => {
      if (!q.has(id)) return;
      q.delete(id);
      const r = real.get(id); real.delete(id);
      if (r != null) realCAF.call(window, r);
      try { f(t); } catch (e) { console.info('Dead-Wave: frame callback failed during load.', e); }
    };
    q.set(id, run); real.set(id, realRAF.call(window, run)); kick();
    return id;
  };
  window.cancelAnimationFrame = (id) => { if (real.has(id)) { realCAF.call(window, real.get(id)); real.delete(id); q.delete(id); } else if (id < 1e9) realCAF.call(window, id); };
  try { return await work(); }
  finally {
    window.requestAnimationFrame = realRAF; window.cancelAnimationFrame = realCAF;
    document.removeEventListener('visibilitychange', kick); ch.port1.close();
  }
}
