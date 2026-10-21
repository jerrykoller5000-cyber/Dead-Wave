// studio/inspector/timeline.js — the inspector's clock and its rewind (CL-196). Claude's (studio/*).
//
// The clock is the game's own: the tick asks it whether to run (held) and how much time passes (scale), so slow
// motion and a pause are the game itself slowed or stopped, every system on the same clock, the aim included. A step
// runs exactly one frame of 1/60 s.
//
// The rewind keeps the last few seconds of the subject's pose: every frame the game draws, the local transform and
// visibility of every node of the subject (the marine with his guns and kit, a zombie's body) is copied into a ring.
// Paused, the scrubber walks back through it: the recorded frame is put back on the rig and drawn, exactly as the game
// posed it. Playing again puts the newest frame (the game's present) back first, so the game carries on from where it
// stopped. Effects that are not part of the rig (casings, dropped magazines, blood) stay where they are.

export function createClock() {
  const st = { k: 1, paused: false, step: 0, gameTime: 0, frames: 0 };
  return {
    held: () => st.paused && st.step <= 0,
    scale(dt) {
      if (!Number.isFinite(dt) || dt < 0) throw new RangeError('frame time must be finite and non-negative');
      let d;
      if (st.step > 0) { st.step--; d = 1 / 60; }
      else d = dt * st.k;
      st.gameTime += d; st.frames++;
      return d;
    },
    play() { st.paused = false; st.step = 0; },
    pause() { st.paused = true; st.step = 0; },
    toggle() { st.paused = !st.paused; st.step = 0; return !st.paused; },
    step(n = 1) { if (!Number.isSafeInteger(n) || n < 0 || n > 3600) throw new RangeError('step count must be an integer from 0 to 3600'); st.paused = true; st.step += n; },
    speed(k) { if (k != null) { const v = +k; if (!Number.isFinite(v) || v <= 0) throw new RangeError('speed must be positive and finite'); st.k = Math.max(0.05, Math.min(2, v)); } return st.k; },
    get paused() { return st.paused; },
    get stepping() { return st.step > 0; },
    get gameTime() { return st.gameTime; },
    state: () => ({ ...st })
  };
}

// budgetMB: how much memory the ring may use (it holds fewer frames for a bigger rig). 10 floats a node a frame.
export function createRecorder({ budgetMB = 48, maxFrames = 900 } = {}) {
  if (!Number.isFinite(budgetMB) || budgetMB <= 0 || budgetMB > 512) throw new RangeError('rewind budget must be from 0 to 512 MB');
  if (!Number.isSafeInteger(maxFrames) || maxFrames < 1 || maxFrames > 3600) throw new RangeError('rewind capacity must be an integer from 1 to 3600');
  let rig = null, nodes = [], index = new Map(), N = 0, cap = 0;
  let buf = null, vis = null, par = null, times = null;
  let head = -1, count = 0, showing = -1;   // showing: ring slot on screen while scrubbing (-1: live)
  function reset(newRig) {
    rig = newRig || null; nodes = []; index = new Map(); N = 0; head = -1; count = 0; showing = -1; buf = vis = par = times = null;
  }
  function collect() {
    const list = [];
    const visit = (o) => { if (o.userData && o.userData.dwiIgnore) return; list.push(o); for (const c of o.children) visit(c); };
    visit(rig);
    return list;
  }
  function layout(list) {
    nodes = list; N = list.length; index = new Map(list.map((o, i) => [o, i]));
    cap = Math.min(maxFrames, Math.floor(budgetMB * 1048576 / (N * 45 + 8)));
    if (cap < 1) throw new RangeError('the rig exceeds the rewind memory budget');
    buf = new Float32Array(cap * N * 10); vis = new Uint8Array(cap * N); par = new Int32Array(cap * N); times = new Float64Array(cap);
    head = -1; count = 0; showing = -1;
  }
  // After the game posed the rig this frame (the inspector's frame, before the draw).
  function record(t) {
    if (!rig || showing >= 0) return;
    if (!Number.isFinite(t)) throw new RangeError('rewind time must be finite');
    const list = collect();
    if (!list.length) return;
    // A draw/holster can reparent the same nodes and change traversal order. Keep their stable indices and history;
    // rebuild only when nodes actually enter or leave the rig.
    if (list.length !== N || list.some((o) => !index.has(o))) layout(list);
    head = (head + 1) % cap; count = Math.min(cap, count + 1);
    const b = head * N * 10, v = head * N;
    for (let i = 0; i < N; i++) {
      const o = nodes[i], p = o.position, q = o.quaternion, s = o.scale, k = b + i * 10;
      buf[k] = p.x; buf[k + 1] = p.y; buf[k + 2] = p.z; buf[k + 3] = q.x; buf[k + 4] = q.y; buf[k + 5] = q.z; buf[k + 6] = q.w;
      buf[k + 7] = s.x; buf[k + 8] = s.y; buf[k + 9] = s.z;
      vis[v + i] = o.visible ? 1 : 0;
      const pi = o === rig ? -1 : index.get(o.parent);
      par[v + i] = pi == null ? -2 : pi;
    }
    times[head] = t;
  }
  function apply(slot) {
    const b = slot * N * 10, v = slot * N;
    // Remove changed edges first: applying a past hierarchy one edge at a time could temporarily make a cycle.
    for (let i = 0; i < N; i++) { const pi = par[v + i]; if (pi >= 0 && nodes[i].parent !== nodes[pi]) nodes[i].removeFromParent(); }
    for (let i = 0; i < N; i++) {
      const o = nodes[i], k = b + i * 10, pi = par[v + i];
      if (pi >= 0 && o.parent !== nodes[pi]) nodes[pi].add(o);
      o.position.set(buf[k], buf[k + 1], buf[k + 2]); o.quaternion.set(buf[k + 3], buf[k + 4], buf[k + 5], buf[k + 6]); o.scale.set(buf[k + 7], buf[k + 8], buf[k + 9]);
      o.visible = vis[v + i] === 1;
    }
    rig.updateMatrixWorld(true);
  }
  // back: frames before the newest (0 = the newest). Returns the frame's time, or null with nothing recorded.
  function show(back) {
    if (!rig || !count) return null;
    if (!Number.isFinite(back)) throw new RangeError('rewind frame must be finite');
    back = Math.max(0, Math.min(count - 1, Math.round(back)));
    const slot = ((head - back) % cap + cap) % cap;
    apply(slot); showing = back === 0 ? -1 : slot;
    return times[slot];
  }
  // Back to the present (the newest frame), before the game runs again.
  function live() { if (showing >= 0 && count) apply(head); showing = -1; }
  return {
    reset, record, show, live,
    get rig() { return rig; },
    get frames() { return count; },
    get scrubbing() { return showing >= 0; },
    span: () => (count > 1 ? times[head] - times[((head - (count - 1)) % cap + cap) % cap] : 0),
    timeAt: (back) => { if (!Number.isFinite(back)) throw new RangeError('rewind frame must be finite'); return count ? times[((head - Math.max(0, Math.min(count - 1, Math.round(back)))) % cap + cap) % cap] : 0; },
    info: () => ({ nodes: N, capacity: cap, frames: count, mb: +((N * 45 + 8) * cap / 1048576).toFixed(3) })
  };
}
