import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(ROOT, 'qa/2026-10-19-AG-92');
await fs.promises.mkdir(OUT_DIR, { recursive: true });
const tag = process.argv[2] || 'before';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720']
});

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  // Seed Math.random deterministically across before & after runs so every random prop dimension/rotation matches 1:1
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      let a = 0x5eed1234 >>> 0;
      Math.random = function() {
        let t = (a += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();`
  });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 120000 });
  await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => {
      if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
      else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
      return true;
    })()`);
    await sleep(300);
  }
  const ready = await page.waitFor('!!window.TT', { timeout: 120000 });
  if (!ready) throw new Error('window.TT never initialized');
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await sleep(500);

  await page.evaluate(`(async () => {
    const T = window.TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const nameEl = document.getElementById('playerName');
    if (nameEl) nameEl.value = 'AG92';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
    const firstRun = document.getElementById('firstRunCard');
    const playAnyway = document.getElementById('firstRunPlay');
    if (firstRun && !firstRun.hidden && playAnyway) playAnyway.click();
    for (let i = 0; i < 80; i++) {
      await wait(200);
      if (T.getPhase && T.getPhase() === 'prep') break;
    }
    await wait(300);
    for (let i = 0; i < 600; i++) {
      if (!document.body.classList.contains('deploying')) break;
      await wait(100);
    }
    await wait(300);
    T.clearZombies();
    T.setHp(100000);
    T.runDevCommand('godmode');
    T.setWorldTime(0.42);
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
    const perf = document.getElementById('perf');
    if (perf) perf.style.display = 'none';
  })()`, 120000);
  await sleep(400);

  // Measure live world prop node & mesh counts before staging close-ups
  const stats = await page.evaluate(`(() => {
    const countObj = (o) => {
      let nodes = 0, meshes = 0, auto = 0;
      if (!o) return { nodes, meshes, auto };
      o.traverse((c) => {
        nodes++;
        if (c.isMesh) meshes++;
        if (c.matrixAutoUpdate) auto++;
      });
      return { nodes, meshes, auto, name: o.name || '' };
    };
    const burrows = TT.getBurrows ? TT.getBurrows() : [];
    const burrowStats = burrows.map((b) => ({
      ...countObj(b.mesh),
      kind: b.mesh?.userData?.kind,
      mouthZ: b.mesh?.userData?.mouthZ
    }));
    const sato = TT.relayDbg && TT.relayDbg.note ? TT.relayDbg.note() : null;
    const satoStats = sato ? {
      note: countObj(sato.group),
      hat: countObj(sato.hat),
      stool: countObj(sato.stool),
      claws: countObj(sato.claws),
      trail: countObj(sato.trail)
    } : null;
    const sceneKids = TT.scene.children;
    const lilyNodes = [];
    const plotNodes = [];
    for (const k of sceneKids) {
      if (k.name === 'lily-pad' || (k.children && k.children.length === 12 && k.children[11]?.children?.length === 25)) {
        lilyNodes.push(countObj(k));
      }
      if (k.name === 'plot-marker' || (k.children && k.children.length === 8 && k.position.z > 60 && Math.abs(k.position.x - (TT.POI.graveyard?.x || 60)) < 10)) {
        plotNodes.push(countObj(k));
      }
    }
    return {
      burrows: burrowStats,
      lilyPads: lilyNodes,
      plotMarkers: plotNodes,
      sato: satoStats
    };
  })()`);

  // 1. Deterministic Lily Pad shot
  await page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const kids = TT.scene.children;
    const lp = kids.find((k) => k.name === 'lily-pad' || (k.children && k.children.length === 12 && k.children[11]?.children?.length === 25));
    if (lp) {
      const x = TT.LAKE.x + 18, z = TT.LAKE.z + 18;
      const wl = TT.waterLevelAt(x, z) ?? TT.LAKE.level;
      lp.position.set(x, wl + 0.015, z);
      lp.rotation.set(0, 0.85, 0);
      lp.scale.setScalar(1);
      lp.updateMatrix();
      lp.updateMatrixWorld(true);
      TT.player.position.set(x + 3, wl + 1, z + 3);
      TT.setShotView({
        x: x + 0.65,
        y: wl + 0.52,
        z: z + 0.75,
        tx: x - 0.05,
        ty: wl + 0.02,
        tz: z - 0.05,
        fov: 35
      });
    }
    await wait(300);
  })()`);
  await page.screenshot(path.join(OUT_DIR, `01-lilypad-${tag}.png`));

  // 2. Deterministic Burrow shot
  await page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const b = (TT.getBurrows ? TT.getBurrows() : [])[0];
    if (b && b.mesh) {
      const x = 14, z = -12, y = TT.sampleHeight(x, z);
      b.mesh.position.set(x, y, z);
      b.mesh.rotation.set(0, 0.4, 0);
      b.mesh.scale.setScalar(1.05);
      b.mesh.updateMatrix();
      b.mesh.updateMatrixWorld(true);
      TT.player.position.set(x + 3, y, z + 3);
      TT.setShotView({
        x: x + 0.48,
        y: y + 0.58,
        z: z + 1.05,
        tx: x,
        ty: y + 0.04,
        tz: z + 0.08,
        fov: 36
      });
    }
    await wait(300);
  })()`);
  await page.screenshot(path.join(OUT_DIR, `02-burrow-${tag}.png`));

  // 3. Plot Markers shot at POI.graveyard
  await page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const G = TT.POI.graveyard;
    const x = G.x - 2.0, z = G.z + 6.2, y = TT.sampleHeight(x, z);
    TT.player.position.set(x, y, z + 5);
    TT.setShotView({
      x: x - 1.8,
      y: y + 1.45,
      z: z + 3.2,
      tx: x + 1.5,
      ty: y + 0.1,
      tz: z - 0.2,
      fov: 42
    });
    await wait(300);
  })()`);
  await page.screenshot(path.join(OUT_DIR, `03-plot-markers-${tag}.png`));

  // 4. Sato Props (note, hat, stool, claws) staged at a deterministic spot
  await page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const S = TT.relayDbg && TT.relayDbg.note ? TT.relayDbg.note() : null;
    if (S) {
      const x = 18, z = -16, y = TT.sampleHeight(x, z);
      S.group.position.set(x, y, z);
      S.group.rotation.set(0, 0.5, 0);
      S.group.updateMatrix();
      S.group.updateMatrixWorld(true);

      S.hat.position.set(x + 0.42, TT.sampleHeight(x + 0.42, z + 0.12) + 0.012, z + 0.12);
      S.hat.rotation.set(Math.PI + 0.1, 1.2, 0.08);
      S.hat.updateMatrix();
      S.hat.updateMatrixWorld(true);

      S.stool.position.set(x - 0.38, TT.sampleHeight(x - 0.38, z - 0.1) + 0.17, z - 0.1);
      S.stool.rotation.set(0, -0.8, Math.PI / 2 - 0.25);
      S.stool.updateMatrix();
      S.stool.updateMatrixWorld(true);

      S.claws.visible = true;
      S.claws.position.set(x + 0.05, y + 0.38, z - 0.35);
      S.claws.rotation.set(0, 0.15, 0);
      S.claws.updateMatrix();
      S.claws.updateMatrixWorld(true);

      TT.player.position.set(x, y, z + 3);
      TT.setShotView({
        x: x + 0.15,
        y: y + 0.72,
        z: z + 1.18,
        tx: x + 0.02,
        ty: y + 0.16,
        tz: z - 0.08,
        fov: 42
      });
    }
    await wait(300);
  })()`);
  await page.screenshot(path.join(OUT_DIR, `04-sato-props-${tag}.png`));

  await fs.promises.writeFile(
    path.join(OUT_DIR, `stats-${tag}.json`),
    JSON.stringify(stats, null, 2),
    'utf8'
  );
  console.log(`shoot-props (${tag}) complete:`, JSON.stringify(stats));
} finally {
  await browser.close();
  await server.close();
}
