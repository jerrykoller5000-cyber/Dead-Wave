// J154 Zombie Pass 4 stage B (Claude 5, ZP4 design §2 B, approved 15 Nov): hit reactions by body part and weapon, as
// impulses into the reaction layer (game/zombie-react.js), scaled by the damage and the type's mass; and the per-individual
// posture (GP-20146's look.postureLean, ChatGPT's contract 15 Nov). Later stages add here: D (stagger, fall, get-up clips),
// E (turns), F (tells). Pure: no THREE, no DOM.
//
// The feed (Claude 2's index.html loan, after CB-336 stage 2): reactToHit(z, kind, dmg, dx, dz, hitY, push) calls
//   reactHit(z, { kind, weapon: currentWeapon, dmg, dx, dz, hitY, side })
// (dx, dz the push direction in the world, away from the shooter; hitY the hit's world height; side the hit's side on
// him, +1 his left, -1 his right, 0 unknown); the saw's contact and burning call reactHit each frame they last.
import { reactKick, reactSustain, reactStateOf, CH } from './zombie-react.js';

// Mass by type (heavier: smaller reactions; CB-336's masses when they land, these until then)
export const REACT_MASS = Object.freeze({
  shambler: 1, feral: 0.85, leaper: 0.8, spider: 1.3, drowned: 1.15, military: 1.1, brute: 2.6, spitter: 1, screamer: 0.9,
  bomber: 1.5, demon: 1.9, colossus: 5.5, guardian: 3, caveguard: 3,
});
// the types the humanoid parts table applies to as written (the others: core and head only, scaled by their mass)
const HUMANOID = new Set(['shambler', 'feral', 'leaper', 'drowned', 'military', 'spitter', 'screamer', 'bomber', 'brute']);

// Weapon classes: how hard a hit snaps (k), how much of the body it moves (whole: 0..1 of the whole-body shove), a spin
// about the hit side (spin), a step back (step), and a sustained source (sustain)
export const WEAPON_CLASS = Object.freeze({
  light: { k: 1.0, whole: 0, spin: 0, step: 0 },          // pistol, Wasp: quick small snaps (a burst reads as a shudder)
  smg: { k: 0.85, whole: 0, spin: 0, step: 0 },            // Uzi
  rifle: { k: 1.6, whole: 0.15, spin: 0.2, step: 0.2 },    // KR-7, GW-4, AK, M4, the rotary
  shotgun: { k: 2.4, whole: 1, spin: 0, step: 1 },         // a whole-body shove and a step back
  sniper: { k: 2.3, whole: 0.35, spin: 1, step: 0.5 },     // a spin about the hit side
  explosive: { k: 3.0, whole: 1.4, spin: 0.3, step: 1.2 }, // direction-aware (stage D knocks him down; this is the shove)
  melee: { k: 1.3, whole: 0.4, spin: 0, step: 0.3 },       // a short rock and a step
  chainsaw: { k: 0.6, whole: 0, spin: 0, step: 0, sustain: 'saw' },
  fire: { k: 0.4, whole: 0, spin: 0, step: 0, sustain: 'fire' },
});
const BY_WEAPON = { pistol: 'light', wasp: 'light', uzi: 'smg', m4: 'rifle', ak: 'rifle', kr7: 'rifle', gw4: 'rifle', carbine: 'rifle',
  minigun: 'rifle', shotgun: 'shotgun', aa12: 'shotgun', sniper: 'sniper', launcher: 'explosive', grenade: 'explosive',
  chainsaw: 'chainsaw', flamer: 'fire', knife: 'melee', revolver: 'rifle' };
const BY_KIND = { pellet: 'shotgun', explosive: 'explosive', melee: 'melee', chainsaw: 'chainsaw', fire: 'fire', burn: 'fire' };
export function weaponClass(weapon, kind) {
  if (kind && BY_KIND[kind] && (kind !== 'pellet' || !weapon || !BY_WEAPON[weapon])) return BY_KIND[kind];
  return (weapon && BY_WEAPON[weapon]) || (kind && BY_KIND[kind]) || 'light';
}

