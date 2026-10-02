// GB-107 (P-138, D-67): fighting below. The rules of a warren's dead, with no three.js and no DOM, so
// node can test them (game/below-fight.test.mjs) and index.html only has to move bodies and draw them.
//
//   createBelowFight({ points, cells, theme, setDone, origin }) -> the fight in one warren, for one delve
//     .sleepers / .nests            the warren's alcoves and nests (CL-99's points), with their state
//     .noise(x, z, r)               a shot heard within r m (GB-105's radius; a suppressor's is much less)
//     .touch(id) / .wake(id, why)   a sleeper shot or hit wakes at once
//     .tick(dt, see)                one frame: what wakes, what a nest sends, the set piece; returns the spawns
//     .hitNest(id, dmg, kind)       a nest takes a round, a blast or fire (weak to the last two)
//     .setKilled(n) / .cleared(box) the set piece's dead, and the Deep's clear (set piece dead, strongbox open)
//   navField(nav, x, z) / navStep(nav, field, x, z, out)   the warren's own flow field (its nav grid)
//
// The numbers are hollows.md 4 and 11 (Grokbot's): 24 awake at most; a sleeper wakes to a noise, to the gun light
// held on it 1.5 s within 8 m, or to him within 2.5 m, and wakes its neighbours within 4 m a moment later; a nest
// has 400 HP and, while he is within 20 m, wakes a new dead every 12 s, at most 3 of its own at once.

export const BELOW = Object.freeze({
  AWAKE_CAP: 24,
  TOUCH_R: 2.5,
  LIGHT_R: 8, LIGHT_S: 1.5, LIGHT_COS: Math.cos(0.42),   // the gun light's cone (the SpotLight's angle)
  NEIGHBOUR_R: 4, NEIGHBOUR_S: 0.7,
  NEST_HP: 400, NEST_R: 20, NEST_EVERY: 12, NEST_OWN: 3,
  NEST_MUL: Object.freeze({ blast: 2, fire: 2 }),   // weak to fire and blasts (D-62)
  DEEP_Y: 1.5,   // he is in the Deep's chamber when he stands in one of its cells
});

// Each Deep's set piece (hollows.md 3), from the kinds there are. 'at' is where each comes from round the
// Deep's centre (m); 'trigger' is 'deep' (he steps into the chamber) or 'strongbox' (the root knot).
export const SET_PIECES = Object.freeze({
  root: Object.freeze({ name: "the climbers' knot", trigger: 'strongbox', drop: 3.2,
    bodies: Object.freeze([['feral', 0, 0], ['feral', 1, 0.6], ['shambler', -1, 0.6], ['shambler', 0.6, -1], ['feral', -0.6, -1], ['shambler', 0, 1.4]]) }),
  shale: Object.freeze({ name: 'the shale flankers', trigger: 'deep',
    bodies: Object.freeze([['feral', -5, -1], ['shambler', -5, 0], ['feral', -5, 1], ['shambler', -5.6, 0.5],
      ['feral', 5, -1], ['shambler', 5, 0], ['feral', 5, 1], ['shambler', 5.6, -0.5]]) }),
  iron: Object.freeze({ name: 'the mine crew', trigger: 'deep',
    bodies: Object.freeze([['brute', 0, 0], ['military', 1.6, 0.4], ['military', -1.6, 0.4], ['military', 0.8, -1.6], ['military', -0.8, -1.6]]) }),
  wet: Object.freeze({ name: 'the drowned', trigger: 'deep', rise: true,
    bodies: Object.freeze([['drowned', 0, 0], ['drowned', 1.4, 0.6], ['drowned', -1.4, 0.6], ['drowned', 0.7, -1.3], ['drowned', -0.7, -1.3], ['drowned', 0, 1.6]]) }),
  hill: Object.freeze({ name: 'the barrow king', trigger: 'deep', king: true,
    bodies: Object.freeze([['colossus', 0, 0], ['military', 2.4, 1], ['military', -2.4, 1], ['shambler', 2, -1.8], ['shambler', -2, -1.8]]) }),
});

