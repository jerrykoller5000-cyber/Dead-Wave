// game/zombie-feet.js — CL-187: the dead on their feet: heel, sole and toe (Claude's).
//
// Jerry (2026-10-12): "an animation and motion pass on all the zombies." Every two-legged kind had its feet fixed to
// its shins: a boot that tilted with the leg, the toe in the dirt at the back of the stride and the heel in it at
// the front. GP-19852 gave seven kinds an ankle and a flat sole (the shambler's, military's, bomber's, brute's,
// drowned's, spitter's and screamer's planted boots stay flat); the rest (feral, leaper, demon, colossus,
// guardian, cave guardian) still had none, and a flat sole alone hovers through the swing like a tray.
//
// Here: an ankle for the kinds that had none (prepareZombieFeet, the same split of the batched shin that
// GP-19852 does, the pivot a little higher on bare feet so the cut is at the joint), and the roll of a step for all
// of them (applyZombieFeet, after every per-kind pose has had its say): the heel lands toe-up, the sole is flat
// through the stance, the heel comes off the ground ahead of the toe (the leg is re-solved a touch higher so the
// ball of the foot stays down), and the toe hangs through the swing.
//
// Where each foot is in its step is read off the leg itself, not a phase: GP-19852's kinds each keep a private
// stride clock, so the foot's height and the way it is moving (back along the ground: planted; up and forward:
// swinging) are the one thing every rig agrees on. The kinds on the old sine gait use its phase.
//
// Pure arithmetic over joint angles; nothing here spawns or moves a body. Knobs: ZFEET (TT.zombieFeetDbg).

