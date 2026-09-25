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
  function setPhase(next) { phase = next; root.dataset.phase = next; }
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
    document.getElementById('hud').inert = false;
    root.classList.add('leaving');
    if (audio) audio.close().catch(() => {});
    window.dispatchEvent(new Event('dw-opening-complete'));
    setTimeout(() => { root.hidden = true; document.getElementById('playerName').focus({preventScroll:true}); }, 650);
  }
  function loading() {
    clearTimeout(introTimer); setPhase(failed ? 'error' : 'loading');
    play.hidden = true; video.pause();
    // A brief dissolve, not a fabricated multi-second loading delay on fast machines.
    if (ready) setTimeout(finish, 350);
  }
  function intro() {
    if (phase !== 'video') return;
    video.pause(); play.hidden = true; setPhase('intro'); sting();
    introTimer = setTimeout(loading, matchMedia('(prefers-reduced-motion: reduce)').matches ? 1000 : 3200);
  }
  retry.onclick = () => location.reload();
  sound.onclick = () => {
    soundEnabled = !soundEnabled; video.muted = !soundEnabled;
    sound.textContent = soundEnabled ? 'Sound on' : 'Sound off'; sound.setAttribute('aria-pressed', String(soundEnabled));
    if (audioGain) audioGain.gain.value = soundEnabled ? level * .16 : 0;
    if (phase === 'video') video.play().catch(() => { play.hidden = false; });
    if (phase === 'intro' && soundEnabled && !audio) sting();
  };
  play.onclick = () => { lastMediaAdvance = performance.now(); video.play().then(() => { play.hidden = true; }).catch(intro); };
  video.addEventListener('ended', intro);
  video.addEventListener('error', intro);
  video.addEventListener('timeupdate', () => { if (video.currentTime !== lastMediaTime) { lastMediaTime = video.currentTime; lastMediaAdvance = performance.now(); } });
  document.addEventListener('keydown', e => {
    if (phase === 'menu') return;
    // The opening plays through; don't let pause/jump leak into the game behind it.
    if (e.code === 'Escape' || e.code === 'Space' && e.target.tagName !== 'BUTTON') { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  const watchdog = setInterval(() => {
    if (phase === 'video' && play.hidden && performance.now() - lastMediaAdvance > 15000) intro();
  }, 1000);
  const slowTimer = setTimeout(() => {
    if (!ready && !failed) { status.textContent = 'Still loading'; retry.hidden = false; }
  }, 90000);
  window.DWOpening = {
    get active() { return phase !== 'menu'; },
    get soundEnabled() { return soundEnabled; },
    // Harness-only entry point: no player control calls this. Still honors load/error state.
    dismissForTesting() { if (phase !== 'menu') loading(); },
    progress(value, label) {
      if (failed || ready) return;
      progress.style.width = Math.max(0, Math.min(100,value)) + '%';
      percent.textContent = Math.round(value) + '%'; status.textContent = label;
    },
    ready() {
      if (ready || failed) return;
      this.progress(100, 'Ready'); ready = true; clearTimeout(slowTimer);
      if (phase === 'loading') setTimeout(finish, 350);
    },
    fail() {
      if (ready || failed) return;
      failed = true; clearTimeout(slowTimer); status.textContent = 'Unable to load'; percent.textContent = '';
      retry.hidden = false;
      if (phase === 'loading') setPhase('error');
    }
  };
  window.addEventListener('error', e => { if (e.error || e.target?.type === 'module') window.DWOpening.fail(); }, true);
  window.addEventListener('unhandledrejection', () => window.DWOpening.fail());
  document.getElementById('hud').inert = true;
  // Never silently fall back to a muted studio intro. Browsers may require a gesture.
  video.play().catch(() => { play.hidden = false; play.focus(); });
})();
