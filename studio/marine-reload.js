// studio/marine-reload.js — a hand path clip (CL-84 part 2): where the marine's support hand goes through a
// magazine change, as keys over the reload, and what the magazine does meanwhile. The clip is data
// (studio/clips/marine/reload-rifle.json); this file reads it. No three.js here: points are plain {x, y, z}, so the
// game, the renderer and Node's tests share it.
//
// A key is { t, at, off? }: t is 0..1 of the reload, `at` a named place the game turns into a point every frame (the
// gun moves while he reloads), `off` metres in the marine's own axes (the support side, up, forward). Between two
// keys the hand eases (smoothstep) along a Catmull-Rom curve through the keys either side, so it arcs out round the
// body instead of cutting straight through it.

export const HAND_PATH_FORMAT = 'dw-hand-path/1';
export const MAG_STATES = ['seated', 'drop', 'gone', 'hand'];

export function validateHandPath(json) {
  const bad = (m) => { throw new Error('hand path ' + (json && json.name || '?') + ': ' + m); };
  if (!json || json.format !== HAND_PATH_FORMAT) bad('format must be ' + HAND_PATH_FORMAT);
  if (!Array.isArray(json.hand) || json.hand.length < 2) bad('needs at least two hand keys');
  const places = json.places ? Object.keys(json.places) : null;
  let last = -1;
  for (const k of json.hand) {
    if (!(k.t >= 0 && k.t <= 1) || k.t < last) bad('hand key times must run 0..1 in order (' + k.t + ')');
    if (typeof k.at !== 'string' || (places && !places.includes(k.at))) bad('unknown place ' + k.at);
    if (k.off && !(Array.isArray(k.off) && k.off.length === 3 && k.off.every(Number.isFinite))) bad('off must be [x, y, z]');
    last = k.t;
  }
  if (json.hand[0].t !== 0 || json.hand[json.hand.length - 1].t !== 1) bad('the hand must start at t 0 and end at t 1');
  if (json.hand[0].at !== json.hand[json.hand.length - 1].at) bad('the hand must end where it started');
  last = -1;
  for (const m of json.mag || []) {
    if (!(m.t >= 0 && m.t <= 1) || m.t < last) bad('mag key times must run 0..1 in order');
    if (!MAG_STATES.includes(m.do)) bad('unknown mag state ' + m.do);
    last = m.t;
  }
  return json;
}

const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

// The four keys round u and how far along the middle pair (eased): { k0, k1, k2, k3, s }.
export function handKeysAt(clip, u) {
  const H = clip.hand, n = H.length;
  u = Math.max(0, Math.min(1, u));
  let i = 0;
  while (i < n - 2 && u >= H[i + 1].t) i++;
  const a = H[i], b = H[i + 1], span = b.t - a.t;
  const s = span > 0 ? smooth((u - a.t) / span) : 1;
  return { k0: H[Math.max(0, i - 1)], k1: a, k2: b, k3: H[Math.min(n - 1, i + 2)], s, i };
}

// Uniform Catmull-Rom through p1..p2 (p0 and p3 shape the ends), s in 0..1. Writes to `out` and returns it.
export function catmullRom(p0, p1, p2, p3, s, out = { x: 0, y: 0, z: 0 }) {
  const s2 = s * s, s3 = s2 * s;
  for (const c of ['x', 'y', 'z']) {
    out[c] = 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * s + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * s2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * s3);
  }
  return out;
}

// The hand's point at u. `place(at)` returns the named place as {x, y, z}; `axes` = { side, up, fwd } unit vectors
// for the offsets. One point per key is resolved (at most four).
export function handPointAt(clip, u, place, axes, out = { x: 0, y: 0, z: 0 }) {
  const { k0, k1, k2, k3, s } = handKeysAt(clip, u);
  const pt = (k) => {
    const p = place(k.at), o = k.off;
    if (!o) return { x: p.x, y: p.y, z: p.z };
    return {
      x: p.x + axes.side.x * o[0] + axes.up.x * o[1] + axes.fwd.x * o[2],
      y: p.y + axes.side.y * o[0] + axes.up.y * o[1] + axes.fwd.y * o[2],
      z: p.z + axes.side.z * o[0] + axes.up.z * o[1] + axes.fwd.z * o[2]
    };
  };
  return catmullRom(pt(k0), pt(k1), pt(k2), pt(k3), s, out);
}

// What the magazine does at u: { state, k } with k 0..1 through that state (until the next key).
export function magAt(clip, u) {
  const M = clip.mag || [];
  let i = -1;
  for (let j = 0; j < M.length; j++) if (u >= M[j].t) i = j;
  if (i < 0) return { state: 'seated', k: 1 };
  const t0 = M[i].t, t1 = i + 1 < M.length ? M[i + 1].t : 1;
  return { state: M[i].do, k: t1 > t0 ? Math.max(0, Math.min(1, (u - t0) / (t1 - t0))) : 1 };
}

// The browser's side: fetch a hand path clip from studio/clips/marine/, next to this file wherever it is served.
export async function fetchHandPath(name) {
  const r = await fetch(new URL('./clips/marine/' + name + '.json', import.meta.url));
  if (!r.ok) throw new Error('studio/clips/marine/' + name + '.json: ' + r.status);
  return validateHandPath(await r.json());
}
