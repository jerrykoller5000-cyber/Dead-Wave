import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const GP_OUT = path.join(ROOT, 'qa/2026-10-18-GP-19925-shots');
const AG_OUT = path.join(ROOT, 'qa/2026-10-18-AG-82');
fs.mkdirSync(GP_OUT, { recursive: true });
fs.mkdirSync(AG_OUT, { recursive: true });

async function captureGP19925() {
  console.log('[GP-19925] Starting browser for HQ story board inspection...');
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
    await page.waitFor('!!window.TT && !!window.TT.openHQBriefingDbg', { timeout: 120000 });
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

    // Start match
    await page.evaluate(`(() => {
      const name = document.getElementById('playerName');
      if (name) name.value = 'Relay Inspector';
      const play = document.getElementById('modeHunt');
      if (play) play.click();
    })()`);
    await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 45000 });
    await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });

    // 1. Advance to Morning 4 with relay repaired on Morning 4 so Hush-origin dispatch appears before Ridgeline line 1
    const morning4 = await page.evaluate(`(() => {
      TT.setRelayUpDbg(false);
      while (TT.getDay() < 3) TT.startPrep();
      TT.setRelayUpDbg(true);
      TT.startPrep();
      const y = TT.sampleHeight(3.2, -5.9);
      TT.player.position.set(3.2, y, -5.9);
      TT.openHQBriefingDbg();
      const orders = [...document.querySelectorAll('#hqBriefing .briefing-orders p')].map(p => p.textContent);
      return { day: TT.getDay(), orders };
    })()`);
    console.log('[GP-19925] Morning 4 orders lines:', morning4.orders.length);

    // Desktop (1280x720) & Narrow (390x844) shots of Threat Report (4-line orders card)
    const checks = [];
    for (const [w, h, tag] of [[1280, 720, 'desktop-1280'], [390, 844, 'narrow-390']]) {
      await page.setViewport(w, h, 1);
      await page.evaluate(`(() => {
        const tab = document.querySelector('#hqBriefing .briefing-nav button:nth-child(1)');
        if (tab) tab.click();
        const c = document.querySelector('#hqBriefing .briefing-content');
        if (c) c.scrollTop = 0;
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 200))');
      await page.screenshot(path.join(GP_OUT, `threat-report-orders-${tag}.png`));
      const metrics = await page.evaluate(`(() => {
        const dlg = document.getElementById('hqBriefing');
        const r = dlg.getBoundingClientRect();
        const ord = document.querySelector('#hqBriefing .briefing-orders');
        const or = ord ? ord.getBoundingClientRect() : null;
        return {
          viewport: [window.innerWidth, window.innerHeight],
          dialogBox: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
          ordersBox: or ? [Math.round(or.x), Math.round(or.y), Math.round(or.width), Math.round(or.height)] : null,
          ordersCount: document.querySelectorAll('#hqBriefing .briefing-orders p').length,
          overflowX: dlg.scrollWidth > dlg.clientWidth + 1
        };
      })()`);
      checks.push({ view: `threat-report-${tag}`, ...metrics });

      // Relay tab: Hush-origin dispatch before Ridgeline line 1
      await page.evaluate(`(() => {
        const tab = document.querySelector('#hqBriefing .briefing-nav button:nth-child(3)');
        if (tab) tab.click();
        const c = document.querySelector('#hqBriefing .briefing-content');
        if (c) c.scrollTop = 0;
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 200))');
      await page.screenshot(path.join(GP_OUT, `relay-hush-origin-${tag}.png`));
      const relayMetrics = await page.evaluate(`(() => {
        const dlg = document.getElementById('hqBriefing');
        const lines = [...document.querySelectorAll('#hqBriefing .briefing-relay .relay-story-line')].map(el => el.textContent);
        return {
          linesCount: lines.length,
          lines,
          overflowX: dlg.scrollWidth > dlg.clientWidth + 1
        };
      })()`);
      checks.push({ view: `relay-hush-origin-${tag}`, ...relayMetrics });
    }

    // 2. Guardian driven-back reward banner + Night 6 Guardian scouting report
    await page.setViewport(1280, 720, 1);
    const guardianCheck = await page.evaluate(`(() => {
      while (TT.getDay() < 6) TT.startPrep();
      const y = TT.sampleHeight(3.2, -5.9);
      TT.player.position.set(3.2, y, -5.9);
      // Re-open HQ briefing on Day 6 (Guardian night)
      const closeBtn = document.querySelector('#hqBriefing .briefing-close');
      if (closeBtn) closeBtn.click();
      TT.openHQBriefingDbg();
      const tab = document.querySelector('#hqBriefing .briefing-nav button:nth-child(1)');
      if (tab) tab.click();
      // Also trigger guardian-first-blood reward banner so both the scouting card and reward banner are verified
      window.dispatchEvent(new CustomEvent('dw-game', {
        detail: {
          type: 'guardian-first-blood',
          runId: 1,
          receiptId: 'guardian-night-first',
          typeKey: 'guardian',
          playerCredit: true,
          planned: true,
          x: 3.2,
          z: -5.9,
          propose: 'mortar-blueprint-or-80-skulls'
        }
      }));
      return {
        day: TT.getDay(),
        banner: TT.bigBannerText ? TT.bigBannerText() : '',
        trick: document.querySelector('#hqBriefing .briefing-trick')?.textContent || '',
        counters: [...document.querySelectorAll('#hqBriefing .briefing-counter')].map(e => e.textContent)
      };
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    await page.screenshot(path.join(GP_OUT, 'guardian-night6-and-reward-desktop-1280.png'));
    await page.setViewport(390, 844, 1);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    await page.screenshot(path.join(GP_OUT, 'guardian-night6-and-reward-narrow-390.png'));

    fs.writeFileSync(
      path.join(GP_OUT, 'report.json'),
      JSON.stringify({ morning4, checks, guardianCheck, pageErrors: page.errors }, null, 2)
    );
    console.log('[GP-19925] Saved 6 screenshots + report.json');
  } finally {
    await browser.close();
    await server.close();
  }
}

function runBenchOne(args) {
  console.log('\n[AG-82] Running: node tools/bench.mjs', args.join(' '));
  const out = execFileSync(process.execPath, ['tools/bench.mjs', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  process.stdout.write(out);
  const lines = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{') && l.endsWith('}'));
  if (!lines.length) throw new Error('No JSON line found in bench output');
  return JSON.parse(lines.at(-1));
}

async function main() {
  await captureGP19925();

  const results = [];
  const nights = [5, 10, 14, 18, 20];

  // 1. Jerry's default graphics preset (no --gfx flag -> 'max')
  for (const n of nights) {
    results.push(runBenchOne(['--night', String(n), '--seconds', '10']));
  }
  results.push(runBenchOne(['--scenario', 'megaswarm', '--count', '48', '--seconds', '10']));

  // 2. High graphics preset (--gfx high)
  for (const n of nights) {
    results.push(runBenchOne(['--night', String(n), '--gfx', 'high', '--seconds', '10']));
  }
  results.push(runBenchOne(['--scenario', 'megaswarm', '--count', '48', '--gfx', 'high', '--seconds', '10']));

  fs.writeFileSync(path.join(AG_OUT, 'bench-results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(AG_OUT, 'bench-lines.jsonl'),
    results.map((r) => JSON.stringify(r)).join('\n') + '\n'
  );
  console.log('[AG-82] Saved all 12 benchmark JSON lines to qa/2026-10-18-AG-82/bench-lines.jsonl');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
