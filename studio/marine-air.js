// studio/marine-air.js — CL-189: the marine in the air, by the way he jumped (Claude's).
//
// Jerry (2026-10-13): "Better animations for jumping in every direction." GP-172 gave the jump its timing (a short
// loaded push-off, a landing that is absorbed); in the air both legs folded the same small amount whatever he was
// doing. Here the air pose comes from how he left the ground:
//
//   - straight up: both knees come up together over the top and reach back down for the landing, not quite in step;
//   - forward (a running leap): a stride in the air: the leading knee drives up, the trailing leg is left behind
//     with the heel up, then the lead reaches out to land on;
//   - backward: the hips sit back and both knees come up in front, the feet reaching back under him to land;
//   - sideways: the leg on the side he is going reaches out that way and the other tucks under, the body leaning
//     into it a little.
//
// Mixed by how much of each his velocity is, and over the flight by u = vy / jump speed (1 leaving the ground, 0 at
// the top, -1 coming down; a walk off a ledge starts at the falling end). The arms (when no gun is in them) throw
// up and out for balance the same way. Pure: numbers only (node-tested in marine-air.test.mjs); index.html's
// updateMarinePose lays them onto the rig.
//
// Conventions (the game's): thigh negative is forward, knee positive is bent; legZ positive swings the foot toward
// the rig's +x; the side lean `side` positive leans toward +x; arm `sw` positive is forward, `out` away from the body.

export const AIR = {
  on: true,            // false: GP-172's air pose (both legs alike), for comparison
  speed: 7.4,          // m/s at which a direction counts fully (his walk; a run counts a little over)
  jumpVel: 7.9,        // the take-off speed (PHYS.jumpVel): u = vy / this
  // Each pose at three points of the flight: leaving the ground, over the top, landing. [thigh, knee] per leg.
  still: { a: [[-0.06, 0.18], [-0.04, 0.16]], b: [[-0.48, 1.05], [-0.42, 0.98]], c: [[-0.14, 0.3], [-0.1, 0.26]] },
  fwd:   { lead: [[-0.62, 0.95], [-0.78, 0.62], [-0.5, 0.22]], trail: [[0.38, 0.22], [0.42, 1.2], [0.12, 0.85]] },
  back:  { lead: [[-0.16, 0.3], [-0.56, 1.05], [0.1, 0.34]], trail: [[-0.1, 0.24], [-0.46, 0.95], [0.14, 0.4]] },
  side:  { lead: [[-0.12, 0.3], [-0.26, 0.42], [-0.16, 0.2]], trail: [[-0.18, 0.4], [-0.38, 0.95], [-0.2, 0.55]],
           leadOut: [0.15, 0.44, 0.32], trailOut: [0.05, 0.16, 0.06] },
  lean:  { still: [0.04, 0.12, 0.06], fwd: [0.16, 0.13, 0.07], back: [-0.08, -0.13, -0.05], side: [0.09, 0.07, 0.03] },
  arms:  { up: 0.55, out: 0.32, landFwd: 0.35, leapFwd: 0.75, leapBack: 0.4, backFwd: 0.8, sideOut: 0.55 }
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
// A value at flight t (0 takeoff .. 0.5 top .. 1 landing) from its three keys, eased between them.
export function key3(k, t) {
  t = clamp(t, 0, 1);
  return t < 0.5 ? k[0] + (k[1] - k[0]) * smooth(t / 0.5) : k[1] + (k[2] - k[1]) * smooth((t - 0.5) / 0.5);
}

// u: vy / jump speed (1 .. -1); f, s: his velocity along his facing and toward his +x (m/s); lead: -1 the left
// leg led (was forward) as he left the ground, +1 the right.
export function airPose(u, f, s, lead = -1, out = {}, A = AIR) {
  const t = (1 - clamp(u, -1, 1)) / 2;
  const wf = clamp(f / A.speed, 0, 1.15), wb = clamp(-f / A.speed, 0, 1), ws = clamp(Math.abs(s) / A.speed, 0, 1);
  const sum = wf + wb + ws, w0 = Math.max(0, 1 - sum), n = w0 + sum || 1;
  const k0 = w0 / n, kf = wf / n, kb = wb / n, ks = ws / n, sg = s >= 0 ? 1 : -1;
  // The legs, as lead and trail; which is which: forward and back, the leg that led; sideways, the leg on that side.
  const legs = [0, 0].map(() => ({ thigh: 0, knee: 0, z: 0 }));
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1;   // 0 the left (-x), 1 the right (+x)
    const leadsStride = side === lead, leadsSide = side === sg;
    const add = (key, w) => { if (w <= 0) return; legs[i].thigh += key3([key[0][0], key[1][0], key[2][0]], t) * w; legs[i].knee += key3([key[0][1], key[1][1], key[2][1]], t) * w; };
    add([A.still.a[i], A.still.b[i], A.still.c[i]], k0);
    add(leadsStride ? A.fwd.lead : A.fwd.trail, kf);
    add(leadsStride ? A.back.lead : A.back.trail, kb);
    add(leadsSide ? A.side.lead : A.side.trail, ks);
    legs[i].z = sg * key3(leadsSide ? A.side.leadOut : A.side.trailOut, t) * ks * n;
  }
  out.thighL = legs[0].thigh; out.kneeL = legs[0].knee; out.legZL = legs[0].z;
  out.thighR = legs[1].thigh; out.kneeR = legs[1].knee; out.legZR = legs[1].z;
  out.lean = key3(A.lean.still, t) * k0 + key3(A.lean.fwd, t) * kf + key3(A.lean.back, t) * kb + key3(A.lean.still, t) * ks;
  out.side = sg * key3(A.lean.side, t) * ks;
  out.head = -out.lean * 0.6;
  // The free arms: up as he leaves, out over the top, forward to meet the ground; a leap swings them against the
  // legs (the arm opposite the leading leg forward), a jump back throws both forward, a side jump opens the lead.
  const up = (1 - smooth(t / 0.45)) * A.arms.up, wide = Math.sin(Math.PI * clamp(t, 0, 1)) * A.arms.out, meet = smooth((t - 0.6) / 0.4) * A.arms.landFwd;
  const base = (up + meet) * (k0 + ks) + A.arms.backFwd * kb * (1 - t * 0.4);
  const leapL = lead < 0 ? -A.arms.leapBack : A.arms.leapFwd, leapR = lead < 0 ? A.arms.leapFwd : -A.arms.leapBack;
  out.swL = base + leapL * kf; out.swR = base + leapR * kf;
  out.outL = wide * (k0 + kb * 0.5) + (sg < 0 ? A.arms.sideOut : 0.1) * ks;
  out.outR = wide * (k0 + kb * 0.5) + (sg > 0 ? A.arms.sideOut : 0.1) * ks;
  out.bend = -0.25 - 0.45 * Math.sin(Math.PI * clamp(t, 0, 1)) * (k0 + kb + ks) - 0.6 * kf;
  out.t = t;
  return out;
}
