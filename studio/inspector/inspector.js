// studio/inspector/inspector.js — the Dead-Wave inspector (CL-196). Claude's (studio/*).
//
// Jerry (2026-10-14): "I am going to be using this for all visual inspections of models and animations from here on
// out. I want the agents to be able to use it as well ... future proof this thing, make it robust, easy to use and
// implement changes going forward ... a prop inspector, be able to easily see other models like rabbits, weapons,
// survivors, you name it." He chose the real game's code over copies of it.
//
// So this is the game. index.html?inspect boots it without the intro or the warm-up, walks the marine into the Training
// Ground, hides the room behind a studio backdrop and hands the camera, the clock and the input to the inspector. Every
// model is built by the game's own builder and every animation is the game running: what you see here is what the
// game draws. The parts:
//
//   catalog.js   every subject (add one there; the check builds them all)       subjects.js  a subject on the stage
//   stage.js     backdrop, floor, light presets, overlays                        orbit.js     the camera
//   timeline.js  the clock (pause, slow, step) and the rewind                    marine.js    his kit and moves
//   ui.js        the panels                                                      api.js       window.DWInspect (agents)
//   notes go to review/inspect-<subject>/notes.md through the game's server (studio/notes-endpoint.mjs)
//
// The game's side is small: the inspectHost() block in index.html (the builders and a few hooks), the clock's two
// questions and the last-word frame call in tick(). README.md in this folder says how to use and extend it.
import { makeCatalog, GROUPS, rnd } from './catalog.js';
import { createStage } from './stage.js';
import { createOrbit, MARINE_KEYS, MODEL_KEYS } from './orbit.js';
import { createClock, createRecorder } from './timeline.js';
import { marineSubject, zombieSubject, modelSubject } from './subjects.js';
import { createMarineDesk } from './marine.js';
import { createUI } from './ui.js';
import { createApi } from './api.js';
import { createWaitQueue, abortError, boundedNumber } from './async.js';

export const VERSION = '1.1.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(f, ms = 60000, every = 50) { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (_) {} await sleep(every); } return false; }

