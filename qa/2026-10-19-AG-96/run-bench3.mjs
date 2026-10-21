import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(ROOT, 'qa/2026-10-19-AG-96');
const PROF_JSONL = path.resolve(ROOT, 'qa/2026-10-19-AG-86/prof-lines.jsonl');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const libCode = fs.readFileSync(path.resolve(ROOT, 'tools/tests/lib.js'), 'utf8');

// 1. Retake 09..13 and 16 with exact station world positions and populated Armory weapon rack
const server = await serve(ROOT, 0);
async function retakeCloseups(suffix, queryExtra = '') {
  const browser = await launch({
    headless: false,
    args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720']
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer${queryExtra}`, { timeout: 120000 });
    await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
        return true;
      })()`);
      await sleep(300);
    }
    await page.waitFor('!!window.TT', { timeout: 120000 });
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await sleep(400);
    await page.evaluate(libCode);

    await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'AG96');
      T.clearZombies();
      T.setHp(100000);
      T.runDevCommand('godmode');
      T.grantAllWeapons();
      if (T.house?.tagWall?.userData?.tags) {
        for (const h of T.house.tagWall.userData.tags) h.visible = true;
      }
      // Place player within 24m of HQ_ARMORY_FRONT (off to the side so never in shot) and wait 600ms so updateArmoryRack populates the rack!
      T.player.position.set(16, T.sampleHeight(16, 16), 16);
      await new Promise(r => setTimeout(r, 650));
      T.setWorldTime(0.32);
    })()`, 120000);

    const closeups = [
      ['09-cif-closeup', 'hq-cif', 0, 1.9, 1.85, 3.2, 42],
      ['10-armory-closeup', 'hq-armory', 0.76, 2.25, 2.2, 3.8, 48],
      ['11-skull-intake-closeup', 'hq-skull-intake', 0, 2.0, 1.95, 3.4, 46],
      ['12-alarm-cabinet-closeup', 'hq-alarm-cabinet', 0, 1.8, 1.75, 2.6, 40],
      ['13-damaged-terminal-closeup', 'hq-damaged-terminal', 0, 0.05, 0.0, 2.2, 42]
    ];

    for (const [shotName, objName, lx, lyEye, lyLook, dist, fov] of closeups) {
      await page.evaluate(`(async () => {
        const T = window.TT;
        const THREE = T.THREE;
        T.setWorldTime(0.32);
        if (T.house?.damagedTerminal?.sparks) T.house.damagedTerminal.sparks.visible = false;
        const obj = T.house.group.getObjectByName('${objName}') || T.house.damagedTerminal?.group;
        obj.updateMatrixWorld(true);
        const wPos = new THREE.Vector3();
        obj.getWorldPosition(wPos);
        const q = obj.getWorldQuaternion(new THREE.Quaternion());
        const t = wPos.clone().add(new THREE.Vector3(${lx}, ${lyLook}, 0.25).applyQuaternion(q));
        const p = wPos.clone().add(new THREE.Vector3(${lx}, ${lyEye}, ${dist}).applyQuaternion(q));
        T.setShotView({ x: p.x, y: p.y, z: p.z, tx: t.x, ty: t.y, tz: t.z, fov: ${fov} });
        await new Promise(r => setTimeout(r, 200));
      })()`);
      await page.screenshot(path.join(OUT_DIR, `${shotName}-${suffix}.png`));
    }

    // Also retake 16-training-armory after waiting 650ms in Training Ground so mirrorTrainingRack has populated the Training rack
    await page.evaluate(`(async () => {
      const T = window.TT;
      T.setShotView(null);
      T.trainingDbg.enter();
      await new Promise(r => setTimeout(r, 650));
      const tg = T.trainingDbg.tg();
      T.player.position.set(tg.origin.x, tg.origin.y + 0.1, tg.origin.z + 10);
      const THREE = T.THREE;
      const cp = T.trainingDbg.state().copies.armory.copy;
      cp.updateMatrixWorld(true);
      const wPos = new THREE.Vector3();
      cp.getWorldPosition(wPos);
      const q = cp.getWorldQuaternion(new THREE.Quaternion());
      const t = wPos.clone().add(new THREE.Vector3(0.76, 2.2, 0.35).applyQuaternion(q));
      const p = wPos.clone().add(new THREE.Vector3(0.76, 2.25, 3.8).applyQuaternion(q));
      T.setShotView({ x: p.x, y: p.y, z: p.z, tx: t.x, ty: t.y, tz: t.z, fov: 48 });
      await new Promise(r => setTimeout(r, 200));
    })()`);
    await page.screenshot(path.join(OUT_DIR, `16-training-armory-${suffix}.png`));
  } finally {
    await browser.close();
  }
}

try {
  await retakeCloseups('before', '&fold=0');
  await retakeCloseups('after', '');
} finally {
  await server.close();
}

// 2. Run 3x Night 20 High bench --prof --cpu sequentially
fs.writeFileSync(path.join(OUT_DIR, 'bench3.jsonl'), '', 'utf8');
for (let i = 1; i <= 3; i++) {
  const out = execFileSync(
    process.execPath,
    [path.join(ROOT, 'tools/bench.mjs'), '--night', '20', '--gfx', 'high', '--prof', '--cpu'],
    { cwd: ROOT, encoding: 'utf8', env: process.env, maxBuffer: 50 * 1024 * 1024 }
  );
  const jsonLine = out.split(/\r?\n/).find((l) => l.trim().startsWith('{') && l.trim().endsWith('}'));
  if (!jsonLine) throw new Error(`Run ${i} produced no JSON line:\n${out}`);
  const clean = jsonLine.trim();
  fs.appendFileSync(path.join(OUT_DIR, 'bench3.jsonl'), clean + '\n', 'utf8');
  fs.appendFileSync(PROF_JSONL, clean + '\n', 'utf8');
  const parsed = JSON.parse(clean);
  const hqDraw = parsed.census?.draws?.byGroup?.find((g) => g && typeof g.k === 'string' && g.k.includes('tag-wall'));
  console.log(`Run ${i}: fps=${parsed.fps} low=${parsed.low} frameMs=${parsed.prof?.frameMs} draws=${parsed.draws} hqDraws=${JSON.stringify(hqDraw)}`);
}
