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
  await page.evaluate(`(() => {
    TT.runDevCommand('godmode');
    TT.devJumpToNight(20, true);
    TT.clearZombies();
  })()`);
  await page.evaluate('new Promise(r => setTimeout(r, 3600))');

  // 1. Check bees & butterflies at Night 20
  const bugsNight = await page.evaluate(`new Promise((resolve) => {
    const bNodes = TT.scene.children.filter(c => c.userData && (c.userData.kind === 'butterfly' || c.userData.kind === 'bee'));
    const target = bNodes[0];
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
        walkWhenShownCount: bNodes.filter(c => c.userData && c.userData.walkWhenShown === true).length,
        byKind: {
          butterfly: { total: bNodes.filter(c => c.userData.kind === 'butterfly').length, visible: bNodes.filter(c => c.userData.kind === 'butterfly' && c.visible).length },
          bee: { total: bNodes.filter(c => c.userData.kind === 'bee').length, visible: bNodes.filter(c => c.userData.kind === 'bee' && c.visible).length }
        },
        sampleTargetPos: target ? target.position.toArray().map(n => Number(n.toFixed(2))) : null
      });
    }));
  })`);
  console.log('Bugs at night:', JSON.stringify(bugsNight));
  await page.screenshot(path.join(SHOTS_DIR, 'bugs-night.png'));

  // 2. Trigger real dawn via clearZombies() + startPrep() (3s skyTo sweep to SKY_MORNING_AT)
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

  const resPath = path.join(OUT_DIR, 'results.json');
  const prev = JSON.parse(fs.readFileSync(resPath, 'utf8'));
  prev.bugsNight = bugsNight;
  prev.bugsDawn = bugsDawn;
  fs.writeFileSync(resPath, JSON.stringify(prev, null, 2));
} finally {
  await browser.close();
  await server.close();
}
