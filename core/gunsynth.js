// CL-134 (Jerry, 2026-10-09: "overhaul all weapons sounds ... impactful and fun to hear"). The guns, built sample by
// sample. Pure: no Web Audio, no game state, no DOM, so node can run it (core/gunsynth.test.mjs) and core/audio.js
// turns what it returns into AudioBuffers once, at load, and then only plays them back.
//
// A shot is layers, each a few lines of DSP, summed and then driven into a soft clipper so it is loud without peaks:
//   crack   the supersonic N-wave (rifles, the magnum, the sniper): the snap you hear before anything else;
//   pop     a broadband muzzle transient (a millisecond or two of noise): the front of every shot;
//   blast   the body: noise under a lowpass that sweeps from bright to dark, plus a resonant "bark" that gives each
//           gun its voice (a pistol's 1.2 kHz pop, the AK's 600 Hz chunk, a shotgun's 380 Hz boom);
//   thump   a sine falling fast in pitch (the kick-drum trick): the punch you feel;
//   sub     the same, lower and longer, for the heavy guns;
//   clank   the action (CL-135): steel striking steel, a hard tick and a dense cluster of resonances gone in a few ms;
//   rattle  a run of small clanks (a belt's links, the AR's buffer and spring settling);
//   whoosh  noise through a moving band (a 40 mm round leaving the tube, a blade through the air).
// The tail is a second, stereo buffer at a low sample rate: a dark rumble that blooms and rolls, and the valley's echoes
// (dark, smeared copies of the shot at 0.1 to 2 s, offset left and right). audio.js plays dry and tail together and
// turns the tail down under sustained fire so a burst rolls instead of turning to mush.
// Every bank has a few variants from seeded noise and jittered parameters, and playback adds a little pitch and level
// variance on top, so no two rounds are the same.

export const GUNSYNTH_VERSION = 1;
export const TAIL_SR = 16000;   // tails are dark (everything under 2.6 kHz); 16 kHz keeps their memory a third

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

// --- DSP --------------------------------------------------------------------------------------------------------
function coefs(type, f, q, sr, db = 0) {
  const w = 2 * Math.PI * Math.max(10, Math.min(f, sr * 0.45)) / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q);
  if (type === 'peak') {   // a bell: +db at f
    const A = Math.pow(10, db / 40), a0 = 1 + al / A;
    return [(1 + al * A) / a0, -2 * cw / a0, (1 - al * A) / a0, -2 * cw / a0, (1 - al / A) / a0];
  }
  let b0, b1, b2;
  const a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
  if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
  else { b0 = al; b1 = 0; b2 = -al; }   // 'bp': 0 dB at the centre
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
// A biquad over x, in place. f is Hz, or a function of time (s) re-read every 16 samples (a sweep).
export function biquad(x, type, f, q, sr, from = 0, to = x.length, db = 0) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const dyn = typeof f === 'function';
  let c = dyn ? null : coefs(type, f, q, sr, db);
  for (let i = from; i < to; i++) {
    if (dyn && ((i - from) & 15) === 0) c = coefs(type, f((i - from) / sr), q, sr);
    const x0 = x[i];
    const y0 = c[0] * x0 + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    x[i] = y0;
  }
  return x;
}
function onePole(x, f, sr) { const a = Math.exp(-2 * Math.PI * f / sr); let y = 0; for (let i = 0; i < x.length; i++) { y = x[i] * (1 - a) + y * a; x[i] = y; } return x; }
function white(n, R) { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = R() * 2 - 1; return a; }
function peak(x) { let p = 0; for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > p) p = v; } return p; }
function addAt(out, src, at, g) { const n = Math.min(src.length, out.length - at); for (let i = Math.max(0, -at); i < n; i++) out[at + i] += src[i] * g; }
const J = (R, x, pct) => x * (1 + (R() * 2 - 1) * pct);
// A soft clipper with a little asymmetry (asym > 0 gives the even harmonics of a real blast: grit, not fuzz).
function saturate(x, drive, asym = 0) {
  if (!(drive > 0)) return x;
  const n = Math.tanh(drive * (1 + asym)) - Math.tanh(drive * asym);
  for (let i = 0; i < x.length; i++) x[i] = (Math.tanh(drive * (x[i] + asym)) - Math.tanh(drive * asym)) / n;
  return x;
}
// Scale x so its RMS over [0, upTo) samples is `target` (noise layers are loud or quiet depending on how narrow
// their filters are; this makes a layer's g mean the same thing whatever its filters).
function normRms(x, target, upTo) {
  const m = Math.max(16, Math.min(x.length, upTo | 0)); let e = 0;
  for (let i = 0; i < m; i++) e += x[i] * x[i];
  const r = Math.sqrt(e / m) || 1;
  for (let i = 0; i < x.length; i++) x[i] *= target / r;
  return x;
}
function fadeOut(x, n) { const m = Math.min(n, x.length); for (let i = 0; i < m; i++) x[x.length - 1 - i] *= i / m; }

