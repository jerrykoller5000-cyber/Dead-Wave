// tools/camera-rig.js: the in-page half of tools/camera.mjs (Jerry, 2026-10-09: "a tool for all the agents so they can
// zoom around and get what they need quickly"). Loaded into the running game by camera.mjs (`import('/tools/camera-rig.js')`)
// and driven through window.CamRig. It only reads the game's debug hooks (window.TT) and parks the camera with
// TT.setShotView, which the frame loop applies last; it never changes game code or saves anything.
//
// A target is what to point at; a view is where to stand. resolve() turns both into a camera
// { x, y, z, tx, ty, tz, fov } and says what it framed.
//
//   weapon:<id>     a weapon alone in the sky, bare (pistol ... chainsaw, knife, machete, m240, m240Carried, mortar,
//                   mortarCarried); weapon:<id>:can for a gun with its suppressor
//   build:<kind>    a buildable alone in the sky (barricade, wall, platform, pillar, floor, stairs, wire, railing,
//                   spikes, light, flame, sandbag, mine, lure, barrel, heavy, mortar, m240); build:<kind>:<tier> upgraded first
//                   (build:light:2 is the Light turret Mk III; tiers are the game's UPGRADE_TRACKS, 0 = as built)
//   zombie:<type>   one zombie of that type, a statue in the sky (`targets zombie` lists the types)
//   survivor:<who>  okafor, brandt, pike
//   marine          a fresh marine in the sky (his default kit); `player` is the live one, wherever he is
//   live:<type|n>   a zombie in the game right now (the first alive of that kind, or the nth); corpse[:<n>] a body down
//   place:<id>      a place in the world: hq, tower, graveyard, mast, dock, pit, cabin, bridge:0, shed:2, wreck:1,
//                   camp:ranger, camp:hikers, camp:trapper, cave:root ... cave:chalk (`targets place` lists them all)
//   xyz:<x>,<y>,<z> any point (y may be "g" for the ground there); xz:<x>,<z> the ground at x, z
//   groups (batch and job only): turrets, build:<kind>:*, build:*:*, or any pattern with * (zombie:*, weapon:*)
//
// Views (around the target, in its own frame; things face +z, so "front" sees its face):
//   front, back, left (= side: its left side; a gun's muzzle to the left), right, three (front-left, above), threeR,
//   rear3, top, low (near the ground, looking up), eye (level) - or --yaw/--pitch (degrees; 0/0 = front, +yaw toward
//   its left) to stand anywhere on the sphere round it.
const DEG = Math.PI / 180;
const SKY = { x: -40, z: -70, up: 34 };          // the shelf: a patch of open sky the weapons sheets already use
const VIEWS = {
  side: [90, 2], left: [90, 2], right: [-90, 2], front: [0, 4], back: [180, 4], three: [40, 24], threeR: [-40, 24],
  rear3: [140, 24], top: [0, 89], low: [30, -8], eye: [20, 0]
};

