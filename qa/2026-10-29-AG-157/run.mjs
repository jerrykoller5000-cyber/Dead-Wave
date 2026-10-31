import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine } from '../../tools/camera.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const PIKE_DIR = path.join(ROOT, 'review', 'sweep', 'pike-hide-3');
const QA_DIR = path.join(ROOT, 'qa', '2026-10-29-AG-157');

fs.mkdirSync(PIKE_DIR, { recursive: true });
fs.mkdirSync(QA_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('=== AG-157: Re-shoot Pike behind tree on GPU (CL-263) ===');

  console.log('Starting Engine with GPU in match mode...');
  const matchEngine = new Engine({ match: true, warm: 'build:light', size: [1600, 900] });
  await matchEngine.open();
  console.log(`Match engine loaded in ${matchEngine.loadSec.toFixed(1)}s, Renderer: ${matchEngine.renderer}`);

  console.log('Setting story state: day 3, gate=true, story done missing, sync...');
  await matchEngine.ev(`
    T.clearZombies();
    T.survivorDbg.setChance(0);
    T.storyDbg.chain.reset();
    T.storyDbg.gate(true);
    T.setDay(3);
    T.runDevCommand('story done missing');
    T.storyDbg.sync();
    await wait(800);
  `);

  console.log('Inspecting campsite, campfire, Pike position, and cover objects...');
  const analysis = await matchEngine.page.evaluate(`(() => {
    const T = window.TT;
    const camp = T.POI.campsites.find((c) => c.style === 'hikers');
    const lm = T.landmarks.find((l) => l.kind === 'campsite' && l.campStyle === 'hikers');
    const fire = lm && lm.campfire ? lm.campfire : { x: camp.x, z: camp.z, y: T.sampleHeight(camp.x, camp.z) };
    const pike = T.historyProps.pikeHide;
    const pikeY = T.sampleHeight(pike.x, pike.z);

    const trees = [];
    if (Array.isArray(T.trees)) {
      for (const tr of T.trees) {
        const d = Math.hypot(tr.x - pike.x, tr.z - pike.z);
        if (d < 15) {
          trees.push({ x: tr.x, z: tr.z, alive: tr.alive, dist: d });
        }
      }
      trees.sort((a, b) => a.dist - b.dist);
    }

    const rocks = [];
    if (Array.isArray(T.rocks)) {
      for (const rk of T.rocks) {
        const d = Math.hypot(rk.x - pike.x, rk.z - pike.z);
        if (d < 15) {
          rocks.push({ x: rk.x, z: rk.z, alive: rk.alive, r: rk.radius || rk.r || rk.size, dist: d });
        }
      }
      rocks.sort((a, b) => a.dist - b.dist);
    }

    const distToFire = Math.hypot(pike.x - fire.x, pike.z - fire.z);
    const distToCamp = Math.hypot(pike.x - camp.x, pike.z - camp.z);

    // Calculate angle from camp to pike vs camp to fire
    const outCamp = Math.atan2(camp.z, camp.x);
    const angleToPike = Math.atan2(pike.z - camp.z, pike.x - camp.x);

    return {
      camp: { x: camp.x, z: camp.z },
      fire: { x: fire.x, y: fire.y, z: fire.z },
      pike: { x: pike.x, y: pikeY, z: pike.z },
      distToFire,
      distToCamp,
      outCamp,
      angleToPike,
      nearestTrees: trees.slice(0, 5),
      nearestRocks: rocks.slice(0, 5)
    };
  })()`);

  console.log('Analysis result:', JSON.stringify(analysis, null, 2));
  fs.writeFileSync(path.join(QA_DIR, 'analysis.json'), JSON.stringify(analysis, null, 2));

  const pikeShots = [
    {
      target: 'place:camp:hikers',
      view: 'three',
      time: 'day',
      dist: 34,
      caption: 'The hikers camp, Pike beyond it (CL-263)',
      out: path.join(PIKE_DIR, 'camp-three.png')
    },
    {
      target: 'place:camp:hikers',
      view: 'top',
      time: 'day',
      dist: 48,
      caption: 'From above: the camp and his hiding place',
      out: path.join(PIKE_DIR, 'camp-top.png')
    },
    {
      target: `xz:${analysis.pike.x},${analysis.pike.z}`,
      view: 'three',
      time: 'day',
      dist: 6,
      caption: `Pike hiding behind tree (dist 6m)`,
      out: path.join(PIKE_DIR, 'pike-close.png')
    },
    {
      cam: {
        x: analysis.fire.x,
        y: analysis.fire.y + 1.2,
        z: analysis.fire.z,
        tx: analysis.pike.x,
        ty: analysis.pike.y + 1.1,
        tz: analysis.pike.z,
        fov: 35
      },
      time: 'day',
      caption: 'From hikers camp fire toward Pike behind tree',
      out: path.join(PIKE_DIR, 'pike-from-fire.png')
    }
  ];

  const pikeThumbs = [];
  const pikeResults = [];
  for (const s of pikeShots) {
    console.log(`Shooting ${path.basename(s.out)}...`);
    let r = await matchEngine.shoot({ ...s, thumb: true });
    let stat = fs.statSync(s.out);
    if (stat.size < 20000) {
      await sleep(400);
      r = await matchEngine.shoot({ ...s, thumb: true });
      stat = fs.statSync(s.out);
    }
    console.log(`  -> ${path.basename(s.out)}: ${stat.size} bytes`);
    pikeThumbs.push({ data: r.thumb || null, label: s.caption || path.basename(s.out, '.png') });
    pikeResults.push(r);
  }

  console.log('Generating sheet.jpg in review/sweep/pike-hide-3/...');
  await matchEngine.sheet(pikeThumbs, { cols: 2, outDir: PIKE_DIR }, pikeResults);
  console.log('sheet.jpg generated.');

  await matchEngine.close();
  console.log('Match engine closed cleanly.');

  // Final file checks
  const requiredFiles = ['camp-three.png', 'camp-top.png', 'pike-close.png', 'pike-from-fire.png', 'sheet.jpg'];
  for (const f of requiredFiles) {
    const fp = path.join(PIKE_DIR, f);
    if (!fs.existsSync(fp)) throw new Error(`Missing expected file: ${fp}`);
    const sz = fs.statSync(fp).size;
    if (sz < 20000) throw new Error(`File ${f} is unexpectedly small: ${sz} bytes`);
    console.log(`Verified ${f}: ${sz} bytes`);
  }

  console.log('All Pike hide shots successfully generated and verified!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