// --- Layers (each returns a buffer starting at its own t = 0) ----------------------------------------------------
// The supersonic crack: an N-wave (jump up, straight down through zero, jump back), high-passed.
function crack(n, sr, P) {
  const a = new Float32Array(n), m = Math.max(6, Math.round(P.dur * sr / 1000));
  for (let i = 0; i < m && i < n; i++) a[i] = 1 - 2 * i / (m - 1);
  if (P.second) { const o = Math.round(P.second * sr / 1000); for (let i = 0; i < m && o + i < n; i++) a[o + i] += (P.secondG || 0.35) * (1 - 2 * i / (m - 1)); }
  biquad(a, 'hp', P.hp || 1500, 0.7, sr);
  onePole(a, 15000, sr);
  return a;
}
// A broadband muzzle transient.
function pop(n, sr, P, R) {
  const a = white(n, R), d = (P.dur || 1.5) / 1000;
  biquad(a, 'hp', P.hp || 1200, 0.7, sr);
  normRms(a, 0.5, Math.round(0.01 * sr));
  for (let i = 0; i < n; i++) { const t = i / sr; a[i] *= (1 - Math.exp(-t / 0.00008)) * Math.exp(-t / d); }
  return a;
}
// The body: noise, filtered (a falling lowpass, a highpass, and a resonant bark mixed in), then enveloped
// (an instant attack and two decays, the fast one carrying the punch, the slow one the weight).
function blast(n, sr, P, R) {
  const src = white(n, R), a = Float32Array.from(src);
  const lp0 = P.lp[0], lp1 = P.lp[1], tau = P.lpTau / 1000;
  const d1 = P.d1 / 1000, d2 = P.d2 / 1000, mix = P.mix != null ? P.mix : 0.3, at = (P.att || 0.25) / 1000;
  const win = Math.round(sr * Math.max(0.004, d1 * 2));
  biquad(a, 'lp', (t) => lp1 + (lp0 - lp1) * Math.exp(-t / tau), 0.75, sr);
  biquad(a, 'hp', P.hp || 80, 0.7, sr);
  normRms(a, 0.32, win);
  if (P.bark) {
    const b = Float32Array.from(src);
    biquad(b, 'bp', P.bark, P.barkQ || 1.5, sr);
    biquad(b, 'bp', P.bark, P.barkQ || 1.5, sr);
    normRms(b, 0.32 * (P.barkMix != null ? P.barkMix : 0.5), win);
    for (let i = 0; i < n; i++) a[i] += b[i];
  }
  for (let i = 0; i < n; i++) { const t = i / sr; a[i] *= (1 - Math.exp(-t / at)) * ((1 - mix) * Math.exp(-t / d1) + mix * Math.exp(-t / d2)); }
  return a;
}
// A sine whose pitch falls fast: the punch (thump) or the weight (sub). A touch of second harmonic for the speaker.
function thump(n, sr, P) {
  const a = new Float32Array(n), f0 = P.f[0], f1 = P.f[1], tp = (P.tp || 15) / 1000, d = P.d / 1000, h2 = P.h2 != null ? P.h2 : 0.12;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = f1 + (f0 - f1) * Math.exp(-t / tp);
    ph += 2 * Math.PI * f / sr;
    a[i] = (Math.sin(ph) + h2 * Math.sin(2 * ph)) * (1 - Math.exp(-t / 0.0006)) * Math.exp(-t / d);
  }
  return a;
}
// --- Mechanics (CL-135, Jerry: "the reloads sound like bones clinking together or a xylophone. We need realism") ----
// Real steel on steel is not a note: it is a hard broadband tick and a dense cluster of resonances (dozens, at no
// musical ratio to each other) that are gone in a few milliseconds, over the dull knock of the part it hit. So nothing
// here is a sine: every layer is noise, shaped.
// A noise burst through n narrow bands, so each band rings for about tau ms (Q = pi f tau); the bands are scattered
// at random over f[0]..f[1], each variant its own, so there is no pitch to hear.
function ringBands(x, sr, R, lo, hi, n, tau) {
  const out = new Float32Array(x.length), tmp = new Float32Array(x.length);
  for (let k = 0; k < n; k++) {
    const f = lo * Math.pow(hi / lo, (k + R()) / n), t = tau * (0.75 + 0.5 * R()) * Math.min(1.25, Math.pow(f / 3000, 0.35)) / 1000;   // the low bands die first: a long low ring is a wood block
    const q = Math.max(1.5, Math.min(60, Math.PI * f * t)), m = Math.min(x.length, Math.ceil(t * 9 * sr) + 64);
    if (f > sr * 0.45) continue;
    tmp.fill(0); tmp.set(x.subarray(0, m));
    biquad(tmp, 'bp', f, q, sr, 0, m);
    const g = (0.5 + R() * 0.5) * Math.sqrt(q * 3000 / f);   // every band the same energy, so no one of them is a note
    for (let i = 0; i < m; i++) out[i] += tmp[i] * g;
  }
  return out;
}
// clank: a metal part striking another (a slide home, a bolt locking, a latch, a case landing).
//   f: [lo, hi] Hz of its resonances; tau: ms they ring (1 to 3 for gun parts, 5 or more for a loose sheet of steel);
//   n: how many; click: the strike itself (broadband, a fraction of a millisecond); body: the dull knock of what it
//   is part of (noise under bodyF, decaying over bodyD ms); ex: ms of the strike (longer is a softer, duller hit).
function clank(n, sr, P, R) {
  const ex = Math.max(0.05, P.ex != null ? P.ex : 0.35) / 1000, m = Math.min(n, Math.ceil(ex * 8 * sr) + 8);
  const e = new Float32Array(n);
  for (let i = 0; i < m; i++) e[i] = (R() * 2 - 1) * Math.exp(-i / sr / ex);
  const f = P.f || [1200, 8000], tau = P.tau || 2;
  const a = ringBands(e, sr, R, f[0], f[1], Math.max(P.n || 0, 20), tau);
  normRms(a, 0.3, Math.round(tau * 3 / 1000 * sr));
  const cl = P.click != null ? P.click : 0.5;
  if (cl > 0) {
    const c = Float32Array.from(e.subarray(0, m)); biquad(c, 'hp', Math.min(f[0] * 1.5, 5000), 0.7, sr);
    normRms(c, 0.3, Math.max(16, Math.round(ex * 2 * sr)));
    for (let i = 0; i < m; i++) a[i] += c[i] * cl;
  }
  const bg = P.body != null ? P.body : 0.35;
  if (bg > 0) {
    const bd = (P.bodyD || 6) / 1000, bm = Math.min(n, Math.ceil(bd * 7 * sr)), b = white(bm, R);
    biquad(b, 'lp', P.bodyF || 900, 0.7, sr); biquad(b, 'lp', P.bodyF || 900, 0.7, sr);
    normRms(b, 0.3, Math.round(bd * 2 * sr));
    for (let i = 0; i < bm; i++) a[i] += b[i] * bg * (1 - Math.exp(-i / (sr * 0.0003))) * Math.exp(-i / sr / bd);
  }
  return a;
}
// knock: a dull hit with no metal in it (a palm on a magazine, polymer on polymer, a mag in the dirt, a wooden
// forend): noise through a low, wide band around f, a quick attack, a decay of d ms.
function knock(n, sr, P, R) {
  const d = (P.d || 12) / 1000, m = Math.min(n, Math.ceil(d * 8 * sr) + 16), a = new Float32Array(n), b = white(m, R);
  const f = P.f || 300;
  biquad(b, 'lp', f * 2.2, 0.7, sr); biquad(b, 'lp', f * 2.2, 0.7, sr);
  biquad(b, 'bp', f, P.q || 1.1, sr);
  normRms(b, 0.32, Math.round(d * 2 * sr));
  for (let i = 0; i < m; i++) a[i] = b[i] * (1 - Math.exp(-i / (sr * 0.0005))) * Math.exp(-i / sr / d);
  return a;
}
// scrape: metal or polymer sliding on metal (a slide racked, a mag pushed up the well, a bolt run back): noise made
// grainy by a random train of tiny bumps (rough 0..1), through a band moving from f[0] to f[1].
function scrape(n, sr, P, R) {
  const dur = P.dur / 1000, att = (P.att || P.dur * 0.25) / 1000, dec = (P.dec || P.dur * 0.3) / 1000;
  const m = Math.min(n, Math.ceil((dur + dec * 6) * sr)), a = white(m, R), out = new Float32Array(n);
  const rough = P.rough != null ? P.rough : 0.7, rate = P.grain || 1400;
  let g = 0; const gk = Math.exp(-1 / (sr * 0.0005));
  for (let i = 0; i < m; i++) { if (R() < rate / sr) g += 0.6 + R(); g *= gk; a[i] *= (1 - rough) + rough * Math.min(2.5, g); }
  const f0 = P.f[0], f1 = P.f[1];
  biquad(a, 'bp', (t) => f0 * Math.pow(f1 / f0, Math.min(1, t / dur)), P.q || 0.9, sr);
  biquad(a, 'hp', P.hp || 500, 0.7, sr);
  normRms(a, 0.32, Math.round(dur * sr));
  for (let i = 0; i < m; i++) { const t = i / sr; out[i] = a[i] * (t < att ? Math.sin(t / att * Math.PI / 2) : t < dur ? 1 : Math.exp(-(t - dur) / dec)); }
  return out;
}
// rattle: a run of small clanks (a belt's links, a revolver's pawl, loose parts settling): count of them over dur ms,
// fading (fade 0..1); slow > 0 spaces them out as they go (a cylinder spinning down).
function rattle(n, sr, P, R) {
  const a = new Float32Array(n), cnt = P.count || 8, dur = P.dur / 1000, slow = P.slow || 0;
  for (let k = 0; k < cnt; k++) {
    const u = (k + (P.even ? 0.15 : 0.8) * R()) / cnt, at = Math.round(dur * (slow ? Math.pow(u, 1 / (1 + slow)) : u) * sr);
    if (at >= n) continue;
    const c = clank(Math.min(n - at, Math.round(0.03 * sr)), sr, { f: P.f, tau: P.tau || 1.2, n: P.n || 8, click: P.click != null ? P.click : 0.6, body: P.body || 0, ex: P.ex }, R);
    addAt(a, c, at, (0.45 + R() * 0.55) * (1 - (P.fade || 0.5) * k / cnt));
  }
  const p = peak(a) || 1; for (let i = 0; i < n; i++) a[i] /= p;
  return a;
}
// static: a CRT changing channel. Hiss across the whole band, flickering frame by frame (60 a second), buzzing with
// the 60 Hz field, peppered with crackle, then cut. dur ms; hum 0..1; crackle: how many pops; f: [hp, lp].
function crtStatic(n, sr, P, R) {
  const dur = P.dur / 1000, m = Math.min(n, Math.ceil((dur + 0.006) * sr)), a = white(m, R), out = new Float32Array(n);
  const f = P.f || [300, 9000];
  biquad(a, 'hp', f[0], 0.7, sr); biquad(a, 'lp', f[1], 0.7, sr);
  biquad(a, 'peak', 4200, 0.8, sr, 0, m, 4);
  normRms(a, 0.3, m);
  const frame = Math.round(sr / 60), hum = P.hum != null ? P.hum : 0.35;
  let lvl = 1;
  for (let i = 0; i < m; i++) {
    if (i % frame === 0) lvl = 0.55 + 0.45 * R();
    const t = i / sr, buzz = 1 - hum * (Math.sin(2 * Math.PI * 60 * t) > 0.6 ? 1 : 0);
    const env = Math.min(1, t / 0.0015) * (t < dur ? (P.swell ? 0.75 + 0.25 * Math.min(1, t / dur * 2) : 1) : Math.max(0, 1 - (t - dur) / 0.004));
    out[i] = a[i] * lvl * buzz * env;
  }
  for (let k = 0; k < (P.crackle || 0); k++) {
    const at = Math.round(R() * dur * sr), g = 0.6 + R() * 1.2, w = Math.round(sr * (0.0002 + R() * 0.0006));
    for (let i = 0; i < w && at + i < m; i++) out[at + i] += (R() * 2 - 1) * g * (1 - i / w);
  }
  return out;
}
// Noise through a band that moves from f0 to f1: a round leaving the tube, a blade through the air.
function whoosh(n, sr, P, R) {
  const a = white(n, R), dur = P.dur / 1000, f0 = P.f[0], f1 = P.f[1];
  biquad(a, 'bp', (t) => f0 * Math.pow(f1 / f0, Math.min(1, t / dur)), P.q || 2, sr);
  normRms(a, 0.32, Math.round(dur * sr));
  const at = (P.att || 20) / 1000, dc = (P.dec || P.dur * 0.4) / 1000;
  for (let i = 0; i < n; i++) { const t = i / sr; a[i] *= (t < at ? Math.sin(t / at * Math.PI / 2) : Math.exp(-(t - at) / dc)); }
  return a;
}
// A wet slap (flesh): noise through a formant that falls (a vowel going "ah-oo"), short.
function wet(n, sr, P, R) {
  const a = white(n, R), d = P.d / 1000;
  biquad(a, 'bp', (t) => P.f[1] + (P.f[0] - P.f[1]) * Math.exp(-t / (d * 0.8)), P.q || 3, sr);
  biquad(a, 'lp', 3200, 0.7, sr);
  normRms(a, 0.32, Math.round(d * 2 * sr));
  for (let i = 0; i < n; i++) { const t = i / sr; a[i] *= (1 - Math.exp(-t / 0.0015)) * Math.exp(-t / d); }
  return a;
}
// Crunch: a dense scatter of tiny bright clicks (bone, gravel, a belt of links).
function crunch(n, sr, P, R) {
  const a = new Float32Array(n), dur = P.dur / 1000, count = P.n || 18;
  for (let k = 0; k < count; k++) {
    const at = Math.floor(R() * dur * sr * (P.spread || 1) * (k / count + R() / count)), g = (0.4 + R() * 0.6) * Math.exp(-at / sr / (dur * 0.6));
    const m = Math.round(0.0015 * sr);
    for (let i = 0; i < m && at + i < n; i++) a[at + i] += (R() * 2 - 1) * g * Math.exp(-i / (sr * 0.0004));
  }
  biquad(a, 'bp', P.f || 2400, P.q || 0.9, sr);
  const p = peak(a) || 1; for (let i = 0; i < n; i++) a[i] /= p;
  return a;
}

