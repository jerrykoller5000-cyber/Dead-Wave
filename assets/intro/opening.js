/* Runs before the game module so video and loading UI survive slow imports. */
(() => {
  const root = document.getElementById('opening');
  const video = document.getElementById('openingVideo');
  const sound = document.getElementById('openingSound');
  const play = document.getElementById('openingPlay');
  const retry = document.getElementById('openingRetry');
  const status = document.getElementById('openingStatus');
  const progress = document.getElementById('openingProgress');
  const percent = document.getElementById('openingPercent');
  let phase = 'video', ready = false, failed = false, introTimer, audio, audioGain;
  let soundEnabled = true, lastMediaTime = 0, lastMediaAdvance = performance.now();
  let level = .8;
  try { const saved = localStorage.getItem('tt_vol_sfx'); if (saved !== null) level = Math.max(0, Math.min(1, +saved || 0)); } catch (_) {}
  video.volume = 1;
  video.muted = false;
  function setPhase(next) {
    phase = next; root.dataset.phase = next; window.DWPerf?.mark('phase-' + next);
    if (next !== 'video') openGate('compile');                // the title card: async compiles only
    if (next !== 'video' && next !== 'intro') openGate('warm');  // the loading screen (static): the warm frames and fights
  }
  // CL-191: the game holds its GPU-heavy load until the disclaimer and the caracal have played, because while shaders
  // compile the GPU cannot put video frames on screen and both stuttered. The world build (CPU) still runs underneath.
  // CL-192: two gates. 'compile' (post-processing set-up and the async shader compile, which should not block the
  // compositor) opens when the caracal ends, under the title card; 'warm' (the synchronous warm frames and the staged
  // fights, which do) opens with the loading screen after it, where a held frame shows nothing. ?gpugate= moves 'compile': 'caracal' opens 'compile' when the caracal starts, 'now'
  // at once (measuring which one the videos tolerate: assets/intro/opening-perf.js). Either opens for a hidden window
  // (nothing to watch) and after 60 s whatever happens, so neither can hold a load for good.
  const gates = { compile: { open: false, waiters: [] }, warm: { open: false, waiters: [] } };
  // The waiters run a moment after the gate opens, so the phase that opened it (the title card) has painted and its
  // animations are on the compositor before the game takes the main thread (measured: a 2.7 s block landed in the
  // same task as the phase change, and the title never got its first frame).
  function openGate(name) {
    const g = gates[name]; if (!g || g.open) return;
    g.open = true; window.DWPerf?.mark('gate-' + name);
    setTimeout(() => { for (const r of g.waiters.splice(0)) r(); }, 120);
  }
  let gateMode = 'late', inspect = false;
  // A test page has nobody watching the videos: the suite and the tools (?raf=timer, or any browser under automation).
  // Most of them wait for the game (window.TT) before they skip the opening, and the game's loop starts only once both
  // gates are open, so on a test page they open at once; otherwise every page sat out the 60 s fallback below (the stalled
  // full runs in GP-19907). ?gpugate= still wins, for measuring the opening under automation.
  try {
    const q = new URLSearchParams(location.search), m = q.get('gpugate');
    if (['late', 'caracal', 'now', 'all'].includes(m)) gateMode = m;
    else if (q.get('raf') === 'timer' || navigator.webdriver === true) gateMode = 'all';
    // CL-196: the inspector (index.html?inspect) has no intro: the loading screen at once, gates open.
    if (q.has('inspect')) { inspect = true; gateMode = 'all'; }
  } catch (_) {}
  window.DWPerf?.mark('gate-mode', gateMode);
  if (gateMode === 'now' || gateMode === 'all') openGate('compile');
  if (gateMode === 'all') openGate('warm');
  setTimeout(() => { openGate('compile'); openGate('warm'); }, 60000);
  const hiddenOpens = () => { if (document.visibilityState === 'hidden') { openGate('compile'); openGate('warm'); } };
  document.addEventListener('visibilitychange', hiddenOpens); hiddenOpens();
  function sting() {
    if (!soundEnabled || !level || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(() => {});
      const t = audio.currentTime;
      audioGain = audio.createGain(); audioGain.gain.value = level * .16; audioGain.connect(audio.destination);
      // A short original low-frequency swell with a metallic tail, no borrowed audio.
      for (const [hz, amplitude] of [[48,.6],[73,.25],[293,.035],[439,.025]]) {
        const osc = audio.createOscillator(), gain = audio.createGain();
        osc.frequency.setValueAtTime(hz * 1.3,t); osc.frequency.exponentialRampToValueAtTime(hz,t+1.8);
        gain.gain.setValueAtTime(.0001,t); gain.gain.exponentialRampToValueAtTime(amplitude,t+.35); gain.gain.exponentialRampToValueAtTime(.0001,t+2.8);
        osc.connect(gain); gain.connect(audioGain); osc.start(t); osc.stop(t+3);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      }
    } catch (_) {}
  }
  function finish() {
    if (!ready || failed || phase !== 'loading') return;
    setPhase('menu'); clearTimeout(introTimer); clearInterval(watchdog);
    document.body.classList.remove('opening');
    const hud = document.getElementById('hud');
    if (hud) hud.inert = false;
    root.classList.add('leaving');
    if (audio) audio.close().catch(() => {});
    window.dispatchEvent(new Event('dw-opening-complete'));
    setTimeout(() => { root.hidden = true; document.getElementById('playerName')?.focus({preventScroll:true}); }, 650);
  }
  function loading() {
    clearTimeout(introTimer); setPhase(failed ? 'error' : 'loading');
    if (play) play.hidden = true;
    video.pause();
    // A brief dissolve, not a fabricated multi-second loading delay on fast machines.
    if (ready) setTimeout(finish, 350);
  }
  function intro() {
    if (phase !== 'video') return;
    // CL-190: a video that fails (or ends) while the disclosure is still up waits for it; the title comes after.
    if (window.DWDisclaimer?.active) { window.DWDisclaimer.done.then(intro); return; }
    video.pause(); if (play) play.hidden = true; setPhase('intro'); sting();
    introTimer = setTimeout(loading, matchMedia('(prefers-reduced-motion: reduce)').matches ? 1000 : 3200);
  }
  // Optional presentation controls must never prevent media events from being wired.
  if (retry) retry.onclick = () => location.reload();
  if (sound) sound.onclick = () => {
    soundEnabled = !soundEnabled; video.muted = !soundEnabled;
    sound.textContent = soundEnabled ? 'Sound on' : 'Sound off'; sound.setAttribute('aria-pressed', String(soundEnabled));
    if (audioGain) audioGain.gain.value = soundEnabled ? level * .16 : 0;
    if (phase === 'video') video.play().catch(() => { if (play) play.hidden = false; });
    if (phase === 'intro' && soundEnabled && !audio) sting();
  };
  if (play) play.onclick = () => { lastMediaAdvance = performance.now(); video.play().then(() => { play.hidden = true; }).catch(intro); };
  video.addEventListener('ended', intro);
  video.addEventListener('error', intro);
  video.addEventListener('timeupdate', () => { if (video.currentTime !== lastMediaTime) { lastMediaTime = video.currentTime; lastMediaAdvance = performance.now(); } });
  document.addEventListener('keydown', e => {
    if (phase === 'menu') return;
    // The opening plays through; don't let pause/jump leak into the game behind it.
    if (e.code === 'Escape' || e.code === 'Space' && e.target.tagName !== 'BUTTON') { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  const watchdog = setInterval(() => {
    if (window.DWDisclaimer?.active) { lastMediaAdvance = performance.now(); return; }   // CL-190: the disclosure runs first
    if (phase === 'video' && (!play || play.hidden) && performance.now() - lastMediaAdvance > 15000) intro();
  }, 1000);
  const slowTimer = setTimeout(() => {
    if (!ready && !failed) { if (status) status.textContent = 'Still loading'; if (retry) retry.hidden = false; }
  }, 90000);
  let warmDriven = false;
  function setBar(value, label) {
    const v = Math.max(0, Math.min(100, value));
    if (progress) progress.style.transform = 'scaleX(' + (v / 100).toFixed(4) + ')';
    if (percent) percent.textContent = Math.round(v) + '%';
    if (status && label) status.textContent = label;
  }
  window.DWOpening = {
    get active() { return phase !== 'menu'; },
    get soundEnabled() { return soundEnabled; },
    // CL-191/CL-192: resolve when the game may start that part of its GPU work (see openGate). gpuGate() is 'compile'.
    gpuGate(name = 'compile') { const g = gates[name] || gates.compile; return g.open ? Promise.resolve() : new Promise((r) => g.waiters.push(r)); },
    // Harness-only entry point: no player control calls this. Still honors load/error state.
    dismissForTesting() { window.DWDisclaimer?.dismiss?.(); if (phase !== 'menu') loading(); },
    progress(value, label) {
      if (failed || ready || warmDriven) return;
      setBar(value, label);
    },
    // CL-195: once the game's GPU warm-up starts reporting (index.html warmProgress), the bar is the warm-up's alone. The
    // load channel's own steps (core/loader.js) had it at 96% for the whole loading screen, and at 100% 'Ready' after the
    // first-minute set, with the staged and live fights still to come.
    warmProgress(value, label) {
      if (failed || ready) return;
      warmDriven = true; setBar(value, label);
    },
    ready() {
      if (ready || failed) return;
      window.DWPerf?.mark('opening-ready');
      setBar(100, 'Ready'); ready = true; clearTimeout(slowTimer);
      if (phase === 'loading') setTimeout(finish, 350);
    },
    fail() {
      if (ready || failed) return;
      failed = true; clearTimeout(slowTimer);
      if (status) status.textContent = 'Unable to load';
      if (percent) percent.textContent = '';
      if (retry) retry.hidden = false;
      if (phase === 'loading') setPhase('error');
    }
  };
  window.addEventListener('error', e => { if (e.error || e.target?.type === 'module') window.DWOpening.fail(); }, true);
  window.addEventListener('unhandledrejection', () => window.DWOpening.fail());
  const hud = document.getElementById('hud');
  if (hud) hud.inert = true;
  // Never silently fall back to a muted studio intro. Browsers may require a gesture.
  // CL-190: the AI disclosure (assets/intro/disclaimer.js) plays first; the video (no autoplay attribute now) starts
  // under its fade-out, buffered meanwhile by preload.
  const startVideo = () => {
    if (phase !== 'video') return;
    if (gateMode === 'caracal') openGate('compile');
    lastMediaAdvance = performance.now();
    video.play().catch(() => { if (play && phase === 'video') { play.hidden = false; play.focus(); } });
  };
  if (inspect) { root.classList.add('inspect'); if (status) status.textContent = 'Loading the inspector'; loading(); }
  else if (window.DWDisclaimer?.done) window.DWDisclaimer.done.then(startVideo); else startVideo();
})();