// What lies in a warren's alcoves: mostly its walkers, a few of its quick ones, and the theme's own.
const SLEEPER_KINDS = Object.freeze({
  root: ['shambler', 'shambler', 'feral', 'shambler', 'leaper'],
  shale: ['shambler', 'feral', 'shambler', 'feral', 'spitter'],
  iron: ['military', 'shambler', 'military', 'shambler', 'brute'],
  wet: ['drowned', 'shambler', 'drowned', 'drowned', 'spitter'],
  hill: ['shambler', 'shambler', 'military', 'shambler', 'brute'],
});
const NEST_KINDS = Object.freeze({ root: ['feral', 'shambler'], shale: ['feral', 'shambler'], iron: ['shambler', 'military'], wet: ['drowned', 'shambler'], hill: ['shambler', 'military'] });

export function sleeperKind(theme, i) { const k = SLEEPER_KINDS[theme] || SLEEPER_KINDS.root; return k[(i * 7 + 3) % k.length]; }
export function nestKind(theme, n) { const k = NEST_KINDS[theme] || NEST_KINDS.root; return k[n % k.length]; }

export function createBelowFight({ points, cells = [], theme = 'root', setDone = false, origin = { x: 0, y: -400, z: 0 }, cell = 6 } = {}) {
  const pts = points || {};
  const sleepers = (pts.sleepers || []).map((p, i) => ({ id: i, x: p.x, y: p.y || 0, z: p.z, depth: p.depth || 1, kind: sleeperKind(theme, i), state: 'asleep', lightT: 0, wakeIn: -1, why: null }));
  const nests = (pts.nests || []).map((p, i) => ({ id: i, x: p.x, y: p.y || 0, z: p.z, depth: p.depth || 1, hp: BELOW.NEST_HP, maxHp: BELOW.NEST_HP, alive: true, timer: BELOW.NEST_EVERY, sent: 0 }));
  const deepCells = new Set(cells.filter((c) => c.kind === 'deep').map((c) => c.i + ',' + c.j));
  const set = SET_PIECES[theme] || null;
  const setAt = pts.set || null;
  let setState = setDone ? 'done' : 'waiting';   // waiting -> due -> spawned -> dead | done (an earlier delve this run)
  let setLeft = 0, isCleared = false, pending = [];
  const events = [];

  function wake(id, why = 'hit') {
    const s = sleepers[id];
    if (!s || s.state === 'awake' || s.state === 'dead') return false;
    if (s.state === 'waking') { s.wakeIn = Math.min(s.wakeIn, 0); return false; }
    s.state = 'waking'; s.why = why; s.wakeIn = 0;
    return true;
  }
  function inDeep(x, z) {
    if (!deepCells.size) return false;
    return deepCells.has(Math.floor((x - origin.x) / cell) + ',' + Math.floor((z - origin.z) / cell));
  }
  function setBodies() {
    if (!set || !setAt) return [];
    return set.bodies.map(([kind, ox, oz], n) => ({ from: 'set', kind, n, x: setAt.x + ox, y: (setAt.y || 0) + (set.drop || 0), z: setAt.z + oz, drop: !!set.drop, rise: !!set.rise, king: !!set.king && n === 0 }));
  }

  return {
    theme, sleepers, nests, set,
    get setState() { return setState; },
    get isCleared() { return isCleared; },
    inDeep,
    wake,
    touch(id) { return wake(id, 'hit'); },
    // A shot heard within r m (its gun's hearing radius, cut by a suppressor): every sleeper inside wakes.
    noise(x, z, r) {
      let n = 0;
      if (!(r > 0)) return 0;
      for (const s of sleepers) if (s.state === 'asleep' && Math.hypot(s.x - x, s.z - z) <= r && wake(s.id, 'noise')) n++;
      return n;
    },
    // The root knot drops when he opens the strongbox.
    strongboxOpened() { if (set && set.trigger === 'strongbox' && setState === 'waiting') setState = 'due'; },
    // A nest takes damage. Returns { blown } once, the frame it goes.
    hitNest(id, dmg, kind = 'round') {
      const n = nests[id];
      if (!n || !n.alive || !(dmg > 0)) return null;
      n.hp -= dmg * (BELOW.NEST_MUL[kind] || 1);
      if (n.hp > 0) return { blown: false, hp: n.hp };
      n.hp = 0; n.alive = false;
      events.push({ kind: 'nest-blown', id, x: n.x, y: n.y, z: n.z });
      return { blown: true, hp: 0 };
    },
    // One frame. see: { x, y, z, dt, light: { on, x, z, dx, dz } | null, awake, nestOwn: { [id]: n } }.
    // Returns { wake: [sleeper ids getting up now], spawn: [{ from: 'nest' | 'set', kind, x, y, z, ... }], events }.
    tick(dt, see = {}) {
      const px = see.x || 0, pz = see.z || 0;
      const out = { wake: [], spawn: [], events: events.splice(0) };
      let room = BELOW.AWAKE_CAP - (see.awake | 0);
      // What he does to the sleepers: walking up to one, holding the light on one.
      const L = see.light && see.light.on ? see.light : null;
      for (const s of sleepers) {
        if (s.state !== 'asleep') continue;
        const dx = s.x - px, dz = s.z - pz, d = Math.hypot(dx, dz);
        if (d <= BELOW.TOUCH_R) { wake(s.id, 'touch'); continue; }
        let lit = false;
        if (L && d <= BELOW.LIGHT_R) {
          const lx = s.x - (L.x != null ? L.x : px), lz = s.z - (L.z != null ? L.z : pz), ll = Math.hypot(lx, lz) || 1, dl = Math.hypot(L.dx, L.dz) || 1;
          lit = (lx * L.dx + lz * L.dz) / (ll * dl) >= BELOW.LIGHT_COS;
        }
        s.lightT = lit ? s.lightT + dt : 0;
        if (s.lightT >= BELOW.LIGHT_S) wake(s.id, 'light');
      }
      // Getting up: one that wakes stirs its neighbours within 4 m a moment later. Nobody gets up past the cap;
      // the rest lie stirring until there is room.
      for (const s of sleepers) {
        if (s.state !== 'waking') continue;
        s.wakeIn -= dt;
        if (s.wakeIn > 0) continue;
        if (room <= 0) continue;
        s.state = 'awake'; room--;
        out.wake.push(s.id);
        for (const o of sleepers) if (o.state === 'asleep' && Math.hypot(o.x - s.x, o.z - s.z) <= BELOW.NEIGHBOUR_R) { o.state = 'waking'; o.why = 'neighbour'; o.wakeIn = BELOW.NEIGHBOUR_S; }
      }
      // The nests: while he is within 20 m, a new dead every 12 s, at most 3 of its own at once.
      for (const n of nests) {
        if (!n.alive) continue;
        const near = Math.hypot(n.x - px, n.z - pz) <= BELOW.NEST_R && Math.abs((see.y != null ? see.y : n.y) - n.y) < 3;
        if (!near) continue;
        n.timer -= dt;
        if (n.timer > 0) continue;
        const own = (see.nestOwn && see.nestOwn[n.id]) | 0;
        if (own >= BELOW.NEST_OWN || room <= 0) { n.timer = 0; continue; }
        n.timer = BELOW.NEST_EVERY;
        out.spawn.push({ from: 'nest', nest: n.id, kind: nestKind(theme, n.sent++), x: n.x, y: n.y, z: n.z });
        room--;
      }
      // The set piece, once a run: when he steps into the Deep's chamber (or, the root knot, opens the box).
      if (setState === 'waiting' && set && set.trigger === 'deep' && inDeep(px, pz) && (see.y == null || setAt == null || Math.abs(see.y - (setAt.y || 0)) < BELOW.DEEP_Y + 2)) setState = 'due';
      if (setState === 'due') {
        pending = setBodies();
        setLeft = pending.length;
        setState = pending.length ? 'spawned' : 'dead';
        out.events.push({ kind: 'set-piece', theme, name: set ? set.name : null, n: setLeft });
      }
      // The set piece comes once; past the cap the rest of it waits in the dark until there is room.
      while (pending.length && room > 0) { out.spawn.push(pending.shift()); room--; }
      return out;
    },
    setKilled(n = 1) {
      if (setState !== 'spawned') return setLeft;
      setLeft = Math.max(0, setLeft - n);
      if (!setLeft) setState = 'dead';
      return setLeft;
    },
    // The Deep is cleared when the set piece is dead and the strongbox open (once).
    cleared(strongboxOpen) {
      if (isCleared) return false;
      if (strongboxOpen && (setState === 'dead' || setState === 'done')) { isCleared = true; return true; }
      return false;
    },
    awakeSleepers() { return sleepers.filter((s) => s.state === 'awake').length; },
  };
}

