// CL-134: hear and measure the game's sounds without the game. Renders AudioSys calls offline, through the real mix
// (the buses, the glue, the limiter), to WAV files, and prints each one's peak and loudness (momentary, K-weighted, the
// way the levels in core/gunsynth.js were set).
//
//   node tools/soundlab.mjs OUTDIR m4 shotgun hit headshot      one bank each, as it is (AudioSys.calibPlay)
//   node tools/soundlab.mjs OUTDIR fire:m4 fire:m4:s burst:uzi   a round as the game fires it (:s suppressed), a burst
//   node tools/soundlab.mjs OUTDIR boom:0.3 cue:charge          an explosion at a distance, a reload cue
//   node tools/soundlab.mjs OUTDIR --all                         every gun and handling bank
//
// The levels in GUN_DEFS / FOLEY_DEFS were set to these targets (dB, momentary, default volume): pistol -36, M4 -34,
// AK -33, shotgun -30, sniper -29.5, a close explosion -27, a hit -40, a headshot -36; the handling 6 dB under
// its old targets (a reload cue about -45 to -50, peaking 8 to 10 dB under a shot), the pump and dry fire -43 to -46.
// CL-135 (the handling, the impacts and the switch rebuilt from noise): a short metal tick has a higher peak for its
// loudness than the old rings, so the handling was set 0.4 of the way to its CL-134 loudness and 0.6 to its CL-134
// peak, never over -25 dBFS; a bullet impact about -47 to -52, the weapon switch -44, the wheel's tick -52.
import fs from 'node:fs';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';
import { GUN_DEFS, FOLEY_DEFS } from '../core/gunsynth.js';
const ROOT = new URL('..', import.meta.url).pathname;
const [,, OUT, ...args] = process.argv;
if (!OUT) { console.log('usage: node tools/soundlab.mjs OUTDIR keys... (see the top of this file)'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const keys = args.includes('--all') ? Object.keys(GUN_DEFS).concat(Object.keys(FOLEY_DEFS)) : args;
const RATE = { pistol: 0.28, uzi: 1 / 14, m4: 0.1, ak: 0.11, aa12: 0.19, minigun: 1 / 15, m240: 1 / 11, revolver: 0.45, shotgun: 0.7, sniper: 0.9, launcher: 0.55, mortar: 0.6 };
function specFor(k) {
  const [kind, a, b] = k.split(':');
  if (kind === 'fire') return { fn: 'fireWeapon', args: [a, { suppressed: b === 's' }], len: 3 };
  if (kind === 'burst') { const iv = RATE[a] || 0.1, n = iv < 0.2 ? 10 : 3; return { fn: 'fireWeapon', args: [a], times: Array.from({ length: n }, (_, i) => i * iv), len: n * iv + 2.5 }; }
  if (kind === 'boom') return { fn: 'grenadeBoom', args: [a != null ? +a : 1, b != null ? +b : 0], len: 3.6 };
  if (kind === 'cue') return { fn: 'reloadCue', args: [a, b != null ? +b : 1], len: 1 };
  return { fn: 'calibPlay', args: [k], len: k === 'sniper' || k === 'boom' ? 3.4 : 2.2 };
}
// K-weighting (BS.1770's two stages), then the loudest 400 ms window.
function biq(x, b, a) { const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; }
function loudness(L, R, sr) {
  const k = (x) => biq(biq(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]), [1, -2, 1], [1, -1.99004745483398, 0.99007225036621]);
  const kl = k(L), kr = k(R), w = Math.round(0.4 * sr), hop = Math.round(0.05 * sr);
  let best = -Infinity;
  for (let i = 0; i + w <= kl.length; i += hop) { let e = 0; for (let j = i; j < i + w; j++) e += kl[j] * kl[j] + kr[j] * kr[j]; best = Math.max(best, -0.691 + 10 * Math.log10(e / w / 2 + 1e-20)); }
  return best;
}
function wav(L, R, sr) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4); }
  return buf;
}
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const page = await browser.newPage({ width: 400, height: 300 });
await page.goto(`${server.origin}/tools/soundlab.html`, { timeout: 60000 });
await page.waitFor('window.ready === true', { timeout: 60000 });
for (const k of keys) {
  const r = await page.evaluate(`renderOne(${JSON.stringify(specFor(k))})`, 120000);
  const L = new Float32Array(Buffer.from(r.L, 'base64').buffer.slice(0)), R = new Float32Array(Buffer.from(r.R, 'base64').buffer.slice(0));
  let pk = 0; for (let i = 0; i < L.length; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  fs.writeFileSync(`${OUT}/${k.replace(/[:]/g, '_')}.wav`, wav(L, R, r.sr));
  console.log(`${k.padEnd(18)} peak ${(20 * Math.log10(pk + 1e-12)).toFixed(1).padStart(6)} dB   loudness ${loudness(L, R, r.sr).toFixed(1).padStart(6)}`);
}
await browser.close(); await server.close(); process.exit(0);
