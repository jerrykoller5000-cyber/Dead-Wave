/* CL-192: what the opening costs, measured on the machine that plays it (Claude's). Jerry (2026-10-14): "the sequence
   from the disclaimer to the menu seems to hitch, drag and is not smooth."

   From the first script to six seconds after the menu is up, this keeps:
   - the segments the player sees (boot, disclaimer, caracal, title, loading, menu) and when each began;
   - per segment: frames, the slow ones (over 33/50/100 ms) and the worst, from requestAnimationFrame (main thread);
   - the two videos' decoded and dropped frames per segment (getVideoPlaybackQuality: the compositor's own count of
     frames it showed late or not at all, the closest thing to "a visible hitch" a page can read), and each drop with
     its time and the last mark before it, so a drop can be laid against what the load was doing;
   - long animation frames (over 50 ms) with the script that held them, and the game's load steps (dw-load events);
   - marks from the game and the opening (DWPerf.mark(name)): the GPU gate, the warm-up stages, the menu camera.
   Then it posts the lot to the dev server (tools/serve.py writes qa/perf/opening-<time>.json) and logs a summary line.
   Cheap (a rAF counter, a 250 ms sampler, two observers) and over a minute after the menu; nothing in the packaged game
   listens for the post, so there it just ends. DWPerf.report() returns the record at any time. */
