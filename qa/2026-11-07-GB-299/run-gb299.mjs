// qa/2026-11-07-GB-299/run-gb299.mjs
// GB-299: night 1 wall-clock to natural end + first ~60s of night 2.
// Overlay fps/low/worst/hitch sampled every 10s via TT.perfSnapshot().
// Usage:
//   node qa/2026-11-07-GB-299/run-gb299.mjs --label current
//   node qa/2026-11-07-GB-299/run-gb299.mjs --label v110 --root C:/Users/Zero/Desktop/dw-gb299-v110
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const argv = process.argv.slice(2);
const flag = (name, d = '') => {
  const i = argv.indexOf(name);
  return i >= 0 ? (argv[i + 1] || d) : d;
};
const LABEL = flag('--label', 'current');
const ROOT = path.resolve(flag('--root', REPO));
const OUT_DIR = HERE;
const SAMPLE_MS = 10000;
const NIGHT2_MS = 60000;
const NIGHT1_CAP_MS = 12 * 60 * 1000;
const COMBAT_MS = 200;

const serveMod = await import(pathToFileURL(path.join(REPO, 'tools', 'serve.mjs')).href);
const cdpMod = await import(pathToFileURL(path.join(REPO, 'tools', 'cdp.mjs')).href);
const { serve } = serveMod;
const { launch } = cdpMod;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function fmtRow(r) {
  const fps = r.fps == null ? '-' : Number(r.fps).toFixed(1);
  const low = r.low == null ? '-' : Number(r.low).toFixed(1);
  const worst = r.worst == null ? '-' : Number(r.worst).toFixed(1);
  const hitch = r.hitches == null ? '-' : String(r.hitches);
  return `| ${String(Math.round(r.wallSec)).padStart(4)} | ${String(r.phase).padEnd(6)} | ${String(r.day).padStart(2)} | ${fps.padStart(5)} | ${low.padStart(5)} | ${worst.padStart(6)} | ${hitch.padStart(5)} | ${r.onScreen || ''} |`;
}

