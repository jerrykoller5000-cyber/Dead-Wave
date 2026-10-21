// studio/inspector/orbit.js — the inspector's camera (CL-196). Claude's (studio/*).
//
// An orbit round a point: drag to go round it, right-drag (or shift-drag) to slide, the wheel to come closer, a
// double click on the subject to orbit round the spot clicked. It drives the game's camera through TT.setShotView,
// which the frame loop applies after every other camera writer, so nothing in the game fights it. Anyone else who
// sets the shot view (the camera tool, tools/camera.mjs) is followed: the orbit picks up from there.
//
// Views are named the way tools/camera.mjs names them (front, back, left/side, right, three, threeR, rear3, top, low,
// eye), in the subject's own frame: things face +z, so "front" looks at its face. The marine has AG-75's bookmarks too
// (full, threeQ, head, torso, hands, back, boots), keys 1 to 7.

const DEG = Math.PI / 180;
export const VIEWS = {
  front: [0, 4], back: [180, 4], left: [90, 2], side: [90, 2], right: [-90, 2], three: [40, 24], threeR: [-40, 24],
  rear3: [140, 24], top: [0, 89], low: [30, -8], eye: [20, 0]
};
// AG-75's marine bookmarks (tools/marine-inspector.js CAM_BOOKMARKS), in degrees and metres from his feet.
export const MARINE_VIEWS = {
  full:   { yaw: 27.5, pitch: 6.9, dist: 3.1,  at: [0, 0.85, 0] },
  threeQ: { yaw: 44.7, pitch: 9.2, dist: 2.85, at: [0, 0.86, 0] },
  head:   { yaw: 20,   pitch: 5.7, dist: 0.72, at: [0, 1.44, 0.04] },
  torso:  { yaw: 25.8, pitch: 5.7, dist: 1.15, at: [0, 1.04, 0.05] },
  hands:  { yaw: 31.5, pitch: 6.9, dist: 0.85, at: [0.08, 0.88, 0.24] },
  back:   { yaw: 157.6, pitch: 8,  dist: 1.85, at: [0, 0.98, -0.08] },
  boots:  { yaw: 27.5, pitch: 8,   dist: 1.15, at: [0, 0.36, 0.02] }
};
export const MARINE_KEYS = ['full', 'threeQ', 'head', 'torso', 'hands', 'back', 'boots'];
export const MODEL_KEYS = ['three', 'front', 'left', 'back', 'right', 'top', 'low'];

// The camera tool's fit (tools/camera-rig.js frame): the box as the camera sees it, its width across the view and its
// height tilted by the pitch, each against its half of the frame, then back by half its depth, plus a margin.
export function fitDistance(size, az, el, fov, aspect, margin = 1.2) {
  const half = Math.tan(fov * DEG / 2);
  const across = Math.abs(size.x * Math.cos(az)) + Math.abs(size.z * Math.sin(az)), deep = Math.abs(size.x * Math.sin(az)) + Math.abs(size.z * Math.cos(az));
  const tall = size.y * Math.cos(el) + deep * Math.abs(Math.sin(el)), depth = deep * Math.cos(el) + size.y * Math.abs(Math.sin(el));
  return Math.max((tall / 2) / half, (across / 2) / (half * aspect), 0.25) * margin + depth / 2;
}

