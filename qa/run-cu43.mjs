// qa/run-cu43.mjs — CU-43, the showcase dry run the real way (AG-18 redo).
// Fresh profile, visible window, Jerry's GPU. No skipPrep. The briefing opens with E at the
// HQ panel, the alarm is the panel button, and nothing is killed until that night's spawns
// have finished. D-39: the dawn banner has no buttons; the next night starts from the panel.
//
//   node qa/run-cu43.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS = path.join(ROOT, 'qa', 'shots', '2026-09-26-CU-43');
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[cu43]', ...a);
const findings = [];
const note = (s) => { findings.push(s); log('FINDING', s); };

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
const shot = async (page, name) => { await page.screenshot(path.join(SHOTS, name + '.png')); log('shot', name); };

async function stand(page, front) {
  return page.evaluate(`(() => {
    const f = TT.${front};
    const y = TT.sampleHeight(f.x, f.z);
    TT.player.position.set(f.x, y, f.z);
    return { x: +TT.player.position.x.toFixed(2), y: +TT.player.position.y.toFixed(2), z: +TT.player.position.z.toFixed(2) };
  })()`);
}

async function pressE(page) {
  return page.evaluate(`(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true, cancelable: true }));
    const d = document.getElementById('hqBriefing');
    return { briefing: !!(d && d.open) };
  })()`);
}

async function briefing(page) {
  return page.evaluate(`(() => {
    const d = document.getElementById('hqBriefing');
    if (!d) return null;
    return {
      open: !!d.open,
      text: (d.innerText || '').replace(/\\s+/g, ' ').slice(0, 900),
      buttons: [...d.querySelectorAll('button')].map((b) => ({ t: b.textContent, disabled: b.disabled }))
    };
  })()`);
}

async function soundAlarm(page) {
  return page.evaluate(`(() => {
    const d = document.getElementById('hqBriefing');
    const b = d && [...d.querySelectorAll('button')].find((x) => !/close/i.test(x.textContent));
    if (!b) return { clicked: false, why: 'no alarm button' };
    if (b.disabled) return { clicked: false, why: 'disabled', label: b.textContent };
    b.click();
    return { clicked: true, label: b.textContent };
  })()`);
}

async function director(page) {
  return page.evaluate(`(() => {
    const d = TT.getWaveDirectorState();
    const alive = TT.zombies.filter((z) => z.alive).length;
    const c = TT.camera.position;
    const cine = TT.getLoopCine();
    return {
      phase: d.phase, day: d.day, spawned: d.waveSpawned, total: d.waveTotal,
      remaining: d.zombiesRemaining, alive, pushes: d.pace ? d.pace.pushes : null,
      push: d.pace ? d.pace.push : null, lull: d.pace ? d.pace.inLull : null,
      finisher: !!TT.getWaveFinisher(), sky: TT.getSkyMode(),
      cam: { x: +c.x.toFixed(1), y: +c.y.toFixed(1), z: +c.z.toFixed(1) },
      cine: cine ? (cine.kind || cine.id || 'on') : null
    };
  })()`);
}

