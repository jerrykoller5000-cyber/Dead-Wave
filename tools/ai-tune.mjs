// CB-336 (claude2): the barricade-pressure tune for stage 1. One game, many trials: each trial clears the field, puts the
// barricade replay's row (9 pieces) and crowd (30 shamblers, 2 brutes, a demon) back on the same spot with its own seed and
// knobs (TT.aiDbg.way: prog, stay; ai=0 for the old crowd), steps 14 s at a true 60 fps and records the row's total HP each
// second. Prints a table and writes <out>/tune.json.
//   node tools/ai-tune.mjs --trials "old:336,0.33:1.1:336,0.15:0.5:336" [--out dir]
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const OUT = opt('out', 'review/CB-336');
const TRIALS = opt('trials', 'old:336,0.33:1.1:336').split(',').map((s) => { const p = s.split(':'); return p[0] === 'old' ? { old: true, seed: +p[1] } : { prog: +p[0], stay: +p[1], seed: +p[2], wait: p[3] != null ? +p[3] : 0 }; });
fs.mkdirSync(OUT, { recursive: true });
const t0 = Date.now(); const log = (m) => console.log(((Date.now() - t0) / 1000).toFixed(0) + 's ' + m);
const server = await serve(process.cwd(), 0);
const b = await launch({ headless: true });
const p = await b.newPage({ width: 400, height: 225 });
const results = [];
try {
  await p.goto(`${server.origin}/index.html?debug=1`, { timeout: 300000 });
  log('loaded ' + await p.waitFor('!!window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 900000 }));
  await p.evaluate(`DWOpening && DWOpening.dismissForTesting && DWOpening.dismissForTesting()`);
  await p.evaluate(fs.readFileSync(path.join('tools', 'tests', 'lib.js'), 'utf8'));
  await p.evaluate(`startMatch(TT, 'AI tune')`, 300000);
  log('in the match');
  await p.evaluate(`(async () => {
    const T = TT, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const w0 = Date.now(); while (T.marine && T.marine.getObjectByName && T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.setHp(1e6);
    let P = null, best = 1e9;
    for (let r = 20; r < 260; r += 6) for (let k = 0; k < 32; k++) {
      const a = k / 32 * 6.283, x = Math.cos(a) * r, z = Math.sin(a) * r, y0 = T.sampleHeight(x, z); let bad = 0, ok = true;
      for (let i = -3; i <= 3 && ok; i++) for (let j = -1; j <= 6 && ok; j++) { const px = x + i * 2.5, pz = z + j * 5; if (Math.abs(T.sampleHeight(px, pz) - y0) > 2 || T.waterDepthAt(px, pz) > 0.02) ok = false; }
      if (!ok) continue;
      for (let i = -3; i <= 3; i++) for (let j = -1; j <= 13; j++) { const q = T.resolveStaticProps(x + i * 2, z + j * 2, 0.9); if (Math.hypot(q.x - x - i * 2, q.z - z - j * 2) > 0.01) bad++; }
      if (bad < best) { best = bad; P = { x, z }; }
    }
    window.__tn = { P };
    T.flightHold(true);
  })()`, 120000);
  for (const tr of TRIALS) {
    const r = await p.evaluate(`(async () => {
      const T = TT, P = __tn.P, tr = ${JSON.stringify(tr)};
      T.clearZombies(); for (const b of (T.builds || []).slice()) T.removeBuild(b);
      let s = tr.seed >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      if (!tr.old) { T.aiDbg.way.prog = tr.prog; T.aiDbg.way.stay = tr.stay; T.aiDbg.way.wait = tr.wait; }
      const hold = () => { T.player.position.set(P.x, T.sampleHeight(P.x, P.z), P.z); T.setHp(1e6); };
      hold();
      const put = (kind, x, z) => { const zz = T.spawnZombie(P.x + x, P.z + z, kind, true, true); if (!zz) return; zz.riseT = 0; T.hordeDbg.join(zz); if (!tr.old) T.aiDbg.join(zz); };
      for (let i = -4; i <= 4; i++) T.spawnBuild('barricade', P.x + i * 1.6, P.z + 4);
      for (let i = 0; i < 30; i++) put('shambler', (i % 6 - 2.5) * 1.1, 14 + ((i / 6) | 0) * 1.1);
      put('brute', -1.2, 21.5); put('brute', 1.2, 22); put('demon', 10, 14);
      const hp = () => +(T.builds.filter((b) => b.type === 'barricade' && b.hp > 0).reduce((a, b) => a + b.hp / (b.maxHp || 1), 0)).toFixed(2);
      const curve = [hp()];
      for (let k = 1; k <= 14 * 60; k++) { hold(); T.stepFrame(1 / 60); if (k % 60 === 0) curve.push(hp()); }
      return curve;
    })()`, 900000);
    results.push({ ...tr, curve: r });
    log(`${tr.old ? 'old' : 'prog ' + tr.prog + ' stay ' + tr.stay + ' wait ' + tr.wait} seed ${tr.seed}: ${r.join(' ')}`);
  }
  fs.writeFileSync(path.join(OUT, 'tune.json'), JSON.stringify(results, null, 1));
} finally { await b.close(); await server.close(); }
