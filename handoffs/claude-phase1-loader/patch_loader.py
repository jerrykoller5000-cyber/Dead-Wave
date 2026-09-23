# Phase 1 #1: the loader keeps going in a hidden tab, and the load stages are exposed.
# Usage: python3 patch_loader.py in.html out.html   (anchors are exact strings; fails loudly)
import sys
src = open(sys.argv[1], encoding='utf-8').read()
def rep(old, new, count=1):
    global src
    n = src.count(old)
    if n != count: sys.exit(f'anchor found {n}x (want {count}): {old[:80]!r}')
    src = src.replace(old, new)

# 1. Load stages and the load channel (window.DWLoad), and a yield a hidden tab doesn't throttle.
rep("""    window.DWOpening?.progress(8, 'Loading world');
    await new Promise(resolve => setTimeout(resolve, 0));
""", """    // === Load stages =============================================================
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
    const DWLoad = window.DWLoad = (() => {
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
    function yieldToBrowser() {
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
    async function whileHiddenFramesRun(work) {
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
    window.DWOpening?.progress(8, 'Loading world');
    DWLoad._begin();
    await yieldToBrowser();
""")

# 2. loadMark: stages by name instead of by count, and the hidden-tab-safe yield.
rep("""      _loadMarks.push(n + ' ' + (performance.now() - _loadT0).toFixed(0) + 'ms');
      const milestones = [[24, 'Loading world'], [32, 'Loading world'], [43, 'Loading world'],
        [55, 'Preparing equipment'], [64, 'Loading world'], [72, 'Preparing scene'],
        [80, 'Preparing scene'], [90, 'Preparing scene'], [96, 'Finishing up']];
      const [percent, label] = milestones[Math.min(_loadMarks.length - 1, milestones.length - 1)];
      window.DWOpening?.progress(percent, label);
      // Yield between the existing construction stages so the splash keeps painting.
      await new Promise(resolve => setTimeout(resolve, 0));
""", """      _loadMarks.push(n + ' ' + (performance.now() - _loadT0).toFixed(0) + 'ms');
      if (!DWLoad._endMark(n)) console.info('Dead-Wave: load mark with no step in LOAD_STEPS: ' + n);
      await yieldToBrowser();
""")

# 3. compileAsync under the hidden-tab rAF stand-in.
rep("""        await renderer.compileAsync(scene, camera);
""", """        await whileHiddenFramesRun(() => renderer.compileAsync(scene, camera));
""")
rep("""    await initPostProcessing();
    warmEffectPools();
""", """    await whileHiddenFramesRun(() => initPostProcessing());
    warmEffectPools();
""")

# 4. The end of the pre-roll announces 'warmup'; the canvas comes back without waiting on rAF when hidden.
rep("""      finishEffectWarmup();
      window.DWOpening?.ready();
      requestAnimationFrame(() => { lr.canvas.style.visibility = lr.prevVis; });
""", """      finishEffectWarmup();
      DWLoad._endStep('warmup');
      DWLoad._stopWatchingErrors();
      window.DWOpening?.ready();
      // Visible: restore on the next frame, after the cleanup has drawn. Hidden: nothing
      // is drawn to see, and rAF would not run until the tab came back.
      if (document.visibilityState === 'hidden') lr.canvas.style.visibility = lr.prevVis;
      else requestAnimationFrame(() => { lr.canvas.style.visibility = lr.prevVis; });
""")

# 5. Pump the pre-roll while hidden.
rep("""    renderer.setAnimationLoop(tick);
  </script>""", """    renderer.setAnimationLoop(tick);

    // The pre-roll (the staged fight that ends in DWOpening.ready()) runs inside the
    // render loop, and a hidden tab never runs the loop, so a load started in a
    // background tab used to sit at "Finishing up" until the player came back. While
    // the tab is hidden and the pre-roll is unfinished, the same tick is pumped from
    // MessageChannel messages; as soon as the tab shows, the loop has it again. Bounded:
    // the pre-roll is about 113 ticks, and the pump stops the moment it ends.
    const preRollPending = () => !_preRollDone || !!_liveRoll;
    let _preRollPumping = false;
    function pumpPreRollWhileHidden() {
      if (_preRollPumping || !preRollPending() || document.visibilityState !== 'hidden') return;
      _preRollPumping = true;
      const ch = new MessageChannel();
      const stop = () => { _preRollPumping = false; ch.port1.close(); };
      ch.port1.onmessage = () => {
        if (!preRollPending() || document.visibilityState !== 'hidden') { stop(); return; }
        try { tick(); } catch (e) { console.info('Dead-Wave: hidden-tab pre-roll stopped.', e); stop(); return; }
        ch.port2.postMessage(0);
      };
      ch.port2.postMessage(0);
    }
    document.addEventListener('visibilitychange', pumpPreRollWhileHidden);
    pumpPreRollWhileHidden();
  </script>""")
open(sys.argv[2], 'w', encoding='utf-8').write(src)
print('ok')
