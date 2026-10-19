import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const AG_OUT = path.join(ROOT, 'qa/2026-10-18-AG-85');
const GP28_OUT = path.join(ROOT, 'qa/2026-10-18-GP-19928-shots');
const GP26_OUT = path.join(ROOT, 'qa/2026-10-18-GP-19926-shots');
fs.mkdirSync(AG_OUT, { recursive: true });
fs.mkdirSync(GP28_OUT, { recursive: true });
fs.mkdirSync(GP26_OUT, { recursive: true });

const SAMPLE = `(() => {
  const read = () => {
    const info = (TT.renderer && TT.renderer.info && TT.renderer.info.render) || {};
    const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
    return { draws, triangles: info.triangles || 0 };
  };
  let best = read();
  const again = read();
  if (again.draws > best.draws) best = again;
  const snap = TT.perfSnapshot() || { fps: 0, low: 0, worst: 0, hitches: 0, frames: 0 };
  return Object.assign({}, snap, best);
})()`;

const ADVANCE = `(() => {
  const st = () => TT.getWaveDirectorState();
  const up = () => (TT.zombies || []).filter((z) => z.alive && !z.dying).length;
  const cap = TT.MAX_ZOMBIES || 48;
  let steps = 0;
  while (steps++ < 250) {
    const pc = st().pace;
    const onLast = !!(pc && pc.pushes > 0 && pc.push === pc.pushes - 1 && !pc.inLull);
    if (onLast) {
      if (up() >= cap) break;
      if (pc.left <= 0 && up() > 0) break;
      TT.spawnWaveBatch(0.25);
      continue;
    }
    if (!pc || pc.inLull || up() > 6) TT.clearZombies();
    TT.spawnWaveBatch(0.5);
  }
  const pc = st().pace;
  const onLast = !!(pc && pc.pushes > 0 && pc.push === pc.pushes - 1 && !pc.inLull);
  const out = up() >= cap || (pc && pc.left <= 0 && up() > 0);
  return {
    done: onLast && out,
    day: st().day,
    phase: st().phase,
    push: pc ? pc.push : null,
    pushes: pc ? pc.pushes : null,
    left: pc ? pc.left : null,
    zombies: up(),
    spawned: st().waveSpawned,
    total: st().waveTotal
  };
})()`;