export const ZFEET = {
  on: true,
  toeUp: 0.17,        // the heel lands toe-up, radians (positive ankle pitch is toe down)
  pushMax: 0.42,      // the heel off the ground ahead of the toe, at most
  pushFrom: 0.62,     // ...from this far through the stance
  hang: 0.15,         // the toe hangs through the swing
  footLen: 0.19,      // ankle to the ball of the foot, metres at scale 1
  liftEps: 0.006,     // a foot this far (metres at scale 1) above its ground is in the air
  // Per kind: the roll's scale, and how the step is read.
  kinds: {
    shambler: { k: 1.0 }, military: { k: 1.0 }, bomber: { k: 0.8 }, brute: { k: 0.7 }, drowned: { k: 0.9 }, spitter: { k: 0.9 }, screamer: { k: 1.0 },
    feral: { k: 0.9, sine: true }, demon: { k: 0.7, sine: true }, colossus: { k: 0.6, sine: true }, guardian: { k: 0.8, sine: true }, caveguard: { k: 0.8, sine: true }
    // (the leaper runs on all fours on GP-19856's own paws; the spider plants its own limbs)
  }
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// The roll through a step. u: 0 at the strike .. 1 at toe-off (the stance); v: 0 at toe-off .. 1 at the strike
// (the swing); exactly one of them is given. Returns the ankle pitch (radians, toe down positive).
export function stepRoll(u, v, F = ZFEET) {
  if (u != null) return -F.toeUp * (1 - smooth(0.02, 0.18, u)) + F.pushMax * smooth(F.pushFrom, 1, u);
  return F.pushMax * (1 - smooth(0, 0.35, v)) + F.hang * Math.sin(Math.PI * v) - F.toeUp * smooth(0.72, 1, v);
}

// Two-bone solve in the leg's plane: the ankle at (ry, rz) from the hip pivot, thigh A, shin B.
export function legSolve(ry, rz, A, B) {
  const d = clamp(Math.hypot(ry, rz), 0.01, A + B - 1e-5);
  const knee = Math.PI - Math.acos(clamp((A * A + B * B - d * d) / (2 * A * B), -1, 1));
  const thigh = Math.atan2(-rz, -ry) - Math.acos(clamp((A * A + d * d - B * B) / (2 * A * d), -1, 1));
  return { thigh, knee };
}

// An ankle for a rig without one: the foot's meshes (by rest height, or split out of a batched shin by colour and
// height, as GP-19852 does) move into a group at the joint. Kinds with bare feet get the pivot at the shin's foot.
export function prepareZombieFeet(T, mesh, scale = 1, kind = '') {
  const u = mesh.userData, bare = !!(ZFEET.kinds[kind] && ZFEET.kinds[kind].sine && kind !== 'colossus');
  const pivotY = (bare ? -0.33 : -0.36) * scale, cut = (bare ? -0.31 : -0.28) * scale;
  for (const leg of [u.legLG, u.legRG]) {
    const shin = leg && leg.userData.shinG; if (!shin || leg.userData.shamblerAnkle) continue;
    let feet = shin.children.filter((o) => o.isMesh && o.position.y < cut);
    if (!feet.length) feet = splitFoot(T, shin, cut / scale);
    if (!feet.length) continue;
    const ankle = new T.Group(); ankle.name = 'zombie-ankle'; ankle.position.set(0, pivotY, 0.04 * scale);
    shin.add(ankle);
    for (const f of feet) { f.position.sub(ankle.position); ankle.add(f); }
    leg.userData.shamblerAnkle = ankle;
    leg.userData.shamblerFootY = u.baseHipsY + leg.position.y + shin.position.y + ankle.position.y;
    leg.userData.ankleByClaude = true;
  }
}
// The foot's triangles out of a batched shin: those below `cut` (shin space, scale 1), or boot-coloured.
function splitFoot(T, shin, cut) {
  const leather = new T.Color(0x594834), sole = new T.Color(0x27251f), out = [];
  const sc = Math.abs(shin.position.y) / 0.38;
  for (const m of [...shin.children]) {
    const src = m.geometry; if (!m.isMesh || !src || !src.attributes || !src.attributes.color) continue;
    const geo = src.index ? src.toNonIndexed() : src, P = geo.attributes.position, C = geo.attributes.color;
    const foot = [], leg = [];
    for (let i = 0; i < P.count; i += 3) {
      const y = (P.getY(i) + P.getY(i + 1) + P.getY(i + 2)) / 3;
      const same = (c) => Math.abs(C.getX(i) - c.r) + Math.abs(C.getY(i) - c.g) + Math.abs(C.getZ(i) - c.b) < 1e-5;
      const isFoot = same(leather) || (same(sole) && y < -0.2 * sc) || y < cut * sc;
      (isFoot ? foot : leg).push(i, i + 1, i + 2);
    }
    if (!foot.length || !leg.length) continue;
    const part = (idx) => {
      const g = new T.BufferGeometry();
      for (const [name, a] of Object.entries(geo.attributes)) {
        const data = new a.array.constructor(idx.length * a.itemSize);
        idx.forEach((n, j) => { for (let c = 0; c < a.itemSize; c++) data[j * a.itemSize + c] = a.array[n * a.itemSize + c]; });
        g.setAttribute(name, new T.BufferAttribute(data, a.itemSize));
      }
      return g;
    };
    const fm = new T.Mesh(part(foot), m.material); fm.position.copy(m.position); fm.quaternion.copy(m.quaternion); fm.scale.copy(m.scale); fm.castShadow = m.castShadow; shin.add(fm); out.push(fm);
    m.geometry = part(leg);
    if (geo !== src) geo.dispose();
  }
  return out;
}

// After every pose of the frame. ctx: { phase (the sine gait's), walkAmt 0..1, standing, busy (an attack or a
// special move owns the legs) }.
export function applyZombieFeet(z, ctx) {
  if (!ZFEET.on || !z.alive || z.farLod || z.crawling || z.hopping) return;
  const K = ZFEET.kinds[z.typeKey]; if (!K) return;
  const u = z.mesh.userData, hips = u.hips; if (!hips) return;
  const rest = u.rest || {};
  const F = ZFEET, k = K.k;
  const st = z._feet || (z._feet = [{ rz: 0, reach: 0.25, planted: false }, { rz: 0, reach: 0.25, planted: false }]);
  const walking = !ctx.standing && !ctx.busy && ctx.walkAmt > 0.05;
  for (let i = 0; i < 2; i++) {
    const leg = i ? u.legRG : u.legLG, lost = i ? z.partsLost && z.partsLost.legR : z.partsLost && z.partsLost.legL;
    const shin = leg && leg.userData.shinG, ankle = leg && leg.userData.shamblerAnkle;
    if (!shin || !ankle || lost) continue;
    const A = Math.abs(shin.position.y), B = Math.abs(ankle.position.y), s = A / 0.38;   // the kind's scale is in the bones
    const a = leg.rotation.x, kn = shin.rotation.x;
    const ry = -(A * Math.cos(a) + B * Math.cos(a + kn)), rz = -(A * Math.sin(a) + B * Math.sin(a + kn));
    const S = st[i], dz = rz - S.rz; S.rz = rz;
    // Kinds without a module keep the sine gait's legs: the sole is laid flat here (GP-19852's kinds do their own).
    if (leg.userData.ankleByClaude) {
      ankle.rotation.x = -((hips.rotation.x - (rest.hipsRX || 0)) + (a - (i ? rest.legRRX || 0 : rest.legLRX || 0)) + kn);
      ankle.rotation.z = -(hips.rotation.z - (rest.hipsRZ || 0));
    }
    if (!walking) continue;
    let roll = 0, lift = 0;
    if (K.sine) {
      // The old gait: a leg is front-most at sin = -1 (the strike) and back-most at sin = 1 (toe-off), planted between.
      const c = ((ctx.phase / (Math.PI * 2) + 0.25 + i * 0.5) % 1 + 1) % 1;
      roll = c < 0.5 ? stepRoll(c / 0.5, null, F) : stepRoll(null, (c - 0.5) / 0.5, F);
      roll *= k * ctx.walkAmt;
      if (roll > 0 && c < 0.5) lift = F.footLen * s * Math.sin(roll) * 0.6;
    } else {
      // GP-19852's kinds: the foot is planted when it is on its ground and going back; it swings when it is up or
      // coming forward. How far through: by where it is between the front and the back of its reach.
      const footY = hips.position.y + leg.position.y + ry, ground = leg.userData.shamblerFootY != null ? leg.userData.shamblerFootY : footY;
      const up = footY - ground;
      const planted = up < F.liftEps * s && dz <= 1e-4;
      if (planted) { if (!S.planted) S.reach = Math.max(0.08 * s, Math.abs(rz)); S.planted = true; S.reach = Math.max(S.reach, Math.abs(rz)); }
      else { if (S.planted) S.reach = Math.max(0.08 * s, Math.abs(rz)); S.planted = false; }
      const R = S.reach;
      if (planted) { const uu = clamp((R - rz) / (2 * R), 0, 1); roll = stepRoll(uu, null, F); if (roll > 0) lift = F.footLen * s * Math.sin(roll); }
      else { const vv = clamp((rz + R) / (2 * R), 0, 1); roll = stepRoll(null, vv, F) * (1 - smooth(0.05 * s, 0.14 * s, up) * 0.5); }
      roll *= k * ctx.walkAmt; lift *= k * ctx.walkAmt;
    }
    if (lift > 1e-4) {
      // The heel comes up: the ankle rises by what the pitch takes, so the ball of the foot stays on the ground.
      const p = legSolve(ry + lift, rz, A, B);
      const da = p.thigh - a, dk = p.knee - kn;
      leg.rotation.x = p.thigh; shin.rotation.x = p.knee;
      ankle.rotation.x -= da + dk;   // the sole as it was, then the roll
    }
    ankle.rotation.x += roll;
  }
}

// --- The weight of a start, a stop and a turn -------------------------------------------------------------------
// Every body leans into its own acceleration: in on a start, back on a stop, into a turn (the centripetal pull).
// The velocity is read off the body's position and smoothed first, so the horde's shoving (a few centimetres a
// frame) does not jitter the chest. Laid on after every per-kind pose; kinds with a bank of their own (the feral,
// the leaper) get the forward part only.
export const ZLEAN = { on: true, perAccel: 0.012, max: 0.12, side: 0.6, rate: 5, velRate: 9, dip: 0.08 };
export function applyZombieLean(z, dt) {
  if (!ZLEAN.on || !z.alive || z.farLod || dt <= 0) return;
  const u = z.mesh.userData, torso = u.torso; if (!torso) return;
  const p = z.mesh.position;
  const L = z._lean || (z._lean = { x: p.x, z: p.z, vx: 0, vz: 0, fwd: 0, side: 0, fresh: true });
  const dx = p.x - L.x, dz = p.z - L.z; L.x = p.x; L.z = p.z;
  if (L.fresh || Math.hypot(dx, dz) > 2.5 * dt + 0.5) { L.fresh = false; L.vx = dx / dt; L.vz = dz / dt; L.fwd = L.side = 0; return; }   // a teleport, a spawn
  const vx = dx / dt, vz = dz / dt, kv = 1 - Math.exp(-ZLEAN.velRate * dt);
  const ax = (vx - L.vx) * kv / dt, az = (vz - L.vz) * kv / dt;   // the smoothed velocity's change this frame
  L.vx += (vx - L.vx) * kv; L.vz += (vz - L.vz) * kv;
  const yaw = z.mesh.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const K = ZFEET.kinds[z.typeKey], ownBank = z.typeKey === 'feral' || z.typeKey === 'leaper' || z.typeKey === 'spider';
  const fwd = Math.max(-ZLEAN.max, Math.min(ZLEAN.max, (ax * fx + az * fz) * ZLEAN.perAccel));
  const side = ownBank ? 0 : Math.max(-ZLEAN.max, Math.min(ZLEAN.max, (ax * rx + az * rz) * ZLEAN.perAccel * ZLEAN.side));
  const k = 1 - Math.exp(-ZLEAN.rate * dt);
  L.fwd += (fwd - L.fwd) * k; L.side += (side - L.side) * k;
  torso.rotation.x += L.fwd;
  torso.rotation.z -= L.side;   // a lean toward +x is a negative roll
  if (u.hips) u.hips.position.y -= Math.abs(L.fwd) * ZLEAN.dip;
  if (u.head && !(z.partsLost && z.partsLost.head)) u.head.rotation.x -= L.fwd * 0.5;
}
