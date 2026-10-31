// qa/2026-10-31-AG-162/analyze.mjs
// Analyzes a 10s Chrome CDP trace (devtools.timeline, disabled-by-default-devtools.timeline.frame, cc, viz, gpu,
// blink.user_timing, disabled-by-default-v8.gc, __metadata) recorded during Night 20 High.

export function mergeSpans(spans) {
  if (!spans.length) return [];
  const sorted = spans.slice().sort((a, b) => a.a - b.a);
  const out = [{ a: sorted[0].a, b: sorted[0].b }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    if (cur.a <= last.b) {
      if (cur.b > last.b) last.b = cur.b;
    } else {
      out.push({ a: cur.a, b: cur.b });
    }
  }
  return out;
}

export function sumSpansUs(spans, clipA = -Infinity, clipB = Infinity) {
  const merged = mergeSpans(spans);
  let total = 0;
  for (const s of merged) {
    const a = Math.max(clipA, s.a);
    const b = Math.min(clipB, s.b);
    if (b > a) total += b - a;
  }
  return total;
}

export function extractCompleteSpans(events, threadKey, winA, winB, filterFn = null) {
  const spans = [];
  const open = new Map();
  for (const e of events) {
    if ((e.pid + ':' + e.tid) !== threadKey) continue;
    if (filterFn && !filterFn(e)) continue;
    if (e.ph === 'X') {
      const a = e.ts;
      const b = e.ts + (e.dur || 0);
      if (b > winA && a < winB) {
        spans.push({ name: e.name, cat: e.cat || '', a: Math.max(winA, a), b: Math.min(winB, b), rawA: a, rawB: b, args: e.args });
      }
    } else if (e.ph === 'B') {
      let stack = open.get(e.name);
      if (!stack) { stack = []; open.set(e.name, stack); }
      stack.push(e);
    } else if (e.ph === 'E') {
      const stack = open.get(e.name);
      if (stack && stack.length) {
        const startEv = stack.pop();
        const a = startEv.ts;
        const b = e.ts;
        if (b > winA && a < winB) {
          spans.push({ name: e.name, cat: e.cat || startEv.cat || '', a: Math.max(winA, a), b: Math.min(winB, b), rawA: a, rawB: b, args: startEv.args || e.args });
        }
      }
    }
  }
  return spans;
}