// The warren's own flow field: walking distance (m) from every walkable nav cell to (x, z), 8-way, no corner cutting.
export function navField(nav, x, z) {
  const { w, h, walkable } = nav, N = nav.cell;
  const dist = new Float64Array(w * h).fill(Infinity);   // 64-bit: a 32-bit store rounds below the heap key and drops the entry
  const a0 = Math.floor((x - nav.ox) / N), b0 = Math.floor((z - nav.oz) / N);
  const field = { dist, w, h, ready: false };
  if (a0 < 0 || b0 < 0 || a0 >= w || b0 >= h) return field;
  let start = b0 * w + a0;
  if (!walkable[start]) {   // he stands in a wall's margin: start from the nearest open cell
    let best = -1, bd = Infinity;
    for (let db = -2; db <= 2; db++) for (let da = -2; da <= 2; da++) {
      const a = a0 + da, b = b0 + db;
      if (a < 0 || b < 0 || a >= w || b >= h || !walkable[b * w + a]) continue;
      const d = da * da + db * db;
      if (d < bd) { bd = d; best = b * w + a; }
    }
    if (best < 0) return field;
    start = best;
  }
  // Dijkstra on a small grid (64 x 64): a binary heap is plenty.
  const hk = [], hv = [];
  const push = (k, v) => { hk.push(k); hv.push(v); let c = hk.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (hk[p] <= hk[c]) break; [hk[p], hk[c]] = [hk[c], hk[p]]; [hv[p], hv[c]] = [hv[c], hv[p]]; c = p; } };
  const pop = () => { const v = hv[0], lk = hk.pop(), lv = hv.pop(); if (hk.length) { hk[0] = lk; hv[0] = lv; let c = 0; for (;;) { let m = 2 * c + 1; if (m >= hk.length) break; if (m + 1 < hk.length && hk[m + 1] < hk[m]) m++; if (hk[m] >= hk[c]) break; [hk[m], hk[c]] = [hk[c], hk[m]]; [hv[m], hv[c]] = [hv[c], hv[m]]; c = m; } } return v; };
  dist[start] = 0; push(0, start);
  while (hk.length) {
    const key = hk[0], cur = pop();
    if (key > dist[cur]) continue;
    const ca = cur % w, cb = (cur / w) | 0;
    for (let db = -1; db <= 1; db++) for (let da = -1; da <= 1; da++) {
      if (!da && !db) continue;
      const a = ca + da, b = cb + db;
      if (a < 0 || b < 0 || a >= w || b >= h) continue;
      const k = b * w + a;
      if (!walkable[k]) continue;
      if (da && db && (!walkable[cb * w + a] || !walkable[b * w + ca])) continue;
      const d = key + (da && db ? 1.4142 : 1) * N;
      if (d < dist[k]) { dist[k] = d; push(d, k); }
    }
  }
  field.ready = true;
  return field;
}

