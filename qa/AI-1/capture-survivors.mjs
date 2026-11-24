// qa/AI-1/capture-survivors.mjs — RTX 5080 WebGPU visual + functional verification for AI-1 Survivors Overhaul.
// Uses tools/cdp.mjs (zero external dependencies) on the real WebGPU RTX 5080 renderer.
// Run through the game-test slot:
//   node crew/crew.mjs slot run antigravity3 AI-1 --checks "AI-1 WebGPU survivor capture" -- node qa/AI-1/capture-survivors.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'qa', 'AI-1');
fs.mkdirSync(OUT, { recursive: true });

const srv = await serve(ROOT, 0);
const browser = await launch({ headless: false });
const page = await browser.newPage({ width: 1280, height: 720 });
const hardTimer = setTimeout(() => { console.error('TIMEOUT 200s'); process.exit(2); }, 200000);

try {
  const url = `${srv.origin}/index.html?debug=1&raf=timer`;
  console.log('capture:', browser.exe, url);
  await page.goto(url);
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  const ready = await page.waitFor('!!window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 150000 });
  if (!ready) throw new Error('TT never became ready. Errors: ' + page.errors.slice(0, 5).join('\n'));
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); return true; })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate('new Promise(r => setTimeout(r, 600))');

  // Start Hunt match
  await page.evaluate(`(() => {
    const inp = document.getElementById('playerName');
    if (inp) inp.value = 'AI1Survivors';
    const btn = document.getElementById('modeHunt');
    if (btn) btn.click();
    return true;
  })()`);
  const started = await page.waitFor('TT.getPhase() === "prep" && !document.body.classList.contains("deploying")', { timeout: 90000 });
  if (!started) throw new Error('Match never reached prep. Errors: ' + page.errors.slice(0, 5).join('\n'));
  await page.evaluate('new Promise(r => setTimeout(r, 500))');

  await page.evaluate(`(() => { TT.clearZombies(); TT.runDevCommand('godmode'); return true; })()`);

  const hideUI = async (hide) => {
    await page.evaluate(`((h) => {
      const cv = [...document.querySelectorAll('canvas')].sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
      const keep = new Set();
      for (let e = cv; e && e !== document.body; e = e.parentElement) keep.add(e);
      for (const child of document.body.children) {
        if (!keep.has(child)) {
          if (h) child.style.setProperty('display', 'none', 'important');
          else child.style.removeProperty('display');
        }
      }
      return true;
    })(${JSON.stringify(hide)})`);
  };

  const shoot = async (name, spec, worldTime = 0.42, waitMs = 420) => {
    await page.evaluate(`(() => { TT.setWorldTime(${worldTime}); TT.setShotView(${JSON.stringify(spec)}); return true; })()`);
    await page.evaluate(`new Promise(r => setTimeout(r, ${waitMs}))`);
    const p = path.join(OUT, name);
    await page.screenshot(p);
    console.log('SHOT:', name, Math.round(fs.statSync(p).size / 1024) + ' KB');
  };

  // --- PART 1: CHARACTER LINEUP & CLOSEUPS ON OPEN GROUND ---
  await hideUI(true);
  const spot = await page.evaluate(`(() => {
    const x = 14, z = 22;
    const figs = ['okafor', 'brandt', 'pike'].map((w, i) => {
      const m = TT.makeSurvivorFigure(w);
      const fx = x + (i - 1) * 1.45;
      m.position.set(fx, TT.sampleHeight(fx, z), z);
      TT.scene.add(m);
      return { w, fx, y: m.position.y, z };
    });
    window.__ai1Lineup = figs;
    return { x, z, y: TT.sampleHeight(x, z), figs };
  })()`);

  await shoot('01-lineup-front-noon.png', { x: spot.x, y: spot.y + 1.08, z: spot.z + 3.9, tx: spot.x, ty: spot.y + 0.90, tz: spot.z, fov: 42 }, 0.40);
  await shoot('02-lineup-back-noon.png',  { x: spot.x, y: spot.y + 1.08, z: spot.z - 3.9, tx: spot.x, ty: spot.y + 0.90, tz: spot.z, fov: 42 }, 0.40);
  await shoot('02b-lineup-front-dusk.png', { x: spot.x, y: spot.y + 1.08, z: spot.z + 3.9, tx: spot.x, ty: spot.y + 0.90, tz: spot.z, fov: 42 }, 0.74);
  await shoot('02c-lineup-front-dawn.png', { x: spot.x, y: spot.y + 1.08, z: spot.z + 3.9, tx: spot.x, ty: spot.y + 0.90, tz: spot.z, fov: 42 }, 0.24);
  const [okF, brF, pkF] = spot.figs;
  await shoot('03-okafor-closeup.png', { x: okF.fx + 0.95, y: okF.y + 1.08, z: okF.z + 1.35, tx: okF.fx, ty: okF.y + 0.94, tz: okF.z, fov: 38 }, 0.40);
  await shoot('04-brandt-closeup.png', { x: brF.fx + 1.05, y: brF.y + 1.08, z: brF.z + 1.25, tx: brF.fx, ty: brF.y + 0.96, tz: brF.z, fov: 38 }, 0.40);
  await shoot('05-pike-closeup.png',   { x: pkF.fx - 0.95, y: pkF.y + 1.08, z: pkF.z + 1.35, tx: pkF.fx, ty: pkF.y + 0.94, tz: pkF.z, fov: 38 }, 0.40);

  // --- PART 2: HQ ROOF POSTS BY DAY (CLEARANCE + RESTING POSES + PLAYER TRACKING) ---
  const roofInfo = await page.evaluate(`(() => {
    TT.setDay(5);
    for (const st of ['trapper', 'ranger', 'hikers']) TT.survivorHelpDbg.grant(st);
    const L = TT.hqLadderAt();
    const crew = TT.roofDbg.crew();
    const ok = crew.find((c) => c.who === 'okafor');
    TT.player.position.set(L.x, L.y, L.z);
    for (let i = 0; i < 40 && !TT.onHqRoof(); i++) TT.stepHqLadder(1, 0.2);
    if (ok) TT.player.position.set(ok.x + 1.2, L.roof, ok.z - 1.5);
    for (let i = 0; i < 35; i++) TT.roofDbg.tick(0.05);
    return { roofY: L.roof, crew };
  })()`);
  const ry = roofInfo.roofY;
  const byWho = Object.fromEntries(roofInfo.crew.map((c) => [c.who, c]));

  await shoot('06-roof-overview-day.png', { x: -6.5, y: ry + 7.2, z: -6.2, tx: 1.5, ty: ry + 0.5, tz: 0.8, fov: 50 }, 0.42);
  await shoot('07-roof-okafor-day.png',   { x: byWho.okafor.x - 1.9, y: ry + 1.55, z: byWho.okafor.z - 2.3, tx: byWho.okafor.x + 0.15, ty: ry + 0.65, tz: byWho.okafor.z - 0.3, fov: 44 }, 0.42);
  await shoot('08-roof-brandt-day.png',   { x: byWho.brandt.x - 2.2, y: ry + 1.65, z: byWho.brandt.z - 2.0, tx: byWho.brandt.x - 0.05, ty: ry + 0.70, tz: byWho.brandt.z + 0.1, fov: 44 }, 0.42);
  await shoot('09-roof-pike-day.png',     { x: byWho.pike.x - 2.2,   y: ry + 1.55, z: byWho.pike.z + 2.1,   tx: byWho.pike.x - 0.1,   ty: ry + 0.65, tz: byWho.pike.z + 0.1, fov: 44 }, 0.42);

  // --- PART 3: NIGHT COMBAT ALERT (M4 SHOULDERED AIM + BRANDT ORBITING M240B + MED-DROP!) ---
  const combatCheck = await page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    TT.stepHqLadder(-1, 3);
    TT.player.position.set(1.0, TT.sampleHeight(1.0, 12.0), 12.0);
    const hold = (x, z, type = 'shambler') => {
      const zb = TT.spawnZombie(x, z, type, true, true);
      zb.riseT = 0; zb.hp = zb.maxHp = 1e5; zb.speed = zb.baseSpeed = 0;
      return zb;
    };
    hold(-2.0, 15.0, 'spitter');    // North for Okafor
    hold(16.0, 2.5, 'brute');       // East for Brandt
    hold(13.0, -13.0, 'bomber');    // SE for Pike
    TT.survivorHelpDbg.setHp(25);   // < 35% HP near HQ -> triggers Okafor combat med-drop!
    TT.hqStartWave();
    for (let i = 0; i < 45; i++) {
      TT.roofDbg.tick(0.05);
      await wait(16);
    }
    return {
      alert: TT.roofDbg.alert(),
      crew: TT.roofDbg.crew(),
      medDrop: TT.roofDbg.medDrop()
    };
  })()`);
  console.log('COMBAT CHECK:', JSON.stringify(combatCheck));

  await shoot('10-roof-combat-okafor-night.png', { x: byWho.okafor.x + 2.0, y: ry + 1.65, z: byWho.okafor.z - 1.4, tx: byWho.okafor.x, ty: ry + 0.95, tz: byWho.okafor.z + 0.3, fov: 42 }, 0.92, 450);
  await shoot('11-roof-combat-brandt-night.png', { x: byWho.brandt.x - 1.7, y: ry + 1.65, z: byWho.brandt.z + 1.9, tx: byWho.brandt.x + 0.15, ty: ry + 0.85, tz: byWho.brandt.z, fov: 42 }, 0.92, 450);
  await shoot('12-roof-combat-pike-night.png',   { x: byWho.pike.x - 1.9,   y: ry + 1.65, z: byWho.pike.z + 1.6,   tx: byWho.pike.x + 0.1,   ty: ry + 0.95, tz: byWho.pike.z - 0.2, fov: 42 }, 0.92, 450);

  if (combatCheck.medDrop) {
    const md = combatCheck.medDrop;
    await shoot('13-okafor-meddrop.png', { x: md.x + 1.6, y: md.y + 1.15, z: md.z + 1.6, tx: md.x, ty: md.y + 0.12, tz: md.z, fov: 42 }, 0.92, 300);
  }

  // --- PART 4: DIALOGUE CARD UI + HEAL CHECK ---
  await hideUI(false);
  const uiCheck = await page.evaluate(`(() => {
    TT.setShotView(null);
    TT.clearZombies();
    TT.setDay(6);
    TT.startPrep();
    const L = TT.hqLadderAt();
    TT.player.position.set(L.x, L.y, L.z);
    for (let i = 0; i < 40 && !TT.onHqRoof(); i++) TT.stepHqLadder(1, 0.2);
    const ok = TT.roofDbg.crew().find((c) => c.who === 'okafor');
    TT.player.position.set(ok.x + 0.5, L.roof, ok.z - 0.8);
    TT.survivorHelpDbg.setHp(30);
    const healPrompt = TT.roofDbg.prompt();
    const healRes = TT.roofDbg.act();
    const hpAfterHeal = TT.getHp();
    const talkRes = TT.roofDbg.act();
    const card = document.getElementById('survivorTalkCard');
    return {
      healPrompt, healRes, hpAfterHeal, talkRes,
      cardHidden: card?.hidden,
      cardWho: card?.dataset?.who,
      cardRole: card?.dataset?.role,
      cardMood: card?.dataset?.mood,
      cardTitle: card?.querySelector('strong')?.textContent,
      cardLine: card?.querySelector('p')?.textContent
    };
  })()`);
  console.log('UI & DIALOGUE CHECK:', JSON.stringify(uiCheck));
  await page.evaluate('new Promise(r => setTimeout(r, 350))');
  await page.screenshot(path.join(OUT, '14-survivor-talk-ui.png'));

  console.log('PAGE ERRORS:', page.errors.length, page.errors.slice(0, 5));
  if (page.errors.length) process.exitCode = 1;
} finally {
  clearTimeout(hardTimer);
  await browser.close();
  await srv.close();
}
