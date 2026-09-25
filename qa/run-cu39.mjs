// qa/run-cu39.mjs — CU-39 for Claude: the pit at noon (what are the black specks?), then
// one alarm, one last kill and both Night Complete buttons, on Jerry's GPU (visible window).
//
//   node qa/run-cu39.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS = path.join(ROOT, 'qa', 'shots', '2026-09-25-CU-39');
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[cu39]', ...a);
const shot = async (page, name) => { await page.screenshot(path.join(SHOTS, name + '.png')); log('shot', name); };
const alive = `TT.zombies.filter(z => z.alive)`;

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`, { waitUntil: 'none' });
  await page.waitFor('!!window.TT && window.DWOpening', { timeout: 240000 });
  await page.evaluate('DWOpening.dismissForTesting && DWOpening.dismissForTesting()');
  await page.waitFor('DWOpening.active === false', { timeout: 120000 });

  // ---- The pit at noon, closer than the named view --------------------------------------
  if (!process.argv.includes('--play-only')) {
  await page.evaluate(`(() => { document.body.classList.add('shot'); for (const id of ['modeSelect', 'hud']) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; } })()`);
  await page.evaluate('TT.setWorldTime(0.5)');
  const closes = [
    ['pit-close-oblique', `(() => { const L = TT.LAKE_HOLE; return { x: L.x + 6, y: -3.4 + 7, z: L.z + 6, tx: L.x, ty: -3.4 - 3, tz: L.z, fov: 45 }; })()`],
    ['pit-close-over', `(() => { const L = TT.LAKE_HOLE; return { x: L.x + 1.5, y: -3.4 + 9, z: L.z + 1.5, tx: L.x, ty: -3.4 - 4, tz: L.z, fov: 40 }; })()`]
  ];
  for (const [name, expr] of closes) {
    await page.evaluate(`(() => { const v = ${expr}; TT.setShotView(v); })()`);
    await sleep(2500);
    await shot(page, name);
  }
  // What is floating over the pit: every visible thing within 9 m of its centre, between the
  // funnel floor and 4 m above the water, grouped by what it is.
  const census = await page.evaluate(`(() => {
    const L = TT.LAKE_HOLE, v = new TT.THREE.Vector3(), out = new Map();
    TT.scene.traverse((o) => {
      if (!(o.isMesh || o.isPoints || o.isSprite || o.isInstancedMesh)) return;
      let vis = o.visible; for (let p = o.parent; p && vis; p = p.parent) vis = p.visible; if (!vis) return;
      const rows = [];
      if (o.isInstancedMesh) {
        const m = new TT.THREE.Matrix4();
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); v.setFromMatrixPosition(m).applyMatrix4(o.matrixWorld); rows.push(v.clone()); }
      } else { o.getWorldPosition(v); rows.push(v.clone()); }
      for (const p of rows) {
        if (Math.hypot(p.x - L.x, p.z - L.z) > 9 || p.y < -12 || p.y > 1) continue;
        const mat = [].concat(o.material)[0] || {};
        const key = (o.name || o.type) + ' < ' + ((o.parent && (o.parent.name || o.parent.type)) || '') + ' | ' + (mat.type || '') + ' #' + (mat.color ? mat.color.getHexString() : '?') + (mat.transparent ? ' transparent' : '') + (mat.emissive ? ' em#' + mat.emissive.getHexString() : '');
        const r = out.get(key) || { n: 0, ymin: 1e9, ymax: -1e9, geo: (o.geometry && o.geometry.type) || '', scale: +o.scale.x.toFixed(3) };
        r.n++; r.ymin = Math.min(r.ymin, +p.y.toFixed(2)); r.ymax = Math.max(r.ymax, +p.y.toFixed(2));
        out.set(key, r);
      }
    });
    return [...out].map(([k, r]) => ({ what: k, ...r })).sort((a, b) => b.n - a.n);
  })()`);
  log('things over the pit at noon (within 9 m, y -12 to 1):');
  for (const c of census) console.log('   ', c.n + 'x', c.what, '| geo', c.geo, 'scale', c.scale, '| y', c.ymin, 'to', c.ymax);
  const bubbles = await page.evaluate('TT.getPitBubbles ? TT.getPitBubbles() : null');
  log('pit bubbles:', JSON.stringify(bubbles));
  fs.writeFileSync(path.join(SHOTS, 'pit-census.json'), JSON.stringify({ census, bubbles }, null, 2));
  await page.evaluate(`(() => { TT.setShotView(null); document.body.classList.remove('shot'); for (const id of ['modeSelect', 'hud']) { const e = document.getElementById(id); if (e) e.style.visibility = ''; } })()`);
  }

  // ---- One alarm, one last kill, both Night Complete buttons ------------------------------
  await page.evaluate(`(() => { document.getElementById('playerName').value = 'Jerry'; document.getElementById('modeHunt').click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 30000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
  await page.evaluate(`TT.runDevCommand('godmode')`);
  const order = process.argv.includes('--next-first') ? [[1, 'next night']] : [[1, 'morning'], [2, 'next night']];
  for (const [night, button] of order) {
    await sleep(1500);
    await page.evaluate('TT.hqStartWave()');
    for (const t of [0.5, 2.5, 5]) { await sleep(t === 0.5 ? 500 : (t === 2.5 ? 2000 : 2500)); await shot(page, `n${night}-alarm-${t}s`); }
    // The alarm launches the wave about 5 s later; before that the only zombies are the day-1
    // camp guards, and killing one in prep is not a last kill.
    const waveOn = await page.waitFor(`TT.getPhase() === 'wave'`, { timeout: 60000 });
    log(`night ${night}: wave phase reached:`, waveOn);
    await page.waitFor(`${alive}.length > 0`, { timeout: 120000 });
    // As t61 does it: drain the plan, clear the field (day-1 ground risers come from their own
    // queue), and leave one zombie 5 m from the marine, so the next kill really is the last.
    await page.evaluate(`(() => { TT.drainWavePlanDbg(); TT.clearZombies(); const p = TT.player.position; TT.spawnZombie(p.x + 5, p.z + 5, 'shambler', true, true); })()`);
    await sleep(1500);
    const t0 = Date.now();
    await page.evaluate(`(() => { const z = ${alive}[0]; if (z) TT.killZombie(z, true, { kind: 'generic', dir: { x: 1, z: 0 } }); })()`);
    log(`night ${night}: finisher running right after the kill:`, await page.evaluate('!!TT.getWaveFinisher()'), 'phase', await page.evaluate('TT.getPhase()'));
    for (const t of [0.5, 1.5, 2.6]) { await sleep(Math.max(0, t * 1000 - (Date.now() - t0))); await shot(page, `n${night}-finisher-${t}s`); }
    const finEnd = await page.waitFor('!TT.getWaveFinisher()', { timeout: 20000 });
    log(`night ${night}: finisher ended after`, ((Date.now() - t0) / 1000).toFixed(1) + ' s', finEnd);
    const cardOpen = await page.waitFor(`!!(document.getElementById('dawnCard') || {}).open`, { timeout: 30000 });
    log(`night ${night}: Night Complete card open:`, cardOpen, 'at', ((Date.now() - t0) / 1000).toFixed(1) + ' s after the last kill');
    await sleep(800);
    await shot(page, `n${night}-night-complete-card`);
    const card = await page.evaluate(`(() => { const d = document.getElementById('dawnCard'); return d ? { text: d.innerText.replace(/\\s+/g, ' ').slice(0, 300), buttons: [...d.querySelectorAll('button')].map(b => b.textContent) } : null; })()`);
    log(`night ${night}: card`, JSON.stringify(card));
    const clicked = await page.evaluate(`(() => { const d = document.getElementById('dawnCard'); const bs = [...d.querySelectorAll('button')]; const b = ${button === 'morning' ? "bs.find(x => x.classList.contains('primary'))" : "bs.find(x => !x.classList.contains('primary'))"}; if (!b) return null; b.click(); return b.textContent; })()`);
    log(`night ${night}: clicked`, JSON.stringify(clicked));
    if (button === 'next night') {
      const nextWave = await page.waitFor(`TT.getPhase() === 'wave'`, { timeout: 20000 });
      log(`night ${night}: Next Night started the next wave:`, nextWave, 'day', await page.evaluate('TT.getDay()'));
    }
    await sleep(2500);
    await shot(page, `n${night}-after-${button.replace(' ', '-')}`);
    log(`night ${night}: after click phase`, await page.evaluate('TT.getPhase()'), 'day', await page.evaluate('TT.getDay()'), 'card open', await page.evaluate(`!!(document.getElementById('dawnCard') || {}).open`), 'briefing open', await page.evaluate(`!!document.querySelector('#hqBriefing.show, #hqBriefing[open], .hq-briefing.show')`));
    if (button === 'morning') {
      // Morning opens the next briefing; close it so the second night can start.
      await page.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }))`);
      await sleep(800);
    }
  }
  log('page errors:', page.errors.length);
  for (const e of page.errors.slice(0, 5)) console.log('   ERR', e.split('\n')[0]);
} catch (e) {
  log('FAILED', e.message);
} finally {
  await browser.close();
  await server.close();
}
