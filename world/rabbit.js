// world/rabbit.js — the rabbit mound and the holy grenade (CL-93, P-123, D-63). Claude's.
//
// Far out from every trail there is one mound bigger than the others, with old bones and a skull scattered round its
// mouth. Shoot into it and a small white rabbit comes out, stares at you for a moment, then goes for your throat:
// one bite and your head is off. Bullets do nothing to it. The one answer is the holy grenade, hidden in the roots of
// the dead tree in the graveyard: pull the pin and a choir sings, the rabbit freezes where it is, and the blast ends it.
//
//   RABBIT                                   its timings, speeds and reaches, and the holy grenade's
//   pickMoundSite(cands)                     the most out-of-the-way spot (pure): { x, z, score } or null
//   createRabbit(home)                       the rabbit's state, asleep in its mound at `home` ({ x, z, yaw })
//   wakeRabbit(r)                            a shot into the mound: it comes out (only when asleep)
//   holdRabbit(r)                            the choir: it freezes where it is (while awake)
//   killRabbit(r)                            the holy blast
//   stepRabbit(r, dt, tgt)                   one tick (pure). tgt: { x, z, alive } or null. → events: 'out', 'lunge', 'bite', 'home'
//   lobVelocity(from, to, g, t)              the throw that lands at `to` after `t` s under gravity `g` (pure)
//   buildMound(T), buildKillerRabbit(T), buildHolyGrenade(T), buildReliquary(T)   the models (our own)
import { mulberry } from './first-people.js';

export const RABBIT = Object.freeze({
  OUT_S: 0.45,          // s from the mouth to the grass
  STARE_S: 1.1,         // s it looks at you before it goes
  LUNGE_SPEED: 12.5,    // m/s, in long low hops
  BITE_R: 0.85,         // m from him that it bites
  RECOVER_S: 0.75,      // s after a bite that didn't kill (godmode, a roll) before it goes again
  GIVE_UP_R: 45,        // m: further than this and it goes home
  HOME_SPEED: 5,
  HOLD_MAX_S: 4,        // the longest the choir holds it
  HOLY_R: 7,            // m: the holy blast
  HOLY_FLIGHT_S: 1.0,   // s the holy grenade is in the air
  HOLY_FUSE_S: 1.9,     // s from the pin to the blast (the choir sings through it)
  HOLY_REACH: 30,       // m: a rabbit this close is what it is thrown at
  MOUTH: 0.75           // m from the mound's middle to its mouth
});

// cands: [{ x, z, path, poi, ok }] (path: distance to the nearest trail, poi: to the nearest landmark). The best is
// the one furthest from both; a spot that isn't ok (water, slope, a solid) is never picked.
export function pickMoundSite(cands) {
  let best = null;
  for (const c of cands) {
    if (!c.ok) continue;
    const score = Math.min(c.path, c.poi * 0.8);
    if (!best || score > best.score) best = { x: c.x, z: c.z, score };
  }
  return best;
}

export function createRabbit(home) {
  return {
    mode: 'asleep', t: 0, hop: 0, x: home.x, z: home.z, y: 0, yaw: home.yaw || 0,
    home: { x: home.x, z: home.z, yaw: home.yaw || 0 }, bites: 0, wakes: 0
  };
}
export function rabbitMouth(home) {
  return { x: home.x + Math.sin(home.yaw || 0) * RABBIT.MOUTH, z: home.z + Math.cos(home.yaw || 0) * RABBIT.MOUTH };
}
export function rabbitAwake(r) { return r.mode !== 'asleep' && r.mode !== 'dead'; }
export function wakeRabbit(r) {
  if (r.mode !== 'asleep') return false;
  const m = rabbitMouth(r.home);
  r.mode = 'out'; r.t = 0; r.x = m.x; r.z = m.z; r.y = -0.3; r.wakes++;
  return true;
}
export function holdRabbit(r) {
  if (!rabbitAwake(r)) return false;
  r.mode = 'held'; r.t = 0; r.y = 0;
  return true;
}
export function killRabbit(r) {
  if (r.mode === 'dead') return false;
  r.mode = 'dead'; r.t = 0; r.y = 0;
  return true;
}

