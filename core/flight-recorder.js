// CU-160: the flight recorder's buffer. The game fills it; this file only stores.
// Two minutes of frames in one typed ring (no per-frame allocation) and a snapshot
// every few seconds. Exact numbers stay in memory; the saved JSON rounds them.

export const FLIGHT_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyC'];
export const FLIGHT_MAX = 120 * 120; // two minutes at 120 fps
export const FLIGHT_N = 28;

const T = 0, DT = 1, KEYS = 2, MDX = 3, MDY = 4, BUTTONS = 5, WHEEL = 6;
const YAW = 7, PITCH = 8, OTSW = 9, FIRST = 10, WEAPON = 11;
const PX = 12, PY = 13, PZ = 14, VX = 15, VZ = 16, VY = 17;
const CX = 18, CY = 19, CZ = 20, QX = 21, QY = 22, QZ = 23, QW = 24, FOV = 25;
const AIM = 26, CAMYAW = 27;

export function keyMask(keys) {
  let m = 0;
  for (let i = 0; i < FLIGHT_KEYS.length; i++) if (keys && keys[FLIGHT_KEYS[i]]) m |= 1 << i;
  return m;
}

export function applyKeyMask(keys, mask) {
  const m = mask | 0;
  for (let i = 0; i < FLIGHT_KEYS.length; i++) keys[FLIGHT_KEYS[i]] = !!(m & (1 << i));
}

// Same generator as core/math.js mulberry32, with the state readable so a snapshot can restore it.
export function createSeededRandom(seed) {
  let a = seed >>> 0;
  const random = function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    random,
    seed: seed >>> 0,
    state: () => a,
    restore(s) { a = +s || 0; }
  };
}

function view(data, idx) {
  const o = idx * FLIGHT_N;
  return {
    t: data[o + T], dt: data[o + DT], keys: data[o + KEYS],
    dx: data[o + MDX], dy: data[o + MDY], buttons: data[o + BUTTONS], wheel: data[o + WHEEL],
    yaw: data[o + YAW], pitch: data[o + PITCH], otsW: data[o + OTSW], first: data[o + FIRST], weapon: data[o + WEAPON],
    px: data[o + PX], py: data[o + PY], pz: data[o + PZ], vx: data[o + VX], vz: data[o + VZ], vy: data[o + VY],
    cx: data[o + CX], cy: data[o + CY], cz: data[o + CZ],
    qx: data[o + QX], qy: data[o + QY], qz: data[o + QZ], qw: data[o + QW], fov: data[o + FOV],
    aim: data[o + AIM], camYaw: data[o + CAMYAW]
  };
}

export function createFlightLog() {
  const data = new Float64Array(FLIGHT_MAX * FLIGHT_N);
  const scratch = new Float64Array(FLIGHT_N);
  let count = 0, head = 0;
  const snaps = [];
  const weapons = [];

  function weaponCode(name) {
    const s = name == null ? '' : String(name);
    let i = weapons.indexOf(s);
    if (i < 0) { i = weapons.length; weapons.push(s); }
    return i;
  }

  function push(frame) {
    const o = head * FLIGHT_N;
    for (let k = 0; k < FLIGHT_N; k++) data[o + k] = frame[k];
    head = (head + 1) % FLIGHT_MAX;
    if (count < FLIGHT_MAX) count++;
  }

  function fill(sample) {
    scratch[T] = sample.t; scratch[DT] = sample.dt; scratch[KEYS] = sample.keys;
    scratch[MDX] = sample.dx; scratch[MDY] = sample.dy; scratch[BUTTONS] = sample.buttons; scratch[WHEEL] = sample.wheel;
    scratch[YAW] = sample.yaw; scratch[PITCH] = sample.pitch; scratch[OTSW] = sample.otsW;
    scratch[FIRST] = sample.first ? 1 : 0; scratch[WEAPON] = weaponCode(sample.weapon);
    scratch[PX] = sample.px; scratch[PY] = sample.py; scratch[PZ] = sample.pz;
    scratch[VX] = sample.vx; scratch[VZ] = sample.vz; scratch[VY] = sample.vy;
    scratch[CX] = sample.cx; scratch[CY] = sample.cy; scratch[CZ] = sample.cz;
    scratch[QX] = sample.qx; scratch[QY] = sample.qy; scratch[QZ] = sample.qz; scratch[QW] = sample.qw;
    scratch[FOV] = sample.fov; scratch[AIM] = sample.aim; scratch[CAMYAW] = sample.camYaw;
    push(scratch);
  }

  function frames() {
    const out = new Array(count);
    const start = count < FLIGHT_MAX ? 0 : head;
    for (let n = 0; n < count; n++) out[n] = view(data, (start + n) % FLIGHT_MAX);
    return out;
  }

  function addSnap(snap) {
    snaps.push(snap);
    const cut = snap.t - 120;
    while (snaps.length && snaps[0].t < cut) snaps.shift();
  }

  function reset() { count = 0; head = 0; snaps.length = 0; }

  function clip(meta) {
    return {
      version: 1,
      game: meta.game || '1.0.0',
      commit: meta.commit || null,
      note: meta.note || '',
      savedAt: meta.savedAt || new Date().toISOString(),
      rngSeed: meta.rngSeed >>> 0,
      settings: meta.settings || {},
      weapons: weapons.slice(),
      frames: frames(),
      snapshots: snaps.map((s) => JSON.parse(JSON.stringify(s)))
    };
  }

  return { fill, frames, addSnap, snaps, reset, clip, weaponCode, weapons };
}