const LAYERS = { crack, pop, blast, thump, sub: thump, clank, knock, scrape, rattle, static: crtStatic, whoosh, wet, crunch };

// --- The shot, the tail, the bank -------------------------------------------------------------------------------
// One shot's dry sound (mono, at sr), and the pre-clip sum (for the echoes). def.layers: [{ k: kind, t: ms, g: gain, ...params }].
const LO = { thump: true, sub: true }, TR = { crack: true, pop: true };
function renderDry(def, sr, R) {
  const n = Math.ceil((def.dryLen || 0.45) * sr), hi = new Float32Array(n), lo = new Float32Array(n), tr = new Float32Array(n), late = new Float32Array(n);
  const subs = def.subs || [[0, 1]];
  for (const [st, sg] of subs) {
    for (const L0 of def.layers) {
      const L = jitterLayer(L0, R);
      const fn = LAYERS[L.k]; if (!fn) continue;
      const at = Math.round(((L.t || 0) + st + (L.tj ? (R() - 0.5) * L.tj : L.k === 'clank' ? (R() - 0.5) * 1.6 : 0)) / 1000 * sr);
      const len = Math.max(16, n - at);
      // anything well after the shot (the sniper's bolt) is kept out of the clipper and the echoes
      const dest = (L.t || 0) > 200 ? late : (LO[L.k] ? lo : TR[L.k] ? tr : hi);
      addAt(dest, fn(len, sr, L, R), at, (L.g != null ? L.g : 1) * sg * J(R, 1, def.ampJ || 0.06));
    }
  }
  if (def.ground) {   // the ground bounce a few milliseconds behind: thickness
    const o = Math.round(def.ground[0] / 1000 * sr), g = def.ground[1], c = Float32Array.from(hi);
    onePole(c, 2500, sr);
    for (let i = n - 1; i >= o; i--) hi[i] += c[i - o] * g;
  }
  const pre = new Float32Array(n);
  for (let i = 0; i < n; i++) pre[i] = hi[i] + lo[i] + tr[i];
  // Three groups, each driven its own way: the body and the metal hard (loud, dense, gritty); the transient barely,
  // so the crack still stands out in front of the body; the punch and the sub only rounded, so they stay a boom.
  saturate(hi, def.drive || 0, def.asym || 0);
  saturate(tr, 0.8);
  saturate(lo, 1.1);
  if (renderDry.debug) renderDry.debug({ hi: Float32Array.from(hi), tr: Float32Array.from(tr), lo: Float32Array.from(lo) });
  const out = hi;
  for (let i = 0; i < n; i++) out[i] = Math.tanh((hi[i] * (def.hiMix || 0.75) + tr[i] * (def.trMix || 1.15) + lo[i] * (def.loMix || 0.55)) * 1.1) / 1.1;
  // the gun's voice: a few broad bells that give it a colour of its own (the AK's chunk, the revolver's bite)
  for (const [f, db, q] of def.eq || []) biquad(out, 'peak', f, q || 1, sr, 0, n, db);
  for (let i = 0; i < n; i++) out[i] += late[i];
  const p = peak(out) || 1;
  for (let i = 0; i < n; i++) out[i] *= 0.95 / p;
  fadeOut(out, Math.round(0.03 * sr));
  return { dry: out, pre };
}
function jitterLayer(L, R) {
  const o = { ...L };
  for (const key of ['d', 'd1', 'd2', 'lpTau', 'dur', 'dec', 'tp', 'tau']) if (typeof o[key] === 'number') o[key] = J(R, o[key], 0.08);
  for (const key of ['bark', 'base', 'hp']) if (typeof o[key] === 'number') o[key] = J(R, o[key], 0.04);
  if (Array.isArray(o.f)) o.f = o.f.map((v) => J(R, v, 0.035));
  else if (o.k === 'knock' && typeof o.f === 'number') o.f = J(R, o.f, 0.06);
  if (Array.isArray(o.lp)) o.lp = o.lp.map((v) => J(R, v, 0.05));
  return o;
}
// Down to the tail's sample rate (the shot is lowpassed first, then read with linear interpolation).
function toTailRate(x, sr) {
  const y = Float32Array.from(x);
  biquad(y, 'lp', TAIL_SR * 0.4, 0.7, sr); biquad(y, 'lp', TAIL_SR * 0.4, 0.7, sr);
  const ratio = sr / TAIL_SR, n = Math.floor(y.length / ratio), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = i * ratio, i0 = Math.floor(p), fr = p - i0; out[i] = y[i0] * (1 - fr) + (y[i0 + 1] || 0) * fr; }
  return out;
}
// The tail: two channels at TAIL_SR. A rumble that blooms and rolls, and the echoes off the valley.
function renderTail(def, pre, sr, R) {
  const T = def.tail, srT = TAIL_SR, n = Math.ceil(T.len * srT);
  const L = new Float32Array(n), Rr = new Float32Array(n);
  // the rumble, independent noise per side, its level rolling slowly
  const tau = T.tau, att = (T.att || 18) / 1000;
  const roll = white(Math.ceil(n / 64) + 2, R); onePole(roll, 7, srT / 64); const rp = peak(roll) || 1;
  for (const ch of [L, Rr]) {
    const a = white(n, R);
    biquad(a, 'lp', (t) => T.lp * (0.55 + 0.45 * Math.exp(-t / (tau * 0.8))), 0.7, srT); biquad(a, 'hp', T.hp || 45, 0.7, srT);
    const ap = 1 / (peak(a) || 1);
    for (let i = 0; i < n; i++) { const t = i / srT; ch[i] += a[i] * ap * T.amp * (1 - Math.exp(-t / att)) * Math.exp(-t / tau) * (1 + 0.4 * roll[i >> 6] / rp); }
  }
  // the echoes: the shot itself, dark and smeared, arriving later, a little earlier on one side than the other
  if (T.echoes && T.echoes.length) {
    const src = toTailRate(pre, sr), sp = peak(src) || 1;
    for (let i = 0; i < src.length; i++) src[i] /= sp;
    for (const [t, g, lp] of T.echoes) {
      const e = Float32Array.from(src);
      biquad(e, 'lp', J(R, lp, 0.08), 0.7, srT); biquad(e, 'hp', 70, 0.7, srT);
      // smear: a few close taps, so an echo off trees is a wash and not a clean slapback
      const sm = new Float32Array(e.length + Math.round(0.035 * srT));
      for (let k = 0; k < 7; k++) addAt(sm, e, Math.round(R() * 0.03 * srT), (1 - k / 8) * (0.3 + R() * 0.5));
      const smP = peak(sm) || 1;
      const off = (T.width || 0.018) * (R() * 2 - 1);
      addAt(L, sm, Math.round(J(R, t, 0.06) * srT + off * srT), g / smP * J(R, 1, 0.1));
      addAt(Rr, sm, Math.round(J(R, t, 0.06) * srT - off * srT), g / smP * J(R, 1, 0.1));
    }
  }
  if (T.debris) {   // what a blast throws up comes down: a patter of small hits through the tail
    for (const ch of [L, Rr]) {
      for (let k = 0; k < T.debris; k++) {
        const at = Math.round((0.15 + R() * R() * 1.4) * srT), m = Math.round(0.006 * srT), g = 0.06 + R() * 0.12;
        for (let i = 0; i < m && at + i < n; i++) ch[at + i] += (R() * 2 - 1) * g * Math.exp(-i / (srT * 0.0012));
      }
    }
  }
  for (const ch of [L, Rr]) { for (let i = 0; i < n; i++) ch[i] = Math.tanh(ch[i] * 1.2) / 1.2; fadeOut(ch, Math.round(0.12 * srT)); }
  return [L, Rr];
}

// The bank for one sound: variants of the dry shot (mono, at sr) and of its tail (stereo, at TAIL_SR).
// def: a GUN_DEFS or FOLEY_DEFS entry. Deterministic for (key, sr, variant).
export { renderDry as _renderDry };
export function buildBank(key, def, sr, opts = {}) {
  const nd = opts.variants || def.variants || 4, nt = def.tail ? (opts.tailVariants || def.tailVariants || 2) : 0;
  const dry = [], tail = [];
  for (let v = 0; v < nd; v++) {
    const R = mulberry32(hashStr(key + ':' + v + ':' + sr));
    const r = renderDry(def, sr, R);
    dry.push(r.dry);
    if (v < nt) tail.push(renderTail(def, r.pre, sr, R));
  }
  return { key, dry, tail, sr, tailSr: TAIL_SR, level: def.level || 0.8, tailLevel: def.tail ? (def.tail.level || 1) : 0,
    interval: def.interval || 0, pitchJ: def.pitchJ != null ? def.pitchJ : 0.03, rev: def.rev != null ? def.rev : 0.08 };
}

