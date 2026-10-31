import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine } from '../../tools/camera.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const QA_DIR = path.join(ROOT, 'qa', '2026-10-29-AG-159');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('Testing drowned drag side capture in match...');
  const engine = new Engine({ match: true, warm: 'none', size: [1280, 720] });
  const shots = [];
  try {
    await engine.open();
    console.log(`Match loaded in ${engine.loadSec.toFixed(1)}s, renderer: ${engine.renderer}`);

    const setup = await engine.ev(`
      T.runDevCommand('godmode');
      T.player.position.set(0, T.sampleHeight(0, 8), 8);
      const jumped = T.devJumpToNight(2, true);
      T.skipGrace();
      T.clearZombies();
      T.setWorldTime(0.5);
      const canvas = T.renderer.domElement, keep = new Set();
      for (let el = canvas; el && el !== document.body; el = el.parentElement) keep.add(el);
      for (const child of document.body.children) if (!keep.has(child)) child.style.setProperty('display', 'none', 'important');
      window.__drownedModule = await import('./game/drowned-behavior.js');
      Math.random = () => 0.1;
      const z = T.spawnZombie(0, 10, 'drowned', true, true);
      if (!z) return { jumped, spawned: false };
      z.mesh.rotation.y = Math.PI;
      z.attackCd = 0.05;
      window.__drownedProbe = z;
      T.setShotView({
        x: z.mesh.position.x + 5.2,
        y: z.mesh.position.y + 1.2,
        z: 9.0,
        tx: z.mesh.position.x,
        ty: z.mesh.position.y + 0.8,
        tz: z.mesh.position.z - 1,
        fov: 38
      });
      return { jumped, spawned: true };
    `);

    if (!setup.spawned) throw new Error('Spawn failed');

    const start = Date.now();
    let lastShot = -Infinity, lastPhase = '', seenDrag = false;
    while (Date.now() - start < 8000) {
      const state = await engine.ev(`
        const z = window.__drownedProbe, p = T.player.position, s = window.__drownedModule.drownedState(z);
        return {
          t: +(performance.now() / 1000).toFixed(3),
          phase: s?.phase ?? null,
          pulled: +(s?.pulled || 0).toFixed(3),
          victim: p.toArray(),
          zombie: z.mesh.position.toArray()
        };
      `);
      if (state.phase === 'drag') seenDrag = true;
      const elapsed = Date.now() - start;
      if (state.phase !== lastPhase || (state.phase === 'drag' && elapsed - lastShot > 320 && shots.length < 8)) {
        if (state.phase !== 'idle' || seenDrag) {
          await engine.ev(`
            const z = window.__drownedProbe, p = T.player.position;
            const midZ = (z.mesh.position.z + p.z) / 2;
            T.setShotView({
              x: z.mesh.position.x + 5.2,
              y: z.mesh.position.y + 1.2,
              z: midZ,
              tx: z.mesh.position.x,
              ty: z.mesh.position.y + 0.8,
              tz: midZ,
              fov: 38
            });
            return true;
          `);
          const file = path.join(QA_DIR, `drowned-side-${String(shots.length + 1).padStart(2, '0')}-${state.phase}.png`);
          await engine.page.screenshot(file);
          shots.push({ file, phase: state.phase });
          lastShot = Date.now() - start;
        }
        lastPhase = state.phase;
      }
      if (seenDrag && state.phase === 'idle') break;
      await sleep(28);
    }

    console.log(`Captured ${shots.length} drowned side shots!`);
  } finally {
    await engine.close();
  }
}

main().catch(err => {
  console.error('Test drowned failed:', err);
  process.exit(1);
});