export function createOrbit(ix) {
  const { THREE } = ix, T = ix.T;
  const cur = { tx: 0, ty: 1, tz: 0, az: 40 * DEG, el: 18 * DEG, dist: 4, fov: 35 };
  const goal = { ...cur };
  let lastSet = null, follow = true, followAt = null, followBookmark = null, lastNow = performance.now(), dirty = true;
  const aspect = () => { const c = T.renderer && T.renderer.domElement; return c && c.clientHeight ? c.clientWidth / c.clientHeight : 16 / 9; };

  function cam(s = cur) {
    const ce = Math.cos(s.el), x = s.tx + Math.sin(s.az) * ce * s.dist, y = s.ty + Math.sin(s.el) * s.dist, z = s.tz + Math.cos(s.az) * ce * s.dist;
    return { x, y, z: Math.abs(Math.sin(s.el)) > 0.9995 ? z + 0.01 : z, tx: s.tx, ty: s.ty, tz: s.tz, fov: s.fov };
  }
  function set(next, instant = false) {
    if (!next || typeof next !== 'object') throw new TypeError('camera settings must be an object');
    for (const k of ['tx', 'ty', 'tz', 'az', 'el', 'dist', 'fov'])
      if (k in next && !Number.isFinite(next[k])) throw new RangeError('camera ' + k + ' must be finite');
    Object.assign(goal, next);
    goal.el = Math.max(-89 * DEG, Math.min(89 * DEG, goal.el));
    goal.dist = Math.max(0.08, Math.min(120, goal.dist));
    goal.fov = Math.max(1, Math.min(120, goal.fov));
    if (instant) { Object.assign(cur, goal); lastSet = T.getShotView ? T.getShotView() : null; }
    dirty = true;
  }
  // A named view (or { yaw, pitch, dist, fov, at }) of the current subject, fitted to it unless dist is given.
  function view(name = 'three', { instant = false, margin, follow: shouldFollow = true } = {}) {
    if (typeof name !== 'string' && (!name || typeof name !== 'object' || Array.isArray(name))) throw new TypeError('view must be a name or camera settings');
    const s = ix.subject, f = s ? s.focus(true) : { center: { x: 0, y: 1, z: 0 }, size: { x: 1, y: 2, z: 1 }, yaw: 0 };
    const fov = typeof name === 'object' && name.fov != null ? +name.fov : goal.fov || 35;
    if (!Number.isFinite(fov) || fov < 1 || fov > 120) throw new RangeError('view fov must be between 1 and 120 degrees');
    if (margin != null && (!Number.isFinite(margin) || margin <= 0)) throw new RangeError('view margin must be positive and finite');
    if (s && s.entry.kind === 'marine' && typeof name === 'string' && MARINE_VIEWS[name]) {
      const b = MARINE_VIEWS[name], base = s.base ? s.base() : f.center, yaw = f.yaw || 0;
      const ax = b.at[0], az0 = b.at[2], cs = Math.cos(yaw), sn = Math.sin(yaw);
      const whole = name === 'full' || name === 'threeQ', part = !whole && s.bookmark ? s.bookmark(name) : null;
      const at = whole ? f.center : part ? part.center : { x: base.x + ax * cs + az0 * sn, y: base.y + b.at[1], z: base.z - ax * sn + az0 * cs };
      const size = whole ? f.size : part && part.size;
      const dist = size ? Math.max(b.dist, fitDistance(size, yaw + b.yaw * DEG, b.pitch * DEG, 40, aspect(), margin || 1.12)) : b.dist;
      set({ tx: at.x, ty: at.y, tz: at.z, az: yaw + b.yaw * DEG, el: b.pitch * DEG, dist, fov: 40 }, instant);
      followBookmark = part ? name : null;
      const ref = part ? part.center : f.center;
      followAt = { dx: goal.tx - ref.x, dy: goal.ty - ref.y, dz: goal.tz - ref.z };
      follow = !!shouldFollow;
      return goal;
    }
    let vy, vp, dist = null;
    if (typeof name === 'string') { const v = VIEWS[name]; if (!v) throw new Error('no view "' + name + '" (' + Object.keys(VIEWS).concat(Object.keys(MARINE_VIEWS)).join(', ') + ')'); [vy, vp] = v; }
    else { vy = name.yaw != null ? +name.yaw : 40; vp = name.pitch != null ? +name.pitch : 18; dist = name.dist != null ? +name.dist : null; }
    const az = vy * DEG + (f.yaw || 0), el = vp * DEG;
    const at = typeof name === 'object' && name.at ? name.at : f.center;   // (a string has .at too)
    if (dist == null) dist = fitDistance(f.size, az, el, fov, aspect(), margin || (s && s.entry.margin) || 1.2);
    set({ tx: at.x, ty: at.y, tz: at.z, az, el, dist, fov }, instant);
    followBookmark = null;
    followAt = { dx: goal.tx - f.center.x, dy: goal.ty - f.center.y, dz: goal.tz - f.center.z };
    follow = !!shouldFollow;
    return goal;
  }
  function orbitBy(dAzDeg, dElDeg) { set({ az: goal.az + dAzDeg * DEG, el: goal.el + dElDeg * DEG }); }
  function dolly(k) { set({ dist: goal.dist * k }); }
  function pan(rightM, upM) {
    const fx = -Math.sin(goal.az), fz = -Math.cos(goal.az);   // forward on the ground
    const rx = -fz, rz = fx;
    const ux = Math.sin(goal.el) * fx, uy = Math.cos(goal.el), uz = Math.sin(goal.el) * fz;   // the screen's up
    set({ tx: goal.tx + rx * rightM + ux * upM, ty: goal.ty + uy * upM, tz: goal.tz + rz * rightM + uz * upM });
    if (followAt) { followAt.dx += rx * rightM + ux * upM; followAt.dy += uy * upM; followAt.dz += rz * rightM + uz * upM; }
  }
  function lookAt(p, closer = 0.6) {
    set({ tx: p.x, ty: p.y, tz: p.z, dist: Math.max(0.2, goal.dist * closer) });
    followBookmark = null;
    const s = ix.subject;
    if (s) { const f = s.focus(); followAt = { dx: p.x - f.center.x, dy: p.y - f.center.y, dz: p.z - f.center.z }; }
  }

  // --- the mouse, on the stage element (the canvas never sees it, so the game never aims or fires from it) ------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const s = ix.subject, el = T.renderer.domElement, r = el.getBoundingClientRect();
    if (!s) return null;
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, T.camera);
    const hits = ray.intersectObject(s.rig(), true).filter((h) => { for (let n = h.object; n; n = n.parent) if (n.visible === false) return false; return true; });
    return hits.length ? hits[0].point : null;
  }
  function attach(el) {
    let drag = null;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, mode: e.button === 2 || e.button === 1 || e.shiftKey ? 'pan' : 'orbit' };
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if (drag.mode === 'orbit') orbitBy(-dx * 0.35, dy * 0.3);
      else { const k = goal.dist * Math.tan(goal.fov * DEG / 2) * 2 / Math.max(1, el.clientHeight); pan(-dx * k, dy * k); }
      ix.ui && ix.ui.cameraMoved && ix.ui.cameraMoved();
    });
    const up = (e) => { drag = null; try { el.releasePointerCapture(e.pointerId); } catch (_) {} };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => { e.preventDefault(); dolly(Math.exp(e.deltaY * (e.ctrlKey ? 0.004 : 0.0012))); }, { passive: false });
    el.addEventListener('dblclick', (e) => { const p = pick(e.clientX, e.clientY); if (p) lookAt(p); });
  }

  // Each frame (in the inspector's frame, before the draw).
  function frame() {
    const now = performance.now(), dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
    if (ix.drive) return;   // the game's own camera while driving; release() remains released
    // somebody else aimed the camera (tools/camera.mjs): pick up from where they left it
    const sv = T.getShotView ? T.getShotView() : null;
    if (sv && lastSet && sv !== lastSet) {
      const dx = sv.x - sv.tx, dy = sv.y - sv.ty, dz = sv.z - sv.tz, d = Math.hypot(dx, dy, dz) || 1;
      Object.assign(cur, { tx: sv.tx, ty: sv.ty, tz: sv.tz, dist: d, az: Math.atan2(dx, dz), el: Math.asin(Math.max(-1, Math.min(1, dy / d))), fov: sv.fov || cur.fov });
      Object.assign(goal, cur); lastSet = sv; follow = false; followBookmark = null;
      return;
    }
    const s = ix.subject;
    if (follow && s && s.live && followAt) {
      const f = s.focus(), part = followBookmark && s.bookmark ? s.bookmark(followBookmark) : null, at = part ? part.center : f.center;
      const tx = at.x + followAt.dx, ty = at.y + followAt.dy, tz = at.z + followAt.dz;
      const mx = tx - goal.tx, my = ty - goal.ty, mz = tz - goal.tz;
      if (Math.abs(mx) + Math.abs(my) + Math.abs(mz) > 1e-5) { goal.tx += mx; goal.ty += my; goal.tz += mz; cur.tx += mx; cur.ty += my; cur.tz += mz; dirty = true; }
    }
    const k = 1 - Math.exp(-14 * dt);
    let moving = false;
    for (const key of ['tx', 'ty', 'tz', 'az', 'el', 'dist', 'fov']) {
      const d = goal[key] - cur[key];
      if (Math.abs(d) > 1e-5) { cur[key] += d * k; moving = true; } else cur[key] = goal[key];
    }
    if (moving || dirty || !sv) { T.setShotView(cam()); lastSet = T.getShotView ? T.getShotView() : null; dirty = false; }
  }
  return {
    view, set, orbitBy, dolly, pan, lookAt, pick, attach, frame, cam: () => cam(cur), goalCam: () => cam(goal),
    state: () => ({ ...goal, yaw: goal.az / DEG, pitch: goal.el / DEG }),
    azimuth: () => cur.az,
    follow: (on) => { if (on != null) follow = !!on; return follow; },
    followState: () => ({ enabled: follow, bookmark: followBookmark, offset: followAt && { ...followAt } }),
    restoreFollow(s) { if (!s || typeof s.enabled !== 'boolean' || (s.bookmark != null && !Object.hasOwn(MARINE_VIEWS, s.bookmark))) throw new Error('invalid camera follow state');
      if (s.offset && !['dx', 'dy', 'dz'].every((k) => Number.isFinite(s.offset[k]))) throw new Error('invalid camera follow offset');
      follow = s.enabled; followBookmark = s.bookmark || null; followAt = s.offset && { ...s.offset }; },
    fov: (v) => { if (v != null) set({ fov: +v }); return goal.fov; },
    release() { lastSet = null; T.setShotView(null); }
  };
}