export function stepRabbit(r, dt, tgt) {
  const ev = [];
  if (r.mode === 'asleep' || r.mode === 'dead') return ev;
  r.t += dt;
  const live = tgt && tgt.alive;
  const dx = live ? tgt.x - r.x : 0, dz = live ? tgt.z - r.z : 0, d = Math.hypot(dx, dz);
  const goHome = () => { r.mode = 'home'; r.t = 0; ev.push('home'); };
  switch (r.mode) {
    case 'out':
      r.y = -0.3 + 0.3 * Math.min(1, r.t / RABBIT.OUT_S);
      if (live) r.yaw = Math.atan2(dx, dz);
      if (r.t >= RABBIT.OUT_S) { r.mode = 'stare'; r.t = 0; r.y = 0; ev.push('out'); }
      break;
    case 'stare':
      if (!live || d > RABBIT.GIVE_UP_R) { goHome(); break; }
      r.yaw = Math.atan2(dx, dz);
      if (r.t >= RABBIT.STARE_S) { r.mode = 'lunge'; r.t = 0; ev.push('lunge'); }
      break;
    case 'recover':
      if (!live || d > RABBIT.GIVE_UP_R) { goHome(); break; }
      r.yaw = Math.atan2(dx, dz);
      if (r.t >= RABBIT.RECOVER_S) { r.mode = 'lunge'; r.t = 0; ev.push('lunge'); }
      break;
    case 'lunge': {
      if (!live || d > RABBIT.GIVE_UP_R) { goHome(); break; }
      r.yaw = Math.atan2(dx, dz);
      const step = Math.min(d, RABBIT.LUNGE_SPEED * dt);
      if (d > 1e-6) { r.x += dx / d * step; r.z += dz / d * step; }
      r.hop += dt * 7;
      r.y = Math.abs(Math.sin(r.hop * Math.PI)) * 0.45;
      if (d - step <= RABBIT.BITE_R) { r.mode = 'recover'; r.t = 0; r.y = 0; r.bites++; ev.push('bite'); }
      break;
    }
    case 'held':
      r.y = 0;
      if (r.t >= RABBIT.HOLD_MAX_S) { r.mode = live ? 'lunge' : 'home'; r.t = 0; }
      break;
    case 'home': {
      const m = rabbitMouth(r.home);
      const hx = m.x - r.x, hz = m.z - r.z, hd = Math.hypot(hx, hz);
      if (live && d < RABBIT.GIVE_UP_R * 0.5) { r.mode = 'stare'; r.t = 0; break; }   // he followed it: it turns
      const step = Math.min(hd, RABBIT.HOME_SPEED * dt);
      if (hd > 1e-6) { r.x += hx / hd * step; r.z += hz / hd * step; r.yaw = Math.atan2(hx, hz); }
      r.hop += dt * 4;
      r.y = Math.abs(Math.sin(r.hop * Math.PI)) * 0.2;
      if (hd - step < 0.05) { r.mode = 'asleep'; r.t = 0; r.y = -0.3; ev.push('asleep'); }
      break;
    }
  }
  return ev;
}

export function lobVelocity(from, to, g = 16, t = RABBIT.HOLY_FLIGHT_S) {
  return { x: (to.x - from.x) / t, y: (to.y - from.y + 0.5 * g * t * t) / t, z: (to.z - from.z) / t };
}

// ---------------------------------------------------------------------------------------------------------------
// Models. All boxes and simple solids, our own.

const box = (T, g, w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
};