(() => {
  if (window.DWPerf) return;
  const now = () => performance.now();
  const R = {
    v: 1, at: new Date().toISOString(), url: location.pathname + location.search,
    ua: navigator.userAgent, cores: navigator.hardwareConcurrency || null, mem: navigator.deviceMemory || null,
    screen: [screen.width, screen.height, devicePixelRatio], marks: [], segments: [], load: [], loaf: [], gaps: [], drops: [],
    stats: {}, videos: {}, summary: null
  };
  let seg = 'boot', segAt = 0, finished = false, menuAt = 0;
  const mark = (name, extra) => { R.marks.push(extra === undefined ? [Math.round(now()), name] : [Math.round(now()), name, extra]); };
  const S = (k) => R.stats[k] || (R.stats[k] = { ms: 0, frames: 0, over33: 0, over50: 0, over100: 0, worst: 0 });
  function setSeg(next) {
    if (next === seg || finished) return;
    const t = now(); S(seg).ms += t - segAt;
    seg = next; segAt = t; R.segments.push([Math.round(t), next]);
    if (next === 'menu') { menuAt = t; setTimeout(finish, 6000); }
  }
  R.segments.push([0, 'boot']);

  // frames (main thread)
  let last = 0;
  function frame(t) {
    if (finished) return;
    if (last && document.visibilityState === 'visible') {
      const dt = t - last, s = S(seg);
      s.frames++; if (dt > 33) s.over33++; if (dt > 50) s.over50++; if (dt > 100) s.over100++; if (dt > s.worst) s.worst = Math.round(dt);
      if (dt > 50 && R.gaps.length < 300) R.gaps.push([Math.round(t - dt), Math.round(dt), seg]);
    }
    last = t; requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // what the page shows: the disclaimer's state and the opening's phase
  function look() {
    const d = document.getElementById('disclaimer'), o = document.getElementById('opening');
    const ds = d && !d.hidden ? d.dataset.state : 'done', op = o ? o.dataset.phase : 'menu';
    if (ds === 'playing' || ds === 'armed' || ds === 'fallback') setSeg('disclaimer');
    else if (ds === 'idle') setSeg('boot');
    else if (op === 'video') setSeg('caracal');
    else if (op === 'intro') setSeg('title');
    else if (op === 'loading' || op === 'error') setSeg('loading');
    else if (op === 'menu') setSeg('menu');
  }
  const mo = new MutationObserver(look);
  const watch = () => {
    for (const id of ['disclaimer', 'opening']) { const e = document.getElementById(id); if (e) mo.observe(e, { attributes: true, attributeFilter: ['data-state', 'data-phase', 'hidden'] }); }
    look();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch, { once: true }); else watch();

  // the videos: decoded/dropped per segment
  const vq = {};
  setInterval(() => {
    if (finished) return;
    for (const [key, id] of [['disclaimer', 'disclaimerVideo'], ['caracal', 'openingVideo']]) {
      const v = document.getElementById(id); if (!v || !v.getVideoPlaybackQuality) continue;
      const q = v.getVideoPlaybackQuality(), p = vq[key] || { total: 0, dropped: 0 };
      if (q.totalVideoFrames < p.total) { vq[key] = { total: q.totalVideoFrames, dropped: q.droppedVideoFrames }; continue; }   // the src was let go
      const dt = q.totalVideoFrames - p.total, dd = q.droppedVideoFrames - p.dropped;
      if (dt || dd) { const r = R.videos[key + '@' + seg] || (R.videos[key + '@' + seg] = { frames: 0, dropped: 0 }); r.frames += dt; r.dropped += dd; }
      if (dd > 0 && R.drops.length < 400) R.drops.push([Math.round(now()), key, seg, dd, R.marks.length ? R.marks[R.marks.length - 1][1] : '']);   // when, and the last mark before it
      vq[key] = { total: q.totalVideoFrames, dropped: q.droppedVideoFrames };
    }
  }, 250);

  // long animation frames, with the script that held them (Chromium 123+), else long tasks
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (R.loaf.length >= 400 || finished) continue;
        const top = (e.scripts || []).slice().sort((a, b) => b.duration - a.duration)[0];
        R.loaf.push([Math.round(e.startTime), Math.round(e.duration), Math.round(e.blockingDuration || 0), seg,
          top ? `${(top.sourceFunctionName || top.invoker || '?').slice(0, 60)} @ ${String(top.sourceURL || '').split('/').pop().slice(0, 40)}:${top.sourceCharPosition ?? ''} ${Math.round(top.duration)}ms` : '']);
      }
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch (_) {
    try { new PerformanceObserver((list) => { for (const e of list.getEntries()) if (R.loaf.length < 400) R.loaf.push([Math.round(e.startTime), Math.round(e.duration), 0, seg, 'longtask']); }).observe({ type: 'longtask', buffered: true }); } catch (_) {}
  }
  // the game's load steps
  window.addEventListener('dw-load', (e) => { const d = e.detail || {}; if (d.substageId && (d.state === 'begin' || d.state === 'end')) R.load.push([Math.round(d.at || now()), d.substageId, d.state]); });
  window.addEventListener('dw-opening-complete', () => mark('opening-complete'));

  function summarize() {
    const seconds = (a, b) => +((b - a) / 1000).toFixed(2);
    const first = (name) => { const m = R.marks.find((x) => x[1] === name); return m ? m[0] : null; };
    const at = (s) => { const x = R.segments.find((y) => y[1] === s); return x ? x[0] : null; };
    const out = { toMenu: menuAt ? seconds(0, menuAt) : null, segments: {}, videos: R.videos, loafOver100: R.loaf.filter((l) => l[1] > 100).length };
    const order = R.segments.map((x) => x[1]);
    for (let i = 0; i < R.segments.length; i++) {
      const [t, s] = R.segments[i], t1 = i + 1 < R.segments.length ? R.segments[i + 1][0] : now();
      const st = R.stats[s] || {};
      out.segments[s] = { at: seconds(0, t), seconds: seconds(t, t1), frames: st.frames || 0, over50: st.over50 || 0, over100: st.over100 || 0, worst: st.worst || 0 };
    }
    out.gpuGateWait = first('gpu-gate-open') && first('gpu-gate-wait') ? seconds(first('gpu-gate-wait'), first('gpu-gate-open')) : null;
    out.order = order.join(' > ');
    const live = R.marks.find((x) => x[1] === 'warm-live-end'); out.liveRollTicks = live ? live[2] : null;
    const rend = R.marks.find((x) => x[1] === 'renderer'); out.renderer = rend ? rend[2] : null;
    void at;
    return out;
  }
  function finish() {
    if (finished) return;
    S(seg).ms += now() - segAt; R.summary = summarize(); finished = true;
    try { console.info('Grave Shift opening perf: ' + JSON.stringify(R.summary)); } catch (_) {}
    if (/^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname)) {
      try { fetch('/__perflog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(R), keepalive: false }).catch(() => {}); } catch (_) {}
    }
  }
  setTimeout(() => { if (!finished) { mark('timeout'); finish(); } }, 180000);
  window.DWPerf = { mark, report: () => R, get segment() { return seg; }, finish };
})();