// The hit's part from its height on him (hitH the type's height, makeZombieMesh userData.hitH), when the caller gives none
export function hitPartOf(z, hitY) {
  const ud = z.mesh && z.mesh.userData, H = (ud && ud.hitH) || 1.7, y0 = z.mesh && z.mesh.position ? z.mesh.position.y : 0;
  if (hitY == null || !isFinite(hitY)) return 'torso';
  const h = (hitY - y0) / H;
  return h > 0.84 ? 'head' : h > 0.47 ? 'torso' : 'leg';
}

// the push in his own frame: fwd > 0 pushes him forward (a shot from behind), lat > 0 toward his left (+x)
function localPush(z, dx, dz) {
  const yaw = z.mesh && z.mesh.rotation ? z.mesh.rotation.y || 0 : 0, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const L = Math.hypot(dx || 0, dz || 0) || 1;
  return { fwd: ((dx || 0) * fx + (dz || 0) * fz) / L, lat: ((dx || 0) * rx + (dz || 0) * rz) / L };
}

// Base kicks (rad/s; hipsDrop m/s) for a light hit of 20 damage on a mass-1 humanoid, by part. f = the push forward,
// l = toward his left, s = the hit side (+1 his left). A positive torsoX folds him; the head snaps back from a shot from
// the front; the hit shoulder is thrown back; a leg hit buckles that knee and sinks the hips.
const PART_KICKS = {
  head: (f, l, s) => { const sd = s || (l >= 0 ? 1 : -1), a = Math.abs(f); return { headX: 20 * f, headZ: -12 * l + 7 * sd * a, headY: 7 * sd * -f, jawX: 6, torsoX: 4.5 * f, torsoZ: -2.4 * l + 1.5 * sd * a, hipsX: 0.8 * f }; },   // sheet 2: ~3x back + a roll and turn away (a straight-on head hit still reads at 8 m); torso follow 1.5x (sheet 1: ~2x read too small)
  torso: (f, l, s, low) => ({ torsoX: low ? -5 * f : 4.2 * f, torsoZ: -3.5 * l, torsoY: 3.2 * s * -f, headX: low ? 2.5 : 4 * f, headZ: -2 * l,
    armLX: -5.5 * f, armRX: -5.5 * f, armLZ: 2.5 + 3 * l, armRZ: -2.5 + 3 * l, elbowLX: -3, elbowRX: -3, hipsX: low ? 1.2 * f : -0.8 * f }),
  arm: (f, l, s) => (s >= 0 ? { armLX: -9 * f, armLZ: 4 + 3 * l, elbowLX: 4, torsoY: 3.5 * -f, torsoZ: -1.5 * l, headY: -1.2 * f }
    : { armRX: -9 * f, armRZ: -4 + 3 * l, elbowRX: 4, torsoY: -3.5 * -f, torsoZ: -1.5 * l, headY: 1.2 * f }),
  leg: (f, l, s) => {
    const L = s >= 0;   // the hit leg (unknown: his left)
    return { [L ? 'shinLX' : 'shinRX']: 12, [L ? 'legLX' : 'legRX']: -4 + 3 * f, hipsDrop: -1.2, hipsZ: (L ? 2.2 : -2.2), torsoX: 2.2, torsoZ: L ? -2 : 2,
      [L ? 'armLZ' : 'armRZ']: L ? 3 : -3, headX: -1.5 };
  },
};
// the whole-body shove (shotgun, explosion, a heavy rifle): everything goes with the push, the arms fly and come back late
const WHOLE = (f, l) => ({ hipsX: 1.6 * f, hipsZ: -1.6 * l, torsoX: 3.2 * f, torsoZ: -3 * l, headX: 4.5 * f, headZ: -3 * l,
  armLX: -6 * f, armRX: -6 * f, armLZ: 3 + 2 * l, armRZ: -3 + 2 * l, elbowLX: -4, elbowRX: -4, shinLX: 4, shinRX: 4, hipsDrop: -0.6 });