export function analyzeTrace(events, expectedFrames = null) {
  const threadNames = new Map();
  const processNames = new Map();
  for (const e of events) {
    if (e.ph === 'M' && e.name === 'thread_name' && e.args?.name) {
      threadNames.set(e.pid + ':' + e.tid, e.args.name);
    }
    if (e.ph === 'M' && e.name === 'process_name' && e.args?.name) {
      processNames.set(e.pid, e.args.name);
    }
  }

  const winStartEv = events.find((e) => e.name === 'ag162-win-start');
  const winEndEv = events.find((e) => e.name === 'ag162-win-end');

  let mainThread = winStartEv ? (winStartEv.pid + ':' + winStartEv.tid) : null;
  if (!mainThread) {
    for (const [k, name] of threadNames.entries()) {
      if (name === 'CrRendererMain') { mainThread = k; break; }
    }
  }
  const rendererPid = mainThread ? Number(mainThread.split(':')[0]) : null;

  let compositorThread = null;
  let gpuMainThread = null;
  let vizCompositorThread = null;
  for (const [k, name] of threadNames.entries()) {
    const [pidStr] = k.split(':');
    const pid = Number(pidStr);
    if (name === 'Compositor' && (rendererPid == null || pid === rendererPid)) compositorThread = k;
    if (name === 'CrGpuMain') gpuMainThread = k;
    if (name === 'VizCompositorThread') vizCompositorThread = k;
  }

  let minTs = Infinity, maxTs = -Infinity;
  for (const e of events) {
    if (e.ts > 0 && e.ph !== 'M') {
      if (e.ts < minTs) minTs = e.ts;
      const end = e.ts + (e.dur || 0);
      if (end > maxTs) maxTs = end;
    }
  }
  const winA = winStartEv ? winStartEv.ts : minTs;
  const winB = winEndEv ? winEndEv.ts : maxTs;
  const winMs = (winB - winA) / 1000;

  // Exclude outer task-runner wrappers AND outer ProxyMain::BeginMainFrame (which wraps FireAnimationFrame + PrePaint + Paint + Commit)
  // when computing disjoint busy time or post-rAF work; we still measure Commit / Layerize / Paint / PrePaint / Style / Layout individually.
  const isWrapperContainer = (name) =>
    name === 'ThreadControllerImpl::RunTask' ||
    name === 'SequenceManagerImpl::SelectNextTask' ||
    name === 'MessagePumpDefault::Run' ||
    name === 'ProxyMain::BeginMainFrame';

  const mainSpans = extractCompleteSpans(events, mainThread, winA, winB, (e) => !isWrapperContainer(e.name));
  const beginMainFrameSpans = extractCompleteSpans(events, mainThread, winA, winB, (e) => e.name === 'ProxyMain::BeginMainFrame');

  // All FireAnimationFrame callbacks (note: each rendered frame has 3 rAF callbacks: game tick, objectives poll, bench tickGpu)
  const allRafCallbacks = mainSpans
    .filter((s) => s.name === 'FireAnimationFrame')
    .sort((a, b) => a.rawA - b.rawA);

  // Group rAF callbacks belonging to the same browser animation frame (within 1.5 ms gap of the previous rAF callback end, or >2ms duration for game tick)
  const gameTickRafs = allRafCallbacks.filter((s) => (s.b - s.a) >= 1500); // game tick is always ~8-40ms (>= 1.5ms), helper rAFs are <0.5ms
  const otherRafs = allRafCallbacks.filter((s) => (s.b - s.a) < 1500);

  //Group rAF callbacks into frame turns (each turn has 1 gameTickRaf + helper rAFs)
  const frameTurns = [];
  for (const gt of gameTickRafs) {
    let a = gt.a, b = gt.b;
    for (const o of otherRafs) {
      if (o.b >= gt.a - 1000 && o.a <= gt.b + 1000) {
        if (o.a < a) a = o.a;
        if (o.b > b) b = o.b;
      }
    }
    frameTurns.push({ a, b, gtA: gt.a, gtB: gt.b });
  }

  const renderedFrames = expectedFrames || gameTickRafs.length || Math.max(1, Math.round(allRafCallbacks.length / 3));
  const traceFrameMs = winMs / renderedFrames;

  const isInsideRaf = (s) => {
    const mid = (s.a + s.b) * 0.5;
    for (const r of frameTurns) {
      if (mid >= r.a && mid <= r.b) return true;
      if (r.a > mid) break;
    }
    return false;
  };

  const categories = {
    FireAnimationFrame_All: (s) => s.name === 'FireAnimationFrame',
    FireAnimationFrame_GameTick: (s) => s.name === 'FireAnimationFrame' && (s.b - s.a) >= 1500,
    FireAnimationFrame_OtherCallbacks: (s) => s.name === 'FireAnimationFrame' && (s.b - s.a) < 1500,
    UpdateLayoutTree_Style: (s) => s.name === 'UpdateLayoutTree' || s.name === 'RecalculateStyles',
    Layout: (s) => s.name === 'Layout',
    PrePaint: (s) => s.name === 'PrePaint',
    Layerize: (s) => s.name === 'Layerize',
    Paint: (s) => s.name === 'Paint' || s.name === 'PaintImage' || s.name === 'SelectorStats',
    Composite_Commit: (s) => s.name === 'CompositeLayers' || s.name === 'Commit',
    Animation: (s) => s.name === 'Animation' || s.name === 'UpdateAnimations',
    GC: (s) => /GC|Scavenge|Mark|Sweep|Compact|Evacuat/i.test(s.name) && /gc|v8|devtools\.timeline|blink_gc/.test(s.cat || ''),
    FunctionCall_OutsideRaf: (s) => (s.name === 'FunctionCall' || s.name === 'EvaluateScript') && !isInsideRaf(s),
    TimerFire: (s) => s.name === 'TimerFire',
    RunMicrotasks_OutsideRaf: (s) => s.name === 'RunMicrotasks' && !isInsideRaf(s),
    HitTest: (s) => s.name === 'HitTest',
  };

  const r3 = (n) => Math.round(n * 1000) / 1000;
  const r2 = (n) => Math.round(n * 100) / 100;

  const mainBreakdown = {};
  for (const [key, fn] of Object.entries(categories)) {
    const matched = mainSpans.filter(fn);
    const totalUs = sumSpansUs(matched, winA, winB);
    const inRaf = matched.filter((s) => isInsideRaf(s));
    const outRaf = matched.filter((s) => !isInsideRaf(s));
    const inRafUs = sumSpansUs(inRaf, winA, winB);
    const outRafUs = sumSpansUs(outRaf, winA, winB);
    let maxMs = 0;
    for (const m of matched) {
      const d = (m.b - m.a) / 1000;
      if (d > maxMs) maxMs = d;
    }
    mainBreakdown[key] = {
      count: matched.length,
      perFrameCount: r2(matched.length / renderedFrames),
      totalMs: r2(totalUs / 1000),
      msPerFrame: r3(totalUs / 1000 / renderedFrames),
      inRafMsPerFrame: r3(inRafUs / 1000 / renderedFrames),
      outRafMsPerFrame: r3(outRafUs / 1000 / renderedFrames),
      maxMs: r2(maxMs)
    };
  }

  // Also measure total ProxyMain::BeginMainFrame (which encompasses rAF + Animate + Style + Layout + PrePaint + Layerize + Paint + Commit)
  const bmfTotalUs = sumSpansUs(beginMainFrameSpans, winA, winB);
  const rafTotalUs = sumSpansUs(allRafCallbacks, winA, winB);
  const gameTickRafUs = sumSpansUs(gameTickRafs, winA, winB);
  const bmfPostRafUs = Math.max(0, bmfTotalUs - rafTotalUs);

  // Total CrRendererMain busy time (union of BeginMainFrame + any mainSpans outside BeginMainFrame)
  const totalMainBusyUs = sumSpansUs([...beginMainFrameSpans, ...mainSpans], winA, winB);
  const mainOutsideRafBusyUs = Math.max(0, totalMainBusyUs - rafTotalUs);
  const mainWaitUs = Math.max(0, (winB - winA) - totalMainBusyUs);

  // Top event names on CrRendererMain outside FireAnimationFrame
  const outRafByName = new Map();
  for (const s of mainSpans) {
    if (s.name === 'FireAnimationFrame') continue;
    if (isInsideRaf(s)) continue;
    const prev = outRafByName.get(s.name) || [];
    prev.push(s);
    outRafByName.set(s.name, prev);
  }
  const topMainOutsideRaf = [...outRafByName.entries()]
    .map(([name, list]) => {
      const us = sumSpansUs(list, winA, winB);
      return { name, count: list.length, totalMs: r2(us / 1000), msPerFrame: r3(us / 1000 / renderedFrames) };
    })
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, 15);

  // Per-frame rAF-to-rAF intervals using frameTurns (one per rendered frame)
  const frameIntervals = [];
  for (let i = 0; i < frameTurns.length - 1; i++) {
    const cur = frameTurns[i];
    const next = frameTurns[i + 1];
    const frameStart = cur.a;
    const rafEnd = cur.b;
    const frameEnd = next.a;
    if (frameEnd <= frameStart) continue;
    const wallMs = (frameEnd - frameStart) / 1000;
    const rafMs = (rafEnd - frameStart) / 1000;
    const gameTickMs = (cur.gtB - cur.gtA) / 1000;
    const outsideMs = wallMs - gameTickMs;
    const postRafSpans = mainSpans.filter((s) => s.b > rafEnd && s.a < frameEnd && s.name !== 'FireAnimationFrame');
    const postRafBusyMs = sumSpansUs(postRafSpans, rafEnd, frameEnd) / 1000;
    const idleWaitMs = Math.max(0, (wallMs - rafMs) - postRafBusyMs);
    frameIntervals.push({ idx: i, wallMs, rafMs, gameTickMs, outsideMs, postRafBusyMs, idleWaitMs });
  }

  const summarizeIntervals = (list) => {
    if (!list.length) return { count: 0, wallMs: 0, gameTickMs: 0, rafMs: 0, outsideMs: 0, postRafBusyMs: 0, idleWaitMs: 0 };
    const avg = (fn) => list.reduce((s, x) => s + fn(x), 0) / list.length;
    return {
      count: list.length,
      wallMs: r2(avg((x) => x.wallMs)),
      gameTickMs: r2(avg((x) => x.gameTickMs)),
      rafMs: r2(avg((x) => x.rafMs)),
      outsideMs: r2(avg((x) => x.outsideMs)),
      postRafBusyMs: r3(avg((x) => x.postRafBusyMs)),
      idleWaitMs: r2(avg((x) => x.idleWaitMs))
    };
  };

  const normalFrames = frameIntervals.filter((f) => f.wallMs <= 20.0);
  const slowFrames20 = frameIntervals.filter((f) => f.wallMs > 20.0);
  const spikeFrames25 = frameIntervals.filter((f) => f.wallMs > 25.0);

  const summarizeThread = (threadKey, label) => {
    if (!threadKey) return { threadKey: null, label, present: false, busyMsPerFrame: 0, topEvents: [] };
    const spans = extractCompleteSpans(events, threadKey, winA, winB, (e) => !isWrapperContainer(e.name));
    const busyUs = sumSpansUs(spans, winA, winB);
    const byName = new Map();
    for (const s of spans) {
      const list = byName.get(s.name) || [];
      list.push(s);
      byName.set(s.name, list);
    }
    const topEvents = [...byName.entries()]
      .map(([name, list]) => {
        const us = sumSpansUs(list, winA, winB);
        return { name, count: list.length, totalMs: r2(us / 1000), msPerFrame: r3(us / 1000 / renderedFrames) };
      })
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, 12);
    return {
      threadKey,
      label,
      present: spans.length > 0,
      spanCount: spans.length,
      totalBusyMs: r2(busyUs / 1000),
      busyMsPerFrame: r3(busyUs / 1000 / renderedFrames),
      topEvents
    };
  };

  const compositorSummary = summarizeThread(compositorThread, 'Compositor (Renderer)');
  const vizSummary = summarizeThread(vizCompositorThread, 'VizCompositorThread');
  const gpuMainSummary = summarizeThread(gpuMainThread, 'CrGpuMain (GPU Process)');

  const renderPipelinePostRafMsPerFrame = r3(
    mainBreakdown.UpdateLayoutTree_Style.outRafMsPerFrame +
    mainBreakdown.Layout.outRafMsPerFrame +
    mainBreakdown.PrePaint.outRafMsPerFrame +
    mainBreakdown.Layerize.outRafMsPerFrame +
    mainBreakdown.Paint.outRafMsPerFrame +
    mainBreakdown.Composite_Commit.outRafMsPerFrame
  );

  const renderPipelineTotalMsPerFrame = r3(
    mainBreakdown.UpdateLayoutTree_Style.msPerFrame +
    mainBreakdown.Layout.msPerFrame +
    mainBreakdown.PrePaint.msPerFrame +
    mainBreakdown.Layerize.msPerFrame +
    mainBreakdown.Paint.msPerFrame +
    mainBreakdown.Composite_Commit.msPerFrame
  );

  return {
    totalTraceEvents: events.length,
    windowMs: r2(winMs),
    renderedFrames,
    allRafCallbacksCount: allRafCallbacks.length,
    gameTickRafCount: gameTickRafs.length,
    traceFrameMs: r2(traceFrameMs),
    traceFps: r2(1000 / traceFrameMs),
    threads: {
      mainThread,
      compositorThread,
      vizCompositorThread,
      gpuMainThread
    },
    mainThreadSummary: {
      frameMs: r2(traceFrameMs),
      beginMainFrameMsPerFrame: r2(bmfTotalUs / 1000 / renderedFrames),
      gameTickRafMsPerFrame: r2(gameTickRafUs / 1000 / renderedFrames),
      allRafMsPerFrame: r2(rafTotalUs / 1000 / renderedFrames),
      otherRafMsPerFrame: r3((rafTotalUs - gameTickRafUs) / 1000 / renderedFrames),
      bmfPostRafMsPerFrame: r3(bmfPostRafUs / 1000 / renderedFrames),
      outsideGameTickMsPerFrame: r2(traceFrameMs - (gameTickRafUs / 1000 / renderedFrames)),
      mainBusyMsPerFrame: r2(totalMainBusyUs / 1000 / renderedFrames),
      mainOutsideRafBusyMsPerFrame: r3(mainOutsideRafBusyUs / 1000 / renderedFrames),
      waitForFrameIdleMsPerFrame: r2(mainWaitUs / 1000 / renderedFrames),
      renderPipelinePostRafMsPerFrame,
      renderPipelineTotalMsPerFrame,
      breakdown: mainBreakdown,
      topMainOutsideRaf
    },
    frameIntervals: {
      all: summarizeIntervals(frameIntervals),
      normalVsync_le20ms: summarizeIntervals(normalFrames),
      missedVsync_gt20ms: summarizeIntervals(slowFrames20),
      spikes_gt25ms: summarizeIntervals(spikeFrames25),
      slowestFrames: frameIntervals.slice().sort((a, b) => b.wallMs - a.wallMs).slice(0, 10).map((f) => ({
        idx: f.idx,
        wallMs: r2(f.wallMs),
        gameTickMs: r2(f.gameTickMs),
        rafMs: r2(f.rafMs),
        outsideMs: r2(f.outsideMs),
        postRafBusyMs: r3(f.postRafBusyMs),
        idleWaitMs: r2(f.idleWaitMs)
      }))
    },
    compositorSummary,
    vizSummary,
    gpuMainSummary
  };
}
