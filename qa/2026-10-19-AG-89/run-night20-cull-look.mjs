import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)));
const SHOTS_DIR = path.join(OUT_DIR, 'shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
const url = `${server.origin}/index.html?debug=1`;

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
  return { done: onLast && out, zombies: up() };
})()`;

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
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
  await page.evaluate(`TT.applyGraphicsPreset('high')`);
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'Bench';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  await page.evaluate(`(() => {
    TT.runDevCommand('godmode');
    TT.devJumpToNight(20, true);
  })()`);
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(ADVANCE, 180000);
    if (st && st.done) break;
  }
  await page.evaluate('new Promise(r => setTimeout(r, 3000))');

  // 1. Slow full 360 circle (8 steps of 45 deg), checking that newly unculled objects immediately have fresh matrixWorld on the very frame they become visible
  const slowTurnProbe = [];
  for (let i = 0; i < 8; i++) {
    const yawDeg = i * 45;
    const info = await page.evaluate(`(async () => {
      const rad = (${yawDeg} * Math.PI) / 180;
      if (typeof TT.setCamYaw === 'function') TT.setCamYaw(rad);
      else if (TT.player) TT.player.rotation.y = rad;
      // step 8 frames slowly
      for (let f = 0; f < 8; f++) {
        await new Promise(r => requestAnimationFrame(r));
      }
      // Check if any visible top-level object has stale matrixWorld vs position
      const scene = TT.scene;
      let staleCount = 0;
      let visibleTops = 0;
      for (const ch of scene.children) {
        if (!ch.visible) continue;
        visibleTops++;
        const dx = Math.abs(ch.position.x - ch.matrixWorld.elements[12]);
        const dy = Math.abs(ch.position.y - ch.matrixWorld.elements[13]);
        const dz = Math.abs(ch.position.z - ch.matrixWorld.elements[14]);
        if (dx > 0.01 || dy > 0.01 || dz > 0.01) staleCount++;
      }
      return { yawDeg: ${yawDeg}, visibleTops, staleCount };
    })()`);
    slowTurnProbe.push(info);
    if (i % 2 === 0) {
      await page.screenshot(path.join(SHOTS_DIR, `slow-turn-${yawDeg}deg.png`));
    }
  }

  // 2. Fast full 360 whip-turn (90 deg per single frame), checking immediate frame after turn
  const fastTurnProbe = [];
  for (let i = 0; i < 4; i++) {
    const yawDeg = i * 90;
    const info = await page.evaluate(`(async () => {
      const rad = (${yawDeg} * Math.PI) / 180;
      if (typeof TT.setCamYaw === 'function') TT.setCamYaw(rad);
      if (TT.player) TT.player.rotation.y = rad;
      await new Promise(r => requestAnimationFrame(r));
      const scene = TT.scene;
      let staleCount = 0;
      let visibleTops = 0;
      for (const ch of scene.children) {
        if (!ch.visible) continue;
        visibleTops++;
        const dx = Math.abs(ch.position.x - ch.matrixWorld.elements[12]);
        const dy = Math.abs(ch.position.y - ch.matrixWorld.elements[13]);
        const dz = Math.abs(ch.position.z - ch.matrixWorld.elements[14]);
        if (dx > 0.01 || dy > 0.01 || dz > 0.01) staleCount++;
      }
      return { yawDeg: ${yawDeg}, visibleTops, staleCount };
    })()`);
    fastTurnProbe.push(info);
    await page.screenshot(path.join(SHOTS_DIR, `fast-turn-${yawDeg}deg.png`));
  }

  // 3. Walk backwards past houses and props for 8 seconds (holding S)
  await page.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', bubbles: true }))`);
  const walkBackProbe = [];
  for (let s = 1; s <= 4; s++) {
    await new Promise(r => setTimeout(r, 2000));
    const info = await page.evaluate(`(() => {
      const p = TT.player.position;
      let staleCount = 0;
      let visibleTops = 0;
      for (const ch of TT.scene.children) {
        if (!ch.visible) continue;
        visibleTops++;
        const dx = Math.abs(ch.position.x - ch.matrixWorld.elements[12]);
        const dy = Math.abs(ch.position.y - ch.matrixWorld.elements[13]);
        const dz = Math.abs(ch.position.z - ch.matrixWorld.elements[14]);
        if (dx > 0.01 || dy > 0.01 || dz > 0.01) staleCount++;
      }
      return { step: ${s}, playerPos: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)], visibleTops, staleCount };
    })()`);
    walkBackProbe.push(info);
    await page.screenshot(path.join(SHOTS_DIR, `walk-back-step${s}.png`));
  }
  await page.evaluate(`window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS', key: 's', bubbles: true }))`);

  const summary = { slowTurnProbe, fastTurnProbe, walkBackProbe };
  fs.writeFileSync(path.join(OUT_DIR, 'look-summary.json'), JSON.stringify(summary, null, 2));
  console.log('LOOK_SUMMARY:', JSON.stringify(summary));
} finally {
  await browser.close();
  await server.close();
}