// The mound: a broad hump of dark earth, a black mouth at +z, and round the mouth the bones of whatever came before.
export function buildMound(T, seed = 93) {
  const rnd = mulberry(seed);
  const g = new T.Group();
  g.name = 'rabbit-mound';
  const earth = new T.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 });
  const dark = new T.MeshStandardMaterial({ color: 0x0d0a08, roughness: 1 });
  const bone = new T.MeshStandardMaterial({ color: 0xe6dfcc, roughness: 0.75 });
  const mound = new T.Mesh(new T.SphereGeometry(0.8, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), earth);
  mound.scale.set(1.25, 0.6, 1.25); mound.receiveShadow = true; g.add(mound);
  const hole = new T.Mesh(new T.CircleGeometry(0.3, 14), dark);
  hole.rotation.x = -0.45; hole.position.set(0, 0.2, 0.93); hole.scale.set(1, 0.8, 1); hole.name = 'rabbit-mound-mouth'; g.add(hole);   // on the hump's face, looking out
  // Bones: long ones lying about, a ribcage's arcs, and the skull in front of the mouth looking out.
  const bones = new T.Group(); bones.name = 'rabbit-mound-bones'; g.add(bones);
  for (let i = 0; i < 9; i++) {
    const a = -1.3 + rnd() * 2.6, r = 0.95 + rnd() * 0.9;
    const len = 0.22 + rnd() * 0.25;
    const b = box(T, bones, 0.045, 0.045, len, bone, Math.sin(a) * r, 0.03, Math.cos(a) * r, 0, rnd() * Math.PI, 0);
    for (const s of [-1, 1]) box(T, bones, 0.075, 0.06, 0.06, bone, b.position.x + Math.sin(b.rotation.y) * s * len / 2, 0.035, b.position.z + Math.cos(b.rotation.y) * s * len / 2);
  }
  const ribs = new T.Group(); ribs.position.set(-0.75, 0.02, 0.9); ribs.rotation.y = 0.6; bones.add(ribs);
  for (let i = 0; i < 4; i++) {
    const rib = new T.Mesh(new T.TorusGeometry(0.17, 0.018, 4, 10, Math.PI), bone);
    rib.position.set(0, 0, i * 0.08); rib.rotation.set(0, 0, 0); ribs.add(rib);
  }
  box(T, ribs, 0.04, 0.04, 0.34, bone, 0, 0.17, 0.12);
  const skull = new T.Group(); skull.name = 'rabbit-mound-skull'; skull.position.set(0.32, 0, RABBIT.MOUTH + 0.5); skull.rotation.y = 0.35; g.add(skull);
  const cranium = new T.Mesh(new T.SphereGeometry(0.12, 10, 8), bone); cranium.scale.set(1, 0.9, 1.15); cranium.position.y = 0.12; skull.add(cranium);
  box(T, skull, 0.15, 0.07, 0.1, bone, 0, 0.04, 0.09);                                      // the jaw
  for (const s of [-1, 1]) { const eye = new T.Mesh(new T.SphereGeometry(0.03, 6, 5), dark); eye.position.set(s * 0.045, 0.13, 0.12); skull.add(eye); }
  const nose = new T.Mesh(new T.SphereGeometry(0.018, 5, 4), dark); nose.position.set(0, 0.09, 0.135); skull.add(nose);
  g.userData.mats = [earth, dark, bone];
  return g;
}