// Which way to walk from (x, z) down the field: writes a unit vector to out, false if the field has nothing to say.
export function navStep(nav, field, x, z, out) {
  if (!field || !field.ready) return false;
  const { w, h, walkable } = nav, N = nav.cell, dist = field.dist;
  const a0 = Math.floor((x - nav.ox) / N), b0 = Math.floor((z - nav.oz) / N);
  if (a0 < 0 || b0 < 0 || a0 >= w || b0 >= h) return false;
  let tk = -1, best = dist[b0 * w + a0];
  const here = best;
  for (let db = -1; db <= 1; db++) for (let da = -1; da <= 1; da++) {
    if (!da && !db) continue;
    const a = a0 + da, b = b0 + db;
    if (a < 0 || b < 0 || a >= w || b >= h) continue;
    const k = b * w + a;
    if (here !== Infinity && da && db && (!walkable[b0 * w + a] || !walkable[b * w + a0])) continue;
    if (dist[k] < best) { best = dist[k]; tk = k; }
  }
  if (tk < 0) return false;
  const tx = nav.ox + ((tk % w) + 0.5) * N, tz = nav.oz + (((tk / w) | 0) + 0.5) * N;
  const dx = tx - x, dz = tz - z, l = Math.hypot(dx, dz);
  if (l < 1e-4) return false;
  out.x = dx / l; out.z = dz / l;
  return true;
}

// Can a body stand at (x, z)? (an open nav cell)
export function navOpen(nav, x, z) {
  const a = Math.floor((x - nav.ox) / nav.cell), b = Math.floor((z - nav.oz) / nav.cell);
  return a >= 0 && b >= 0 && a < nav.w && b < nav.h && !!nav.walkable[b * nav.w + a];
}
