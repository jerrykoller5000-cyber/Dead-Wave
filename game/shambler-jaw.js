// CE-22 (Claude 5): the shambler's jaw swing. REVIEW COPY, nothing landed.
// Drives u.shamblerJaw.rotation.x (Claude 3's joint, CC-359 s42/s43; + opens; 0 = the rest gape = the most closed it goes)
// on top of the game's final shambler pose. One spring per zombie (a little under critical: a small overshoot, then still).
// What moves it, strongest first:
//   attack wind-up (z.attackWindup) opens it with the arm coming back; the swing (z.swingT) snaps it shut, then a slack hang;
//   a hit (z.hitReact going up) jolts it open; a groan (the game's own z.groanCd timer rolling over) or the notice twitch
//   (z.noticeT) opens it with a slow chew; walking: the jaw is a loose pendulum on the head (it drops a little when the body's
//   fall stops at a footfall and lags the head's nod); idle: nearly shut, a slow slack breath.
// Range (measured on the game-built body, review/CE-22/range.json): the chin never comes within 20 mm of the chest or arms for
// head pitch -0.4..+0.4 rad and jaw 0..0.3 rad, so the open limit is flat. It is the Director's look limit: .2 rad (at .25 a
// thin dark sliver shows at the CC-359 seam). Every frame is clamped to [0, max].
// Nothing per frame allocates. State: one object per zombie in a WeakMap, rebuilt when the zombie's mesh changes (respawn).
export const SHAMBLER_JAW = {
  max: .2,          // rad, the open limit (Director LOOK 20:10Z: .25 shows a sliver)
  windOpen: .8,     // of max, reached at 60% of the wind-up and held to the hit
  slack: .2,        // of max, the hang after a swing or a hit
  slackT: .45,      // s
  groanOpen: .55,   // of max
  groanDur: 1.0,    // s (x .8 .. 1.2 per zombie)
  noticeDur: .7,    // s
  chew: .22,        // of the groan opening, the slow chew
  breath: .06,      // of max, idle slack breath
  hitKick: 3.2,     // rad/s, the jolt open on a hit
  fallLag: .6,      // rad per m/s^2 of the hips' upward acceleration (the jaw's inertia at a footfall)
  nodLag: .12,      // of the head's pitch acceleration (follow-through on the nod)
  w: 15, zeta: .62, // the spring (rad/s, damping ratio)
  wWind: 24,        // rad/s while winding up (the short game wind-up)
  wSnap: 34, zetaSnap: .5,
};
const states = new WeakMap();
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export function shamblerJawLimit() { return SHAMBLER_JAW.max; }   // flat: see the range note above
export function resetShamblerJaw(z) {
  states.delete(z);
  const jaw = z && z.mesh && z.mesh.userData.shamblerJaw;
  if (jaw) jaw.rotation.x = 0;
}
export function shamblerJawState(z) { return states.get(z) || null; }   // for the review probes
export function applyShamblerJaw(z, dt) {
  if (z.typeKey !== 'shambler' || !z.mesh) return;
  const u = z.mesh.userData, jaw = u.shamblerJaw, head = u.head, hips = u.hips;
  if (!jaw || !head || (z.partsLost && z.partsLost.head)) { states.delete(z); return; }
  const K = SHAMBLER_JAW, max = K.max;
  const y = (hips ? hips.position.y : 0) + z.mesh.position.y, hp = head.rotation.x;
  let s = states.get(z);
  if (!s || s.mesh !== z.mesh || dt > .15) {
    const seed = s && s.mesh === z.mesh ? s.seed : Math.random();
    s = { mesh: z.mesh, a: clamp(jaw.rotation.x || 0, 0, max), v: 0, seed, t: seed * 20, chewRate: 4.2 + 2.4 * seed,
      y, vy: 0, ay: 0, hp, hv: 0, ha: 0, wind0: 0, swing: 0, slackT: 0, groanT: 0, groanDur: 0,
      groanCd: z.groanCd, hit: z.hitReact || 0, notice: z.noticeT || 0 };
    states.set(z, s);
    if (dt > .15 || dt <= 0) { jaw.rotation.x = s.a; return; }
  }
  if (!(dt > 0)) return;
  s.t += dt;
  // the head's motion (one frame of finite differences, low-passed: the jaw is a pendulum on it)
  const f = 1 - Math.exp(-30 * dt);
  const vy = (y - s.y) / dt, ay = (vy - s.vy) / dt; s.y = y; s.vy = vy; s.ay += (clamp(ay, -40, 40) - s.ay) * f;
  const hv = (hp - s.hp) / dt, ha = (hv - s.hv) / dt; s.hp = hp; s.hv = hv; s.ha += (clamp(ha, -60, 60) - s.ha) * f;
  // events
  if (z.groanCd != null && s.groanCd != null && z.groanCd > s.groanCd + .5 && z.alive) { s.groanDur = K.groanDur * (.8 + .4 * s.seed); s.groanT = s.groanDur; }
  s.groanCd = z.groanCd;
  const nt = z.noticeT || 0; if (nt > s.notice + .1 && s.groanT <= 0) { s.groanDur = K.noticeDur; s.groanT = s.groanDur; } s.notice = nt;
  const hr = z.hitReact || 0; if (hr > s.hit + .05) { s.v += K.hitKick; s.slackT = Math.max(s.slackT, K.slackT); } s.hit = hr;
  const sw = z.swingT || 0; if (s.swing > 0 && sw <= 0) s.slackT = K.slackT; s.swing = sw;
  // the target and the spring, strongest beat first
  let target, w = K.w, zeta = K.zeta;
  const wu = z.attackWindup || 0;
  if (wu > 0) {
    if (wu > s.wind0) s.wind0 = wu;
    target = max * K.windOpen * smooth((1 - wu / s.wind0) / .6); w = K.wWind;
  } else {
    s.wind0 = 0;
    if (sw > 0) { target = 0; w = K.wSnap; zeta = K.zetaSnap; }
    else if (s.groanT > 0) {
      const e = s.groanDur - s.groanT, env = smooth(e / .25) * smooth(s.groanT / .3);
      target = max * K.groanOpen * env * (1 - K.chew * (.5 + .5 * Math.sin(s.t * s.chewRate)));
    } else if (s.slackT > 0) target = max * K.slack * smooth(s.slackT / K.slackT * 2);
    else target = max * K.breath * (.5 + .5 * Math.sin(s.t * 1.3 + s.seed * 6));
  }
  s.groanT = Math.max(0, s.groanT - dt); s.slackT = Math.max(0, s.slackT - dt);
  const push = K.fallLag * s.ay - K.nodLag * s.ha;
  s.v += (w * w * (target - s.a) - 2 * zeta * w * s.v + push) * dt;
  s.a += s.v * dt;
  if (s.a > max) { s.a = max; if (s.v > 0) s.v *= -.2; }
  else if (s.a < 0) { s.a = 0; if (s.v < 0) s.v *= -.15; }   // teeth meet: a small knock back
  jaw.rotation.x = s.a;
}