// Thin the field so a breather can start, but never end the night before the plan is out.
async function fightUntilSpawned(page, label, timeoutMs) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeoutMs) {
    last = await page.evaluate(`(() => {
      const d = TT.getWaveDirectorState();
      const alive = TT.zombies.filter((z) => z.alive);
      const spawned = d.waveSpawned >= d.waveTotal && d.waveTotal > 0;
      const keep = spawned ? 0 : 3;
      let killed = 0;
      while (TT.zombies.filter((z) => z.alive).length > keep) {
        const z = TT.zombies.find((z) => z.alive);
        if (!z) break;
        TT.killZombie(z, true, { kind: 'generic', dir: { x: 1, z: 0 } });
        killed++;
        if (killed > 40) break;
      }
      const now = TT.getWaveDirectorState();
      return {
        phase: now.phase, spawned: now.waveSpawned, total: now.waveTotal,
        alive: TT.zombies.filter((z) => z.alive).length,
        finisher: !!TT.getWaveFinisher(), killed
      };
    })()`);
    if (last.finisher || (last.spawned >= last.total && last.total > 0 && last.alive === 0)) break;
    if (last.phase !== 'wave') break;
    await sleep(400);
  }
  log(label, 'fight', JSON.stringify(last), 'in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  return last;
}

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`, { waitUntil: 'none' });
  await page.waitFor('!!window.TT && window.DWOpening', { timeout: 240000 });
  log('renderer', await page.evaluate('TT.getRendererBackend && TT.getRendererBackend()'));
  await page.evaluate('DWOpening.dismissForTesting && DWOpening.dismissForTesting()');
  await page.waitFor('DWOpening.active === false', { timeout: 120000 });
  await shot(page, '01-menu');

  await page.evaluate(`(() => { document.getElementById('playerName').value = 'Jerry'; document.getElementById('modeHunt').click(); })()`);
  const prep = await page.waitFor(`TT.getPhase() === 'prep' && !document.body.classList.contains('deploying')`, { timeout: 180000 });
  log('day 1 prep', prep, 'day', await page.evaluate('TT.getDay()'));
  await page.evaluate(`TT.runDevCommand('godmode')`);
  await sleep(800);
  await shot(page, '02-day1-prep');

  log('stand panel', JSON.stringify(await stand(page, 'HQ_PANEL_FRONT')));
  await sleep(400);
  log('press E', JSON.stringify(await pressE(page)));
  await sleep(600);
  const day1Board = await briefing(page);
  log('day 1 board', JSON.stringify(day1Board));
  if (!day1Board || !day1Board.open) note('Day 1 briefing did not open from E at the HQ panel.');
  else {
    if (!/scout|cave|tonight/i.test(day1Board.text)) note('Day 1 briefing text has no scouting report: ' + day1Board.text.slice(0, 180));
    if (/bounty/i.test(day1Board.text)) note('Day 1 briefing lists a bounty; bounties start on night 2.');
  }
  await shot(page, '03-day1-briefing');

  const alarm1 = await soundAlarm(page);
  log('night 1 alarm button', JSON.stringify(alarm1));
  if (!alarm1.clicked) note('Night 1 alarm button did not fire: ' + alarm1.why);
  const alarmCams = [];
  for (const t of [0.5, 2.5, 5]) {
    await sleep(t === 0.5 ? 500 : 2000);
    const d = await director(page);
    alarmCams.push({ t, ...d });
    await shot(page, `04-n1-alarm-${t}s`);
  }
  log('night 1 alarm cameras', JSON.stringify(alarmCams));
  const ys = alarmCams.map((c) => c.cam.y);
  if (Math.max(...ys) - Math.min(...ys) > 25) note('Night 1 alarm camera climbed more than 25 m (D-39 holds the HQ): ' + JSON.stringify(alarmCams.map((c) => c.cam)));

  const wave1 = await page.waitFor(`TT.getPhase() === 'wave'`, { timeout: 30000 });
  log('night 1 wave phase', wave1);
  if (!wave1) note('Night 1 never reached phase wave.');
  await shot(page, '05-n1-wave');
  const fight1 = await fightUntilSpawned(page, 'night 1', 180000);
  if (!(fight1 && fight1.spawned >= fight1.total && fight1.total > 0)) note('Night 1 spawns did not finish: ' + JSON.stringify(fight1));

  const fin0 = Date.now();
  if (!(await page.evaluate('!!TT.getWaveFinisher()'))) {
    await page.evaluate(`(() => { const z = TT.zombies.find((z) => z.alive); if (z) TT.killZombie(z, true, { kind: 'generic', dir: { x: 1, z: 0 } }); })()`);
  }
  log('finisher just after last kill', await page.evaluate('!!TT.getWaveFinisher()'), 'phase', await page.evaluate('TT.getPhase()'));
  for (const t of [0.5, 1.5, 2.6]) {
    await sleep(Math.max(0, t * 1000 - (Date.now() - fin0)));
    await shot(page, `06-n1-finisher-${t}s`);
    log('finisher', t + 's', 'running', await page.evaluate('!!TT.getWaveFinisher()'), 'sky', await page.evaluate('TT.getSkyMode()'));
  }
  const finEnd = await page.waitFor('!TT.getWaveFinisher()', { timeout: 20000 });
  log('finisher ended', finEnd, 'after', ((Date.now() - fin0) / 1000).toFixed(1) + 's');

  const banner = await page.waitFor(`!!(document.getElementById('dawnCard') || {}).open`, { timeout: 20000 });
  await sleep(400);
  const card = await page.evaluate(`(() => {
    const d = document.getElementById('dawnCard');
    return d ? { open: !!d.open, text: (d.innerText || '').replace(/\\s+/g, ' ').slice(0, 300), buttons: d.querySelectorAll('button').length, cls: d.className } : null;
  })()`);
  log('dawn banner', banner, JSON.stringify(card), 'phase', await page.evaluate('TT.getPhase()'), 'day', await page.evaluate('TT.getDay()'));
  await shot(page, '07-dawn-banner');
  if (!card || !card.open) note('Dawn banner did not open after the night 1 finisher.');
  else if (card.buttons !== 0) note('Dawn banner has ' + card.buttons + ' button(s); D-39 says none.');

  const day2 = await page.waitFor(`TT.getPhase() === 'prep' && TT.getDay() === 2`, { timeout: 20000 });
  log('day 2 prep', day2);
  if (!day2) note('Day 2 prep did not start by itself after the last kill.');
  const bountiesReady = await page.waitFor(`(TT.getBounties() || []).some((b) => b.state === 'open')`, { timeout: 20000 });
  log('bounties posted', bountiesReady, JSON.stringify(await page.evaluate('TT.getBounties()')));
  if (!bountiesReady) note('Day 2 posted no open bounty.');

  log('stand panel', JSON.stringify(await stand(page, 'HQ_PANEL_FRONT')));
  await sleep(400);
  log('press E day 2', JSON.stringify(await pressE(page)));
  await sleep(600);
  const day2Board = await briefing(page);
  log('day 2 board', JSON.stringify(day2Board));
  if (!day2Board || !day2Board.open) note('Day 2 briefing did not open.');
  else if (!/bounty/i.test(day2Board.text)) note('Day 2 briefing has no bounty listing: ' + (day2Board.text || '').slice(0, 180));
  await shot(page, '08-day2-briefing');
  await page.evaluate(`(() => { const b = document.querySelector('#hqBriefing button'); if (b && /close/i.test(b.textContent)) b.click(); else document.querySelectorAll('#hqBriefing button')[1] && document.querySelectorAll('#hqBriefing button')[1].click(); })()`);
  await sleep(400);

  const post = await page.evaluate(`(() => { const b = (TT.getBounties() || []).find((p) => p.state === 'open'); return b ? { x: b.x, z: b.z, reward: b.reward, alive: b.alive, label: b.labelKey } : null; })()`);
  log('bounty post', JSON.stringify(post));
  if (post) {
    await page.evaluate(`(() => { const y = TT.sampleHeight(${post.x}, ${post.z}); TT.player.position.set(${post.x} + 6, y, ${post.z} + 6); })()`);
    await sleep(700);
    await shot(page, '09-bounty-site');
    const cleared = await page.evaluate(`(() => {
      const guards = TT.zombies.filter((z) => z.alive && z.poiGuard && z.poiGuard.bounty);
      for (const z of guards) TT.killZombie(z, true, { kind: 'generic', dir: { x: 1, z: 0 } });
      return { killed: guards.length, posts: TT.getBounties(), bag: TT.getSkullBag() };
    })()`);
    log('bounty clear', JSON.stringify(cleared));
    if (!cleared.posts.some((p) => p.state === 'done')) note('Clearing the day-2 guards did not mark the bounty done.');
    if (!(cleared.bag && cleared.bag.count > 0)) note('Bounty reward did not land in the skull bag.');
    await sleep(500);
    await shot(page, '10-bounty-cleared');
  }

  const beforeBank = await page.evaluate('TT.getBank()');
  log('stand window', JSON.stringify(await stand(page, 'HQ_WINDOW_FRONT')), 'bag', JSON.stringify(await page.evaluate('TT.getSkullBag()')));
  await sleep(400);
  const deposited = await pressE(page);
  log('press E at window', JSON.stringify(deposited));
  await shot(page, '11-bank-window');
  const green = await page.waitFor(`TT.hq && (TT.hq.dep === 'green' || TT.hq.dep === 'process' || TT.hq.dep === 'open')`, { timeout: 8000 });
  await page.waitFor(`TT.getBank() > ${beforeBank}`, { timeout: 15000 });
  const afterBank = await page.evaluate('({ bank: TT.getBank(), bag: TT.getSkullBag(), dep: TT.hq.dep })');
  log('after bank', green, JSON.stringify(afterBank));
  if (!(afterBank.bank > beforeBank)) note('Bank did not take the skulls (bank ' + beforeBank + ' -> ' + afterBank.bank + ').');
  await shot(page, '12-bank-done');

  log('stand panel', JSON.stringify(await stand(page, 'HQ_PANEL_FRONT')));
  await sleep(400);
  await pressE(page);
  await sleep(500);
  const alarm2 = await soundAlarm(page);
  log('night 2 alarm button', JSON.stringify(alarm2));
  if (!alarm2.clicked) note('Night 2 did not start from the HQ panel: ' + JSON.stringify(alarm2));
  await sleep(2500);
  await shot(page, '13-n2-alarm');
  const wave2 = await page.waitFor(`TT.getPhase() === 'wave'`, { timeout: 30000 });
  log('night 2 wave', wave2, 'day', await page.evaluate('TT.getDay()'));
  const fight2 = await fightUntilSpawned(page, 'night 2', 240000);
  if (!(fight2 && fight2.spawned >= fight2.total && fight2.total > 0)) note('Night 2 spawns did not finish: ' + JSON.stringify(fight2));
  if (!(await page.evaluate('!!TT.getWaveFinisher()'))) {
    await page.evaluate(`(() => { const z = TT.zombies.find((z) => z.alive); if (z) TT.killZombie(z, true, { kind: 'generic', dir: { x: 1, z: 0 } }); })()`);
  }
  await page.waitFor('!TT.getWaveFinisher()', { timeout: 20000 });
  const banner2 = await page.waitFor(`!!(document.getElementById('dawnCard') || {}).open`, { timeout: 20000 });
  log('night 2 dawn', banner2, 'day', await page.evaluate('TT.getDay()'), 'phase', await page.evaluate('TT.getPhase()'));
  await shot(page, '14-n2-dawn');
  if (!banner2) note('No dawn banner after night 2.');

  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 20000 });
  log('stand panel', JSON.stringify(await stand(page, 'HQ_PANEL_FRONT')));
  await sleep(500);
  await pressE(page);
  await sleep(500);
  await shot(page, '15-day3-briefing');
  const alarm3 = await soundAlarm(page);
  log('night 3 alarm button', JSON.stringify(alarm3));
  if (!alarm3.clicked) note('Night 3 did not start from the HQ panel: ' + JSON.stringify(alarm3));
  await sleep(2500);
  await shot(page, '16-n3-alarm');
  const wave3 = await page.waitFor(`TT.getPhase() === 'wave' && TT.getDay() === 3`, { timeout: 30000 });
  log('night 3 wave', wave3, JSON.stringify(await director(page)));
  await shot(page, '17-n3-wave');
  if (!wave3) note('Night 3 wave did not start.');

  log('page errors', page.errors.length);
  for (const e of page.errors.slice(0, 8)) console.log('   ERR', e.split('\n')[0]);
  if (page.errors.length) note(page.errors.length + ' page error(s). First: ' + page.errors[0].split('\n')[0]);
  fs.writeFileSync(path.join(SHOTS, 'findings.json'), JSON.stringify({ findings, errors: page.errors.slice(0, 8) }, null, 2));
  log('findings', findings.length ? findings.join(' | ') : 'none');
} catch (e) {
  log('FAILED', e && e.stack || e);
  fs.writeFileSync(path.join(SHOTS, 'findings.json'), JSON.stringify({ findings, failed: String(e && e.stack || e) }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
