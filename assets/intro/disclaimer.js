/* CL-191: the AI disclosure before the studio intro (Claude's). Jerry (2026-10-13): "We want to be 100% transparent
   about using AI from the rip."

   One video, assets/disclaimer/disclaimer.mp4: picture and sound baked together (the siren and the police lights,
   "Been Warned", the five voiced lines, the distant guy, GPT's dancing marine, the shot), so nothing here keeps time:
   the browser's media pipeline plays it, hardware-decoded and off the main thread, so the game loading behind it
   cannot make it stutter, drift or repeat. Its source (the scene, the mix, the timeline) is tools/disclaimer/; see
   the README there to rebuild it.

   This script only starts it, skips it, and hands over to the opening (opening.js waits on DWDisclaimer.done):
   - sound needs the browser's say-so; when play() is refused, "press any key" over black, and that key starts it
     (it is never taken as a skip). Play Dead-Wave.bat passes --autoplay-policy=no-user-gesture-required, so from the
     launcher it simply plays.
   - Esc, Enter, Space or the Skip button skip it (sound out over 0.2 s, picture out over 0.4 s).
   - nothing waits on requestAnimationFrame (a hidden window still finishes): 'ended', and a 1 s watchdog that gives
     up on a video that has not moved for 8 s.
   - a video that cannot load falls back to the one sentence that matters, as text, for a few seconds.
   - level: the player's SFX volume (tt_vol_sfx), like the caracal intro.
   ?disclaimer=0 on the URL skips it; DWDisclaimer.preview() plays it again over the menu.

   CL-225, Jerry (2026-10-20): "Could you disable the AI disclaimer in the beginning for now? I am going back and forth
   on whether I want to include it or not." So it is off at the start until he decides (ENABLED below). Everything
   else is kept: ENABLED = true brings it back as it was, ?disclaimer=1 on the URL plays it once anyway, and
   DWDisclaimer.preview() still plays it over the menu. */