// a step back from a shove: the hips sink, a knee goes, the trailing leg swings to catch him (the AI's push moves him)
const STEP = (f) => ({ legLX: 8 * f, legRX: -5 * f, shinLX: 7, shinRX: 4.5, hipsDrop: -1.0, hipsX: -0.8 * f });   // x1.6: a step back you can see (Director, ZP4 sheet 1)

const add = (acc, kicks, k) => { for (const id in kicks) acc[id] = (acc[id] || 0) + kicks[id] * k; return acc; };

// One hit: { kind, weapon, dmg, dx, dz, hitY, part, side }. Returns the kicks it gave (for the checks).
export function reactHit(z, hit) {
  if (!z || !z.mesh || (z.alive === false)) return null;
  const cls = WEAPON_CLASS[weaponClass(hit.weapon, hit.kind)] || WEAPON_CLASS.light;
  const type = z.typeKey || (z.mesh.userData && z.mesh.userData.typeKey) || 'shambler';
  const mass = REACT_MASS[type] || 1, human = HUMANOID.has(type);
  const part0 = hit.part || hitPartOf(z, hit.hitY);
  const part = part0 === 'armL' || part0 === 'armR' ? 'arm' : part0 === 'legL' || part0 === 'legR' ? 'leg' : part0;
  const side = part0 === 'armL' || part0 === 'legL' ? 1 : part0 === 'armR' || part0 === 'legR' ? -1 : Math.sign(hit.side || 0);
  const { fwd, lat } = localPush(z, hit.dx, hit.dz);
  const dmgK = Math.max(0.5, Math.min(1.7, 0.5 + (hit.dmg || 20) / 40));
  const k = cls.k * dmgK / mass;
  const R = reactStateOf(z); R.mass = mass;
  if (cls.sustain) { sustained(z, cls.sustain, fwd, lat, mass); return { sustain: cls.sustain }; }
  const kicks = {};
  const lowTorso = hit.hitY != null && z.mesh.position && ((hit.hitY - z.mesh.position.y) / ((z.mesh.userData && z.mesh.userData.hitH) || 1.7)) < 0.62;
  add(kicks, (PART_KICKS[part] || PART_KICKS.torso)(fwd, lat, side, lowTorso), 1);
  if (cls.whole) add(kicks, WHOLE(fwd, lat), cls.whole);
  if (cls.step) add(kicks, STEP(fwd), cls.step);
  if (cls.spin) { const s = side || (lat >= 0 ? 1 : -1); add(kicks, { torsoY: 6 * s, hipsY: 3 * s, headY: 3 * s }, cls.spin); }
  if (!human) for (const id in kicks) if (!/^(torso|head|hips)/.test(id)) delete kicks[id];   // the specials: their own rigs' limbs stay theirs
  reactKick(z, kicks, k);
  return kicks;
}

// The saw in contact: a shudder through the body, the arms claw at the saw, the head thrown about; burning: the arms beat
// at the body, the head thrown about, a lurch. Re-fed each frame it lasts (seconds tops it up), so it stops when it does.
function sustained(z, kind, fwd, lat, mass) {
  const m = 1 / Math.sqrt(mass);
  if (kind === 'saw') reactSustain(z, 'saw', 0.18, (R, h, rnd) => {
    R.tgt[CH.armLX] = -0.75; R.tgt[CH.armRX] = -0.75; R.tgt[CH.elbowLX] = -0.6; R.tgt[CH.elbowRX] = -0.6; R.tgt[CH.torsoX] = 0.22; R.tgt[CH.headX] = 0.25;
    const j = 26 * m * h;   // a fast jitter: rad/s per substep
    R.v[CH.torsoX] += rnd() * j * 9; R.v[CH.torsoZ] += rnd() * j * 7; R.v[CH.torsoY] += rnd() * j * 6; R.v[CH.headX] += rnd() * j * 12; R.v[CH.headZ] += rnd() * j * 10;
    R.v[CH.armLX] += rnd() * j * 10; R.v[CH.armRX] += rnd() * j * 10; R.v[CH.shinLX] += Math.abs(rnd()) * j * 5; R.v[CH.shinRX] += Math.abs(rnd()) * j * 5;
  });
  else if (kind === 'fire') reactSustain(z, 'fire', 0.25, (R, h, rnd, S) => {
    const t = S.age, beat = Math.sin(t * 2 * Math.PI * 3.1), beat2 = Math.sin(t * 2 * Math.PI * 2.7 + 1.3);
    R.tgt[CH.armLX] = -0.55 + 0.35 * beat; R.tgt[CH.armRX] = -0.55 - 0.35 * beat2; R.tgt[CH.armLZ] = 0.15 + 0.25 * beat2; R.tgt[CH.armRZ] = -0.15 - 0.25 * beat;
    R.tgt[CH.elbowLX] = -0.75; R.tgt[CH.elbowRX] = -0.75; R.tgt[CH.torsoX] = 0.12 + 0.1 * beat2;
    const j = 14 * m * h; R.v[CH.headX] += rnd() * j * 14; R.v[CH.headY] += rnd() * j * 16; R.v[CH.headZ] += rnd() * j * 12; R.v[CH.torsoZ] += rnd() * j * 6;
  });
}