export function install() {
  const T = window.TT, THREE = T.THREE;
  const base = new THREE.Vector3(SKY.x, T.sampleHeight(SKY.x, SKY.z) + SKY.up, SKY.z);
  const shelf = new Map();   // name -> Object3D, made on first use, hidden when another is shown
  const hideShelf = () => { for (const o of shelf.values()) o.visible = false; };
  const box = new THREE.Box3(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  let last = null, lastMeta = null;

  // CL-136: three's clone() copies userData through JSON, and a gun's userData holds its flash, laser and moving
  // parts (whole objects, geometry and all): that was most of the first picture's 14 s. The game's cloneLean copies
  // the tree without that; this is the same thing for a game without it.
  const cloneLean = T.cloneLean || function cl(obj) {
    const ud = obj.userData; obj.userData = {};
    let c; try { c = new obj.constructor().copy(obj, false); } finally { obj.userData = ud; }
    c.userData = {};
    for (const k in ud) if (ud[k] == null || typeof ud[k] !== 'object') c.userData[k] = ud[k];
    for (const ch of obj.children) c.add(cl(ch));
    return c;
  };
  const fxMats = (src) => new Set([src.userData.flash, src.userData.laser, src.userData.flare].filter(Boolean).map((o) => o.material));
  const bare = (g, src, can = false) => {
    const fx = src ? fxMats(src) : new Set();
    g.traverse((o) => {
      o.visible = o.name === 'suppressor' ? can : !(o.material && fx.has(o.material));
      if (o.name === 'flash' || (o.userData && o.userData.isFlash)) o.visible = false;
      if (o.isLight) o.intensity = 0;
    });
    return g;
  };
  const onShelf = (g, yaw = 0) => { g.position.copy(base); g.rotation.set(0, yaw, 0); g.visible = true; if (!g.parent) T.scene.add(g); return g; };
  function shelfItem(name, make) {
    if (!shelf.has(name)) { const g = make(); if (!g) return null; g.visible = false; shelf.set(name, g); }
    return shelf.get(name);
  }

  // --- what there is -------------------------------------------------------------------------------------------
  const WEAPONS = () => [...Object.keys(T.weaponMeshes || {}), 'knife', 'machete', 'm240', 'm240Carried', 'mortar', 'mortarCarried'];
  const BUILDS = ['barricade', 'wall', 'platform', 'pillar', 'floor', 'stairs', 'wire', 'railing', 'spikes', 'light', 'flame', 'sandbag', 'mine', 'lure', 'barrel', 'heavy', 'mortar', 'm240'];
  const zombieTypes = () => Object.keys(T.ZOMBIE_TYPES || {}).filter((k) => T.ZOMBIE_TYPES[k] && T.ZOMBIE_TYPES[k].name);
  let placeRows = null;
  async function places() {
    if (placeRows) return placeRows;
    const { mapLandmarks } = await import('/ui/map-landmarks.js');
    const P = T.POI || {}, hq = T.house && T.house.group ? T.house.group.position : { x: 0, z: 0 };
    const rows = mapLandmarks(P, hq, T.LAKE_HOLE);
    const out = [];
    for (const r of rows) {
      let id = r.id;
      const [kind, i] = id.split(':');
      const list = P[{ camp: 'campsites', cave: 'caves' }[kind] || kind]; const src = i != null ? (list || [])[+i] : list;
      if (kind === 'camp' && src && src.style) id = 'camp:' + src.style;
      else if (kind === 'cave' && src && src.theme) id = 'cave:' + src.theme;
      else if (kind === 'cabins') id = +i ? 'cabin:' + i : 'cabin';
      else if (kind === 'bridges') id = 'bridge:' + i;
      else if (kind === 'sheds') id = 'shed:' + i;
      else if (kind === 'wrecks') id = 'wreck:' + i;
      if (out.some((o) => o.id === id)) id = r.id;
      out.push({ id, x: r.x, z: r.z, yaw: src && Number.isFinite(src.yaw) ? src.yaw : null });
    }
    placeRows = out;
    return out;
  }
  // --- groups: one name, many targets (the batch and job commands expand them) --------------------------------------
  //   turrets          every turret at every tier (light, flame, heavy, mortar), then the M240
  //   build:<kind>:*   that buildable at every tier; build:*:* every buildable at every tier
  //   anything with *  matched against the target list: zombie:*, weapon:*, survivor:*, place:cave:*
  // Each comes back as { target, caption, row } (caption: the game's own name for it; row: one per kind, for sheets).
  const tiersOf = (k) => {
    const tr = T.UPGRADE_TRACKS && T.UPGRADE_TRACKS[k];
    const names = tr && tr.names && tr.names.length ? tr.names : [k];
    return names.map((nm, i) => ({ target: 'build:' + k + (i ? ':' + i : ''), caption: nm, row: k }));
  };
  const GROUPS = { turrets: () => [...['light', 'flame', 'heavy', 'mortar'].flatMap(tiersOf), { target: 'build:m240', caption: 'M240 emplacement', row: 'm240' }] };
  async function expand(spec) {
    spec = String(spec || '');
    if (GROUPS[spec]) return GROUPS[spec]();
    const [kind, a, b] = spec.split(':');
    if (kind === 'build' && b === '*') return (a === '*' ? BUILDS : [a]).flatMap(tiersOf);
    if (spec.includes('*')) {
      const re = new RegExp('^' + spec.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
      const hit = (await targets()).filter((t) => re.test(t));
      if (!hit.length) throw new Error('nothing matches "' + spec + '" (try: targets)');
      return hit.map((t) => ({ target: t, caption: t.split(':').slice(1).join(' '), row: t.split(':')[0] }));
    }
    return [{ target: spec }];
  }
  async function targets(filter = '') {
    const all = [
      ...WEAPONS().map((k) => 'weapon:' + k), ...BUILDS.map((k) => 'build:' + k),
      ...zombieTypes().map((k) => 'zombie:' + k), 'survivor:okafor', 'survivor:brandt', 'survivor:pike', 'marine', 'player',
      ...(await places()).map((p) => 'place:' + p.id)
    ];
    return all.filter((t) => t.includes(filter));
  }

  // --- a target, made ready and measured -------------------------------------------------------------------------
  // Returns { center: {x,y,z}, size: {x,y,z}, yaw, label }.
  function measure(g, label, yaw = 0) {
    g.updateMatrixWorld(true); box.makeEmpty();
    g.traverseVisible((o) => { if (o.isMesh || o.isSkinnedMesh) box.expandByObject(o); });
    if (box.isEmpty()) box.setFromObject(g);
    box.getCenter(v3); box.getSize(s3);
    return { center: { x: v3.x, y: v3.y, z: v3.z }, size: { x: s3.x, y: s3.y, z: s3.z }, yaw, label };
  }
  async function target(spec) {
    const [kind, a, b] = String(spec).split(':');
    hideShelf();
    if (T.dressGuns) T.dressGuns({ guns: {} });
    if (kind === 'weapon') {
      const can = b === 'can';
      const g = shelfItem('weapon:' + a + (can ? ':can' : ''), () => {
        const src = T.weaponMeshes && T.weaponMeshes[a];
        if (src) return bare(cloneLean(src), src, can);
        if (a === 'knife' || a === 'machete') {
          let kn = T.knifeMesh ? T.knifeMesh() : null;
          if (!kn) T.scene.traverse((o) => { if (!kn && o.userData && o.userData.knifeModel) kn = o; });
          const part = kn && kn.userData[a + 'Model'];
          return part ? bare(cloneLean(part)) : null;
        }
        if (a === 'm240' || a === 'mortar') { const bd = T.spawnBuild(a, SKY.x, SKY.z + 6); return bd && bd.mesh ? bare(bd.mesh) : null; }
        const cm = T.m240VisDbg ? T.m240VisDbg().carriedGun : null;
        if (a === 'm240Carried' && cm) { const g = bare(cloneLean(cm)); g.scale.setScalar(1); return g; }
        if (a === 'mortarCarried' && cm && cm.parent) {
          const mt = cm.parent.children.find((o) => o !== cm && Math.abs(o.scale.x - 0.78) < 1e-3 && Math.abs(o.position.y - 1.06) < 1e-3);
          if (mt) { const g = bare(cloneLean(mt)); g.scale.setScalar(1); return g; }
        }
        return null;
      });
      if (!g) throw new Error('no weapon "' + a + '" (try: targets weapon)');
      // guns lie along z, the muzzle at +z: "front" looks down the barrel, "side" is its left side, muzzle to the left
      return measure(onShelf(g), 'weapon ' + a, 0);
    }
    if (kind === 'build') {
      // build:<kind>:<tier> takes it up its upgrade track first (light:2 is the Light turret Mk III)
      const tier = b ? Math.max(0, parseInt(b, 10) || 0) : 0;
      const g = shelfItem('build:' + a + (tier ? ':' + tier : ''), () => {
        const bd = T.spawnBuild(a, SKY.x, SKY.z + 6);
        if (!bd) return null;
        if (tier) {
          if (!T.applyUpgrade) throw new Error('this build has no TT.applyUpgrade');
          T.applyUpgrade(bd, a, tier);
          const got = T.tierOf ? T.tierOf(bd, a) : bd.tier | 0;
          if (got !== tier) throw new Error('build "' + a + '" has no tier ' + tier);
        }
        return bd.mesh ? bare(bd.mesh) : null;
      });
      if (!g) throw new Error('no buildable "' + a + '" (try: targets build)');
      return measure(onShelf(g), 'build ' + a + (tier ? ' tier ' + tier : ''), 0);
    }
    if (kind === 'zombie') {
      const g = shelfItem('zombie:' + a, () => {
        if (!T.ZOMBIE_TYPES[a]) return null;
        const z = T.spawnZombie(SKY.x + 3, SKY.z + 3, a, true, true);
        if (!z || !z.mesh) return null;
        const i = T.zombies.indexOf(z); if (i >= 0) T.zombies.splice(i, 1);   // out of the list: nothing moves it now
        return z.mesh;
      });
      if (!g) throw new Error('no zombie type "' + a + '" (try: targets zombie)');
      return measure(onShelf(g), 'zombie ' + a, 0);
    }
    if (kind === 'survivor') {
      const g = shelfItem('survivor:' + a, () => T.makeSurvivorFigure ? T.makeSurvivorFigure(a) : null);
      if (!g) throw new Error('no survivor "' + a + '"');
      return measure(onShelf(g), 'survivor ' + a, 0);
    }
    if (kind === 'marine') {
      const g = shelfItem('marine', () => T.makeMarine ? T.makeMarine() : null);
      if (!g) throw new Error('no marine factory');
      return measure(onShelf(g), 'marine', 0);
    }
    if (kind === 'live') {   // CL-137: a zombie that is actually in the game, where it is now: live:<type> (the first alive of that kind) or live:<n>
      const zs = (T.zombies || []).filter((q) => q.alive && q.mesh);
      const z = /^\d+$/.test(a || '') ? zs[+a] : zs.find((q) => q.typeKey === a) || (a === 'any' || a == null ? zs[0] : null);
      if (!z) throw new Error('no live zombie "' + (a || '') + '" (' + zs.length + ' alive)');
      const h = z.hitH || 1.6, r = (z.radius || 0.42) * 2;
      return { center: { x: z.mesh.position.x, y: z.mesh.position.y + h * 0.5, z: z.mesh.position.z }, size: { x: r, y: h, z: r }, yaw: z.mesh.rotation.y, label: 'live ' + z.typeKey };
    }
    if (kind === 'corpse') {   // CL-137: the newest body on the ground (corpse) or corpse:<n>
      const cs = T.corpses || [];
      const c = /^\d+$/.test(a || '') ? cs[+a] : cs[cs.length - 1];
      if (!c || !c.mesh) throw new Error('no corpse (' + cs.length + ')');
      return { center: { x: c.mesh.position.x, y: c.mesh.position.y + 0.7, z: c.mesh.position.z }, size: { x: 2.4, y: 1.9, z: 2.4 }, yaw: c.yaw || 0, label: 'corpse ' + c.typeKey };   // a body on its way down fills this; lying, it sits in the lower half
    }
    if (kind === 'player') {
      const p = T.player.position;
      return { center: { x: p.x, y: p.y + 0.9, z: p.z }, size: { x: 0.8, y: 1.9, z: 0.8 }, yaw: T.player.rotation.y, label: 'player' };
    }
    if (kind === 'place') {
      const id = [a, b].filter((x) => x != null).join(':');
      const rows = await places();
      const p = rows.find((r) => r.id === id) || rows.find((r) => r.id.startsWith(id));
      if (!p) throw new Error('no place "' + id + '" (try: targets place)');
      const gy = T.sampleHeight(p.x, p.z);
      const big = id === 'hq' ? 16 : id.startsWith('cave') ? 14 : id === 'pit' ? 24 : 12;
      return { center: { x: p.x, y: gy + big * 0.15, z: p.z }, size: { x: big, y: big * 0.4, z: big }, yaw: p.yaw || 0, label: 'place ' + p.id };
    }
    if (kind === 'xyz' || kind === 'xz') {
      const n = String(spec).slice(kind.length + 1).split(',');
      const x = +n[0], z = kind === 'xz' ? +n[1] : +n[2];
      const y = kind === 'xz' || n[1] === 'g' ? T.sampleHeight(x, z) : +n[1];
      if (![x, y, z].every(Number.isFinite)) throw new Error('bad point ' + spec);
      return { center: { x, y, z }, size: { x: 4, y: 2, z: 4 }, yaw: 0, label: 'point ' + [x, y, z].map((v) => +v.toFixed(2)).join(',') };
    }
    throw new Error('unknown target "' + spec + '" (try: targets)');
  }

  // --- where to stand -------------------------------------------------------------------------------------------
  // o: { view, yaw, pitch, dist, fov, aspect, margin, height, lookY } (degrees, metres)
  function frame(m, o = {}) {
    const fov = +o.fov || 35, aspect = +o.aspect || 16 / 9;
    const [vy, vp] = VIEWS[o.view || 'three'] || VIEWS.three;
    const az = (o.yaw != null ? +o.yaw : vy) * DEG + (m.yaw || 0), el = (o.pitch != null ? +o.pitch : vp) * DEG;
    const dir = { x: Math.sin(az) * Math.cos(el), y: Math.sin(el), z: Math.cos(az) * Math.cos(el) };
    const s = m.size, c = { ...m.center };
    if (o.lookY != null) c.y += +o.lookY;
    // fit the box as the camera sees it: its width across the view and its height (tilted by the pitch), each against
    // its half of the frame, then back off by half its depth, plus a margin
    const half = Math.tan(fov * DEG / 2);
    const across = Math.abs(s.x * Math.cos(az)) + Math.abs(s.z * Math.sin(az)), deep = Math.abs(s.x * Math.sin(az)) + Math.abs(s.z * Math.cos(az));
    const tall = s.y * Math.cos(el) + deep * Math.abs(Math.sin(el)), depth = deep * Math.cos(el) + s.y * Math.abs(Math.sin(el));
    const need = Math.max((tall / 2) / half, (across / 2) / (half * aspect), 0.3);
    const dist = o.dist != null ? +o.dist : need * (o.margin != null ? +o.margin : 1.15) + depth / 2;
    let y = c.y + dir.y * dist;
    if (o.height != null) y = c.y + +o.height;
    const cam = { x: c.x + dir.x * dist, y, z: c.z + dir.z * dist, tx: c.x, ty: c.y, tz: c.z, fov };
    if (Math.abs(dir.y) > 0.999) cam.z += 0.01;   // straight down: lookAt needs a hair of offset
    return cam;
  }

  // --- moving from the last camera ------------------------------------------------------------------------------
  // n: { orbit (deg, round the target, + is to the right), tilt (deg, + is up), zoom (x: 2 is twice as close),
  //      pan: [right, up] (m, camera and target together), fwd (m, both), fov }
  function nudge(cam, n = {}) {
    const c = { ...cam };
    let dx = c.x - c.tx, dy = c.y - c.ty, dz = c.z - c.tz;
    let r = Math.hypot(dx, dy, dz), az = Math.atan2(dx, dz), el = Math.asin(Math.max(-1, Math.min(1, dy / (r || 1))));
    if (n.orbit) az += +n.orbit * DEG;
    if (n.tilt) el = Math.max(-89 * DEG, Math.min(89 * DEG, el + +n.tilt * DEG));
    if (n.zoom) r /= +n.zoom;
    c.x = c.tx + Math.sin(az) * Math.cos(el) * r; c.y = c.ty + Math.sin(el) * r; c.z = c.tz + Math.cos(az) * Math.cos(el) * r;
    const fwd = { x: (c.tx - c.x) / r, y: (c.ty - c.y) / r, z: (c.tz - c.z) / r };
    const right = { x: -fwd.z, y: 0, z: fwd.x }, rl = Math.hypot(right.x, right.z) || 1; right.x /= rl; right.z /= rl;
    const up = { x: -right.z * fwd.y, y: right.z * fwd.x - right.x * fwd.z, z: right.x * fwd.y };
    const move = (vx, vy, vz) => { c.x += vx; c.y += vy; c.z += vz; c.tx += vx; c.ty += vy; c.tz += vz; };
    if (n.pan) { const [pr, pu] = n.pan.map(Number); move(right.x * pr + up.x * pu, up.y * pu, right.z * pr + up.z * pu); }
    if (n.fwd) move(fwd.x * n.fwd, fwd.y * n.fwd, fwd.z * n.fwd);
    if (n.fov) c.fov = +n.fov;
    return c;
  }

  // --- the frame around the picture -----------------------------------------------------------------------------
  const TIMES = { midnight: 0, night: 0.02, dawn: 0.26, morning: 0.33, noon: 0.5, day: 0.4, afternoon: 0.6, dusk: 0.74, evening: 0.78 };
  function setTime(t) {
    if (t == null || t === '') return;
    const v = t in TIMES ? TIMES[t] : +t;
    if (Number.isFinite(v) && T.setWorldTime) T.setWorldTime(v);
  }
  let uiHidden = false;
  function ui(show) {
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    if (!c) return;
    const keep = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const ch of document.body.children) {
      if (keep.has(ch) || ch.id === 'camRigCaption') continue;
      if (show) { if (ch.dataset.camHidden) { ch.style.removeProperty('display'); delete ch.dataset.camHidden; } }
      else if (ch.style.display !== 'none') { ch.style.setProperty('display', 'none', 'important'); ch.dataset.camHidden = '1'; }
    }
    uiHidden = !show;
    // the FPS readout (on because the camera loads the game with ?debug=1, which is what gives it window.TT) stays out
    // of the picture unless asked for
    const perf = document.getElementById('perf');
    if (perf) perf.style.visibility = show && perfWanted ? '' : 'hidden';
  }
  let perfWanted = false;
  function caption(text) {
    let el = document.getElementById('camRigCaption');
    if (!text) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'camRigCaption';
      el.style.cssText = 'position:fixed;left:16px;top:12px;z-index:99999;padding:5px 11px;background:#0b0f0ccc;border-top:3px solid #f2c418;color:#f4ecd0;font:600 20px/1.25 Impact,"Arial Black",sans-serif;letter-spacing:.05em;text-transform:uppercase;pointer-events:none';
      document.body.append(el);
    }
    el.textContent = text;
  }
  const frames = (n) => new Promise((res) => { let k = 0; const tick = () => (++k >= n ? res() : setTimeout(tick, 1000 / 60)); setTimeout(tick, 1000 / 60); });

  // --- one shot's worth: point, stand, light, wait for the picture to settle -----------------------------------------
  // req: { target?, view..., cam?: {x,y,z,tx,ty,tz,fov}, move?: {...}, time?, ui?, caption?, aspect, settle (ms) }
  async function aim(req = {}) {
    let meta = null, cam;
    // CL-137: `pre` is code run in the game right before this picture (T, R and wait(ms) in scope), so one shot can
    // set its own scene: a hit, a spawn, a pose, with no gap between the deed and the picture.
    if (req.pre) await (new Function('T', 'R', 'wait', 'return (async () => {' + req.pre + '})()'))(T, { aim, release, target, frame }, (ms) => new Promise((r) => setTimeout(r, ms)));
    if (req.live) {   // the game's own camera, as the player sees it
      T.setShotView(null); setTime(req.time); perfWanted = !!req.perf; ui(!!req.ui); caption(req.caption || '');
      await frames(3); await new Promise((r) => setTimeout(r, +req.settle || 120));
      const c = T.camera, d = new THREE.Vector3(); c.getWorldDirection(d);
      last = { x: c.position.x, y: c.position.y, z: c.position.z, tx: c.position.x + d.x * 10, ty: c.position.y + d.y * 10, tz: c.position.z + d.z * 10, fov: c.fov };
      lastMeta = { label: 'the play camera' };
      return { cam: last, target: 'the play camera', time: T.getWorldTime ? T.getWorldTime() : null };
    }
    if (req.target) meta = await target(req.target);   // stages it (a shelf item shown, the others hidden)
    if (req.cam) cam = { fov: 35, ...req.cam };
    else if (meta) cam = frame(meta, req);
    else if (last) { cam = last; meta = lastMeta; }
    else throw new Error('say what to point at: a target, --cam, or --live');
    if (req.move) cam = nudge(cam, req.move);
    setTime(req.time);
    perfWanted = !!req.perf; ui(!!req.ui);
    caption(req.caption || '');
    T.setShotView(cam);
    await frames(3);
    await new Promise((r) => setTimeout(r, +req.settle || 120));
    last = cam; lastMeta = meta;
    return { cam, target: meta && meta.label, center: meta && meta.center, size: meta && meta.size, time: T.getWorldTime ? T.getWorldTime() : null };
  }
  // the play camera back (for watching the game between shots, or before a scripted bit)
  function release() { T.setShotView(null); ui(true); caption(''); }
  function renderer() {
    try {
      const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (gl ? gl.getParameter(gl.RENDERER) : 'none');
    } catch (e) { return 'unknown'; }
  }
  return { targets, expand, groups: () => Object.keys(GROUPS), target, frame, nudge, aim, release, setTime, ui, caption, places, renderer, VIEWS, TIMES, last: () => last };
}