// External page screenshots can retain a previous WebGPU compositor surface behind the inspector's panels.
// A held review publishes a bounded 2D copy of the real rendered frame; resuming always removes that copy.
export function createHeldPresentation(host, doc = document) {
  let held = null;
  function release(canvas) { if (!canvas) return; canvas.remove(); canvas.width = 0; canvas.height = 0; }
  function clearPresentation() { const old = held; held = null; release(old); }
  function presentFrame() {
    clearPresentation();
    const src = host.renderer?.domElement, rect = src?.getBoundingClientRect();
    if (!src || !Number.isInteger(src.width) || !Number.isInteger(src.height) || src.width < 1 || src.height < 1 || src.width * src.height > 32 * 1024 * 1024)
      throw new Error('Held picture requires a canvas from 1 to 32 million pixels; reduce the window size');
    if (!rect || ![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0)
      throw new Error('Held picture needs a visible renderer canvas with finite dimensions');
    const canvas = doc.createElement('canvas');
    try {
      canvas.width = src.width; canvas.height = src.height;
      const g = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
      if (!g) throw new Error('Held picture canvas is unavailable');
      g.fillStyle = '#000'; g.fillRect(0, 0, canvas.width, canvas.height); g.drawImage(src, 0, 0);
      // Read a pixel to complete the actual source-buffer copy before exposing the frame to a page screenshot.
      g.getImageData(0, 0, 1, 1);
      canvas.setAttribute('data-dwi-held-frame', 'true'); canvas.setAttribute('aria-hidden', 'true');
      Object.assign(canvas.style, { position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', pointerEvents: 'none', zIndex: '1' });
      doc.body.append(canvas); held = canvas; return canvas;
    } catch (e) { release(canvas); throw e; }
  }
  return { presentFrame, clearPresentation };
}

// Only a failed boot owns this marker. A healthy live inspector is never removed on retry.
export function clearFailedBootState(doc = document, page = window) {
  if (page.DWInspect?.ready) return false;
  const failed = doc.getElementById('dwi');
  if (failed?.getAttribute?.('data-dwi-startup-error') === 'true') failed.remove();
  delete page.DWInspectError;
  return true;
}

let booting = null;
let active = null;
export function boot(host, opts = {}) {
  if (window.DWInspect && window.DWInspect.ready) return Promise.resolve(window.DWInspect);
  if (booting) return booting;
  booting = start(host, opts).catch((e) => {
    try { active?.cleanup?.(); } catch (cleanupError) { console.warn('[inspector] startup cleanup', cleanupError); }
    window.DWInspectError = String(e?.stack || e);
    let root = document.getElementById('dwi');
    if (!root) { root = document.createElement('div'); root.id = 'dwi'; root.className = 'dwi'; document.body.append(root); }
    root.setAttribute('data-dwi-startup-error', 'true');
    const panel = document.createElement('div'); panel.className = 'dwi-help'; panel.setAttribute('role', 'alert');
    const card = document.createElement('div'); card.className = 'dwi-help-card';
    const title = document.createElement('h2'); title.textContent = 'Inspector could not start';
    const message = document.createElement('p'); message.textContent = String(e?.message || e);
    const tip = document.createElement('p'); tip.textContent = 'Launch Open Marine Inspector.bat again, or reload after correcting the error. Details are also in window.DWInspectError.';
    const reload = document.createElement('button'); reload.className = 'dwi-btn'; reload.textContent = 'Reload inspector'; reload.onclick = () => location.reload();
    card.append(title, message, tip, reload); panel.append(card); root.append(panel); throw e;
  }).finally(() => { booting = null; });
  return booting;
}
async function start(host, opts) {
  if (!host || host.version !== 1 || !host.THREE || !host.scene || !host.builders || !host.data ||
      !['attach', 'training', 'enterTraining', 'placePlayer', 'render', 'loop'].every((k) => typeof host[k] === 'function'))
    throw new Error('Inspector needs game host version 1 with its builders and lifecycle hooks; reload the game');
  clearFailedBootState();
  const say = (t) => { const s = document.getElementById('openingStatus'); if (s) s.textContent = t; };
  document.body.classList.add('inspect');
  if (!document.getElementById('dwiCss')) document.head.append(Object.assign(document.createElement('link'), { id: 'dwiCss', rel: 'stylesheet', href: new URL('./inspector.css?v=' + VERSION, import.meta.url).href }));
  // the game's debug hooks are stamped on its first full frame; the opening goes when the game says ready
  if (!(await until(() => window.TT, 120000))) throw new Error('the game never stamped window.TT');
  if (!(await until(() => !window.DWOpening || window.DWOpening.active === false, 120000))) throw new Error('the opening did not release the inspector');
  const T = window.TT, THREE = host.THREE;
  const ix = { host, T, THREE, version: VERSION, GROUPS, subject: null, entry: null, variant: null, mode: null, drive: false, errors: [] };
  active = ix;
  ix.ctx = { host, T, THREE, B: host.builders, D: host.data, doc: document, rnd };
  Object.assign(ix, createHeldPresentation(host));

  // game-time waits: resolved by the frame as the inspector's clock runs (so a held key is held for as long in slow motion)
  const waiters = createWaitQueue(), frameWaiters = createWaitQueue();
  ix.recordError = (id, e, phase = 'runtime') => {
    if (e?.name === 'AbortError') return;
    ix.errors.push({ id, phase, at: new Date().toISOString(), error: String(e?.message || e) });
    if (ix.errors.length > 100) ix.errors.shift();
  };
  ix.waitGame = (sec, signal) => waiters.wait({ at: ix.clock.gameTime + boundedNumber(sec, 'wait seconds', 0, 600), signal });
  ix.ensureLoop = () => { ix.clearPresentation(); if (ix._still) { ix._still = false; host.loop(true); } };
  ix.nextFrame = (signal) => { ix.ensureLoop(); return frameWaiters.wait({ signal, timeout: 15000 }); };
  ix.assertAvailable = (token) => { if (ix.busy && ix.busy.token !== token) throw new Error('Inspector busy: ' + ix.busy.label + ' (cancel it before changing the stage)'); };
  ix.cleanup = () => {
    ix.clearPresentation();
    ix.marine?.stop(); waiters.cancel(); frameWaiters.cancel();
    ix.subject?.dispose(); ix.stage?.backdrop('off'); ix.stage?.dispose(); ix.ui?.root.remove();
    host.attach(null); ix.ensureLoop(); host.setPointerOnCanvas?.(false);
    if (ix.filter) { window.removeEventListener('keydown', ix.filter, true); window.removeEventListener('keyup', ix.filter, true); }
    if (ix.onError) { window.removeEventListener('error', ix.onError); window.removeEventListener('unhandledrejection', ix.onRejection); }
    if (ix.onBlur) window.removeEventListener('blur', ix.onBlur);
  };
  ix.onError = (e) => ix.recordError(ix.entry?.id, e.error || e.message, 'page');
  ix.onRejection = (e) => ix.recordError(ix.entry?.id, e.reason, 'promise');
  window.addEventListener('error', ix.onError); window.addEventListener('unhandledrejection', ix.onRejection);

  ix.clock = createClock();
  ix.recorder = createRecorder({ budgetMB: opts.rewindMB ?? 48 });

  // into the Training Ground (its scene is compiled on the way in, with the loop stopped), then onto the stage
  say('Entering the studio');
  host.enterTraining();
  if (!(await until(() => host.training()?.active && host.training()?.tg, 30000))) throw new Error('the Training Ground did not open for inspection');
  if (!(await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 20000))) throw new Error('the Training Ground is still loading; reload the inspector');
  const tr = host.training(), tg = tr.tg, R = (T.trainingDbg && T.trainingDbg.TRAINING) || {};
  const room = R.BUILD || { minX: -44, maxX: -8, minZ: -12, maxZ: 28 }, O = tg.origin || { x: 0, y: tg.floorY, z: -640 };
  // the stage goes in after the room: going in, the Training Ground hides everything far from it (trainingHideWorld)
  ix.stage = createStage(ix);
  ix.stage.placeAt(O.x + (room.minX + room.maxX) / 2, tg.floorY, O.z + (room.minZ + room.maxZ) / 2);
  host.scene.add(ix.stage.group);
  ix.stage.backdrop('studio');
  host.adoptLights(ix.stage.group);

  ix.orbit = createOrbit(ix);
  ix.marine = createMarineDesk(ix);
  ix.marine.prepare();
  host.setPointerOnCanvas(false);
  try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (_) {}

  ix.catalog = makeCatalog(ix.ctx);
  ix.byId = new Map(ix.catalog.map((e) => [e.id, e]));
  if (ix.byId.size !== ix.catalog.length) throw new Error('the inspector catalog contains duplicate subject ids');

  // --- showing a subject ----------------------------------------------------------------------------------------
  let showToken = 0;
  ix.show = async function show(id, o = {}) {
    ix.assertAvailable(o._job);
    if (o.signal?.aborted) throw abortError();
    ix.ensureLoop();
    const entry = ix.byId.get(id);
    if (!entry) throw new Error('no subject "' + id + '" (DWInspect.list())');
    const variants = entry.variants ? (typeof entry.variants === 'function' ? entry.variants(ix.ctx) : entry.variants) : null;
    const variant = o.variant != null ? String(o.variant) : variants && variants.length ? variants[0].key : null;
    if (variant != null && (!variants || !variants.some((v) => v.key === variant))) throw new Error('no variant "' + variant + '" for ' + id);
    if (entry.kind === 'zombie' && o.mode && !['live', 'walk', 'rise', 'statue'].includes(o.mode)) throw new Error('zombie mode must be live, walk, rise or statue');
    const token = ++showToken;
    ix.recorder.live();
    if (ix.subject && ix.subject.entry.kind === 'marine') ix.marine.stop();
    if (ix.subject) { try { ix.subject.dispose(); } catch (e) { console.warn('[inspector] dispose', e); } }
    ix.subject = null; ix.stage.invalidate();
    ix.entry = null; ix.variant = null;
    let s;
    try {
      if (entry.broken) throw new Error(entry.broken);
      if (entry.kind === 'marine') s = marineSubject(ix, entry);
      else if (entry.kind === 'zombie') s = zombieSubject(ix, entry, o.mode || 'live');
      else s = await modelSubject(ix, entry, variant, { isCurrent: () => token === showToken && !o.signal?.aborted });
    } catch (e) {
      ix.recordError(id, e, 'build');
      if (token === showToken && ix.ui) ix.ui.subjectFailed(entry, e);
      throw e;
    }
    if (token !== showToken || !s || o.signal?.aborted) { s?.dispose(); throw abortError('Subject selection superseded or cancelled'); }
    ix.entry = entry; ix.variants = variants; ix.variant = variant;
    ix.subject = s; ix.mode = s.mode || null;
    ix.recorder.reset(s.rig());
    // the marine shows only as himself (and as a zombie's target)
    ix.showMarine = entry.kind === 'marine' || (entry.kind === 'zombie' && s.mode !== 'statue');
    if (o.view !== false) ix.orbit.view(o.view || (entry.kind === 'marine' ? 'full' : 'three'), { instant: !!o.instant });
    if (ix.ui) ix.ui.subjectShown(entry, s);
    try { const url = new URL(location.href); url.searchParams.set('inspect', id); if (variant) url.searchParams.set('variant', variant); else url.searchParams.delete('variant'); history.replaceState(null, '', url); } catch (_) {}
    await ix.nextFrame(o.signal);
    return s;
  };

  // --- the frame: last word before the draw ---------------------------------------------------------------------
  const P = T.player, rollPivot = host.rollPivot;
  ix.frame = function frame(dt, realDt) {
    const s = ix.subject, held = dt === 0;
    if (!held) {
      if (s) { try { s.update(dt, ix.clock.gameTime); } catch (e) { if (!s._warned) { s._warned = true; ix.recordError(s.entry.id, e, 'update'); console.warn('[inspector] subject update', e); } } }
      if (s && s.entry.kind === 'marine') ix.marine.frame(dt);
      waiters.flush(ix.clock.gameTime);
    }
    // the marine: shown as himself or a zombie's target, never in someone else's picture (the game sets player.visible
    // every frame, so this is the last word on it, for this draw only)
    P.visible = !!ix.showMarine || (s && s.entry.kind === 'zombie' && s.mode !== 'statue');
    if (s && s.entry.kind === 'marine' && rollPivot) rollPivot.visible = true;   // the sniper's scope hides him
    if (!held && s && !ix.skipHistory && !ix.recorder.scrubbing) ix.recorder.record(ix.clock.gameTime);
    ix.orbit.frame();
    const focus = s ? s.focus() : null;
    ix.stage.frame(held ? 0 : dt, focus);
    if (ix.ui) ix.ui.frame(dt, focus);
    frameWaiters.flush();
  };
  host.attach({
    held: () => ix.clock.held(),
    scale: (dt) => ix.clock.scale(dt),
    frame: (dt, realDt) => { try { ix.frame(dt, realDt); } catch (e) { if (!ix._frameErr) { ix._frameErr = true; ix.recordError(ix.entry?.id, e, 'frame'); frameWaiters.cancel(e); console.error('[inspector] frame', e); } } }
  });

  // --- the keyboard: the inspector's unless the marine is being driven ---------------------------------------------
  const typing = (el) => el && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !/^(range|checkbox|radio|button)$/i.test(el.type)));
  const filter = (e) => {
    if (e.__dwi) return;                                        // the inspector's own presses, for the game
    const inUi = !!(ix.ui && e.target instanceof Node && ix.ui.root.contains(e.target));
    if (inUi && ix.busy && e.target.closest?.('select,input[type="range"],input[type="checkbox"],input[type="radio"]') &&
        e.code !== 'Tab' && !e.ctrlKey && !e.metaKey && !/^F\d+$/.test(e.code)) {
      if (e.type === 'keydown' && e.code === 'Escape') ix.api?.cancel();
      e.preventDefault(); e.stopImmediatePropagation(); return;
    }
    if (inUi && typing(e.target)) return;                      // typing in a field: the field's (the root stops it there)
    if (inUi && ((e.target.closest?.('button, [role="button"]') && ['Enter', 'Space'].includes(e.code)) ||
        (e.target.tagName === 'INPUT' && /^(range|checkbox|radio)$/i.test(e.target.type) && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Space'].includes(e.code)))) return;
    if (ix.drive) {
      if (e.code === 'Escape' && e.type === 'keydown') { ix.setDrive(false); e.preventDefault(); e.stopImmediatePropagation(); }
      return;                                                   // driving: the game's
    }
    if (e.ctrlKey || e.metaKey || /^F\d+$/.test(e.code)) return;  // the browser's (reload, devtools, zoom)
    e.stopImmediatePropagation();
    if (e.type === 'keydown' && ix.ui && ix.ui.key(e)) e.preventDefault();
    else if (e.type === 'keydown' && !/^(Tab)$/.test(e.code)) e.preventDefault();
  };
  window.addEventListener('keydown', filter, true);
  window.addEventListener('keyup', filter, true);
  ix.filter = filter;
  ix.onBlur = () => { if (ix.drive && !ix.busy) ix.setDrive(false); };
  window.addEventListener('blur', ix.onBlur);
  ix.setDrive = (on) => {
    ix.assertAvailable();
    if (on && ix.entry?.kind !== 'marine') throw new Error('Show the live marine before driving');
    ix.ensureLoop();
    ix.drive = !!on;
    ix.marine.stop();
    if (on) { ix.orbit.release(); host.setPointerOnCanvas(true); }
    else { host.setPointerOnCanvas(false); ix.orbit.view(ix.subject && ix.subject.entry.kind === 'marine' ? 'full' : 'three'); for (const k of Object.keys(host.keys)) host.keys[k] = false; if (T.setMouseFireDbg) T.setMouseFireDbg(false); if (T.setZoomHeldDbg) T.setZoomHeldDbg(false); }
    if (ix.ui) ix.ui.driveChanged(ix.drive);
    return ix.drive;
  };

  // --- the time controls the UI and the API share --------------------------------------------------------------
  ix.play = () => { ix.ensureLoop(); ix.recorder.live(); ix.clock.play(); ix.ui && ix.ui.timeChanged(); };
  ix.pause = () => { ix.ensureLoop(); ix.clock.pause(); ix.ui && ix.ui.timeChanged(); };
  ix.step = (n = 1) => { boundedNumber(n, 'frames to step', -600, 600, { integer: true }); if (n === 0) throw new Error('frames to step must be nonzero'); ix.ensureLoop(); if (n < 0) return ix.scrubBy(n); ix.recorder.live(); ix.clock.step(n); ix.ui && ix.ui.timeChanged(); };
  let scrubBack = 0;
  ix.scrub = (back) => { boundedNumber(back, 'frames to rewind', 0, 9000, { integer: true }); if (!ix.clock.paused) ix.pause(); scrubBack = back; const t = ix.recorder.show(scrubBack); ix.ui && ix.ui.timeChanged(); return t; };
  ix.scrubBy = (n) => ix.scrub((ix.recorder.scrubbing ? scrubBack : 0) - n);
  ix.scrubBack = () => (ix.recorder.scrubbing ? scrubBack : 0);
  ix.speed = (k) => { const v = ix.clock.speed(k); ix.ui && ix.ui.timeChanged(); return v; };

  // --- pictures -------------------------------------------------------------------------------------------------
  // The canvas as drawn: a frame is drawn and copied into a plain canvas in the same task (WebGPU and WebGL both let
  // the picture go after it), the way the game's own armory pictures are read (armoryPicture).
  const _cap = document.createElement('canvas');
  ix.capture = async (type = 'image/png', quality = 0.92, signal) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(type)) throw new Error('Picture type must be image/png, image/jpeg or image/webp');
    boundedNumber(quality, 'picture quality', 0, 1);
    const playing = !ix.clock.paused; ix.clock.pause();
    try {
      await ix.nextFrame(signal); host.render();
      const src = host.renderer.domElement;
      if (!src.width || !src.height || src.width * src.height > 32 * 1024 * 1024) throw new Error('Picture requires a canvas from 1 to 32 million pixels; reduce the window size');
      _cap.width = src.width; _cap.height = src.height;
      const g = _cap.getContext('2d'); if (!g) throw new Error('Picture canvas is unavailable');
      g.fillStyle = '#000'; g.fillRect(0, 0, _cap.width, _cap.height); g.drawImage(src, 0, 0);
      return _cap.toDataURL(type, quality);
    } finally { if (playing) ix.clock.play(); }
  };

  // --- go ------------------------------------------------------------------------------------------------------
  ix.ui = createUI(ix);
  ix.api = createApi(ix);
  window.DWInspect = ix.api;
  host.audio && host.audio.setMuted && opts.mute && host.audio.setMuted(true);
  const q = new URLSearchParams(location.search), first = q.get('inspect');
  const start = first && ix.byId.has(first) ? first : 'marine';
  try { await ix.show(start, { variant: q.get('variant'), instant: true }); }
  catch (e) { console.warn('[inspector] ' + start + ':', e); await ix.show('marine', { instant: true }); ix.ui.toast('Saved subject could not open: ' + e.message + '. Showing the marine.', true); }
  ix.api.ready = true;
  window.dispatchEvent(new CustomEvent('dw-inspector-ready', { detail: { version: VERSION, subjects: ix.catalog.length } }));
  console.info('Inspector ' + VERSION + ': ' + ix.catalog.length + ' subjects; DWInspect.help() for the API');
  return ix.api;
}
export { MARINE_KEYS, MODEL_KEYS };
