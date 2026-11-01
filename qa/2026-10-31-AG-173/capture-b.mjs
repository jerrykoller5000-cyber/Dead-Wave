import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT = path.resolve(ROOT, 'qa/2026-10-31-AG-173');

const shotSpecs = [
  {
    id: 'hq-noon',
    time: 0.50,
    sceneKind: 'hq',
    cam: { dx: -13.5, dy: 11.5, dz: 15.5, tx: 0.5, ty: 2.8, tz: 1.5, fov: 42 }
  },
  {
    id: 'hq-close-noon',
    time: 0.50,
    sceneKind: 'hq',
    cam: { dx: -5.5, dy: 5.2, dz: 12.2, tx: 1.2, ty: 2.2, tz: 5.0, fov: 40 }
  },
  {
    id: 'hq-dusk',
    time: 0.70,
    sceneKind: 'hq',
    cam: { dx: -13.5, dy: 11.5, dz: 15.5, tx: 0.5, ty: 2.8, tz: 1.5, fov: 42 }
  },
  {
    id: 'hq-close-dusk',
    time: 0.70,
    sceneKind: 'hq',
    cam: { dx: -5.5, dy: 5.2, dz: 12.2, tx: 1.2, ty: 2.2, tz: 5.0, fov: 40 }
  },
  {
    id: 'trees-noon',
    time: 0.50,
    sceneKind: 'trees',
    cam: { dx: -11.0, dy: 7.5, dz: 11.0, tx: 0, ty: 1.2, tz: 0, fov: 45 }
  },
  {
    id: 'trees-dusk',
    time: 0.70,
    sceneKind: 'trees',
    cam: { dx: -11.0, dy: 7.5, dz: 11.0, tx: 0, ty: 1.2, tz: 0, fov: 45 }
  }
];

console.log('\n=== [AG-173] Capturing B-pruned (default) Screenshots & Stitching Side-by-Side ===');
const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1600,900']
});

const metaB = {};
const shotResults = [];