// The per-individual posture (GP-20146 look.postureLean, ChatGPT's contract 15 Nov: radians about the torso's +x, forward a
// hunch, default 0, [-0.06, +0.20], humanoids only). Pass 4 lays it on top of the type's base lean: 0.3 at the hips, 0.7 at
// the torso, the head counters 0.5 (his gaze kept), the hips sink a little; faded by k (0 on the ground, dead, climbing,
// crawling; the caller's), the torso's total kept under POSTURE.torsoMax. Every frame after the gait and before the
// reaction layer; tracks what it left so bones nobody re-poses don't gather it.
export const POSTURE = Object.freeze({ min: -0.06, max: 0.20, hips: 0.3, torso: 0.7, head: -0.5, dip: 0.04, torsoMax: 0.55 });
const POSTURE_TYPES = new Set(['shambler', 'feral', 'military', 'drowned', 'screamer', 'bomber', 'spitter']);
export function postureOf(z) {
  const L = z && z.look && Number.isFinite(z.look.postureLean) ? z.look.postureLean : 0;
  const type = z && (z.typeKey || (z.mesh && z.mesh.userData && z.mesh.userData.typeKey));
  return POSTURE_TYPES.has(type) ? Math.max(POSTURE.min, Math.min(POSTURE.max, L)) : 0;
}
function onTop(st, key, obj, ax, v) {   // obj[ax] = base + v, where base is this frame's pose (or last frame's, if untouched)
  if (!obj) return;
  const cur = obj[ax], left = st[key + 'L'], had = st[key] || 0;
  const base = cur === left ? cur - had : cur;
  obj[ax] = base + v; st[key + 'L'] = obj[ax]; st[key] = v;
}
export function applyPosture(z, k = 1) {
  const ud = z && z.mesh && z.mesh.userData; if (!ud) return 0;
  const L = postureOf(z) * Math.max(0, Math.min(1, k));
  const st = z._posture || (L === 0 ? null : (z._posture = {}));
  if (!st) return 0;
  let tv = POSTURE.torso * L;
  if (ud.torso && ud.torso.rotation) { const base = ud.torso.rotation.x === st.tL ? ud.torso.rotation.x - (st.t || 0) : ud.torso.rotation.x; if (base + tv > POSTURE.torsoMax) tv = Math.max(0, POSTURE.torsoMax - base); }
  onTop(st, 'h', ud.hips && ud.hips.rotation, 'x', POSTURE.hips * L);
  onTop(st, 't', ud.torso && ud.torso.rotation, 'x', tv);
  onTop(st, 'd', ud.head && ud.head.rotation, 'x', POSTURE.head * L);
  onTop(st, 'y', ud.hips && ud.hips.position, 'y', -POSTURE.dip * Math.max(0, L) * ((ud.hitH || 1.7) / 1.7));
  return L;
}