// --- The guns ---------------------------------------------------------------------------------------------------
// level: the gun's loudness against the others (the shotgun and the sniper at 1). interval: the fire rate the
// bursts are evened out to. Layer times in ms, decays in ms, frequencies in Hz.
export const GUN_DEFS = {
  // 9 mm: a tight, snappy pop and the slide cycling behind it.
  pistol: { level: 0.2485, supLevel: 1.4, eq: [[2200, 3, 1.2], [150, -3, 1]], interval: 0.28, dryLen: 0.32, drive: 1.58, asym: 0.05, ground: [4, 0.25],
    layers: [
      { k: 'pop', dur: 1.4, hp: 1600, g: 0.9 },
      { k: 'blast', g: 1, d1: 7, d2: 42, mix: 0.24, lp: [10000, 2550], lpTau: 22.4, hp: 130, bark: 1250, barkQ: 1.8, barkMix: 0.5 },
      { k: 'thump', g: 0.55, f: [250, 125], tp: 16.5, d: 32 },
      { k: 'clank', t: 9, f: [1800, 9500], tau: 1.6, n: 16, body: 0.3, bodyF: 1400, g: 0.16 },
      { k: 'clank', t: 31, f: [1300, 8000], tau: 2, n: 16, body: 0.45, bodyF: 1100, g: 0.2 }
    ],
    tail: { len: 0.9, lp: 1150, tau: 0.17, amp: 0.2, echoes: [[0.085, 0.26, 2200], [0.19, 0.16, 1500], [0.33, 0.09, 1000]] } },
  // 9 mm open bolt at 14 a second: dry, mid-forward "tak"s, the bolt clattering, short tails.
  uzi: { level: 0.4059, supLevel: 1.37, eq: [[1400, 3, 1.1], [120, -4, 1], [5000, 2, 1]], interval: 1 / 14, dryLen: 0.22, drive: 1.44, asym: 0.04, pitchJ: 0.035,
    layers: [
      { k: 'pop', dur: 1.1, hp: 1700, g: 0.8 },
      { k: 'blast', g: 1, d1: 5.5, d2: 26, mix: 0.2, lp: [9000, 3250], lpTau: 15.4, hp: 160, bark: 1500, barkQ: 1.3, barkMix: 0.55 },
      { k: 'thump', g: 0.45, f: [210, 120], tp: 13.5, d: 24 },
      { k: 'clank', t: 0, f: [900, 6500], tau: 2, n: 16, body: 0.5, bodyF: 900, g: 0.28 },
      { k: 'clank', t: 38, f: [1500, 8500], tau: 1.4, n: 12, g: 0.1 }
    ],
    tail: { len: 0.6, lp: 1300, tau: 0.11, amp: 0.16, echoes: [[0.08, 0.2, 2000], [0.17, 0.12, 1400]] } },
  // 5.56: the supersonic crack, a compact punch, the bolt and the buffer spring, a clean bright tail.
  m4: { level: 0.2453, supLevel: 1.15, eq: [[3500, 3, 1], [120, 2, 1.2], [600, -3, 1.2]], interval: 0.1, dryLen: 0.36, drive: 1.44, asym: 0.04, ground: [5, 0.22],
    layers: [
      { k: 'crack', dur: 0.55, hp: 1800, g: 0.95 },
      { k: 'pop', dur: 1.2, hp: 1400, g: 0.5 },
      { k: 'blast', g: 1, d1: 7, d2: 48, mix: 0.27, lp: [12000, 2700], lpTau: 21, hp: 110, bark: 900, barkQ: 1.4, barkMix: 0.42 },
      { k: 'thump', g: 0.62, f: [185, 105], tp: 19.5, d: 44 },
      { k: 'sub', g: 0.14, f: [60, 50], tp: 30, d: 70, h2: 0 },
      { k: 'clank', t: 6, f: [2000, 10000], tau: 1.4, n: 16, body: 0.25, g: 0.11 },
      { k: 'rattle', t: 12, count: 3, dur: 16, f: [2500, 9000], tau: 1, g: 0.035 },
      { k: 'clank', t: 25, f: [1300, 8000], tau: 2, n: 16, body: 0.45, bodyF: 1000, g: 0.14 }
    ],
    tail: { len: 1.05, lp: 1400, tau: 0.27, amp: 0.27, echoes: [[0.09, 0.3, 2600], [0.21, 0.2, 1700], [0.38, 0.12, 1200], [0.6, 0.06, 900]] } },
  // 7.62x39: lower, chunkier, rougher; a heavier bolt and more grit.
  ak: { level: 0.2315, supLevel: 1.49, eq: [[700, 4, 1.2], [1600, 2, 1.4], [5000, -2, 1]], interval: 0.11, dryLen: 0.42, drive: 2.02, asym: 0.08, ground: [5, 0.28],
    layers: [
      { k: 'crack', dur: 0.7, hp: 1400, g: 0.82 },
      { k: 'pop', dur: 1.6, hp: 1100, g: 0.5 },
      { k: 'blast', g: 1, d1: 9, d2: 68, mix: 0.32, lp: [9000, 1850], lpTau: 25.2, hp: 90, bark: 620, barkQ: 1.3, barkMix: 0.56 },
      { k: 'thump', g: 0.76, f: [150, 98], tp: 24, d: 58 },
      { k: 'sub', g: 0.19, f: [52, 46], tp: 30, d: 90, h2: 0 },
      { k: 'clank', t: 5, f: [1000, 7000], tau: 2.2, n: 16, body: 0.4, bodyF: 900, g: 0.18 },
      { k: 'clank', t: 30, f: [700, 5500], tau: 2.6, n: 16, body: 0.6, bodyF: 700, g: 0.22 }
    ],
    tail: { len: 1.25, lp: 1200, tau: 0.33, amp: 0.31, echoes: [[0.1, 0.32, 2200], [0.23, 0.22, 1500], [0.41, 0.13, 1000], [0.66, 0.07, 800]] } },
  // The Watchman, belt-fed 7.62 NATO: deeper and heavier than the AK, the bolt slamming home, the links rattling.
  m240: { level: 0.1961, eq: [[350, 3, 1.1], [90, 2, 1.2], [3000, -3, 1]], interval: 1 / 11, dryLen: 0.45, drive: 2.16, asym: 0.06, ground: [6, 0.3],
    layers: [
      { k: 'crack', dur: 0.8, hp: 1300, g: 0.7 },
      { k: 'pop', dur: 2.4, hp: 800, g: 0.85 },
      { k: 'blast', g: 1, d1: 10, d2: 80, mix: 0.38, lp: [6500, 1100], lpTau: 26, hp: 70, bark: 340, barkQ: 1.1, barkMix: 0.75 },
      { k: 'thump', g: 0.85, f: [130, 88], tp: 27, d: 74 },
      { k: 'sub', g: 0.25, f: [46, 41], tp: 40, d: 120, h2: 0 },
      { k: 'clank', t: 4, f: [600, 5000], tau: 2.6, n: 16, body: 0.6, bodyF: 650, g: 0.24 },
      { k: 'rattle', t: 44, count: 5, dur: 24, f: [1800, 9000], tau: 1.1, g: 0.12 }
    ],
    tail: { len: 1.4, lp: 1000, tau: 0.42, amp: 0.36, echoes: [[0.11, 0.34, 2000], [0.25, 0.24, 1300], [0.45, 0.15, 950], [0.72, 0.08, 700]] } },
  // The rotary gun: each round the game fires is four here, a 60th of a second apart, so it tears instead of
  // ticking (the motor's whine is a separate loop, see audio.js minigunSpin).
  minigun: { level: 0.1202, eq: [[900, 4, 1.4], [3000, -2, 1], [250, -3, 1.2]], interval: 1 / 15, dryLen: 0.2, drive: 1.73, asym: 0.05, pitchJ: 0.025, ampJ: 0.12,
    subs: [[0, 1], [16.7, 0.86], [33.3, 0.95], [50, 0.82]],
    layers: [
      { k: 'crack', dur: 0.45, hp: 1700, g: 0.55 },
      { k: 'blast', g: 1, d1: 3.5, d2: 17, mix: 0.22, lp: [8000, 3400], lpTau: 11.2, hp: 140, bark: 950, barkQ: 1.6, barkMix: 0.5 },
      { k: 'thump', g: 0.42, f: [165, 108], tp: 12, d: 17 }
    ],
    tail: { len: 0.6, lp: 950, tau: 0.15, amp: 0.26, echoes: [[0.09, 0.2, 1700], [0.2, 0.12, 1200]] } },
  // 12 gauge pump: the big one. A broadband front, a long low boom, a heavy sub, and the valley answering.
  shotgun: { level: 0.1848, eq: [[70, 3, 1], [450, 2, 1.2], [2500, -1.5, 1]], interval: 0.7, dryLen: 0.6, drive: 2.3, asym: 0.07, ground: [6, 0.32],
    layers: [
      { k: 'pop', dur: 2.8, hp: 700, g: 1.5 },
      { k: 'blast', g: 1, d1: 14, d2: 130, mix: 0.42, lp: [6500, 1000], lpTau: 42, hp: 55, bark: 300, barkQ: 0.9, barkMix: 0.55 },
      { k: 'thump', g: 1, f: [105, 70], tp: 33, d: 110 },
      { k: 'sub', g: 0.36, f: [42, 37], tp: 50, d: 220, h2: 0 }
    ],
    tail: { len: 1.9, lp: 900, tau: 0.6, amp: 0.42, width: 0.025, echoes: [[0.12, 0.4, 1800], [0.27, 0.3, 1200], [0.48, 0.2, 900], [0.75, 0.12, 700], [1.1, 0.06, 600]] } },
  // The auto shotgun: the pump gun's boom, tighter, with its gas system chugging.
  aa12: { level: 0.2187, eq: [[220, 4, 1], [3000, -3, 1]], interval: 0.19, dryLen: 0.45, drive: 2.16, asym: 0.07, ground: [6, 0.3],
    layers: [
      { k: 'pop', dur: 1.9, hp: 950, g: 0.9 },
      { k: 'blast', g: 1, d1: 11, d2: 85, mix: 0.34, lp: [8000, 1700], lpTau: 33.6, hp: 90, bark: 430, barkQ: 1.1, barkMix: 0.6 },
      { k: 'thump', g: 0.85, f: [125, 84], tp: 27, d: 76 },
      { k: 'sub', g: 0.27, f: [44, 40], tp: 40, d: 150, h2: 0 },
      { k: 'clank', t: 34, f: [700, 5500], tau: 2.4, n: 16, body: 0.6, bodyF: 700, g: 0.17 },
      { k: 'clank', t: 70, f: [1000, 7000], tau: 1.8, n: 14, body: 0.3, g: 0.1 }
    ],
    tail: { len: 1.25, lp: 950, tau: 0.42, amp: 0.36, echoes: [[0.11, 0.33, 1700], [0.25, 0.22, 1150], [0.45, 0.13, 850]] } },
  // .44: the hammer falls, then a cannon. A magnum's crack, a huge mid boom, a long tail.
  revolver: { level: 0.2437, eq: [[1300, 3, 1.3], [4500, 5, 1], [250, -4, 1.2]], interval: 0.45, dryLen: 0.55, drive: 2.16, asym: 0.07, ground: [5, 0.3],
    layers: [
      { k: 'clank', t: 0, f: [2200, 10000], tau: 1, n: 12, click: 0.8, body: 0.2, g: 0.06 },
      { k: 'crack', t: 6, dur: 0.8, hp: 1200, g: 1.05 },
      { k: 'pop', t: 6, dur: 1.8, hp: 1000, g: 0.75 },
      { k: 'blast', t: 6, g: 1, d1: 11, d2: 100, mix: 0.36, lp: [11000, 1800], lpTau: 34, hp: 70, bark: 780, barkQ: 1.5, barkMix: 0.6 },
      { k: 'thump', t: 6, g: 0.9, f: [140, 92], tp: 26, d: 85 },
      { k: 'sub', t: 6, g: 0.3, f: [46, 41], tp: 40, d: 160, h2: 0 }
    ],
    tail: { len: 1.7, lp: 1000, tau: 0.55, amp: 0.42, width: 0.022, echoes: [[0.12, 0.42, 2000], [0.27, 0.3, 1400], [0.48, 0.2, 1000], [0.76, 0.11, 750], [1.1, 0.05, 600]] } },
  // The hero: the biggest crack in the game (doubled off the ground), a deep blast, a sub you feel, and the valley
  // rolling it back for two seconds. (The bolt is its own cues now, on the animation's beats: CL-135, GB-146.)
  sniper: { level: 0.2071, supLevel: 0.93, eq: [[5000, 4, 1], [60, 3, 1], [700, -4, 1.1]], interval: 0.9, dryLen: 1.0, drive: 2.45, asym: 0.06, ground: [5, 0.3],
    layers: [
      { k: 'crack', dur: 0.9, hp: 2200, g: 1.25, second: 4, secondG: 0.4 },
      { k: 'pop', dur: 2.0, hp: 1800, g: 0.85 },
      { k: 'blast', g: 1, d1: 12, d2: 150, mix: 0.4, lp: [12000, 1300], lpTau: 42, hp: 50, bark: 1100, barkQ: 1.6, barkMix: 0.3 },
      { k: 'thump', g: 1, f: [112, 70], tp: 37.5, d: 130 },
      { k: 'sub', g: 0.39, f: [40, 35], tp: 60, d: 260, h2: 0 }
    ],
    tail: { len: 2.7, lp: 900, tau: 0.9, amp: 0.5, width: 0.03, echoes: [[0.15, 0.45, 2200], [0.33, 0.36, 1500], [0.58, 0.27, 1100], [0.9, 0.19, 850], [1.3, 0.12, 650], [1.8, 0.07, 500]] } },
  // 40 mm: "thoomp". A hollow tube pop with two modes, the round hissing away, a soft blast.
  launcher: { level: 0.1774, interval: 0.55, dryLen: 0.5, drive: 1.58, asym: 0.03,
    layers: [
      { k: 'pop', dur: 1.0, hp: 1400, g: 0.35 },
      { k: 'thump', g: 1, f: [230, 132], tp: 24, d: 62, h2: 0.25 },
      { k: 'thump', g: 0.32, f: [520, 304], tp: 18, d: 34, h2: 0 },
      { k: 'blast', g: 0.6, d1: 10, d2: 60, mix: 0.3, lp: [4200, 1000], lpTau: 28, hp: 70, bark: 300, barkQ: 1.2, barkMix: 0.5 },
      { k: 'whoosh', t: 22, f: [2600, 900], dur: 260, q: 2.2, att: 25, dec: 110, g: 0.13 },
      { k: 'sub', g: 0.18, f: [58, 52], tp: 30, d: 80, h2: 0 }
    ],
    tail: { len: 1.0, lp: 900, tau: 0.3, amp: 0.25, echoes: [[0.1, 0.25, 1600], [0.24, 0.15, 1100]] } },
  // The mortar: a deeper tube, a longer climb of the round leaving it.
  mortar: { level: 0.2096, interval: 0.6, dryLen: 0.8, drive: 1.73, asym: 0.03,
    layers: [
      { k: 'pop', dur: 1.4, hp: 1100, g: 0.45 },
      { k: 'thump', g: 1, f: [170, 94], tp: 30, d: 90, h2: 0.25 },
      { k: 'thump', g: 0.3, f: [380, 216], tp: 22, d: 45, h2: 0 },
      { k: 'blast', g: 0.75, d1: 13, d2: 90, mix: 0.35, lp: [4000, 850], lpTau: 35, hp: 50, bark: 240, barkQ: 1.1, barkMix: 0.5 },
      { k: 'whoosh', t: 30, f: [1800, 3600], dur: 520, q: 2.5, att: 60, dec: 260, g: 0.1 },
      { k: 'sub', g: 0.27, f: [46, 40], tp: 40, d: 160, h2: 0 }
    ],
    tail: { len: 1.5, lp: 800, tau: 0.45, amp: 0.32, echoes: [[0.12, 0.3, 1400], [0.28, 0.2, 1000], [0.5, 0.12, 750]] } },
  // A built turret: a rifle, a touch higher and drier, a servo-feed clack.
  turret: { level: 0.2438, interval: 0.2, dryLen: 0.3, drive: 1.44, asym: 0.04,
    layers: [
      { k: 'crack', dur: 0.5, hp: 1900, g: 0.8 },
      { k: 'blast', g: 1, d1: 6, d2: 38, mix: 0.25, lp: [11000, 3050], lpTau: 18.2, hp: 130, bark: 1050, barkQ: 1.6, barkMix: 0.45 },
      { k: 'thump', g: 0.5, f: [190, 108], tp: 16.5, d: 34 },
      { k: 'clank', t: 14, f: [1600, 9000], tau: 1.6, n: 14, body: 0.3, g: 0.14 }
    ],
    tail: { len: 0.8, lp: 1300, tau: 0.2, amp: 0.22, echoes: [[0.09, 0.24, 2200], [0.2, 0.14, 1500]] } },
  // A heavy turret: the AK's weight on a mount.
  turretHeavy: { level: 0.1829, interval: 0.25, dryLen: 0.38, drive: 1.87, asym: 0.06,
    layers: [
      { k: 'crack', dur: 0.75, hp: 1400, g: 0.75 },
      { k: 'blast', g: 1, d1: 9, d2: 64, mix: 0.32, lp: [8500, 1850], lpTau: 25.2, hp: 85, bark: 600, barkQ: 1.3, barkMix: 0.5 },
      { k: 'thump', g: 0.75, f: [145, 92], tp: 24, d: 58 },
      { k: 'clank', t: 16, f: [1000, 7000], tau: 2, n: 16, body: 0.45, bodyF: 800, g: 0.16 }
    ],
    tail: { len: 1.1, lp: 1100, tau: 0.32, amp: 0.3, echoes: [[0.1, 0.3, 2000], [0.23, 0.2, 1400], [0.42, 0.11, 950]] } },
  // A grenade, a launcher round, a mine, a drum: the pressure front, a huge low blast, the ground answering for three
  // seconds, and the dirt coming back down.
  boom: { level: 0.1981, dryLen: 1.2, drive: 2.59, asym: 0.05, variants: 3, ground: [8, 0.35],
    layers: [
      { k: 'crack', dur: 2.6, hp: 600, g: 0.9 },
      { k: 'pop', dur: 4, hp: 700, g: 0.9 },
      { k: 'blast', g: 1, d1: 26, d2: 300, mix: 0.45, lp: [6000, 600], lpTau: 84, hp: 30, bark: 180, barkQ: 0.8, barkMix: 0.5 },
      { k: 'thump', g: 1, f: [78, 44], tp: 60, d: 250, h2: 0.2 },
      { k: 'sub', g: 0.48, f: [34, 28], tp: 90, d: 500, h2: 0 },
      { k: 'crunch', t: 20, dur: 120, n: 40, f: 1600, q: 0.7, g: 0.3 }
    ],
    tail: { len: 3.2, lp: 700, tau: 1.1, amp: 0.55, width: 0.03, debris: 26, echoes: [[0.18, 0.45, 1400], [0.4, 0.35, 1000], [0.7, 0.25, 750], [1.05, 0.16, 600], [1.5, 0.1, 500], [2.0, 0.06, 400]] } }
};