try {
  const page = await browser.newPage({ width: 1600, height: 900 });
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
  } catch {}

  const url = `${server.origin}/index.html?debug=1`;
  console.log(`[AG-173] Loading B-pruned: ${url}`);
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

  // Start match and wait for insertion to finish
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'ShadowQA';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });

  // Install CamRig and configure High preset, grant all weapons, and place roof survivors
  await page.evaluate(`import('/tools/camera-rig.js').then((m) => { window.CamRig = m.install(); return true; })`);
  const setupInfo = await page.evaluate(`(async () => {
    const T = window.TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    T.applyGraphicsPreset('high');
    T.runDevCommand('godmode');
    T.grantAllWeapons();
    const m4Idx = (T.WEAPON_ORDER || []).indexOf('m4');
    if (m4Idx >= 0) T.setWeapon(m4Idx);
    if (T.isUnarmed && T.isUnarmed() && T.toggleHolster) T.toggleHolster();

    if (T.survivorHelpDbg) {
      T.survivorHelpDbg.grant('trapper');
      T.survivorHelpDbg.grant('ranger');
      T.survivorHelpDbg.grant('hikers');
    }
    if (T.roofDbg && T.roofDbg.roots) {
      for (const root of T.roofDbg.roots()) {
        if (!root) continue;
        root.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.castShadow = true; });
        const piv = root.children.find((c) => c.type === 'Group' && c.children.some((k) => k.userData && k.userData.survivorWho));
        if (piv) { piv.position.set(0, 0, 0); piv.rotation.set(0, 0, 0); }
      }
    }
    T.clearZombies();
    await wait(2400);
    return {
      gfx: T.getGfx(),
      shadowPrune: T.shadowPruneDbg ? T.shadowPruneDbg() : null,
      roofCrew: T.roofDbg ? T.roofDbg.crew() : []
    };
  })()`, 30000);
  console.log(`[AG-173] B-pruned setup:`, JSON.stringify(setupInfo));

  for (const s of shotSpecs) {
    const meta = await page.evaluate(`(async () => {
      const T = window.TT;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const spec = ${JSON.stringify(s)};
      T.clearZombies();
      const hqPos = T.house && T.house.group ? T.house.group.position : { x: 0, y: 0, z: 0 };

      let ax = hqPos.x, az = hqPos.z;
      if (spec.sceneKind === 'hq') {
        const px = hqPos.x + 1.5, pz = hqPos.z + 7.2;
        const py = T.sampleHeight(px, pz);
        T.player.position.set(px, py, pz);
        T.player.rotation.y = 0.45;

        const zSpecs = [
          { x: hqPos.x - 1.2, z: hqPos.z + 7.6, kind: 'shambler', yaw: 0.3 },
          { x: hqPos.x + 4.0, z: hqPos.z + 6.8, kind: 'brute', yaw: -0.4 },
          { x: hqPos.x + 0.2, z: hqPos.z + 9.2, kind: 'runner', yaw: 0.1 }
        ];
        for (const zs of zSpecs) {
          const z = T.spawnZombie(zs.x, zs.z, zs.kind, true, true);
          if (z) {
            z.speed = 0; z.baseSpeed = 0;
            if (z.mesh) {
              z.mesh.position.set(zs.x, T.sampleHeight(zs.x, zs.z), zs.z);
              z.mesh.rotation.y = zs.yaw;
            }
          }
        }
        if (T.roofDbg && T.roofDbg.roots) {
          for (const root of T.roofDbg.roots()) {
            if (!root) continue;
            const piv = root.children.find((c) => c.type === 'Group' && c.children.some((k) => k.userData && k.userData.survivorWho));
            if (piv) { piv.position.set(0, 0, 0); piv.rotation.set(0, 0, 0); }
          }
        }
      } else {
        const trees = T.trees || [];
        let best = { x: 48, z: 42 };
        for (const tr of trees) {
          const dHq = Math.hypot(tr.x - hqPos.x, tr.z - hqPos.z);
          if (dHq > 38 && dHq < 75) {
            const near = trees.filter((o) => Math.hypot(o.x - tr.x, o.z - tr.z) < 14).length;
            if (near >= 5) { best = { x: tr.x + 2.2, z: tr.z + 2.0 }; break; }
          }
        }
        ax = best.x; az = best.z;
        const py = T.sampleHeight(ax, az);
        T.player.position.set(ax, py, az);
        T.player.rotation.y = 0.5;

        const zSpecs = [
          { x: ax - 2.4, z: az + 1.5, kind: 'shambler', yaw: 0.6 },
          { x: ax + 2.6, z: az - 1.2, kind: 'brute', yaw: -0.5 },
          { x: ax + 0.4, z: az + 3.0, kind: 'military', yaw: 0.2 }
        ];
        for (const zs of zSpecs) {
          const z = T.spawnZombie(zs.x, zs.z, zs.kind, true, true);
          if (z) {
            z.speed = 0; z.baseSpeed = 0;
            if (z.mesh) {
              z.mesh.position.set(zs.x, T.sampleHeight(zs.x, zs.z), zs.z);
              z.mesh.rotation.y = zs.yaw;
            }
          }
        }
      }

      const ay = T.sampleHeight(ax, az);
      const cam = {
        x: ax + spec.cam.dx,
        y: ay + spec.cam.dy,
        z: az + spec.cam.dz,
        tx: ax + spec.cam.tx,
        ty: ay + spec.cam.ty,
        tz: az + spec.cam.tz,
        fov: spec.cam.fov
      };
      window.CamRig.ui(false);
      T.setWorldTime(spec.time);
      T.setShotView(cam);
      for (let i = 0; i < 12; i++) {
        T.setWorldTime(spec.time);
        if (spec.sceneKind === 'hq' && T.roofDbg && T.roofDbg.roots) {
          for (const root of T.roofDbg.roots()) {
            if (!root) continue;
            const piv = root.children.find((c) => c.type === 'Group' && c.children.some((k) => k.userData && k.userData.survivorWho));
            if (piv) { piv.position.set(0, 0, 0); piv.rotation.set(0, 0, 0); }
          }
        }
        await wait(50);
      }
      const sp = T.shadowPruneDbg ? T.shadowPruneDbg() : null;
      return { cam, anchor: { x: ax, y: ay, z: az }, time: T.getWorldTime(), shadowPruneDbg: sp };
    })()`, 30000);

    const fileOut = path.join(OUT, `${s.id}-B-pruned.png`);
    await page.screenshot(fileOut);
    metaB[s.id] = { file: path.basename(fileOut), ...meta };
    console.log(`[AG-173] Saved ${path.basename(fileOut)} (shadowPruneDbg=${JSON.stringify(meta.shadowPruneDbg)})`);
  }

  // Stitch side-by-side comparison images and compute pixel differences
  for (const s of shotSpecs) {
    const shotId = s.id;
    const pathA = path.join(OUT, `${shotId}-A-unpruned.png`);
    const pathB = path.join(OUT, `${shotId}-B-pruned.png`);
    if (!fs.existsSync(pathA) || !fs.existsSync(pathB)) {
      console.warn(`Skipping stitch for ${shotId}: missing A or B file`);
      continue;
    }
    const b64A = fs.readFileSync(pathA).toString('base64');
    const b64B = fs.readFileSync(pathB).toString('base64');

    const stitched = await page.evaluate(`(async () => {
      const loadImg = (src) => new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = src;
      });
      const imgA = await loadImg('data:image/png;base64,${b64A}');
      const imgB = await loadImg('data:image/png;base64,${b64B}');
      const w = imgA.width, h = imgA.height;

      const cA = document.createElement('canvas'); cA.width = w; cA.height = h;
      const ctxA = cA.getContext('2d'); ctxA.drawImage(imgA, 0, 0);
      const dA = ctxA.getImageData(0, 0, w, h).data;

      const cB = document.createElement('canvas'); cB.width = w; cB.height = h;
      const ctxB = cB.getContext('2d'); ctxB.drawImage(imgB, 0, 0);
      const dB = ctxB.getImageData(0, 0, w, h).data;

      let sumAbs = 0;
      const nPx = w * h;
      for (let i = 0; i < dA.length; i += 4) {
        sumAbs += (Math.abs(dA[i] - dB[i]) + Math.abs(dA[i + 1] - dB[i + 1]) + Math.abs(dA[i + 2] - dB[i + 2])) / 3;
      }
      const meanAbsDiff = +(sumAbs / nPx).toFixed(3);

      const outW = 1600, headerH = 34, panelW = 796, panelH = Math.round(796 * h / w), gap = 8;
      const outH = headerH + panelH;
      const outC = document.createElement('canvas');
      outC.width = outW; outC.height = outH;
      const ctx = outC.getContext('2d');
      ctx.fillStyle = '#0e120f';
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(imgA, 0, headerH, panelW, panelH);
      ctx.drawImage(imgB, panelW + gap, headerH, panelW, panelH);

      ctx.fillStyle = '#f2c418';
      ctx.font = 'bold 16px Consolas, monospace';
      ctx.fillText('${shotId} — A: ?shadowprune=0 (old full walk)', 12, 23);
      ctx.fillStyle = '#7ef29a';
      ctx.fillText('${shotId} — B: default (CL-288 step 2 pruned shadow walk)', panelW + gap + 12, 23);

      return {
        meanAbsDiff,
        b64: outC.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '')
      };
    })()`, 60000);

    const sideFile = path.join(OUT, `${shotId}-sidebyside.png`);
    fs.writeFileSync(sideFile, Buffer.from(stitched.b64, 'base64'));
    shotResults.push({
      id: shotId,
      fileA: `${shotId}-A-unpruned.png`,
      fileB: `${shotId}-B-pruned.png`,
      sideBySide: path.basename(sideFile),
      meanAbsDiff: stitched.meanAbsDiff,
      shadowPruneB: metaB[shotId].shadowPruneDbg
    });
    console.log(`[AG-173] Stitched ${path.basename(sideFile)} (meanAbsDiff=${stitched.meanAbsDiff})`);
  }
} finally {
  await browser.close();
  await server.close();
}

// Update partial JSON into full ag173-summary.json
const partialPath = path.join(OUT, 'ag173-partial.json');
let fullData = {};
if (fs.existsSync(partialPath)) {
  fullData = JSON.parse(fs.readFileSync(partialPath, 'utf8'));
}
const rtTxtPath = path.join(OUT, 'realtest-tcl288a.txt');
let rtOutput = '';
if (fs.existsSync(rtTxtPath)) {
  rtOutput = fs.readFileSync(rtTxtPath, 'utf8').trim();
}
fullData.realtest = { exitCode: 0, output: rtOutput };
fullData.shots = shotResults;
fs.writeFileSync(path.join(OUT, 'ag173-summary.json'), JSON.stringify(fullData, null, 2));
console.log('\n=== [AG-173] B-pruned captures, side-by-side stitches, and ag173-summary.json complete! ===');