(() => {
  const root = document.getElementById('disclaimer');
  if (!root) return;
  const video = root.querySelector('video');
  const prompt = root.querySelector('.dsc-prompt'), skipBtn = document.getElementById('disclaimerSkip'), fallback = root.querySelector('.dsc-fallback');
  let level = 0.8;
  try { const s = localStorage.getItem('tt_vol_sfx'); if (s !== null) level = Math.max(0, Math.min(1, +s || 0)); } catch (_) {}
  const ENABLED = false;   // CL-225: off at the start while Jerry decides; true plays it before the studio intro again
  let off = !video || !ENABLED;
  try {
    const q = new URLSearchParams(location.search), v = q.get('disclaimer');
    if ((v === '1' || v === 'on') && video) off = false;   // CL-225: see it while it is switched off
    if (v === '0' || v === 'off' || q.has('inspect')) off = true;   // CL-196: not in the inspector
  } catch (_) {}

  let state = 'idle', preview = false, lastT = -1, stillFor = 0, watchdog = 0, fadeIv = 0, endTimer = 0;
  let resolveDone; const done = new Promise((r) => { resolveDone = r; });
  const setState = (s) => { state = s; root.dataset.state = s; };
  const emit = (name, detail) => { try { window.dispatchEvent(new CustomEvent('dw-disclaimer-' + name, { detail })); } catch (_) {} };
  const playing = () => state === 'playing';

  function start() {
    if (state !== 'idle' && state !== 'armed') return;
    video.muted = false; video.volume = level;
    const p = video.play();
    if (p && p.then) p.then(onPlaying, (e) => {
      if (e && e.name === 'NotAllowedError') { setState('armed'); prompt.hidden = false; }
      else fail(e);
    });
    else onPlaying();
  }
  function onPlaying() {
    if (state === 'playing') return;
    setState('playing'); prompt.hidden = true; skipBtn.hidden = false;
    emit('start');
    clearInterval(watchdog); lastT = -1; stillFor = 0;
    watchdog = setInterval(() => {
      if (!playing()) return;
      if (video.currentTime === lastT && !video.paused) { if (++stillFor >= 8) { console.warn('[disclaimer] stalled; moving on'); finish(true); } }
      else { stillFor = 0; lastT = video.currentTime; }
    }, 1000);
  }
  function fail(e) {
    console.warn('[disclaimer] no video:', e && (e.message || e.name || e));
    if (state === 'done' || state === 'leaving' || state === 'fallback') return;
    // The sentence still gets said.
    setState('fallback'); prompt.hidden = true; skipBtn.hidden = false;
    if (fallback) fallback.hidden = false;
    clearTimeout(endTimer); endTimer = setTimeout(() => finish(false), 4500);
  }
  function finish(skipped, instant) {
    if (state === 'leaving' || state === 'done') return;
    const was = state;
    setState('leaving'); clearInterval(watchdog); clearTimeout(endTimer);
    skipBtn.hidden = true; prompt.hidden = true;
    const wasPreview = preview;
    if (!wasPreview) resolveDone();   // the caracal starts under the fade
    const close = () => {
      clearInterval(fadeIv);
      try { video.pause(); } catch (_) {}
      root.hidden = true; root.classList.remove('leaving'); if (fallback) fallback.hidden = true;
      setState('done'); preview = false;
      if (!wasPreview) { video.removeAttribute('src'); try { video.load(); } catch (_) {} }   // let the 15 MB go
      emit('end', { skipped: !!skipped });
    };
    if (instant || was !== 'playing') { if (!instant) root.classList.add('leaving'); setTimeout(close, instant ? 0 : 420); return; }
    // Sound out over 0.2 s (an interval, not rAF: a hidden window still gets there), picture over 0.4 s.
    const v0 = video.volume, t0 = performance.now();
    clearInterval(fadeIv);
    fadeIv = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / 200); try { video.volume = v0 * (1 - k); } catch (_) {} if (k >= 1) clearInterval(fadeIv); }, 16);
    if (skipped) root.classList.add('leaving');
    setTimeout(close, skipped ? 420 : 0);
  }
  function skip() { if (state === 'playing' || state === 'fallback') finish(true); }

  video && video.addEventListener('ended', () => finish(false));
  video && video.addEventListener('error', () => fail(video.error));
  video && video.addEventListener('playing', () => { if (state === 'armed' || state === 'idle') onPlaying(); });

  // The key or click that starts it after a refusal (never a skip).
  const gesture = (e) => {
    if (state !== 'armed') return;
    if (e.type === 'keydown') { e.preventDefault(); e.stopImmediatePropagation(); }
    start();
  };
  document.addEventListener('pointerdown', gesture, true);
  document.addEventListener('keydown', gesture, true);
  // Skip keys, in capture ahead of the opening's own key guard (this script loads first).
  document.addEventListener('keydown', (e) => {
    if (state !== 'playing' && state !== 'fallback') return;
    if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); skip(); }
  }, true);
  skipBtn.addEventListener('click', (e) => { e.stopPropagation(); skip(); });

  window.DWDisclaimer = {
    done, video,
    get active() { return state !== 'done' && state !== 'leaving'; },
    get state() { return state; },
    skip,
    // Harness entry (DWOpening.dismissForTesting): over at once, silently.
    dismiss() { if (state === 'done') return; finish(true, true); },
    // Play it again over whatever is on screen: DWDisclaimer.preview()
    preview() {
      if (state !== 'done') return false;
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      preview = true; root.hidden = false; setState('idle');
      try { video.currentTime = 0; } catch (_) {}
      start(); return true;
    }
  };
  if (video) video.dataset.src = video.getAttribute('src') || '';

  if (off) { root.hidden = true; setState('done'); resolveDone(); if (video) { video.removeAttribute('src'); try { video.load(); } catch (_) {} } return; }
  start();
})();