function median(nums) {
  if (!nums.length) return 0;
  const s = nums.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function sampleWindow(page, seconds, meta) {
  await page.evaluate('TT.resetPerf()');
  const t0 = Date.now();
  const windows = [];
  while (Date.now() - t0 < seconds * 1000) {
    const snap = await page.evaluate(SAMPLE);
    if (snap) windows.push(snap);
    await new Promise((r) => setTimeout(r, 1000));
  }
  const tail = windows.slice(-10);
  const paced = tail.filter((w) => w.fps > 0);
  const use = paced.length ? paced : tail;
  const avg = (key) => use.reduce((sum, w) => sum + (w[key] || 0), 0) / (use.length || 1);
  const final = windows.at(-1) || { worst: 0, hitches: 0 };
  const counted = (use.some((w) => w.draws > 0) ? use : windows).filter((w) => w.draws > 0);
  const drawRows = counted.length ? counted : use;
  const state = await page.evaluate(
    `({ zombies: (TT.zombies || []).filter(z => z.alive && !z.dying).length, gfx: TT.getGfx ? TT.getGfx() : '' })`
  );
  const summary = {
    scenario: meta.scenario,
    seconds,
    fps: Math.round(avg('fps') * 10) / 10,
    low: Math.round(avg('low') * 10) / 10,
    worst: Math.round((final.worst || 0) * 10) / 10,
    hitches: final.hitches || 0,
    draws: Math.round(median(drawRows.map((w) => w.draws || 0))),
    triangles: Math.round(median(drawRows.map((w) => w.triangles || 0))),
    zombies: state.zombies,
    gfx: state.gfx,
    windows: use.length,
    ...meta.extra,
  };
  console.log(JSON.stringify(summary));
  return summary;
}

async function runNight(page, night, gfx, seconds = 10) {
  await page.evaluate(`TT.applyGraphicsPreset(${JSON.stringify(gfx)})`);
  const jumped = await page.evaluate(`(() => {
    TT.clearZombies();
    TT.runDevCommand('godmode');
    const ok = !!TT.devJumpToNight(${night}, true);
    const st = TT.getWaveDirectorState();
    return { ok, phase: st.phase, day: st.day, pushes: st.pace ? st.pace.pushes : 0 };
  })()`);
  if (!jumped.ok || jumped.phase !== 'wave') {
    throw new Error('devJumpToNight refused night ' + night + ' (' + JSON.stringify(jumped) + ')');
  }
  let state = null;
  for (let i = 0; i < 40; i++) {
    state = await page.evaluate(ADVANCE, 180000);
    if (state.done) break;
  }
  if (!state || !state.done) {
    throw new Error('night ' + night + ' never reached its last push with the horde out');
  }
  await page.evaluate('new Promise(r => setTimeout(r, 3000))');
  return sampleWindow(page, seconds, {
    scenario: 'night',
    extra: {
      night,
      push: state.push,
      pushes: state.pushes,
      last: state.done,
    },
  });
}

async function runMegaswarm(page, count, gfx, seconds = 10) {
  await page.evaluate(`(() => {
    TT.applyGraphicsPreset(${JSON.stringify(gfx)});
    TT.clearZombies();
    TT.startPrep();
    TT.spawnMegaswarm(${count | 0});
  })()`);
  await page.evaluate('new Promise(r => setTimeout(r, 1500))');
  const res = await sampleWindow(page, seconds, {
    scenario: 'megaswarm',
    extra: { count },
  });
  await page.evaluate(`TT.clearZombies()`);
  return res;
}

async function main() {
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false, width: 1280, height: 720 });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    const url = `${server.origin}/index.html?debug=1`;
    await page.goto(url, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 250))');
    }
    await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

    // --- PART 1: GP-19928 first-run card verification on zero-run profile ---
    console.log('[GP-19928] Checking first-run card on zero-run profile...');
    const gp28Check = await page.evaluate(`(() => {
      const name = document.getElementById('playerName');
      if (name) name.value = 'Bench';
      const play = document.getElementById('modeHunt');
      if (play) play.click();
      const card = document.getElementById('firstRunCard');
      const r = card ? card.getBoundingClientRect() : null;
      const tBtn = document.getElementById('firstRunTraining');
      const pBtn = document.getElementById('firstRunPlay');
      return {
        hidden: card ? card.hidden : true,
        box: r ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null,
        title: card?.querySelector('h2, h3, .first-run-title, p')?.textContent?.trim() || '',
        text: card?.innerText?.trim() || '',
        trainingLabel: tBtn?.textContent?.trim() || '',
        playLabel: pBtn?.textContent?.trim() || '',
        savedFlag: localStorage.getItem('dw_first_run_choice_v1')
      };
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    await page.screenshot(path.join(GP28_OUT, 'first-run-card-desktop-1280.png'));
    await page.setViewport(390, 844, 1);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    const gp28Narrow = await page.evaluate(`(() => {
      const card = document.getElementById('firstRunCard');
      const r = card ? card.getBoundingClientRect() : null;
      return {
        viewport: [window.innerWidth, window.innerHeight],
        box: r ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null,
        overflowX: card ? card.scrollWidth > card.clientWidth + 1 : false
      };
    })()`);
    await page.screenshot(path.join(GP28_OUT, 'first-run-card-narrow-390.png'));
    await page.setViewport(1280, 720, 1);
    await page.evaluate('new Promise(r => setTimeout(r, 150))');

    // Click #firstRunPlay to enter the match!
    await page.evaluate(`(() => {
      const pBtn = document.getElementById('firstRunPlay');
      if (pBtn && !document.getElementById('firstRunCard')?.hidden) pBtn.click();
      else {
        const play = document.getElementById('modeHunt');
        if (play) play.click();
      }
    })()`);
    fs.writeFileSync(path.join(GP28_OUT, 'report.json'), JSON.stringify({ gp28Check, gp28Narrow }, null, 2));

    const prep = await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 60000 });
    if (!prep) throw new Error('match never reached prep');
    const landed = await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
    if (!landed) throw new Error('insertion never finished');

    // --- PART 2: Post-CL-210 / Post-AG-84 GPU Benchmarks (High & Max) ---
    console.log('[AG-85] Running post-CL-210 GPU benchmarks...');
    const results = [];
    for (const n of [5, 10, 14, 18, 20]) {
      results.push(await runNight(page, n, 'high', 10));
    }
    results.push(await runMegaswarm(page, 48, 'high', 10));
    results.push(await runNight(page, 20, 'max', 10));
    results.push(await runMegaswarm(page, 48, 'max', 10));

    fs.writeFileSync(path.join(AG_OUT, 'bench-results.json'), JSON.stringify(results, null, 2));
    fs.writeFileSync(
      path.join(AG_OUT, 'bench-lines.jsonl'),
      results.map((r) => JSON.stringify(r)).join('\n') + '\n'
    );
    console.log('[AG-85] Saved post-CL-210 bench-results.json and bench-lines.jsonl');

    // --- PART 3: GP-19926 Night N copy screenshots ---
    console.log('[GP-19926] Capturing Night N copy screenshots...');
    const gp26Checks = [];
    for (const night of [6, 14, 17]) {
      const info = await page.evaluate(`(() => {
        TT.clearZombies();
        TT.setDay(${night - 1});
        TT.startPrep();
        const y = TT.sampleHeight(3.2, -5.9);
        TT.player.position.set(3.2, y, -5.9);
        const closeBtn = document.querySelector('#hqBriefing .briefing-close');
        if (closeBtn && !document.getElementById('hqBriefing')?.hidden) closeBtn.click();
        TT.openHQBriefingDbg();
        const tab = document.querySelector('#hqBriefing .briefing-nav button:nth-child(1)');
        if (tab) tab.click();
        return {
          day: TT.getDay(),
          banner: TT.bigBannerText ? TT.bigBannerText() : '',
          title: document.querySelector('#hqBriefing .briefing-head h2, #hqBriefing h2')?.textContent || '',
          text: document.querySelector('#hqBriefing .briefing-content')?.innerText?.slice(0, 600) || ''
        };
      })()`);
      await page.setViewport(1280, 720, 1);
      await page.evaluate('new Promise(r => setTimeout(r, 200))');
      await page.screenshot(path.join(GP26_OUT, `night-${night}-scouting-desktop-1280.png`));
      await page.setViewport(390, 844, 1);
      await page.evaluate('new Promise(r => setTimeout(r, 200))');
      await page.screenshot(path.join(GP26_OUT, `night-${night}-scouting-narrow-390.png`));
      gp26Checks.push({ night, ...info });
    }

    // Also capture Night 5 Ember Night wave start banner + Night 6 inbound banner
    await page.setViewport(1280, 720, 1);
    const emberBanner = await page.evaluate(`(() => {
      const closeBtn = document.querySelector('#hqBriefing .briefing-close');
      if (closeBtn) closeBtn.click();
      TT.devJumpToNight(5, true);
      return { day: TT.getDay(), banner: TT.bigBannerText ? TT.bigBannerText() : '' };
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    await page.screenshot(path.join(GP26_OUT, 'night-5-ember-banner-desktop-1280.png'));
    gp26Checks.push({ type: 'ember-banner', ...emberBanner });

    fs.writeFileSync(path.join(GP26_OUT, 'report.json'), JSON.stringify({ gp26Checks }, null, 2));
    console.log('[GP-19926] Saved screenshots and report.json');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
