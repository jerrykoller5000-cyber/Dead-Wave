import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(ROOT, 'qa/2026-10-19-AG-91');
const SHOTS_DIR = path.resolve(OUT_DIR, 'shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
const url = `${server.origin}/index.html?debug=1`;

async function startMatch(page) {
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'Bench';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  const prep = await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  if (!prep) throw new Error('match never reached prep');
  const landed = await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  if (!landed) throw new Error('insertion never finished');
}

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
    zombies: up()
  };
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
  const ready = await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
  if (!ready) throw new Error('TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

  await page.evaluate(`TT.applyGraphicsPreset('high')`);
  await startMatch(page);
  const jumped = await page.evaluate(`(() => {
    TT.runDevCommand('godmode');
    const ok = !!TT.devJumpToNight(20, true);
    const st = TT.getWaveDirectorState();
    return { ok, phase: st.phase, day: st.day, pushes: st.pace ? st.pace.pushes : 0 };
  })()`);
  if (!jumped.ok || jumped.phase !== 'wave') {
    throw new Error('devJumpToNight refused night 20 (' + JSON.stringify(jumped) + ')');
  }
  let state = null;
  for (let i = 0; i < 40; i++) {
    state = await page.evaluate(ADVANCE, 180000);
    if (state.done) break;
  }
  console.log('Night 20 state:', JSON.stringify(state));

  // Ensure we also have a mix of close walkers/attackers in front AND zombies 14-22m behind the camera
  await page.evaluate('new Promise(r => setTimeout(r, 3500))');

  // 1. Check close dead walking and attacking in front of the player
  await page.evaluate(`(() => {
    const px = TT.player.position.x, py = TT.player.position.y, pz = TT.player.position.z;
    const zList = (TT.zombies || []).filter(z => z.alive && !z.dying);
    const wanted = ['feral', 'demon', 'brute', 'shambler', 'military', 'spitter', 'leaper', 'colossus'];
    const picked = [];
    for (const w of wanted) {
      const found = zList.find(z => z.typeKey === w && !picked.includes(z));
      if (found) picked.push(found);
    }
    while (picked.length < 8 && picked.length < zList.length) {
      const next = zList.find(z => !picked.includes(z));
      if (next) picked.push(next); else break;
    }
    const frontOffsets = [
      [-1.8, 3.2], [0.0, 2.4], [1.8, 3.4], [-2.6, 5.0],
      [-0.8, 4.6], [1.1, 4.8], [2.7, 5.4], [0.2, 6.5]
    ];
    for (let i = 0; i < picked.length; i++) {
      const z = picked[i];
      z.x = px + frontOffsets[i][0];
      z.z = pz + frontOffsets[i][1];
      if (z.mesh) {
        z.mesh.position.set(z.x, TT.sampleHeight(z.x, z.z), z.z);
        z.mesh.rotation.y = Math.atan2(px - z.x, pz - z.z);
      }
    }
    TT.setShotView({ x: px, y: py + 2.1, z: pz - 3.2, tx: px, ty: py + 1.0, tz: pz + 5.0, fov: 55 });
  })()`);

  await page.evaluate('new Promise(r => setTimeout(r, 250))');
  await page.screenshot(path.join(SHOTS_DIR, 'close-walk-attack-t0.png'));
  await page.evaluate('new Promise(r => setTimeout(r, 250))');
  await page.screenshot(path.join(SHOTS_DIR, 'close-walk-attack-t1.png'));
  await page.evaluate('new Promise(r => setTimeout(r, 250))');
  await page.screenshot(path.join(SHOTS_DIR, 'close-walk-attack-t2.png'));

  // Probe close zombie limb/foot/flame/feral-echo motion across 20 frames
  const closeProbe = await page.evaluate(`new Promise((resolve) => {
    const px = TT.player.position.x, pz = TT.player.position.z;
    const closeZ = (TT.zombies || []).filter(z => z.alive && !z.dying && Math.hypot(z.x - px, z.z - pz) < 12);
    const snap = (z) => {
      const rots = [];
      let flameState = null;
      if (z.mesh) {
        z.mesh.traverse(o => {
          if (o.name === 'demon-fire-fist' && flameState === null) flameState = o.rotation.y + o.scale.x + o.position.y;
          if (o !== z.mesh && rots.length < 16) {
            rots.push([o.rotation.x, o.rotation.y, o.rotation.z, o.position.y]);
          }
        });
      }
      return { id: z.id, type: z.typeKey, x: z.x, z: z.z, rots, flameState };
    };
    const s0 = closeZ.map(snap);
    let frames = 0;
    const step = () => {
      if (++frames < 20) { requestAnimationFrame(step); return; }
      const s1 = closeZ.map(snap);
      const diffs = s0.map((a, i) => {
        const b = s1[i];
        let maxLimbDelta = 0;
        for (let j = 0; j < a.rots.length; j++) {
          const r0 = a.rots[j], r1 = b.rots[j];
          if (!r0 || !r1) continue;
          const d = Math.hypot(r1[0] - r0[0], r1[1] - r0[1], r1[2] - r0[2], r1[3] - r0[3]);
          if (d > maxLimbDelta) maxLimbDelta = d;
        }
        return {
          type: a.type,
          movedXZ: Number(Math.hypot(b.x - a.x, b.z - a.z).toFixed(4)),
          maxLimbDeltaRad: Number(maxLimbDelta.toFixed(4)),
          flameDelta: a.flameState != null && b.flameState != null ? Number(Math.abs(b.flameState - a.flameState).toFixed(4)) : null
        };
      });
      resolve({ count: closeZ.length, diffs });
    };
    requestAnimationFrame(step);
  })`);
  console.log('Close zombies probe:', JSON.stringify(closeProbe));

  // 2. Check zombies >12m behind camera, then turn camera 180 deg to face them
  await page.evaluate(`(() => {
    const px = TT.player.position.x, py = TT.player.position.y, pz = TT.player.position.z;
    const alive = (TT.zombies || []).filter(z => z.alive && !z.dying);
    const behindOffsets = [[-3, -15], [-1.2, -16], [0.5, -15.5], [2.2, -16.5], [-2.0, -18], [1.5, -17.5]];
    for (let i = 0; i < Math.min(6, alive.length); i++) {
      const z = alive[i];
      z.x = px + behindOffsets[i][0];
      z.z = pz + behindOffsets[i][1];
      if (z.mesh) z.mesh.position.set(z.x, TT.sampleHeight(z.x, z.z), z.z);
    }
    TT.setShotView({ x: px, y: py + 2.1, z: pz - 1.5, tx: px, ty: py + 1.1, tz: pz + 12, fov: 55 });
  })()`);

  await page.evaluate('new Promise(r => setTimeout(r, 1500))');

  const behindTurnProbe = await page.evaluate(`new Promise((resolve) => {
    const px = TT.player.position.x, py = TT.player.position.y, pz = TT.player.position.z;
    const behindZ = (TT.zombies || []).filter(z => z.alive && !z.dying && z.z < pz - 8);
    const snap = (z) => {
      const rots = [];
      if (z.mesh) {
        z.mesh.traverse(o => {
          if (o !== z.mesh && rots.length < 16) {
            rots.push([o.name || o.type, Number(o.rotation.x.toFixed(4)), Number(o.rotation.y.toFixed(4)), Number(o.rotation.z.toFixed(4)), Number(o.position.y.toFixed(4))]);
          }
        });
      }
      return { id: z.id, type: z.typeKey, x: Number(z.x.toFixed(3)), z: Number(z.z.toFixed(3)), rots };
    };
    const beforeTurn = behindZ.map(snap);
    TT.setShotView({ x: px, y: py + 2.1, z: pz - 1.5, tx: px, ty: py + 1.1, tz: pz - 16, fov: 55 });
    requestAnimationFrame(() => {
      const frame1 = behindZ.map(snap);
      let f = 0;
      const waitMore = () => {
        if (++f < 15) { requestAnimationFrame(waitMore); return; }
        const frame15 = behindZ.map(snap);
        const summary = behindZ.map((z, idx) => {
          const b0 = beforeTurn[idx], b1 = frame1[idx], b15 = frame15[idx];
          let maxJumpF1 = 0, maxMoveF15 = 0;
          for (let j = 0; j < b0.rots.length; j++) {
            const r0 = b0.rots[j], r1 = b1[j] || b1.rots[j], r15 = b15[j] || b15.rots[j];
            if (!r0 || !r1 || !r15) continue;
            const d1 = Math.hypot(r1[1] - r0[1], r1[2] - r0[2], r1[3] - r0[3]);
            const d15 = Math.hypot(r15[1] - r1[1], r15[2] - r1[2], r15[3] - r1[3]);
            if (d1 > maxJumpF1) maxJumpF1 = d1;
            if (d15 > maxMoveF15) maxMoveF15 = d15;
          }
          return {
            type: z.typeKey,
            maxSingleFrameRotJumpRad: Number(maxJumpF1.toFixed(4)),
            subsequent15FrameRotMotionRad: Number(maxMoveF15.toFixed(4))
          };
        });
        resolve({ count: behindZ.length, summary });
      };
      requestAnimationFrame(waitMore);
    });
  })`);
  console.log('Behind-camera turn probe:', JSON.stringify(behindTurnProbe));

  await page.screenshot(path.join(SHOTS_DIR, 'turn-behind-frame0.png'));
  await page.evaluate('new Promise(r => setTimeout(r, 250))');
  await page.screenshot(path.join(SHOTS_DIR, 'turn-behind-frame15.png'));

  const feralEchoCheck = await page.evaluate(`(() => {
    const fm = TT.feralMotionDbg;
    const ferals = (TT.zombies || []).filter(z => z.alive && z.typeKey === 'feral');
    const echoes = [];
    TT.scene.traverse(o => {
      if (o.name && o.name.includes('echo')) echoes.push({ name: o.name, vis: o.visible, pos: o.position.toArray() });
    });
    return {
      hasFeralMotionDbg: !!fm,
      feralCount: ferals.length,
      echoObjects: echoes
    };
  })()`);
  console.log('Feral echo check:', JSON.stringify(feralEchoCheck));

  // 3. Check bees and butterflies at night vs dawn (identified by userData.kind === 'butterfly' | 'bee')
  const bugsNight = await page.evaluate(`(() => {
    const bNodes = TT.scene.children.filter(c => c.userData && (c.userData.kind === 'butterfly' || c.userData.kind === 'bee'));
    return {
      worldTime: Number(TT.getWorldTime().toFixed(4)),
      sunIntensity: Number(TT.sun.intensity.toFixed(4)),
      totalBugs: bNodes.length,
      visibleBugs: bNodes.filter(c => c.visible).length,
      walkWhenShownCount: bNodes.filter(c => c.userData && c.userData.walkWhenShown === true).length,
      byKind: {
        butterfly: { total: bNodes.filter(c => c.userData.kind === 'butterfly').length, visible: bNodes.filter(c => c.userData.kind === 'butterfly' && c.visible).length },
        bee: { total: bNodes.filter(c => c.userData.kind === 'bee').length, visible: bNodes.filter(c => c.userData.kind === 'bee' && c.visible).length }
      }
    };
  })()`);
  console.log('Bugs at night:', JSON.stringify(bugsNight));
  await page.screenshot(path.join(SHOTS_DIR, 'bugs-night.png'));

  // Transition to daytime/dawn via clearZombies() + startPrep() (3s skyTo sweep to SKY_MORNING_AT)
  await page.evaluate(`(() => {
    TT.clearZombies();
    TT.startPrep();
    return true;
  })()`);
  await page.evaluate('new Promise(r => setTimeout(r, 3600))');
  const bugsDawn = await page.evaluate(`new Promise((resolve) => {
    let f = 0;
    const bNodes = TT.scene.children.filter(c => c.userData && (c.userData.kind === 'butterfly' || c.userData.kind === 'bee'));
    let p0 = null;
    const step = () => {
      f++;
      if (f === 2) {
        p0 = bNodes.map(c => {
          let wRot = 0;
          c.traverse(o => { if (o !== c && o.rotation) wRot += Math.abs(o.rotation.z) + Math.abs(o.rotation.x); });
          return [c.position.x, c.position.y, c.position.z, wRot];
        });
      }
      if (f < 35) { requestAnimationFrame(step); return; }
      const movedCount = bNodes.filter((c, i) => {
        if (!p0) return false;
        let wRot = 0;
        c.traverse(o => { if (o !== c && o.rotation) wRot += Math.abs(o.rotation.z) + Math.abs(o.rotation.x); });
        return Math.hypot(c.position.x - p0[i][0], c.position.y - p0[i][1], c.position.z - p0[i][2]) > 1e-3 ||
               Math.abs(wRot - p0[i][3]) > 1e-3;
      }).length;
      const target = bNodes.find(c => c.visible && c.userData.kind === 'butterfly') || bNodes.find(c => c.visible) || bNodes[0];
      if (target) {
        const tx = target.position.x, ty = target.position.y, tz = target.position.z;
        TT.setShotView({ x: tx + 1.4, y: ty + 0.55, z: tz + 1.4, tx, ty, tz, fov: 45 });
      }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        resolve({
          worldTime: Number(TT.getWorldTime().toFixed(4)),
          sunIntensity: Number(TT.sun.intensity.toFixed(4)),
          totalBugs: bNodes.length,
          visibleBugs: bNodes.filter(c => c.visible).length,
          movedOrFlappedBugs: movedCount,
          byKind: {
            butterfly: { total: bNodes.filter(c => c.userData.kind === 'butterfly').length, visible: bNodes.filter(c => c.userData.kind === 'butterfly' && c.visible).length },
            bee: { total: bNodes.filter(c => c.userData.kind === 'bee').length, visible: bNodes.filter(c => c.userData.kind === 'bee' && c.visible).length }
          },
          sampleTargetPos: target ? target.position.toArray().map(n => Number(n.toFixed(2))) : null
        });
      }));
    };
    requestAnimationFrame(step);
  })`);
  console.log('Bugs at dawn:', JSON.stringify(bugsDawn));
  await page.screenshot(path.join(SHOTS_DIR, 'bugs-dawn.png'));

  fs.writeFileSync(
    path.join(OUT_DIR, 'results.json'),
    JSON.stringify({ state, closeProbe, behindTurnProbe, feralEchoCheck, bugsNight, bugsDawn }, null, 2)
  );
} finally {
  await browser.close();
  await server.close();
}