// Suppressed: no crack worth the name, a dull "thup", the action suddenly loud by comparison, almost no tail.
export function suppressedDef(def) {
  const layers = def.layers.map((L) => {
    const o = { ...L };
    if (o.k === 'crack') o.g *= 0.12;
    else if (o.k === 'pop') { o.g *= 0.25; o.hp = 900; }
    else if (o.k === 'blast') { o.g *= 0.55; o.lp = [Math.min(2600, o.lp[0]), Math.min(700, o.lp[1])]; o.d2 *= 0.5; o.bark = (o.bark || 800) * 0.7; }
    else if (o.k === 'thump') { o.g *= 0.55; }
    else if (o.k === 'sub') { o.g *= 0.3; }
    else if (o.k === 'clank' || o.k === 'rattle' || o.k === 'scrape') { o.g *= 2.2; }
    return o;
  });
  // the can itself: a short breathy "pfft" through the baffles
  layers.push({ k: 'whoosh', t: 1, f: [1400, 700], dur: 40, q: 1.2, att: 2, dec: 18, g: 0.35 });
  const T = def.tail;
  return { ...def, level: def.level * 0.5 * (def.supLevel || 1), drive: (def.drive || 2) * 0.7, layers,
    tail: T ? { ...T, amp: T.amp * 0.35, len: Math.min(T.len, 0.6), echoes: (T.echoes || []).slice(0, 1).map(([t, g, lp]) => [t, g * 0.4, lp * 0.6]) } : null };
}

