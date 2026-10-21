// The inspector's supported agent interface. Stage-changing jobs are exclusive, cancellable, and restore review settings.
import { abortError, boundedNumber } from './async.js';
import { CAMO_KEYS } from '../../core/camo.js';
import { normalizeWardrobe, BODY_CHOICES } from '../../game/wardrobe.js';
import { headRoot } from '../../game/zombie-headshots.js';

export function createApi(ix) {
  const T = ix.T, M = ix.marine;
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const safe = (f) => { try { return f(); } catch (_) { return null; } };
  const variantsOf = (e) => e.variants ? (typeof e.variants === 'function' ? e.variants(ix.ctx) : e.variants) : [];
  const brief = (e) => ({ id: e.id, name: e.name, group: e.group, kind: e.kind, owner: e.owner, source: e.source, variants: variantsOf(e).map((v) => v.key) });
  const change = (f) => { ix.assertAvailable(); return f(); };
  const boolean = (v, name) => { if (typeof v !== 'boolean') throw Error(name + ' must be a boolean'); return v; };
  const checkSignal = (signal) => { if (signal?.aborted) throw abortError(); };
  function cameraData(c) {
    if (!c || typeof c !== 'object') throw Error('camera must be an object');
    const out = {};
    for (const k of ['x', 'y', 'z', 'tx', 'ty', 'tz']) out[k] = boundedNumber(c[k], 'camera.' + k, -1000000, 1000000);
    out.fov = boundedNumber(c.fov ?? 35, 'camera.fov', 1, 120);
    if (Math.hypot(out.x - out.tx, out.y - out.ty, out.z - out.tz) < 0.0001) throw Error('camera must be separate from its target');
    return out;
  }
  function setCamera(c, follow = false) {
    const p = cameraData(c), dx = p.x - p.tx, dy = p.y - p.ty, dz = p.z - p.tz, dist = Math.hypot(dx, dy, dz);
    ix.orbit.set({ tx: p.tx, ty: p.ty, tz: p.tz, dist, az: Math.atan2(dx, dz), el: Math.asin(Math.max(-1, Math.min(1, dy / dist))), fov: p.fov }, true);
    ix.orbit.follow(follow); ix.orbit.frame();
    return ix.orbit.cam();
  }
  function current() {
    const s = ix.subject; if (!s) return null;
    const f = s.focus(), m = ix.stage.measure(s.rig());
    return { id: s.entry.id, name: s.entry.name, kind: s.entry.kind, variant: ix.variant, mode: s.mode || null, center: f.center, size: m ? m.size : f.size, yaw: f.yaw, info: s.info() };
  }
  function controlList() {
    const controls = ix.subject?.controls || [], seen = new Set();
    for (const c of controls) {
      if (!c || typeof c.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(c.id) || seen.has(c.id)) throw Error('model controls need unique stable IDs');
      seen.add(c.id);
    }
    return controls;
  }
  function optionsOf(c) { const options = typeof c.options === 'function' ? c.options() : c.options; return (options || []).map((v) => typeof v === 'object' && v !== null ? v.key : v); }
  function validateControl(c, value) {
    if (!['toggle', 'select'].includes(c.type)) throw Error('model recipes and model.set only support toggle/select switches: ' + c.id);
    if (typeof c.set !== 'function' || typeof c.get !== 'function') throw Error('model control is not a readable switch: ' + c.id);
    if (c.type === 'toggle') boolean(value, 'model switch ' + c.id);
    else if (c.type === 'select') { if (!optionsOf(c).includes(value)) throw Error('unsupported model choice: ' + c.id); }
    else throw Error('model recipes and model.set only support toggle/select switches: ' + c.id);
    return value;
  }
  function modelControls() { return controlList().map((c) => ({ id: c.id, type: c.type, label: c.label || c.id, ...(c.type === 'select' ? { options: clone(optionsOf(c)) } : {}), ...(c.type === 'toggle' || c.type === 'select' ? { value: c.get() } : {}) })); }
  function modelSwitches() { return Object.fromEntries(controlList().filter((c) => c.type === 'toggle' || c.type === 'select').map((c) => [c.id, validateControl(c, c.get())])); }
  function modelYaw() { const y = ix.subject?.holder?.rotation.y || 0; return ((y + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; }
  function applyModel(recipe) {
    if (!recipe) return;
    const controls = new Map(controlList().map((c) => [c.id, c])), changes = [];
    for (const [id, value] of Object.entries(recipe.switches)) { const c = controls.get(id); if (!c) throw Error('model has no switch "' + id + '"'); changes.push([c, validateControl(c, value)]); }
    // Validate every switch before any setter: button commands can never be replayed from a saved recipe.
    for (const [c, value] of changes) c.set(value);
    if (ix.subject?.kind === 'model') { ix.subject.turntable = recipe.turntable; if (recipe.yaw != null) ix.subject.setYaw(recipe.yaw); }
  }
  function session() {
    const state = M.state(), guns = T.WEAPON_ORDER || ix.host.data?.WEAPON_ORDER || [], mods = {};
    for (const w of guns) mods[w] = Object.fromEntries(M.mods(w).map((m) => [m.id, !!m.fitted]));
    const follow = ix.orbit.followState();
    return { schema: 'dw-inspector-session', schemaVersion: 1, inspectorVersion: ix.version, view: { follow: follow.enabled, bookmark: follow.bookmark, offset: follow.offset },
      subject: { id: ix.entry?.id || 'marine', variant: ix.variant ?? null, mode: ix.mode ?? null },
      camera: clone(ix.orbit.cam()), display: { backdrop: ix.stage.backdrop(), light: ix.stage.light(), overlays: ix.stage.overlays.all() },
      clock: { speed: ix.clock.speed(), paused: ix.clock.paused },
      ...(ix.subject?.entry.kind === 'model' ? { model: { switches: modelSwitches(), turntable: ix.subject.turntable || 0, yaw: modelYaw() } } : {}),
      marine: { weapon: M.weapon(), akimbo: !!state.akimbo, blade: state.blade, camo: M.camo(), gear: Object.fromEntries(M.GEAR_IDS.map((k) => [k, !!M.gear(k)])),
        wardrobe: clone(T.getWardrobe()), mods, move: state.move, loop: !!state.loop, holds: clone(state.holds || {}) } };
  }
  function validateSession(raw) {
    // Fail before touching the stage, even for malformed or malicious JSON recipes.
    let visited = 0;
    function plain(v, depth = 0) {
      if (++visited > 4000 || depth > 12) throw Error('session is too complex');
      if (typeof v === 'number' && !Number.isFinite(v)) throw Error('session contains a non-finite number');
      if (v && typeof v === 'object') {
        if (!Array.isArray(v) && ![Object.prototype, null].includes(Object.getPrototypeOf(v))) throw Error('session must contain plain JSON data');
        for (const k of Object.keys(v)) { if (['__proto__', 'prototype', 'constructor'].includes(k)) throw Error('unsafe session key'); plain(v[k], depth + 1); }
      } else if (!['undefined', 'string', 'number', 'boolean'].includes(typeof v) && v !== null) throw Error('session must contain JSON data');
    }
    plain(raw);
    if (!raw || raw.schema !== 'dw-inspector-session' || raw.schemaVersion !== 1) throw Error('unsupported inspector session schema');
    if (JSON.stringify(raw).length > 65536) throw Error('session exceeds 64 KB');
    const r = clone(raw), e = ix.byId.get(r.subject?.id); if (!e) throw Error('session subject is not in DWInspect.list()');
    const object = (v, name) => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error(name + ' must be an object'); return v; };
    const variants = variantsOf(e);
    if (r.subject.variant != null && !variants.some((v) => v.key === r.subject.variant)) throw Error('unknown session variant');
    if (r.subject.mode != null && (e.kind !== 'zombie' || !['live', 'walk', 'rise', 'statue'].includes(r.subject.mode))) throw Error('unknown session mode');
    r.camera = cameraData(r.camera);
    if (r.model != null) {
      object(r.model, 'model'); r.model.switches = object(r.model.switches || {}, 'model switches');
      r.model.turntable = boundedNumber(r.model.turntable ?? 0, 'model turntable', -10, 10);
      if (r.model.yaw != null) r.model.yaw = boundedNumber(r.model.yaw, 'model yaw', -Math.PI, Math.PI);
      if (Object.keys(r.model.switches).length > 32) throw Error('too many model switches');
      for (const [id, v] of Object.entries(r.model.switches)) {
        if (!/^[a-z][a-z0-9-]{0,63}$/.test(id) || !['boolean', 'string', 'number'].includes(typeof v) || (typeof v === 'string' && v.length > 128)) throw Error('model switches need stable IDs and scalar choices');
        if (typeof v === 'number') boundedNumber(v, 'model choice', -1000000, 1000000);
      }
      if (e.kind !== 'model' && (Object.keys(r.model.switches).length || r.model.turntable !== 0 || r.model.yaw)) throw Error('model setup requires a standalone model subject');
    }
    if (r.view != null) {
      object(r.view, 'view'); boolean(r.view.follow, 'view follow');
      if (r.view.bookmark != null && !['full', 'threeQ', 'head', 'torso', 'hands', 'back', 'boots'].includes(r.view.bookmark)) throw Error('unknown view bookmark');
      if (r.view.offset != null) { object(r.view.offset, 'view offset'); for (const k of ['dx', 'dy', 'dz']) boundedNumber(r.view.offset[k], 'view offset.' + k, -1000000, 1000000); }
    }
    if (!r.display || !Object.hasOwn(ix.stage.BACKDROPS, r.display.backdrop) || !Object.hasOwn(ix.stage.LIGHTS, r.display.light)) throw Error('unknown session display preset');
    r.display.overlays = object(r.display.overlays || {}, 'display overlays');
    const overlays = ix.stage.overlays.all();
    for (const [k, v] of Object.entries(r.display.overlays || {})) { if (!Object.hasOwn(overlays, k)) throw Error('unknown session overlay: ' + k); boolean(v, 'overlay'); }
    if (!r.clock) throw Error('session clock is missing'); r.clock.speed = boundedNumber(r.clock.speed, 'session speed', 0.05, 2); boolean(r.clock.paused, 'session pause');
    const m = r.marine, guns = T.WEAPON_ORDER || ix.host.data?.WEAPON_ORDER || [];
    if (!m || (m.weapon !== 'none' && !guns.includes(m.weapon))) throw Error('unknown session weapon');
    boolean(m.akimbo, 'akimbo'); if (m.akimbo && !['pistol', 'uzi', 'revolver'].includes(m.weapon)) throw Error('akimbo requires pistol, uzi or revolver');
    if (!['knife', 'machete', 'katana'].includes(m.blade)) throw Error('unknown session blade');
    if (m.camo != null && !CAMO_KEYS.includes(m.camo)) throw Error('unknown session camo');
    m.gear = object(m.gear || {}, 'marine gear'); m.mods = object(m.mods || {}, 'marine mods'); m.holds = object(m.holds || {}, 'marine holds');
    for (const [k, v] of Object.entries(m.gear)) { if (!M.GEAR_IDS.includes(k)) throw Error('unknown session gear'); boolean(v, 'gear'); }
    if (!m.wardrobe || m.wardrobe.version !== 1 || !m.wardrobe.items || !m.wardrobe.body || !m.wardrobe.guns) throw Error('session wardrobe is incomplete');
    const canonical = (v) => v && typeof v === 'object' ? Array.isArray(v) ? v.map(canonical) : Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v;
    // Gun finishes include the rune, which is separate from the clothing camo table. Validate them independently.
    const clothes = { ...m.wardrobe, guns: {} }, normalized = normalizeWardrobe(clothes, m.camo || 'm81', (k) => CAMO_KEYS.includes(k));
    if (JSON.stringify(canonical(clothes)) !== JSON.stringify(canonical(normalized))) throw Error('session wardrobe has unsupported choices');
    for (const [w, finish] of Object.entries(m.wardrobe.guns))
      if (!guns.includes(w) || typeof finish !== 'string' || (!CAMO_KEYS.includes(finish) && !M.finishes(w).some((f) => f.key === finish))) throw Error('unknown session gun finish');
    for (const [w, values] of Object.entries(m.mods || {})) {
      if (!guns.includes(w) || !values || typeof values !== 'object' || Array.isArray(values)) throw Error('unknown session mod weapon');
      const ids = M.mods(w).map((v) => v.id);
      for (const [id, on] of Object.entries(values)) { if (!ids.includes(id)) throw Error('unknown session weapon mod'); boolean(on, 'weapon mod'); }
      if (values.ext && values.heavy) throw Error('extended magazine and heavy barrel share a slot');
    }
    if (m.move != null && !M.MOVES.some((v) => v.id === m.move)) throw Error('unknown session move'); boolean(m.loop, 'move loop');
    for (const [kind, v] of Object.entries(m.holds || {})) {
      if (!['walk', 'run', 'reload', 'knife', 'draw', 'grenade'].includes(kind)) throw Error('unknown session hold');
      if (kind === 'grenade') { if (!Array.isArray(v) || !['grab', 'raise', 'cocked', 'throw', 'back'].includes(v[0])) throw Error('unknown grenade hold'); boundedNumber(v[1], 'grenade hold', 0, 0.6); }
      else boundedNumber(v, kind + ' hold', 0, kind === 'draw' ? 1.2 : 1);
    }
    return r;
  }
  async function restoreInternal(r, token, signal) {
    checkSignal(signal);
    M.stop(); ix.ensureLoop(); ix.pause();
    if (ix.drive) { ix.drive = false; ix.host.setPointerOnCanvas(false); ix.ui?.driveChanged(false); }
    M.akimbo(null); M.weapon(r.marine.weapon); M.blade(r.marine.blade);
    if (r.marine.camo != null) M.camo(r.marine.camo);
    // These are the same in-memory wardrobe and dress hooks used by the marine desk. Training never writes a save.
    Object.assign(T.getWardrobe(), clone(r.marine.wardrobe)); T.dressMarine(T.marine, T.getWardrobe()); T.dressGuns?.(T.getWardrobe());
    for (const [k, v] of Object.entries(r.marine.gear)) M.gear(k, v);
    for (const [w, values] of Object.entries(r.marine.mods)) {
      for (const [id, on] of Object.entries(values)) if (!on) M.fit(id, false, w);
      for (const [id, on] of Object.entries(values)) if (on) M.fit(id, true, w);
    }
    if (r.marine.akimbo) M.akimbo(r.marine.weapon);
    await ix.show(r.subject.id, { variant: r.subject.variant, mode: r.subject.mode, view: false, instant: true, _job: token, signal });
    checkSignal(signal);
    applyModel(r.model);
    ix.stage.backdrop(r.display.backdrop); ix.stage.light(r.display.light);
    for (const [k, v] of Object.entries(r.display.overlays)) ix.stage.overlays.set(k, v);
    ix.speed(r.clock.speed); M.setLoop(r.marine.loop);
    if (r.subject.id === 'marine' && r.marine.move) { ix.play(); await M.play(r.marine.move, { loop: r.marine.loop }); checkSignal(signal); }
    for (const [kind, v] of Object.entries(r.marine.holds)) M.hold(kind, v);
    setCamera(r.camera); if (r.view) ix.orbit.restoreFollow({ enabled: r.view.follow, bookmark: r.view.bookmark, offset: r.view.offset });
    if (r.clock.paused) ix.pause(); else ix.play();
    await ix.nextFrame(signal); return session();
  }
  async function runJob(label, run) {
    ix.assertAvailable(); ix.ensureLoop();
    if (ix.drive) throw Error('Exit Drive with Esc before capturing or running a review job');
    const job = { label, token: Symbol(label), controller: new AbortController(), cancelling: false }; ix.busy = job;
    try { return await run(job); }
    finally { if (ix.busy === job) ix.busy = null; }
  }
  function cancel() { if (!ix.busy) return false; ix.busy.cancelling = true; ix.busy.controller.abort(); M.stop(); return true; }
  function presentationWait(value, signal, label) {
    checkSignal(signal);
    return new Promise((resolve, reject) => {
      let done = false, timer;
      const finish = (fn, v) => { if (done) return; done = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); fn(v); };
      const abort = () => finish(reject, abortError());
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => finish(reject, Error(label + ' timed out after 15000 ms; reload the inspector')), 15000);
      Promise.resolve(value).then((v) => finish(resolve, v), (e) => finish(reject, e));
    });
  }
  function decode(data, signal) {
    checkSignal(signal);
    return new Promise((resolve, reject) => {
      const im = new Image(); let timer;
      function done(error) { clearTimeout(timer); signal?.removeEventListener('abort', abort); im.onload = im.onerror = null; if (error) reject(error); else resolve(im); }
      const abort = () => done(abortError());
      im.onload = () => done(); im.onerror = () => done(Error('could not decode the inspector image'));
      signal?.addEventListener('abort', abort, { once: true }); timer = setTimeout(() => done(Error('inspector image decode timed out')), 15000); im.src = data;
    });
  }
  function canvas(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width > 16384 || height > 16384 || width * height > 32000000)
      throw Error('sheet is too large; reduce tile size or filter the subject group');
    const c = document.createElement('canvas'); c.width = Math.round(width); c.height = Math.round(height); if (!c.getContext('2d')) throw Error('could not allocate inspector sheet'); return c;
  }
  async function sheetData(options = {}) {
    const n = boundedNumber(options.n ?? 8, 'sheet views', 1, 32, { integer: true }), pitch = boundedNumber(options.pitch ?? 12, 'sheet pitch', -89, 89);
    const tile = boundedNumber(options.tile ?? 480, 'sheet tile', 96, 1024, { integer: true }), cols = boundedNumber(options.cols ?? 4, 'sheet columns', 1, 12, { integer: true });
    return runJob('Turnaround sheet', async ({ controller }) => {
      const s = ix.subject; if (!s) throw Error('nothing on the stage');
      const camera = ix.orbit.cam(), follow = ix.orbit.followState(), paused = ix.clock.paused, images = [], signal = controller.signal;
      ix.pause();
      try {
        for (let i = 0; i < n; i++) { checkSignal(signal); ix.orbit.view({ yaw: 360 * i / n, pitch }, { instant: true }); images.push(await decode(await ix.capture('image/jpeg', 0.88, signal), signal)); }
        const th = Math.max(1, Math.round(tile * images[0].height / images[0].width)), c = canvas(cols * tile, Math.ceil(n / cols) * th + 34), g = c.getContext('2d');
        g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
        images.forEach((im, i) => { const x = i % cols * tile, y = 34 + Math.floor(i / cols) * th; g.drawImage(im, x, y, tile, th); g.fillStyle = '#f4ecd0'; g.font = '600 13px Arial'; g.fillText(Math.round(360 * i / n) + '°', x + 8, y + 18); });
        g.fillStyle = '#f2c418'; g.font = '600 18px Arial'; g.fillText(s.entry.name + ' · ' + s.entry.id + (ix.variant ? ' · ' + ix.variant : ''), 10, 23);
        return c.toDataURL('image/jpeg', 0.86);
      } finally { setCamera(camera); ix.orbit.restoreFollow(follow); if (paused) ix.pause(); else ix.play(); }
    });
  }
  async function thumbOf(width, signal) {
    const im = await decode(await ix.capture('image/jpeg', 0.85, signal), signal), c = canvas(width, width * im.height / im.width);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.82);
  }
  function checkOptions({ only = null, frames = 2, thumbs = 0, view = null, variants = true } = {}) {
    frames = boundedNumber(frames, 'check frames', 1, 120, { integer: true });
    if (thumbs !== 0) thumbs = boundedNumber(thumbs, 'check thumbnails', 96, 1024, { integer: true });
    boolean(variants, 'check variants');
    const entries = ix.catalog.filter((e) => { if (!only) return true; if (only instanceof RegExp) { only.lastIndex = 0; return only.test(e.id); } return e.id.includes(String(only)); });
    if (!entries.length) throw Error('no inspector subjects match ' + String(only));
    const rows = entries.flatMap((e) => { const vs = variants ? variantsOf(e) : []; return (vs.length ? vs : [{ key: null }]).map((v) => ({ e, variant: v.key })); });
    return { rows, frames, thumbs, view };
  }
  async function checkInternal(options, job) {
    const { rows, frames, thumbs, view } = checkOptions(options), before = validateSession(session()), follow = ix.orbit.follow(), out = [], broken = new Map(), signal = job.controller.signal;
    const history = ix.skipHistory; ix.skipHistory = true;
    try {
      M.stop(); ix.pause();
      for (const { e, variant } of rows) {
        checkSignal(signal); const t0 = performance.now(), seen = new Set(ix.errors), mode = e.kind === 'zombie' ? 'statue' : null;
        try {
          const s = await ix.show(e.id, { variant, mode, instant: true, view: view || undefined, _job: job.token, signal });
          if (e.kind === 'model') { modelControls(); modelSwitches(); }
          ix.play(); for (let i = 0; i < frames; i++) await ix.nextFrame(signal); ix.pause();
          const c = current(), sz = c?.size, errors = ix.errors.filter((r) => !seen.has(r)), bad = !s || !sz || ![sz.x, sz.y, sz.z].every((v) => Number.isFinite(v) && v >= 0) || sz.x + sz.y + sz.z <= 0.005 || !c.info?.meshes || errors.length;
          const thumb = thumbs ? await thumbOf(thumbs, signal) : undefined;
          out.push({ id: e.id, variant, mode, ok: !bad, ms: Math.round(performance.now() - t0), tris: c?.info?.tris || 0, size: sz && [sz.x, sz.y, sz.z].map((v) => +v.toFixed(3)), error: errors.length ? errors.map((r) => r.error).join(' | ') : bad ? 'nothing shown (empty or invalid visible geometry)' : null, thumb });
          if (bad) broken.set(e.id, out[out.length - 1].error);
          ix.ui?.markBroken(e.id, broken.get(e.id) || null);
        } catch (e2) {
          if (e2.name === 'AbortError' || signal.aborted) throw abortError();
          out.push({ id: e.id, variant, mode, ok: false, ms: Math.round(performance.now() - t0), error: String(e2.message || e2) }); broken.set(e.id, String(e2.message || e2)); ix.ui?.markBroken(e.id, String(e2.message || e2));
        }
      }
      return out;
    } finally { ix.skipHistory = history; await restoreInternal(before, job.token); ix.orbit.follow(follow); }
  }
  const check = (options = {}) => { checkOptions(options); return runJob('Catalog check', (job) => checkInternal(options, job)); };
  async function contactSheet({ only = null, cols = 6, tile = 300, view = null, variants = true } = {}) {
    cols = boundedNumber(cols, 'sheet columns', 1, 12, { integer: true }); tile = boundedNumber(tile, 'sheet tile', 96, 1024, { integer: true });
    const options = { only, thumbs: tile, view, variants }; checkOptions(options);
    return runJob('Catalog contact sheet', async (job) => {
      const res = await checkInternal(options, job), signal = job.controller.signal, images = await Promise.all(res.map((r) => r.thumb ? decode(r.thumb, signal) : null));
      const first = images.find(Boolean), th = first ? first.height : Math.round(tile * 9 / 16), c = canvas(cols * tile, Math.ceil(res.length / cols) * th + 30), g = c.getContext('2d');
      g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#f2c418'; g.font = '600 16px Arial'; g.fillText('Inspector ' + ix.version + ' · ' + res.length + ' variants · ' + res.filter((r) => !r.ok).length + ' broken', 8, 20);
      res.forEach((r, i) => { const x = i % cols * tile, y = 30 + Math.floor(i / cols) * th; if (images[i]) g.drawImage(images[i], x, y, tile, th); g.fillStyle = '#000b'; g.fillRect(x, y + th - 22, tile, 22); g.fillStyle = r.ok ? '#f4ecd0' : '#ff6b5b'; g.font = '600 12px Arial'; g.fillText((r.ok ? '' : 'BROKEN ') + r.id + (r.variant == null ? '' : ':' + r.variant) + (r.ok ? '' : ': ' + r.error), x + 6, y + th - 7, tile - 12); g.strokeStyle = '#000'; g.strokeRect(x, y, tile, th); });
      return { data: c.toDataURL('image/jpeg', 0.86), results: res.map(({ thumb, ...rest }) => rest) };
    });
  }
  const zom = () => { const s = ix.subject; if (!s || s.entry.kind !== 'zombie') throw Error('show a zombie first'); return s; };
  const live = () => { const z = zom().z; if (!z?.alive) throw Error('it is not alive (zombie.respawn())'); return z; };
  const api = {
    ready: false, version: ix.version, apiVersion: 1,
    capabilities: () => ({ apiVersion: 1, sessionSchemaVersion: 1, modelControls: true, cancellableJobs: true, allVariantChecks: true, realGame: true, rewind: 'rig transforms; resume returns to the present', speed: { min: 0.05, max: 2 } }),
    busy: () => ix.busy ? { label: ix.busy.label, cancelling: ix.busy.cancelling } : null, cancel,
    list: (filter) => ix.catalog.filter((e) => !filter || (e.id + ' ' + e.name + ' ' + e.group).toLowerCase().includes(String(filter).toLowerCase())).map(brief),
    has: (id) => ix.byId.has(id), groups: () => ix.GROUPS.slice(),
    async show(id, o = {}) { await ix.show(id, o); return current(); }, current,
    view: (v, o) => change(() => { ix.orbit.view(v, o); return ix.orbit.state(); }),
    camera: (c) => c == null ? ix.orbit.cam() : change(() => setCamera(c)),
    play: () => change(() => ix.play()), pause: () => change(() => ix.pause()), step: (n = 1) => change(() => ix.step(n)), speed: (k) => k == null ? ix.clock.speed() : change(() => ix.speed(k)), scrub: (n) => change(() => ix.scrub(n)),
    stepAsync: (n = 1) => { boundedNumber(n, 'steps', 0, 600, { integer: true }); return runJob('Frame steps', async ({ controller }) => { if (n === 0) return api.time(); try { ix.step(n); while (ix.clock.state().step > 0) await ix.nextFrame(controller.signal); checkSignal(controller.signal); return api.time(); } finally { if (controller.signal.aborted) ix.pause(); } }); },
    time: () => ({ ...ix.clock.state(), rewind: ix.recorder.info(), span: ix.recorder.span(), scrubbing: ix.recorder.scrubbing }),
    backdrop: (b) => b == null ? ix.stage.backdrop() : change(() => ix.stage.backdrop(b)), light: (l) => l == null ? ix.stage.light() : change(() => ix.stage.light(l)),
    overlay: (k, on) => on == null ? ix.stage.overlays.get(k) : change(() => ix.stage.overlays.set(k, on)), drive: (on) => change(() => ix.setDrive(on)),
    session, restore: (recipe) => { const r = validateSession(recipe); return runJob('Restore review recipe', async (job) => { const before = validateSession(session()); try { return await restoreInternal(r, job.token, job.controller.signal); } catch (e) { await restoreInternal(before, job.token); throw e; } }); },
    model: {
      controls: modelControls,
      set: (id, value) => change(() => { const c = controlList().find((v) => v.id === id); if (!c) throw Error('model has no switch "' + id + '"'); c.set(validateControl(c, value)); return c.get(); }),
      turntable: (speed) => speed == null ? ix.subject?.turntable || 0 : change(() => { if (ix.subject?.entry.kind !== 'model') throw Error('show a standalone model before setting the turntable'); return ix.subject.turntable = boundedNumber(speed, 'turntable speed', -10, 10); }),
      yaw: (angle) => angle == null ? modelYaw() : change(() => { if (ix.subject?.entry.kind !== 'model') throw Error('show a standalone model before setting its yaw'); ix.subject.setYaw(boundedNumber(angle, 'model yaw', -Math.PI, Math.PI)); return modelYaw(); })
    },
    marine: {
      moves: () => M.MOVES.map((m) => ({ id: m.id, name: m.name, cat: m.cat })),
      play: (id, o) => change(() => { if (ix.entry?.kind !== 'marine') throw Error('show the live marine before playing a move'); ix.play(); return M.play(id, o); }), stop: () => change(() => M.stop()), loop: (on) => on == null ? M.loop : change(() => M.setLoop(on)),
      weapon: (k) => k == null ? M.weapon() : change(() => M.weapon(k)), akimbo: (k) => change(() => M.akimbo(k)), blade: (k) => k == null ? M.state().blade : change(() => M.blade(k)),
      mods: (w) => M.mods(w), fit: (id, on, w) => change(() => M.fit(id, on, w)), gear: (id, on) => on == null ? M.gear(id) : change(() => M.gear(id, on)),
      camo: (k) => k == null ? M.camo() : change(() => { if (!CAMO_KEYS.includes(k)) throw Error('unknown camo'); return M.camo(k); }),
      item: (id, p) => change(() => { const value = M.item(id, p); if (!value) throw Error('unsupported wardrobe item or choice'); return value; }),
      body: (p) => p == null ? clone(T.getWardrobe().body) : change(() => {
        if (!p || typeof p !== 'object' || Array.isArray(p) || !Object.entries(p).every(([k, v]) => Object.hasOwn(BODY_CHOICES, k) && BODY_CHOICES[k].includes(v))) throw Error('unsupported body choice');
        return M.body(p);
      }),
      finish: (k, w) => change(() => M.finish(k, w)), finishes: (w) => M.finishes(w), preset: (n) => change(() => M.preset(n)), presets: () => Object.keys(M.PRESETS),
      hold: (kind, u) => change(() => M.hold(kind, u)), holdState: (kind) => M.holdState(kind), state: () => M.state(), press: (code) => change(() => M.press(code)), holdKey: (code, on) => change(() => M.holdKey(code, on)), home: () => change(() => M.home())
    },
    zombie: { get: () => zom().z,
      // A named reaction probe, not a projectile accuracy test: tell the real classifier which surface was chosen.
      hit: (where = 'body', dmg = 12) => change(() => {
        if (!['head', 'body', 'legs'].includes(where)) throw Error('reaction zone must be head, body or legs');
        dmg = boundedNumber(dmg, 'damage', 0, 100000); const z = live(), h = headRoot(z) || z.mesh.userData?.headG;
        const head = where === 'head' && !z.partsLost?.head, point = head && h?.getWorldPosition ? h.getWorldPosition(new ix.THREE.Vector3()) : null;
        T.damageZombie(z, dmg, { kind: 'bullet', dir: { x: 0, z: 1 }, hitY: point ? point.y : z.mesh.position.y + (z.hitH || 1.45) * ({ head: 0.95, body: 0.55, legs: 0.2 }[where]),
          headHit: head, militaryZone: where === 'head' ? 'face' : where === 'body' ? 'chest' : 'exposed', brutePart: where === 'head' ? 'head' : undefined });
        return z.hp;
      }),
      kill: () => change(() => T.killZombie(live())), lose: (part) => change(() => T.dismemberDbg(live(), part)), respawn: () => change(() => zom().respawn()) },
    shot: ({ type = 'image/png', quality = 0.92 } = {}) => { if (!['image/png', 'image/jpeg', 'image/webp'].includes(type)) throw Error('unsupported screenshot format'); boundedNumber(quality, 'image quality', 0, 1); return runJob('Screenshot', ({ controller }) => ix.capture(type, quality, controller.signal)); },
    sheetData, check, contactSheet,
    async note(text, { context = '', who = 'agent' } = {}) {
      if (typeof text !== 'string' || !text.trim() || text.length > 12000 || typeof context !== 'string' || context.length > 4000 || typeof who !== 'string' || who.length > 80) throw Error('note needs 1–12000 characters, context ≤4000 and author ≤80');
      return runJob('Save review note', async ({ controller }) => {
        const e = ix.entry; if (!e) throw Error('nothing on the stage');
        const wasPaused = ix.clock.paused; let recipe, image; ix.pause();
        try { image = await ix.capture('image/jpeg', 0.85, controller.signal); recipe = session(); recipe.clock.paused = wasPaused; }
        finally { if (!wasPaused) ix.play(); }
        const timer = setTimeout(() => controller.abort(), 15000);
        try { const r = await fetch('/__inspect/note', { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subject: e.id, name: e.name, owner: e.owner, asset: e.review, source: e.source, text, context: context + '\nReview recipe: ' + JSON.stringify(recipe), image, who, recipe }) }); const out = await r.json(); if (!r.ok || !out.ok) throw Error(out.error || 'review note was not saved (' + r.status + ')'); return out; }
        finally { clearTimeout(timer); }
      });
    },
    async still(on = true) {
      ix.assertAvailable();
      if (!on) { ix.clearPresentation?.(); if (ix._still) { ix._still = false; await ix.host.loop(true); } return false; }
      if (ix._still) return true;
      return runJob('Present held frame', async ({ controller }) => {
        const signal = controller.signal;
        try {
          await ix.nextFrame(signal); await new Promise((r) => setTimeout(r, 0)); checkSignal(signal);
          await ix.host.loop(false); ix._still = true;
          // The frame marker is CPU state before drawing. A WebGPU canvas may still present the previous subject.
          // Draw the held scene explicitly, fence submitted GPU work, then give the compositor a task to present it.
          // The host owns fresh renderer-frame bookkeeping; the supported agent API uses no private GPU fields.
          await presentationWait(ix.host.render(), signal, 'Held-frame draw');
          if (typeof ix.host.renderer?.waitForGPU === 'function') await presentationWait(ix.host.renderer.waitForGPU(), signal, 'Held-frame GPU presentation');
          checkSignal(signal); ix.presentFrame?.();
          await new Promise((r) => setTimeout(r, 0)); checkSignal(signal); return true;
        } catch (e) {
          ix.clearPresentation?.();
          ix._still = false;
          try { await ix.host.loop(true); } catch (resumeError) { ix.recordError?.(ix.entry?.id, resumeError, 'resume'); }
          ix.recordError?.(ix.entry?.id, e, 'presentation'); throw e;
        }
      });
    },
    errors: () => ix.errors.slice(),
    help: () => 'DWInspect ' + ix.version + ', API 1: list(), show(id,{variant,mode}), view(), camera(), session(), restore(recipe), play/pause/stepAsync/speed/scrub, shot(), sheetData(), check({only,variants:true}), contactSheet(), note(text), busy(), cancel(). Model switches: model.controls(), model.set(id,value), model.turntable(speed), model.yaw(angle). Marine kit/moves/holds and zombie reactions are under marine / zombie. Guide: studio/inspector/README.md',
    _ix: ix // unsupported internals; agents should use the versioned API above
  };
  return api;
}
