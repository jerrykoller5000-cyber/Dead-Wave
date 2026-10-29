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

// The mound: a hole in the hillside, not a lump set on it. Local +Y is the ground's up once it is seated,
// so the mouth lies in the slope and the throat goes down into the hill. Bones and a skull at the lip.
export function buildMound(T, seed = 93) {
  const rnd = mulberry(seed);
  const g = new T.Group();
  g.name = 'rabbit-mound';
  const earth = new T.MeshStandardMaterial({ color: 0x6b5340, roughness: 1 });
  const spoil = new T.MeshStandardMaterial({ color: 0x4a382c, roughness: 1 });
  const dark = new T.MeshStandardMaterial({ color: 0x050403, roughness: 1, side: T.DoubleSide });
  const bone = new T.MeshStandardMaterial({ color: 0xd9d0b8, roughness: 0.72 });
  const stain = new T.MeshStandardMaterial({ color: 0x5a1a16, roughness: 1 });
  const holeR = 0.62;
  const holeMat = dark.clone();
  holeMat.polygonOffset = true;
  holeMat.polygonOffsetFactor = -4;
  holeMat.polygonOffsetUnits = -4;
  // A torn mouth. One clean oval read as a lid. The outline wobbles, and clods cut the edge.
  const shape = new T.Shape();
  const bites = 14;
  for (let i = 0; i < bites; i++) {
    const a = (i / bites) * Math.PI * 2;
    const jag = holeR * (0.58 + rnd() * 0.55);
    const x = Math.cos(a) * jag * 1.25;
    const y = Math.sin(a) * jag * 0.72;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const hole = new T.Mesh(new T.ShapeGeometry(shape), holeMat);
  hole.rotation.x = Math.PI / 2;
  hole.position.y = 0.04;
  hole.renderOrder = 2;
  hole.name = 'rabbit-mound-mouth';
  const throat = new T.Mesh(new T.CylinderGeometry(holeR * 0.45, holeR * 0.18, 0.5, 9), dark);
  throat.position.y = -0.18;
  throat.scale.set(1.2, 1, 0.75);
  g.add(throat, hole);
  for (let i = 0; i < 20; i++) {
    const a = rnd() * Math.PI * 2;
    const rad = holeR * (0.45 + rnd() * 0.95);
    const c = new T.Mesh(new T.SphereGeometry(0.05 + rnd() * 0.1, 5, 4), rnd() < 0.45 ? earth : spoil);
    c.scale.set(1.2 + rnd() * 0.7, 0.16 + rnd() * 0.14, 0.75 + rnd() * 0.45);
    c.position.set(Math.sin(a) * rad, 0.028 + rnd() * 0.02, Math.cos(a) * rad * 0.8);
    g.add(c);
  }
  for (let i = 0; i < 6; i++) {
    const c = new T.Mesh(new T.SphereGeometry(0.08 + rnd() * 0.07, 6, 4), spoil);
    c.scale.y = 0.4;
    c.position.set((rnd() - 0.5) * 1.1, 0.035, holeR * 0.5 + 0.25 + rnd() * 0.45);
    g.add(c);
  }
  for (let i = 0; i < 4; i++) {
    const rock = new T.Mesh(new T.DodecahedronGeometry(0.08 + rnd() * 0.05, 0), spoil);
    rock.position.set((rnd() - 0.5) * 1.5, 0.05, 0.15 + rnd() * 0.85);
    rock.rotation.set(rnd(), rnd(), rnd());
    g.add(rock);
  }
  const blood = new T.Mesh(new T.CircleGeometry(0.32, 10), stain);
  blood.rotation.x = -Math.PI / 2;
  blood.position.set(0.22, 0.025, 0.35);
  g.add(blood);
  const bones = new T.Group(); bones.name = 'rabbit-mound-bones'; g.add(bones);
  for (let i = 0; i < 9; i++) {
    const a = 0.15 + rnd() * 2.7, r = 0.62 + rnd() * 0.7;
    const len = 0.24 + rnd() * 0.3;
    const b = box(T, bones, 0.04, 0.035, len, bone, Math.sin(a) * r, 0.035, Math.cos(a) * r, (rnd() - 0.5) * 0.25, rnd() * Math.PI, (rnd() - 0.5) * 0.2);
    for (const s of [-1, 1]) box(T, bones, 0.07, 0.05, 0.05, bone, b.position.x + Math.sin(b.rotation.y) * s * len / 2, 0.035, b.position.z + Math.cos(b.rotation.y) * s * len / 2);
  }
  // A ribcage lying across the lip, half into the dark.
  for (let i = 0; i < 5; i++) {
    const rib = new T.Mesh(new T.TorusGeometry(0.16, 0.018, 4, 10, Math.PI), bone);
    rib.rotation.x = Math.PI / 2;
    rib.position.set(-0.22 + i * 0.08, 0.04, 0.62);
    bones.add(rib);
  }
  box(T, bones, 0.4, 0.03, 0.035, bone, -0.06, 0.05, 0.62);
  const skull = new T.Group(); skull.name = 'rabbit-mound-skull'; skull.position.set(0.22, 0.02, 0.38); skull.rotation.set(0.55, 0.4, 0.2); g.add(skull);
  const cranium = new T.Mesh(new T.SphereGeometry(0.13, 10, 8), bone); cranium.scale.set(1, 0.88, 1.15); cranium.position.y = 0.1; skull.add(cranium);
  box(T, skull, 0.16, 0.06, 0.11, bone, 0, 0.03, 0.1);
  for (const s of [-1, 1]) { const eye = new T.Mesh(new T.SphereGeometry(0.032, 6, 5), dark); eye.position.set(s * 0.048, 0.11, 0.12); skull.add(eye); }
  const nose = new T.Mesh(new T.SphereGeometry(0.02, 5, 4), dark); nose.position.set(0, 0.07, 0.14); skull.add(nose);
  g.userData.mats = [earth, spoil, dark, holeMat, bone, stain];
  return g;
}

// The rabbit: small, white, soft, pink in the ears, red in the eye, two long front teeth.
export function buildKillerRabbit(T) {
  const g = new T.Group();
  g.name = 'killer-rabbit';
  const fur = new T.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.92 });
  const furShade = new T.MeshStandardMaterial({ color: 0xe6e2da, roughness: 0.95 });
  const pink = new T.MeshStandardMaterial({ color: 0xe9a0a8, roughness: 0.78 });
  const mawMat = new T.MeshStandardMaterial({ color: 0x4a0b10, roughness: 0.85 });
  const bloodMat = new T.MeshStandardMaterial({ color: 0x8c1118, roughness: 0.55 });
  const eyeM = new T.MeshBasicMaterial({ color: 0xe0141e });
  const pupilM = new T.MeshBasicMaterial({ color: 0x1a0204 });
  const shineM = new T.MeshBasicMaterial({ color: 0xff9a9a });
  const tooth = new T.MeshStandardMaterial({ color: 0xfffbea, roughness: 0.32, metalness: 0.05 });
  const addM = (parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };

  // Sculpted torso, muscular haunches, arched spine, and puffed chest ruff
  const body = addM(g, new T.SphereGeometry(0.17, 14, 12), fur, 0, 0.17, -0.01, 0.92, 0.86, 1.28);
  addM(g, new T.SphereGeometry(0.125, 12, 10), fur, 0, 0.21, 0.1, 0.96, 0.92, 0.95); // chest ruff
  addM(g, new T.SphereGeometry(0.095, 10, 8), furShade, 0, 0.12, 0.14, 0.85, 0.72, 0.85); // lower brisket
  addM(g, new T.SphereGeometry(0.05, 8, 6), bloodMat, 0, 0.15, 0.185, 0.65, 0.45, 0.32); // blood fleck on chest

  for (const s of [-1, 1]) {
    addM(g, new T.SphereGeometry(0.115, 12, 10), fur, s * 0.088, 0.155, -0.075, 0.78, 1.05, 1.15, 0.12, 0, -s * 0.08); // muscular haunch
    addM(g, new T.SphereGeometry(0.075, 10, 8), fur, s * 0.068, 0.16, 0.095, 0.72, 0.95, 0.88); // shoulder
  }

  // Head group at (0, 0.29, 0.17)
  const head = new T.Group(); head.position.set(0, 0.29, 0.17); g.add(head);
  addM(head, new T.SphereGeometry(0.102, 14, 12), fur, 0, 0.005, -0.005, 1.02, 0.96, 1.12); // cranium
  addM(head, new T.SphereGeometry(0.064, 10, 8), fur, 0, -0.006, 0.068, 0.92, 0.78, 1.05); // snout bridge
  // Snarling parted maw & bloodied lower jaw
  addM(head, new T.SphereGeometry(0.042, 8, 6), mawMat, 0, -0.036, 0.084, 0.95, 0.52, 0.78);
  addM(head, new T.SphereGeometry(0.04, 8, 6), furShade, 0, -0.052, 0.068, 0.88, 0.42, 0.85);
  addM(head, new T.SphereGeometry(0.028, 6, 5), bloodMat, 0, -0.048, 0.092, 0.75, 0.3, 0.5);

  for (const s of [-1, 1]) {
    // Puffed snarling jowls / whisker pads
    addM(head, new T.SphereGeometry(0.048, 10, 8), fur, s * 0.042, -0.016, 0.065, 0.88, 0.72, 0.95);
    addM(head, new T.SphereGeometry(0.054, 10, 8), fur, s * 0.066, -0.008, 0.012, 0.75, 0.82, 0.92); // cheek tuft
    // Organic tapered rabbit ears with recessed pink concha
    const ear = new T.Group(); ear.position.set(s * 0.048, 0.072, -0.022); ear.rotation.set(-0.26, -s * 0.12, -s * 0.28); head.add(ear);
    addM(ear, new T.CapsuleGeometry(0.026, 0.155, 5, 10), fur, 0, 0.102, 0, 0.95, 1, 0.52);
    addM(ear, new T.CapsuleGeometry(0.02, 0.125, 4, 8), furShade, 0, 0.115, -0.004, 0.82, 1, 0.38);
    addM(ear, new T.CapsuleGeometry(0.015, 0.12, 4, 8), pink, 0, 0.098, 0.01, 0.85, 1, 0.35);
    addM(ear, new T.SphereGeometry(0.022, 8, 6), fur, 0, 0.018, 0.004, 1.0, 0.8, 0.8); // ear base cartilage
    // Glowing crimson eye + vertical predator slit pupil + catchlight + scowling brow ridge
    addM(head, new T.SphereGeometry(0.021, 10, 8), eyeM, s * 0.056, 0.022, 0.074, 0.95, 0.95, 0.95);
    addM(head, new T.SphereGeometry(0.01, 8, 6), pupilM, s * 0.064, 0.022, 0.088, 0.42, 1.15, 0.5);
    addM(head, new T.SphereGeometry(0.005, 6, 4), shineM, s * 0.062, 0.029, 0.091);
    // Heavy scowling brow ridge angled fiercely inward
    addM(head, new T.CapsuleGeometry(0.011, 0.042, 4, 6), furShade, s * 0.052, 0.042, 0.076, 1, 1, 0.85, 0.25, -s * 0.35, Math.PI * 0.5 - s * 0.42);
    // Whiskers
    for (let w = -1; w <= 1; w++) {
      addM(head, new T.CylinderGeometry(0.0015, 0.0006, 0.065, 4), furShade, s * 0.072, -0.016 + w * 0.008, 0.082, 1, 1, 1, w * 0.18, -s * 0.25, s * (Math.PI * 0.48 + w * 0.12));
    }
  }

  // Sculpted pink nose pad + nostrils
  addM(head, new T.SphereGeometry(0.016, 8, 6), pink, 0, 0.002, 0.115, 1.15, 0.78, 0.85);
  for (const s of [-1, 1]) addM(head, new T.SphereGeometry(0.005, 5, 4), mawMat, s * 0.008, 0.001, 0.124);

  // Two long curved vampiric front fangs + flanking carnassial teeth + blood-tipped points
  for (const s of [-1, 1]) {
    addM(head, new T.ConeGeometry(0.011, 0.058, 8), tooth, s * 0.012, -0.052, 0.104, 0.85, 1, 0.72, Math.PI - 0.12, 0, s * 0.04);
    addM(head, new T.ConeGeometry(0.007, 0.024, 6), bloodMat, s * 0.012, -0.068, 0.106, 0.82, 1, 0.7, Math.PI - 0.12, 0, s * 0.04);
    addM(head, new T.ConeGeometry(0.0065, 0.028, 6), tooth, s * 0.028, -0.04, 0.092, 0.8, 1, 0.7, Math.PI - 0.08, 0, s * 0.1);
    addM(head, new T.ConeGeometry(0.0055, 0.022, 6), tooth, s * 0.016, -0.046, 0.088, 0.8, 1, 0.7, 0.15, 0, 0);
  }

  // Fluffy multi-tuft cottontail
  const tail = new T.Group(); tail.position.set(0, 0.2, -0.21); g.add(tail);
  addM(tail, new T.SphereGeometry(0.056, 10, 8), fur, 0, 0, 0, 0.95, 0.95, 1.1);
  addM(tail, new T.SphereGeometry(0.042, 8, 6), fur, 0, 0.024, -0.025, 0.85, 0.85, 0.95);

  // Sculpted hind feet and forelegs with wicked curved claws
  const feet = [];
  for (const s of [-1, 1]) {
    const footG = new T.Group(); footG.position.set(s * 0.085, 0.025, -0.04); g.add(footG);
    addM(footG, new T.CapsuleGeometry(0.026, 0.12, 5, 8), fur, 0, 0.004, 0, 1.05, 0.72, 1.0, Math.PI / 2, 0, 0);
    for (let t = -1; t <= 1; t++) {
      addM(footG, new T.SphereGeometry(0.013, 6, 5), furShade, t * 0.015, -0.004, 0.082, 0.85, 0.7, 1.3);
      addM(footG, new T.ConeGeometry(0.0055, 0.026, 5), tooth, t * 0.016, -0.006, 0.104, 0.8, 1, 1, Math.PI * 0.58, 0, 0);
    }
    feet.push(footG);

    // Muscular foreleg + paw + blood-tipped claws
    const foreG = new T.Group(); foreG.position.set(s * 0.055, 0.055, 0.155); g.add(foreG);
    addM(foreG, new T.CapsuleGeometry(0.022, 0.065, 5, 8), fur, 0, 0.015, -0.008, 0.95, 1, 0.95, 0.15, 0, 0);
    addM(foreG, new T.SphereGeometry(0.024, 8, 6), furShade, 0, -0.032, 0.012, 1.05, 0.65, 1.25);
    for (let t = -1; t <= 1; t++) {
      addM(foreG, new T.ConeGeometry(0.005, 0.024, 5), tooth, t * 0.012, -0.038, 0.038, 0.8, 1, 1, Math.PI * 0.56, t * 0.1, 0);
    }
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
// CL-267 (docs/asset-principles.md: a story object reads at a glance): a carved casket, not four slabs: a plinth with
// corner feet, walls with a moulded lip, a dark well with a faded red cloth the grenade lies on, and the lid (a cross
// raised on it) pushed off and leaning on the box's side; moss in the joins and on the lid's top, the stone darker
// toward the ground. All of it one vertex-coloured mesh (one draw, was eight); the grenade stays its own (it's taken).
export function buildReliquary(T) {
  const g = new T.Group();
  g.name = 'holy-reliquary';
  const parts = new T.Group();
  const col = (hex) => new T.MeshBasicMaterial({ color: hex });   // only their colours are kept (the bake)
  const stone = col(0x86827a), stoneDk = col(0x6c6961), well = col(0x2b2925), cloth = col(0x5e3030), moss = col(0x4f5c34), mossLt = col(0x66703f);
  box(T, parts, 0.46, 0.035, 0.34, stoneDk, 0, 0.0175, 0);                       // the plinth
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(T, parts, 0.07, 0.03, 0.07, stoneDk, sx * 0.2, 0.012, sz * 0.14);   // corner feet
  for (const s of [-1, 1]) {
    box(T, parts, 0.045, 0.15, 0.3, stone, s * 0.19, 0.11, 0);                    // the end walls
    box(T, parts, 0.42, 0.15, 0.045, stone, 0, 0.11, s * 0.1275);                 // the side walls
    box(T, parts, 0.06, 0.025, 0.33, stoneDk, s * 0.19, 0.192, 0);                // the moulded lip
    box(T, parts, 0.44, 0.025, 0.06, stoneDk, 0, 0.192, s * 0.1275);
  }
  box(T, parts, 0.34, 0.01, 0.22, well, 0, 0.04, 0);                              // the dark well
  box(T, parts, 0.3, 0.018, 0.19, cloth, 0, 0.052, 0, 0, 0, 0.03);                // the cloth, faded
  box(T, parts, 0.08, 0.012, 0.19, cloth, 0.17, 0.11, 0, 0, 0, -1.2);             // its end hanging over the rim
  // The lid, pushed off: one long edge on the ground, leaning on the box's side, the cross on its face.
  // Its frame: lying askew on the ground beside the box (its near edge 4 cm off the plinth), a little sunk at its far end.
  const lid = new T.Group(); lid.position.set(0.06, 0, 0.21); lid.rotation.set(0.03, 0.3, 0); parts.add(lid);
  box(T, lid, 0.46, 0.045, 0.34, stone, 0, 0.0225, 0.17);
  box(T, lid, 0.4, 0.012, 0.28, stoneDk, 0, 0.051, 0.17);                         // a sunk panel's border
  box(T, lid, 0.05, 0.012, 0.22, stone, 0, 0.063, 0.17);                          // the raised cross: the upright
  box(T, lid, 0.17, 0.012, 0.05, stone, 0, 0.063, 0.125);                         // and the arms, toward its head
  // Moss: low cushions in the joins and on top.
  const cushion = (r, c, x, y, z, sy = 0.3) => { const m = new T.Mesh(new T.SphereGeometry(r, 8, 5), c); m.position.set(x, y, z); m.scale.set(1, sy, 1); parts.add(m); };
  cushion(0.05, moss, -0.22, 0.04, 0.15); cushion(0.035, mossLt, -0.2, 0.2, -0.13, 0.35); cushion(0.04, moss, 0.23, 0.035, -0.16);
  cushion(0.03, mossLt, 0.12, 0.2, 0.13, 0.35); cushion(0.045, moss, 0.2, 0.03, 0.2);
  // Bake: one mesh, the stone a little darker toward the ground.
  parts.updateMatrixWorld(true);
  const pos = [], nor = [], cl = [], c = new T.Color();
  parts.traverse((o) => {
    if (!o.isMesh) return;
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    const P = geo.attributes.position.array, N = geo.attributes.normal.array;
    for (let i = 0; i < P.length; i += 3) {
      const k = 0.78 + 0.22 * Math.min(1, Math.max(0, P[i + 1] / 0.2));
      c.copy(o.material.color).multiplyScalar(k);
      pos.push(P[i], P[i + 1], P[i + 2]); nor.push(N[i], N[i + 1], N[i + 2]); cl.push(c.r, c.g, c.b);
    }
    geo.dispose(); o.geometry.dispose();
  });
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(cl, 3));
  const mesh = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 }));
  mesh.name = 'holy-reliquary-stone'; mesh.castShadow = true; mesh.receiveShadow = true;
  g.add(mesh);
  const grenade = buildHolyGrenade(T); grenade.position.set(0, 0.07, 0); grenade.rotation.z = 0.25; g.add(grenade);
  g.userData.grenade = grenade;
  return g;
}