// The definition behind a bank key: 'm4', 'm4:s' (suppressed), 'hit', ... (null for an unknown key).
export const SUPPRESSIBLE = ['pistol', 'uzi', 'shotgun', 'm4', 'ak', 'sniper'];
export function defForKey(key) {
  const i = key.indexOf(':'), id = i < 0 ? key : key.slice(0, i), mod = i < 0 ? '' : key.slice(i + 1);
  const def = GUN_DEFS[id] || FOLEY_DEFS[id];
  if (!def) return null;
  return mod === 's' ? suppressedDef(def) : def;
}

// --- Handling, hits and the like (no tail: a dry one-shot each) -----------------------------------------------------
export const FOLEY_DEFS = {
  // CL-135: the handling is steel, polymer and hands now: hard ticks, dense short rings, dull knocks, scrapes. Nothing
  // rings like a bar on a xylophone.
  // Dry fire: the hammer falls on nothing. A hard tick, the frame answering, no body.
  dryFire: { level: 0.0892, dryLen: 0.12, drive: 1.4, layers: [{ k: 'clank', f: [2200, 11000], tau: 0.9, n: 14, click: 1, body: 0.35, bodyF: 1400, g: 1 }, { k: 'clank', t: 8, f: [900, 6000], tau: 1.6, n: 14, click: 0.3, body: 0.6, bodyF: 800, g: 0.5 }, { k: 'knock', t: 8, f: 550, d: 6, g: 0.3 }] },
  // The pump, back (the forend sliding, a rough scrape and a clack) and forward (the heavier slam home).
  pumpBack: { level: 0.0352, dryLen: 0.22, drive: 1.8, layers: [{ k: 'scrape', f: [1300, 2300], dur: 45, rough: 0.75, g: 0.6 }, { k: 'clank', t: 48, f: [700, 5500], tau: 2.4, n: 16, body: 0.7, bodyF: 800, g: 1 }, { k: 'knock', t: 48, f: 280, d: 14, g: 0.45 }] },
  pumpFwd: { level: 0.0435, dryLen: 0.24, drive: 2.0, layers: [{ k: 'scrape', f: [2200, 1300], dur: 40, rough: 0.75, g: 0.5 }, { k: 'clank', t: 40, f: [600, 5000], tau: 2.8, n: 18, body: 0.8, bodyF: 700, g: 1 }, { k: 'clank', t: 43, f: [1800, 9000], tau: 1.2, n: 12, g: 0.4 }, { k: 'knock', t: 40, f: 230, d: 20, g: 0.6 }] },
  // A spent case landing in the dirt: a bright tick with a quick metallic shimmer, a dull tap, a bounce or two.
  brass: { level: 0.0251, dryLen: 0.3, variants: 6, layers: [{ k: 'clank', f: [3500, 12000], tau: 1.8, n: 18, click: 0.6, body: 0.2, bodyF: 1500, g: 1 }, { k: 'knock', f: 900, d: 3, g: 0.25 }, { k: 'clank', t: 70, tj: 40, f: [3500, 12000], tau: 2.2, n: 14, click: 0.5, body: 0.1, g: 0.4 }, { k: 'clank', t: 125, tj: 50, f: [3800, 12000], tau: 1.5, n: 10, click: 0.4, body: 0, g: 0.15 }] },
  // A magazine hitting the ground: a dull polymer-and-steel thunk, a little rattle of the rounds inside.
  magDrop: { level: 0.0553, dryLen: 0.2, layers: [{ k: 'knock', f: 200, d: 22, g: 1 }, { k: 'knock', f: 650, d: 7, g: 0.35 }, { k: 'clank', f: [700, 4500], tau: 1.8, n: 14, body: 0, g: 0.35 }, { k: 'rattle', t: 40, count: 3, dur: 40, f: [1500, 7000], tau: 0.9, g: 0.12 }] },
  // Hits: a flesh thwack (a punch, a wet slap, a little crunch), heavier for the big ones, and a headshot that cracks.
  hit: { level: 0.1258, dryLen: 0.18, drive: 2.2, variants: 6, layers: [{ k: 'thump', f: [150, 62], tp: 9, d: 26, g: 1 }, { k: 'wet', f: [1300, 520], d: 40, q: 1.5, g: 0.8 }, { k: 'crunch', dur: 18, n: 8, f: 2200, g: 0.35 }, { k: 'pop', dur: 1, hp: 2000, g: 0.25 }] },
  hitHeavy: { level: 0.0904, dryLen: 0.24, drive: 2.6, variants: 6, layers: [{ k: 'thump', f: [120, 48], tp: 12, d: 40, g: 1 }, { k: 'wet', f: [1000, 380], d: 60, q: 1.4, g: 0.9 }, { k: 'crunch', dur: 30, n: 12, f: 1700, g: 0.45 }, { k: 'pop', dur: 1.4, hp: 1600, g: 0.3 }] },
  headshot: { level: 0.1042, dryLen: 0.32, drive: 2.6, variants: 4, layers: [{ k: 'pop', dur: 1.2, hp: 1600, g: 0.9 }, { k: 'crunch', dur: 14, n: 12, f: 3200, q: 0.6, g: 0.7 }, { k: 'crunch', dur: 30, n: 22, f: 2400, q: 0.8, g: 0.8 }, { k: 'thump', f: [160, 55], tp: 10, d: 45, g: 1 }, { k: 'wet', t: 6, f: [1500, 400], d: 90, q: 1.4, g: 1 }, { k: 'wet', t: 60, f: [900, 500], d: 50, q: 1.6, g: 0.3 }] },
  // Blades: a knife's short bright zip, a machete's longer heavier one; a stab and a chop.
  knifeSwing: { level: 0.0633, dryLen: 0.2, variants: 4, layers: [{ k: 'whoosh', f: [900, 3800], dur: 110, q: 2.4, att: 55, dec: 40, g: 1 }] },
  macheteSwing: { level: 0.0555, dryLen: 0.3, variants: 4, layers: [{ k: 'whoosh', f: [500, 2200], dur: 170, q: 1.8, att: 85, dec: 60, g: 1 }, { k: 'whoosh', t: 30, f: [1400, 4200], dur: 120, q: 3, att: 50, dec: 40, g: 0.35 }] },
  knifeHit: { level: 0.0791, dryLen: 0.2, drive: 2.0, variants: 4, layers: [{ k: 'wet', t: 30, f: [1600, 600], d: 50, q: 1.5, g: 1 }, { k: 'thump', t: 30, f: [170, 80], tp: 8, d: 24, g: 0.7 }, { k: 'clank', t: 30, f: [3000, 11000], tau: 1, n: 10, click: 0.3, body: 0, g: 0.12 }] },
  macheteChop: { level: 0.1021, dryLen: 0.26, drive: 2.4, variants: 4, layers: [{ k: 'thump', t: 40, f: [140, 55], tp: 12, d: 45, g: 1 }, { k: 'wet', t: 40, f: [1100, 420], d: 70, q: 1.4, g: 0.9 }, { k: 'crunch', t: 42, dur: 26, n: 14, f: 1900, g: 0.5 }, { k: 'clank', t: 40, f: [1500, 9000], tau: 1.4, n: 12, body: 0, g: 0.15 }] },
  // Handling: what the hands do to the guns.
  magRelease: { level: 0.1151, dryLen: 0.08, layers: [{ k: 'clank', f: [1600, 9000], tau: 1.1, n: 14, click: 0.9, body: 0.5, bodyF: 1300, g: 1 }, { k: 'knock', t: 5, f: 700, d: 5, g: 0.4 }] },
  magOut: { level: 0.052, dryLen: 0.16, layers: [{ k: 'scrape', f: [1600, 1000], dur: 55, rough: 0.6, g: 0.6 }, { k: 'knock', t: 45, f: 420, d: 10, g: 0.5 }, { k: 'clank', t: 45, f: [800, 4500], tau: 1.5, n: 12, body: 0, g: 0.25 }] },
  magIn: { level: 0.0408, dryLen: 0.16, drive: 1.6, layers: [{ k: 'scrape', f: [1000, 1700], dur: 42, rough: 0.7, g: 0.5 }, { k: 'clank', t: 48, f: [1000, 7000], tau: 1.8, n: 16, click: 0.8, body: 0.6, bodyF: 900, g: 1 }, { k: 'knock', t: 48, f: 340, d: 10, g: 0.5 }] },
  magSlap: { level: 0.091, dryLen: 0.14, drive: 2.0, layers: [{ k: 'knock', f: 260, d: 14, g: 1 }, { k: 'knock', f: 950, d: 4, g: 0.4 }, { k: 'clank', t: 2, f: [1200, 8000], tau: 1.6, n: 16, click: 0.8, body: 0.3, g: 0.7 }] },
  slideBack: { level: 0.0586, dryLen: 0.14, layers: [{ k: 'scrape', f: [2300, 3200], dur: 42, rough: 0.85, g: 0.6 }, { k: 'clank', t: 40, f: [1200, 7500], tau: 1.8, n: 16, body: 0.4, bodyF: 1100, g: 1 }] },
  slideFwd: { level: 0.0862, dryLen: 0.14, drive: 1.8, layers: [{ k: 'clank', f: [900, 7500], tau: 2.2, n: 18, click: 1, body: 0.6, bodyF: 1000, g: 1 }, { k: 'clank', t: 2, f: [2500, 11000], tau: 1, n: 12, g: 0.5 }, { k: 'knock', f: 420, d: 8, g: 0.35 }] },
  akRockOut: { level: 0.0449, dryLen: 0.18, layers: [{ k: 'clank', f: [900, 6000], tau: 2.2, n: 16, click: 0.9, body: 0.5, bodyF: 900, g: 1 }, { k: 'scrape', t: 15, f: [1200, 800], dur: 65, rough: 0.6, g: 0.5 }] },
  akRockIn: { level: 0.0355, dryLen: 0.2, drive: 1.8, layers: [{ k: 'scrape', f: [800, 1300], dur: 60, rough: 0.6, g: 0.45 }, { k: 'clank', t: 75, f: [800, 6000], tau: 2.4, n: 18, click: 1, body: 0.7, bodyF: 800, g: 1 }, { k: 'knock', t: 75, f: 260, d: 16, g: 0.5 }] },
  drumOut: { level: 0.0606, dryLen: 0.22, layers: [{ k: 'clank', f: [700, 5000], tau: 2.4, n: 16, body: 0.5, bodyF: 700, g: 0.8 }, { k: 'scrape', t: 20, f: [800, 500], dur: 85, rough: 0.5, g: 0.6 }, { k: 'knock', t: 60, f: 190, d: 22, g: 0.5 }] },
  drumIn: { level: 0.0384, dryLen: 0.24, drive: 1.8, layers: [{ k: 'scrape', f: [600, 900], dur: 65, rough: 0.5, g: 0.45 }, { k: 'knock', t: 70, f: 170, d: 26, g: 1 }, { k: 'clank', t: 70, f: [700, 5500], tau: 2.4, n: 18, click: 1, body: 0.4, g: 0.7 }] },
  boltUp: { level: 0.1252, dryLen: 0.08, layers: [{ k: 'clank', f: [1500, 9000], tau: 1.2, n: 14, click: 0.9, body: 0.4, bodyF: 1200, g: 1 }, { k: 'knock', f: 800, d: 4, g: 0.3 }] },
  boltBack: { level: 0.0477, dryLen: 0.16, layers: [{ k: 'scrape', f: [2000, 2800], dur: 68, rough: 0.85, g: 0.55 }, { k: 'clank', t: 72, f: [900, 6500], tau: 2.2, n: 16, body: 0.5, bodyF: 900, g: 1 }] },
  boltFwd: { level: 0.0449, dryLen: 0.16, layers: [{ k: 'scrape', f: [2800, 2000], dur: 60, rough: 0.85, g: 0.55 }, { k: 'clank', t: 64, f: [1000, 7000], tau: 2, n: 16, body: 0.5, bodyF: 1000, g: 1 }] },
  boltDown: { level: 0.1087, dryLen: 0.1, drive: 1.6, layers: [{ k: 'clank', f: [1500, 9500], tau: 1.2, n: 14, click: 1, body: 0.5, bodyF: 1200, g: 1 }, { k: 'knock', f: 520, d: 6, g: 0.35 }] },
  boxLatch: { level: 0.1014, dryLen: 0.12, layers: [{ k: 'clank', f: [1200, 7500], tau: 1.6, n: 16, click: 0.9, body: 0.4, g: 1 }, { k: 'clank', t: 30, f: [800, 5000], tau: 2, n: 14, body: 0.6, bodyF: 800, g: 0.7 }] },
  belt: { level: 0.0409, dryLen: 0.34, layers: [{ k: 'rattle', count: 11, dur: 250, f: [1800, 9000], tau: 1.1, fade: 0.4, g: 1 }, { k: 'scrape', f: [3000, 2400], dur: 230, rough: 0.9, att: 40, dec: 60, g: 0.25 }] },
  boxSeat: { level: 0.0652, dryLen: 0.18, drive: 1.6, layers: [{ k: 'knock', f: 160, d: 28, g: 1 }, { k: 'clank', f: [600, 4500], tau: 2.4, n: 16, body: 0.3, g: 0.5 }] },
  shell: { level: 0.0662, dryLen: 0.14, layers: [{ k: 'scrape', f: [1400, 2000], dur: 32, rough: 0.6, g: 0.5 }, { k: 'clank', t: 34, f: [1300, 7000], tau: 1.5, n: 14, body: 0.4, bodyF: 1000, g: 1 }, { k: 'knock', t: 34, f: 600, d: 6, g: 0.3 }] },
  bigBrass: { level: 0.0456, dryLen: 0.5, layers: [{ k: 'clank', t: 60, f: [700, 6000], tau: 3.5, n: 18, body: 0.5, bodyF: 600, g: 1 }, { k: 'clank', t: 150, tj: 40, f: [700, 6000], tau: 3, n: 16, body: 0.4, bodyF: 600, g: 0.8 }, { k: 'clank', t: 250, tj: 50, f: [800, 6000], tau: 2.5, n: 14, body: 0.3, g: 0.6 }, { k: 'clank', t: 330, tj: 50, f: [800, 6000], tau: 2, n: 12, body: 0.2, g: 0.4 }] },
  cylinderOpen: { level: 0.1014, dryLen: 0.12, layers: [{ k: 'clank', f: [1500, 9000], tau: 1.4, n: 14, click: 0.9, body: 0.4, g: 1 }, { k: 'clank', t: 22, f: [900, 5500], tau: 2, n: 14, body: 0.5, bodyF: 900, g: 0.6 }] },
  cylinderSpin: { level: 0.0642, dryLen: 0.3, layers: [{ k: 'rattle', count: 12, dur: 230, f: [2500, 10000], tau: 0.8, n: 10, even: true, slow: 0.6, fade: 0.6, g: 1 }, { k: 'scrape', f: [3500, 2500], dur: 200, rough: 0.3, dec: 40, g: 0.15 }] },
  tubeOpen: { level: 0.0988, dryLen: 0.2, layers: [{ k: 'clank', f: [800, 5500], tau: 2, n: 16, click: 0.9, body: 0.4, g: 0.8 }, { k: 'knock', t: 15, f: 230, d: 20, g: 0.6 }] },
  // The flamethrower catching: a low whoomph of gas lighting.
  flameOn: { level: 0.0678, dryLen: 0.42, drive: 1.6, layers: [{ k: 'thump', f: [95, 58], tp: 20, d: 110, g: 1 }, { k: 'whoosh', f: [300, 950], dur: 200, q: 0.9, att: 30, dec: 120, g: 0.8 }, { k: 'blast', d1: 20, d2: 140, mix: 0.4, lp: [2500, 600], lpTau: 60, hp: 60, g: 0.5 }] },
  tubeShell: { level: 0.038, dryLen: 0.2, layers: [{ k: 'scrape', f: [700, 1100], dur: 50, rough: 0.5, g: 0.5 }, { k: 'knock', t: 55, f: 210, d: 20, g: 1 }, { k: 'clank', t: 55, f: [700, 5000], tau: 2, n: 14, body: 0.2, g: 0.5 }] },
  // CL-135: the rest of the reloads, out of the old beeps. A hand to the pouch; the flamer's valve and tank; its
  // piezo; the rotary gun's motor; the little settle when a reload is done.
  grab: { level: 0.0172, dryLen: 0.14, layers: [{ k: 'scrape', f: [1800, 1200], dur: 60, rough: 0.4, q: 0.7, hp: 700, g: 1 }, { k: 'knock', t: 50, f: 420, d: 8, g: 0.4 }] },
  valveShut: { level: 0.0573, dryLen: 0.3, layers: [{ k: 'scrape', f: [2400, 1800], dur: 70, rough: 0.9, grain: 600, g: 0.5 }, { k: 'clank', t: 70, f: [900, 6500], tau: 2, n: 16, body: 0.4, g: 1 }, { k: 'whoosh', f: [7000, 5000], dur: 70, q: 0.8, att: 2, dec: 25, g: 0.35 }] },
  valveOpen: { level: 0.0471, dryLen: 0.42, layers: [{ k: 'clank', f: [900, 6500], tau: 2, n: 16, body: 0.4, g: 1 }, { k: 'scrape', t: 5, f: [1800, 2400], dur: 60, rough: 0.9, grain: 600, g: 0.4 }, { k: 'whoosh', t: 30, f: [4500, 7000], dur: 300, q: 0.7, att: 60, dec: 90, g: 0.6 }] },
  tankOff: { level: 0.1269, dryLen: 0.24, layers: [{ k: 'clank', f: [1000, 7000], tau: 1.6, n: 16, click: 0.9, body: 0.4, g: 0.8 }, { k: 'scrape', t: 20, f: [900, 600], dur: 60, rough: 0.5, g: 0.4 }, { k: 'knock', t: 55, f: 150, d: 30, g: 1 }] },
  tankOn: { level: 0.0807, dryLen: 0.24, layers: [{ k: 'knock', f: 140, d: 32, g: 1 }, { k: 'scrape', t: 10, f: [600, 900], dur: 60, rough: 0.5, g: 0.4 }, { k: 'clank', t: 100, f: [1000, 7000], tau: 1.8, n: 16, click: 1, body: 0.5, g: 0.9 }] },
  igniter: { level: 0.0586, dryLen: 0.32, layers: [{ k: 'pop', dur: 0.5, hp: 3000, g: 0.8 }, { k: 'clank', f: [2500, 11000], tau: 0.8, n: 12, click: 1, body: 0.2, g: 0.6 }, { k: 'pop', t: 60, dur: 0.5, hp: 3000, g: 0.8 }, { k: 'clank', t: 60, f: [2500, 11000], tau: 0.8, n: 12, click: 1, body: 0.2, g: 0.6 }, { k: 'crunch', t: 62, dur: 40, n: 9, f: 5000, q: 0.7, g: 0.3 }, { k: 'whoosh', t: 80, f: [400, 900], dur: 180, q: 0.8, att: 40, dec: 80, g: 0.5 }] },
  motorBlip: { level: 0.0438, dryLen: 0.55, layers: [{ k: 'scrape', f: [350, 1100], dur: 260, rough: 0.95, grain: 380, q: 1.4, hp: 200, att: 40, dec: 30, g: 1 }, { k: 'scrape', t: 260, f: [1100, 300], dur: 200, rough: 0.95, grain: 300, q: 1.4, hp: 200, att: 10, dec: 60, g: 0.8 }, { k: 'clank', f: [900, 6000], tau: 1.4, n: 12, body: 0.4, g: 0.4 }] },
  settle: { level: 0.0627, dryLen: 0.1, layers: [{ k: 'knock', f: 500, d: 6, g: 1 }, { k: 'clank', t: 3, f: [1500, 8000], tau: 1, n: 10, body: 0, g: 0.35 }] },
  // Bullets landing: stone (a hard crack and chips), steel (a clang), wood (a thock and splinters), dirt (a thud and
  // the patter of what it kicked up), water (a slap and spray), sand; the odd ricochet off stone and steel.
  impactRock: { level: 0.0995, dryLen: 0.3, variants: 6, drive: 1.6, layers: [{ k: 'pop', dur: 0.8, hp: 2200, g: 1 }, { k: 'clank', f: [1500, 9000], tau: 0.8, n: 14, body: 0.6, bodyF: 1500, g: 0.6 }, { k: 'knock', f: 500, d: 6, g: 0.5 }, { k: 'crunch', t: 6, dur: 90, n: 10, f: 3000, q: 0.8, g: 0.35 }] },
  impactMetal: { level: 0.1106, dryLen: 0.4, variants: 6, drive: 1.4, layers: [{ k: 'pop', dur: 0.6, hp: 2500, g: 0.7 }, { k: 'clank', f: [900, 9000], tau: 7, n: 26, click: 0.8, body: 0.4, bodyF: 1200, g: 1 }] },
  impactWood: { level: 0.0898, dryLen: 0.22, variants: 6, drive: 1.6, layers: [{ k: 'knock', f: 380, d: 10, q: 1.4, g: 1 }, { k: 'knock', f: 1300, d: 4, g: 0.4 }, { k: 'pop', dur: 0.7, hp: 1800, g: 0.5 }, { k: 'crunch', t: 4, dur: 50, n: 9, f: 2600, q: 0.9, g: 0.35 }] },
  impactDirt: { level: 0.058, dryLen: 0.25, variants: 6, drive: 1.4, layers: [{ k: 'knock', f: 140, d: 22, g: 1 }, { k: 'pop', dur: 1.2, hp: 900, g: 0.35 }, { k: 'crunch', t: 15, dur: 120, n: 14, f: 1700, q: 0.7, g: 0.4 }] },
  impactWater: { level: 0.0356, dryLen: 0.3, variants: 6, layers: [{ k: 'knock', f: 300, d: 14, g: 0.8 }, { k: 'wet', f: [700, 1900], d: 45, q: 1.6, g: 0.8 }, { k: 'whoosh', t: 8, f: [3500, 2500], dur: 120, q: 0.6, att: 10, dec: 60, g: 0.5 }] },
  impactSand: { level: 0.0333, dryLen: 0.22, variants: 6, layers: [{ k: 'knock', f: 200, d: 14, g: 0.8 }, { k: 'crunch', dur: 90, n: 30, f: 2200, q: 0.6, g: 0.8 }] },
  ricochet: { level: 0.0246, dryLen: 0.4, variants: 4, layers: [{ k: 'whoosh', f: [3400, 1100], dur: 260, q: 4, att: 6, dec: 90, g: 1 }, { k: 'whoosh', f: [5200, 1900], dur: 220, q: 3, att: 4, dec: 70, g: 0.5 }] },
  // A grenade: the pin and the spoon going; a bounce on the ground.
  grenadePin: { level: 0.0527, dryLen: 0.3, layers: [{ k: 'clank', f: [1800, 9000], tau: 1.2, n: 14, click: 0.9, body: 0.2, g: 1 }, { k: 'scrape', t: 8, f: [3000, 2000], dur: 25, rough: 0.8, g: 0.4 }, { k: 'clank', t: 70, f: [2500, 11000], tau: 2.5, n: 14, body: 0, g: 0.5 }, { k: 'whoosh', t: 50, f: [700, 1600], dur: 160, q: 0.9, att: 60, dec: 50, g: 0.6 }] },
  grenadeBounce: { level: 0.0606, dryLen: 0.16, variants: 4, layers: [{ k: 'knock', f: 260, d: 14, g: 1 }, { k: 'clank', f: [800, 5000], tau: 1.5, n: 14, body: 0, g: 0.35 }] },
  // CL-135 (Jerry: "the weapons switching should sound like a CRT TV static switching"): a channel change. The knob's
  // detent, a burst of static flickering frame by frame with the 60 Hz buzz under it, cut dead, the picture popping on.
  weaponSwitch: { level: 0.0556, dryLen: 0.26, layers: [{ k: 'clank', f: [1200, 7000], tau: 1, n: 12, click: 1, body: 0.6, bodyF: 900, g: 0.7 }, { k: 'static', t: 4, dur: 150, hum: 0.4, crackle: 7, swell: true, f: [350, 10000], g: 1 }, { k: 'pop', t: 154, dur: 0.6, hp: 1500, g: 0.5 }, { k: 'knock', t: 154, f: 180, d: 16, g: 0.45 }] },
  // ...and the wheel moving over a gun. GB-148 (Jerry, 2026-10-09: "could you change the weapon wheel sound to something
  // more pleasant?"): it was CL-135's dial detent and a blip of snow (81% of it above 2 kHz, half above 4 kHz), heard on
  // every gun the pointer crosses. Now a soft, rounded tock, a small plastic detent felt more than heard: a dull knock
  // round 620 Hz over a muted, short click (98% of it under 2 kHz), about 4.7 dB quieter. Still noise, no tone.
  wheelTick: { level: 0.032, dryLen: 0.07, variants: 4, layers: [{ k: 'knock', f: 620, d: 7, q: 1.2, g: 1 }, { k: 'clank', f: [800, 3200], tau: 0.4, n: 18, click: 0.15, ex: 0.9, body: 0.6, bodyF: 800, g: 0.35 }] },
  // GB-167: the fire selector's detent, a small crisp steel click (audio.js plays it twice, the lever leaving one notch
  // and dropping into the next). Full auto sits a touch higher and firmer than semi.
  selectorSemi: { level: 0.028, dryLen: 0.05, variants: 3, layers: [{ k: 'knock', f: 1400, d: 9, q: 1.6, g: 1 }, { k: 'clank', f: [1500, 5200], tau: 0.25, n: 12, click: 0.35, ex: 0.9, body: 0.5, bodyF: 1400, g: 0.5 }] },
  selectorAuto: { level: 0.032, dryLen: 0.05, variants: 3, layers: [{ k: 'knock', f: 1750, d: 10, q: 1.8, g: 1 }, { k: 'clank', f: [1800, 6000], tau: 0.22, n: 12, click: 0.45, ex: 0.9, body: 0.5, bodyF: 1700, g: 0.55 }] }
};