// The rabbit: small, white, soft, pink in the ears, red in the eye, two long front teeth.
export function buildKillerRabbit(T) {
  const g = new T.Group();
  g.name = 'killer-rabbit';
  const fur = new T.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.95 });
  const pink = new T.MeshStandardMaterial({ color: 0xe9a0a8, roughness: 0.8 });
  const eyeM = new T.MeshBasicMaterial({ color: 0xd8141c });
  const tooth = new T.MeshStandardMaterial({ color: 0xfffbea, roughness: 0.4 });
  const body = new T.Mesh(new T.SphereGeometry(0.17, 10, 8), fur); body.scale.set(0.9, 0.85, 1.25); body.position.set(0, 0.17, 0); body.castShadow = true; g.add(body);
  const head = new T.Group(); head.position.set(0, 0.29, 0.17); g.add(head);
  const skull = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), fur); skull.scale.set(1, 0.95, 1.1); skull.castShadow = true; head.add(skull);
  for (const s of [-1, 1]) {
    const ear = new T.Group(); ear.position.set(s * 0.05, 0.07, -0.02); ear.rotation.set(-0.25, 0, -s * 0.3); head.add(ear);   // tips apart
    box(T, ear, 0.05, 0.2, 0.025, fur, 0, 0.1, 0);
    box(T, ear, 0.03, 0.16, 0.01, pink, 0, 0.1, 0.014);
    const eye = new T.Mesh(new T.SphereGeometry(0.018, 6, 5), eyeM); eye.position.set(s * 0.055, 0.02, 0.075); head.add(eye);
  }
  const nose = new T.Mesh(new T.SphereGeometry(0.014, 5, 4), pink); nose.position.set(0, -0.005, 0.11); head.add(nose);
  for (const s of [-1, 1]) box(T, head, 0.016, 0.04, 0.008, tooth, s * 0.009, -0.05, 0.1);
  const tail = new T.Mesh(new T.SphereGeometry(0.055, 6, 5), fur); tail.position.set(0, 0.2, -0.21); g.add(tail);
  const feet = [];
  for (const s of [-1, 1]) {
    feet.push(box(T, g, 0.06, 0.05, 0.18, fur, s * 0.08, 0.025, -0.04));
    box(T, g, 0.04, 0.08, 0.05, fur, s * 0.05, 0.05, 0.16);
  }
  g.userData.head = head; g.userData.feet = feet; g.userData.fur = fur;
  return g;
}

// The holy grenade: a gold orb on a jewelled band, a little cross on top, the pin's ring at its shoulder.
export function buildHolyGrenade(T) {
  const g = new T.Group();
  g.name = 'holy-grenade';
  const gold = new T.MeshStandardMaterial({ color: 0xd9a92b, roughness: 0.3, metalness: 0.85 });
  const red = new T.MeshStandardMaterial({ color: 0xb3122a, roughness: 0.25, metalness: 0.3 });
  const blue = new T.MeshStandardMaterial({ color: 0x1d4fb8, roughness: 0.25, metalness: 0.3 });
  const orb = new T.Mesh(new T.SphereGeometry(0.1, 14, 10), gold); orb.position.y = 0.1; orb.castShadow = true; g.add(orb);
  const band = new T.Mesh(new T.TorusGeometry(0.1, 0.012, 6, 18), gold); band.rotation.x = Math.PI / 2; band.position.y = 0.1; g.add(band);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, j = new T.Mesh(new T.SphereGeometry(0.016, 6, 5), i % 2 ? blue : red);
    j.position.set(Math.cos(a) * 0.105, 0.1, Math.sin(a) * 0.105); g.add(j);
  }
  box(T, g, 0.02, 0.1, 0.02, gold, 0, 0.24, 0);
  box(T, g, 0.07, 0.02, 0.02, gold, 0, 0.26, 0);
  const ring = new T.Mesh(new T.TorusGeometry(0.022, 0.005, 5, 10), gold); ring.position.set(0.06, 0.2, 0); ring.name = 'holy-grenade-pin'; g.add(ring);
  return g;
}

// Where it waits: a little stone box with its lid off, tucked in the dead tree's roots.
export function buildReliquary(T) {
  const g = new T.Group();
  g.name = 'holy-reliquary';
  const stone = new T.MeshStandardMaterial({ color: 0x7d7a72, roughness: 0.95 });
  const moss = new T.MeshStandardMaterial({ color: 0x4d5a32, roughness: 1 });
  box(T, g, 0.42, 0.04, 0.3, stone, 0, 0.02, 0);
  for (const s of [-1, 1]) { box(T, g, 0.04, 0.16, 0.3, stone, s * 0.19, 0.1, 0); box(T, g, 0.42, 0.16, 0.04, stone, 0, 0.1, s * 0.13); }
  box(T, g, 0.46, 0.05, 0.34, stone, 0.34, 0.03, 0.08, 0, 0.5, 0.1);     // the lid, pushed off
  box(T, g, 0.2, 0.012, 0.12, moss, 0.36, 0.06, 0.1, 0, 0.5, 0.1);
  const grenade = buildHolyGrenade(T); grenade.position.set(0, 0.04, 0); grenade.rotation.z = 0.25; g.add(grenade);
  g.userData.grenade = grenade;
  return g;
}
