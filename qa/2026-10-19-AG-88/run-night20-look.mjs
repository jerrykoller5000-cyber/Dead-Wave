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

  // Check world MatrixWorld motion over 60 seconds and capture shots at 0s, 20s, 40s, 60s
  // plus 4 consecutive rAF frames to inspect sunShadowCadence (every 4th frame shadow map update)
  const probeStart = await page.evaluate(`(() => {
    const zs = (TT.zombies || []).filter(z => z.alive && z.mesh).slice(0, 8);
    return zs.map(z => ({
      type: z.type,
      pos: [z.mesh.position.x, z.mesh.position.y, z.mesh.position.z],
      mw: [z.mesh.matrixWorld.elements[12], z.mesh.matrixWorld.elements[13], z.mesh.matrixWorld.elements[14]]
    }));
  })()`);

  const shots = [];
  for (const sec of [0, 20, 40, 60]) {
    if (sec > 0) await new Promise(r => setTimeout(r, 20000));
    const p = path.join(SHOTS_DIR, `night20-t${sec}s.png`);
    await page.screenshot(p);
    shots.push({ label: `Night 20 High t=${sec}s`, file: p });
  }

  const probeEnd = await page.evaluate(`(() => {
    const zs = (TT.zombies || []).filter(z => z.alive && z.mesh).slice(0, 8);
    return zs.map(z => ({
      type: z.type,
      pos: [z.mesh.position.x, z.mesh.position.y, z.mesh.position.z],
      mw: [z.mesh.matrixWorld.elements[12], z.mesh.matrixWorld.elements[13], z.mesh.matrixWorld.elements[14]],
      posMatchesMw: Math.hypot(z.mesh.position.x - z.mesh.matrixWorld.elements[12], z.mesh.position.z - z.mesh.matrixWorld.elements[14]) < 0.01
    }));
  })()`);

  console.log('probeStart:', JSON.stringify(probeStart));
  console.log('probeEnd:', JSON.stringify(probeEnd));
} finally {
  await browser.close();
  await server.close();
}