// Stage D (ZP4 design §2 D): the crowd's own hooks (CB-336 stage 1: z.ai.pose 'shoved' / 'queue', z.ai.shX/shZ its shove).
// 'shoved': a catch step in the push direction, the arms out for balance, the head lagging; fed ONCE on the pose's rising
// edge (the call site: if (a.pose === 'shoved' && a._poseWas !== 'shoved') reactShove(z, { dx: a.shX, dz: a.shZ, stagger: z.hzStaggerT > 0 })).
// 'queue': pressed back by friends in front: he leans into the one ahead with his hands on him and shuffles; re-fed each
// frame the pose lasts (reactQueue(z, { dx: a.prX, dz: a.prZ })), so it fades the moment the press does. Both through the
// reaction layer (added on top of the walk: the feet still land, nothing is held after it).
export function reactShove(z, { dx = 0, dz = 0, stagger = false } = {}) {
  if (!z || !z.mesh || z.alive === false) return null;
  const type = z.typeKey || (z.mesh.userData && z.mesh.userData.typeKey) || 'shambler';
  const mass = REACT_MASS[type] || 1, human = HUMANOID.has(type);
  const sp = Math.hypot(dx, dz); if (sp < 1e-3) return null;
  const { fwd: f, lat: l } = localPush(z, dx, dz);
  const k = Math.max(0.3, Math.min(1.3, sp / 2)) * (stagger ? 1.6 : 1) / Math.sqrt(mass);
  const R = reactStateOf(z);
  // the catch step: the leg on the push's side (straight on: the one his seed picks) swings the way he is pushed
  const left = Math.abs(l) > 0.25 ? l > 0 : ((R.seed >>> 3) & 1) === 1, Lg = left ? 'L' : 'R';
  // the lateral kicks doubled (Director 16 Nov, pass 2: a side shove has to read at 8 m from the player's eye)
  const kicks = { torsoX: 5 * f, torsoZ: -9 * l, headX: -3.5 * f, headZ: 6 * l, hipsDrop: -0.6, hipsZ: -2.8 * l,
    armLZ: 3.2, armRZ: -3.2, armLX: -1 - 2.4 * Math.abs(f), armRX: -1 - 2.4 * Math.abs(f), elbowLX: -2, elbowRX: -2,
    ['leg' + Lg + 'X']: -10 * f, ['shin' + Lg + 'X']: 7 };
  if (!human) for (const id in kicks) if (!/^(torso|head|hips)/.test(id)) delete kicks[id];
  reactKick(z, kicks, k);
  return kicks;
}
export function reactQueue(z, { dx = 0, dz = 0 } = {}) {
  if (!z || !z.mesh || z.alive === false) return null;
  const type = z.typeKey || (z.mesh.userData && z.mesh.userData.typeKey) || 'shambler';
  if (!HUMANOID.has(type)) return null;
  // the press comes from in front (it pushes him back): lean into it, toward where it comes from
  const L = Math.hypot(dx, dz) || 1, { fwd: f, lat: l } = localPush(z, -dx / L, -dz / L);
  return reactSustain(z, 'queue', 0.3, (R, h, rnd, S) => {
    const into = Math.max(0, f), side = l;
    R.tgt[CH.torsoX] = 0.08 + 0.12 * into; R.tgt[CH.torsoZ] = -0.1 * side; R.tgt[CH.headX] = 0.06;
    // ADDED to the gait's own arms, which on the shambler already reach forward: -1.05 here threw them over his head
    // (pass 2 strip, 16 Nov); a small forward push and bent elbows put the hands on the one ahead
    R.tgt[CH.armLX] = -0.3 * into - 0.05; R.tgt[CH.armRX] = -0.3 * into - 0.05; R.tgt[CH.elbowLX] = -0.45; R.tgt[CH.elbowRX] = -0.45;
    R.tgt[CH.armLZ] = 0.12; R.tgt[CH.armRZ] = -0.12;
    const t = S.age, sh = Math.sin(t * 2 * Math.PI * 1.3);   // a slow shuffle against the one ahead
    R.tgt[CH.hipsZ] = 0.04 * sh; R.tgt[CH.torsoY] = 0.05 * sh; R.v[CH.headX] += rnd() * 0.6 * h;
  });
}