function toMarkdown(label, meta, rows) {
  const lines = [
    `# GB-299 ${label}`,
    '',
    `- root: \`${meta.root}\``,
    `- commit: \`${meta.commit || '?'}\``,
    `- gfx: ${meta.gfx} · first person · real WebGPU`,
    `- started: ${meta.started}`,
    `- ended: ${meta.ended}`,
    `- night1 wall s: ${meta.night1WallSec}`,
    `- night2 wall s: ${meta.night2WallSec}`,
    `- samples: ${rows.length}`,
  ];
  if (meta.fpsMean != null) {
    lines.push(`- fps mean/min: ${meta.fpsMean.toFixed(1)} / ${meta.fpsMin.toFixed(1)}`);
    lines.push(`- 1% low mean: ${meta.lowMean.toFixed(1)}`);
    lines.push(`- worst max ms: ${meta.worstMax.toFixed(1)}`);
  }
  lines.push('');
  lines.push('| wall s | phase | day | fps | low | worst | hitch | on screen |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) lines.push(fmtRow(r));
  lines.push('');
  return lines.join('\n');
}

async function combatTick(page) {
  await page.evaluate(`(() => {
    const T = window.TT;
    if (!T || !T.getPhase || T.getPhase() !== 'wave') {
      if (T && T.setMouseFireDbg) T.setMouseFireDbg(false);
      return null;
    }
    const alive = (T.zombies || []).filter((z) => z.alive && !z.dying && z.mesh);
    const p = T.player.position;
    let best = null, bd = 1e9;
    for (const z of alive) {
      if (z.riseT > 0) continue;
      const d = Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z);
      if (d < bd) { bd = d; best = z; }
    }
    if (!best) { T.setMouseFireDbg(false); return { alive: alive.length }; }
    T.setAimTargetDbg(best.mesh.position.x, best.mesh.position.z);
    if (T.aimTarget) T.aimTarget.y = best.mesh.position.y + (best.hitH || 1.45) * 0.7;
    T.setAimYawDbg(Math.atan2(best.mesh.position.x - p.x, best.mesh.position.z - p.z));
    const w = T.getCurrentWeapon();
    const ammo = ((T.getAmmo && T.getAmmo()[w]) | 0);
    if (ammo === 0 && T.startReload && !T.isReloading()) T.startReload();
    const st = (T.WEAPON_STATS && T.WEAPON_STATS[w]) || {};
    const click = !!(window.__gb299Click = !window.__gb299Click);
    T.setMouseFireDbg(bd < 70 && (st.auto || st.spin || st.melee || st.flamer || click));
    if (bd < 2.2 && T.getKnifeCd && T.getKnifeCd() <= 0 && (T.isReloading() || ammo === 0) && T.knifeAttack) T.knifeAttack();
    return { alive: alive.length, dist: +bd.toFixed(1) };
  })()`);
}

async function takeSample(page, t0) {
  return page.evaluate(`(() => {
    const T = window.TT;
    const t0 = ${0}; // replaced below
    const snap = (T.perfSnapshot && T.perfSnapshot()) || { fps: 0, low: 0, worst: 0, hitches: 0, frames: 0 };
    const st = (T.getWaveDirectorState && T.getWaveDirectorState()) || {};
    const phase = T.getPhase ? T.getPhase() : (st.phase || '?');
    const day = T.getDay ? T.getDay() : (st.day || 0);
    const alive = (T.zombies || []).filter((z) => z.alive && !z.dying);
    const p = T.player.position;
    const nearHQ = Math.hypot(p.x, p.z) < 18;
    const woods = Math.abs(p.x) > 40 || Math.abs(p.z) > 40;
    const pc = st.pace || null;
    const parts = [];
    parts.push(alive.length + ' z');
    if (st.waveSpawned != null && st.waveTotal != null) parts.push('spawned ' + st.waveSpawned + '/' + st.waveTotal);
    if (pc) parts.push('push ' + ((pc.push | 0) + 1) + '/' + (pc.pushes || '?') + (pc.inLull ? ' lull' : ''));
    if (nearHQ) parts.push('near HQ');
    else if (woods) parts.push('woods');
    else parts.push('field');
    if (phase === 'prep') parts.push('dawn/prep');
    if (phase === 'wave' && alive.length) parts.push('fighting');
    const fp = T.fpDbg ? T.fpDbg() : null;
    return {
      wallSec: (Date.now() - __GB299_T0__) / 1000,
      phase, day,
      fps: snap.fps, low: snap.low, worst: snap.worst, hitches: snap.hitches, frames: snap.frames,
      zombies: alive.length,
      spawned: st.waveSpawned || 0,
      total: st.waveTotal || 0,
      onScreen: parts.join(', '),
      backend: T.getRendererBackend ? T.getRendererBackend() : '?',
      firstPerson: !!(fp && fp.first),
      gfx: T.getGfx ? T.getGfx() : null,
      player: { x: +p.x.toFixed(1), z: +p.z.toFixed(1) }
    };
  })()`.replace('__GB299_T0__', String(t0)).replace('const t0 = 0; // replaced below', ''));
}

async function main() {
  console.log('[GB-299] label=' + LABEL + ' root=' + ROOT);
  const commitFile = path.join(ROOT, '.git');
  let commit = '?';
  try {
    // Prefer HEAD from the active repo (worktree shares .git)
    const { execFileSync } = await import('node:child_process');
    commit = execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch { /* ignore */ }

  const server = await serve(ROOT, 0);
  const url = server.origin + '/index.html?debug=1';
  console.log('[GB-299] serving', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  const rows = [];
  const meta = {
    label: LABEL,
    root: ROOT,
    commit,
    gfx: 'high',
    started: new Date().toISOString(),
    ended: null,
    night1WallSec: 0,
    night2WallSec: 0,
  };

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    await page.goto(url, { timeout: 180000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) {
      throw new Error('TT never appeared: ' + (page.errors[0] || ''));
    }
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });

    // Inject startMatch helper
    const libPath = path.join(REPO, 'tools', 'tests', 'lib.js');
    await page.evaluate(fs.readFileSync(libPath, 'utf8'));

    console.log('[GB-299] startMatch (Jerry launcher path)...');
    await page.evaluate(`(async () => { await startMatch(window.TT, 'GB299'); })()`, 180000);

    const setup = await page.evaluate(`(() => {
      const T = window.TT;
      T.runDevCommand && T.runDevCommand('godmode');
      // Fresh CDP profile: no Jerry tt_gfx; High on RTX 5080 per card.
      if (T.applyGraphicsPreset) T.applyGraphicsPreset('high');
      if (T.setViewFirstDbg) T.setViewFirstDbg(true);
      if (T.resetPerf) T.resetPerf();
      // Stand near HQ porch for night 1.
      const x = -5.9, z = -2.2;
      const y = T.sampleHeight ? T.sampleHeight(x, z) : T.player.position.y;
      T.player.position.set(x, y, z);
      if (T.localPlayer) T.localPlayer.position.set(x, y, z);
      try { localStorage.setItem('tt_perf_hud', '1'); } catch (_) {}
      return {
        phase: T.getPhase(),
        day: T.getDay(),
        gfx: T.getGfx ? T.getGfx() : null,
        backend: T.getRendererBackend ? T.getRendererBackend() : null,
        fp: T.fpDbg ? T.fpDbg() : null
      };
    })()`);
    console.log('[GB-299] setup', JSON.stringify(setup));
    meta.gfx = setup.gfx || 'high';

    // Wait for FP blend
    for (let i = 0; i < 40; i++) {
      const w = await page.evaluate(`(() => (window.TT.fpDbg ? window.TT.fpDbg().w : 0))()`);
      if (w >= 0.99) break;
      await wait(100);
    }

    // Start night 1 via HQ alarm (Jerry path) — fall back to skipPrep
    console.log('[GB-299] starting night 1...');
    await page.evaluate(`(() => {
      const T = window.TT;
      if (T.hqStartWave) T.hqStartWave();
      else if (T.skipPrep) T.skipPrep();
    })()`);
    const waveOn = await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'wave'`, { timeout: 120000 });
    if (!waveOn) {
      await page.evaluate(`(() => { if (window.TT.skipPrep) window.TT.skipPrep(); })()`);
      if (!(await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'wave'`, { timeout: 30000 }))) {
        throw new Error('night 1 never reached wave phase');
      }
    }
    await page.evaluate(`(() => { if (window.TT.resetPerf) window.TT.resetPerf(); })()`);

    const t0 = Date.now();
    let night1End = null;
    let lastSampleAt = 0;
    let lastCombatAt = 0;

    // Night 1 loop
    while (true) {
      const now = Date.now();
      if (now - t0 > NIGHT1_CAP_MS) {
        console.log('[GB-299] night 1 hit wall-clock cap; forcing clear of leftovers');
        await page.evaluate(`(() => {
          const T = window.TT;
          if (T.clearZombies) T.clearZombies();
          // If still wave with nothing left, nudge dawn
          if (T.getPhase && T.getPhase() === 'wave' && T.drainWavePlanDbg) T.drainWavePlanDbg();
        })()`);
        await wait(2000);
      }

      if (now - lastCombatAt >= COMBAT_MS) {
        lastCombatAt = now;
        try { await combatTick(page); } catch (e) { console.log('[GB-299] combat err', String(e).slice(0, 120)); }
      }

      if (now - lastSampleAt >= SAMPLE_MS || lastSampleAt === 0) {
        lastSampleAt = now;
        try {
          const row = await takeSample(page, t0);
          if (row) {
            rows.push(row);
            console.log('[GB-299] sample', Math.round(row.wallSec) + 's', row.phase, 'd' + row.day, 'fps', Number(row.fps).toFixed(1), 'worst', Number(row.worst).toFixed(1), row.onScreen);
          }
        } catch (e) {
          console.log('[GB-299] sample err', String(e).slice(0, 160));
        }
      }

      const st = await page.evaluate(`(() => {
        const T = window.TT;
        return { phase: T.getPhase(), day: T.getDay(), alive: (T.zombies||[]).filter(z=>z.alive&&!z.dying).length };
      })()`);
      // Night 1 ended when we return to prep at day >= 2
      if (st.phase === 'prep' && st.day >= 2) {
        night1End = Date.now();
        console.log('[GB-299] night 1 ended at', ((night1End - t0) / 1000).toFixed(1), 's wall');
        break;
      }
      // Also accept wave gone with day already advanced in some builds
      if (st.phase === 'prep' && st.day > 1 && rows.some((r) => r.phase === 'wave')) {
        night1End = Date.now();
        break;
      }
      await wait(50);
    }
    meta.night1WallSec = +(((night1End || Date.now()) - t0) / 1000).toFixed(1);

    // Sample dawn/prep once
    try {
      const dawn = await takeSample(page, t0);
      if (dawn) { rows.push(dawn); console.log('[GB-299] dawn sample', dawn.onScreen); }
    } catch { /* ignore */ }

    // Start night 2
    console.log('[GB-299] starting night 2 for ~60s...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.runDevCommand && T.runDevCommand('godmode');
      if (T.setViewFirstDbg) T.setViewFirstDbg(true);
      if (T.hqStartWave) T.hqStartWave();
      else if (T.skipPrep) T.skipPrep();
    })()`);
    const n2 = await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'wave'`, { timeout: 120000 });
    if (!n2) {
      await page.evaluate(`(() => { if (window.TT.skipPrep) window.TT.skipPrep(); })()`);
      await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'wave'`, { timeout: 30000 });
    }
    await page.evaluate(`(() => { if (window.TT.resetPerf) window.TT.resetPerf(); })()`);

    const n2Start = Date.now();
    lastSampleAt = 0;
    lastCombatAt = 0;
    while (Date.now() - n2Start < NIGHT2_MS) {
      const now = Date.now();
      if (now - lastCombatAt >= COMBAT_MS) {
        lastCombatAt = now;
        try { await combatTick(page); } catch { /* ignore */ }
      }
      if (now - lastSampleAt >= SAMPLE_MS || lastSampleAt === 0) {
        lastSampleAt = now;
        try {
          const row = await takeSample(page, t0);
          if (row) {
            rows.push(row);
            console.log('[GB-299] n2 sample', Math.round(row.wallSec) + 's', row.phase, 'd' + row.day, 'fps', Number(row.fps).toFixed(1), 'worst', Number(row.worst).toFixed(1), row.onScreen);
          }
        } catch { /* ignore */ }
      }
      await wait(50);
    }
    meta.night2WallSec = +((Date.now() - n2Start) / 1000).toFixed(1);

    // Final sample
    try {
      const last = await takeSample(page, t0);
      if (last) rows.push(last);
    } catch { /* ignore */ }

    // Stop fire, clear leftovers so we don't leave zombies
    await page.evaluate(`(() => {
      const T = window.TT;
      if (T.setMouseFireDbg) T.setMouseFireDbg(false);
      if (T.clearZombies) T.clearZombies();
    })()`);

    meta.ended = new Date().toISOString();
    const waveRows = rows.filter((r) => r.phase === 'wave' && r.fps > 0);
    if (waveRows.length) {
      meta.fpsMean = waveRows.reduce((s, r) => s + r.fps, 0) / waveRows.length;
      meta.fpsMin = Math.min(...waveRows.map((r) => r.fps));
      meta.lowMean = waveRows.reduce((s, r) => s + r.low, 0) / waveRows.length;
      meta.worstMax = Math.max(...waveRows.map((r) => r.worst));
    }

    const worst3 = [...rows].filter((r) => r.worst > 0).sort((a, b) => b.worst - a.worst).slice(0, 3);

    const jsonPath = path.join(OUT_DIR, LABEL + '-raw.json');
    const mdPath = path.join(OUT_DIR, LABEL === 'v110' ? 'v110-table.md' : 'current-table.md');
    fs.writeFileSync(jsonPath, JSON.stringify({ meta, rows, worst3 }, null, 2), 'utf8');
    fs.writeFileSync(mdPath, toMarkdown(LABEL, meta, rows), 'utf8');
    console.log('[GB-299] wrote', mdPath);
    console.log('[GB-299] wrote', jsonPath);
    console.log('[GB-299] DONE', JSON.stringify({
      samples: rows.length,
      fpsMean: meta.fpsMean,
      fpsMin: meta.fpsMin,
      lowMean: meta.lowMean,
      worstMax: meta.worstMax,
      night1WallSec: meta.night1WallSec,
      night2WallSec: meta.night2WallSec,
      worst3: worst3.map((r) => ({ wallSec: r.wallSec, worst: r.worst, fps: r.fps, onScreen: r.onScreen })),
    }));
  } finally {
    try { await browser.close(); } catch { /* ignore */ }
    try { server.close(); } catch { /* ignore */ }
  }
}

main().catch((e) => {
  console.error('[GB-299] FAILED', e);
  process.exit(1);
});
