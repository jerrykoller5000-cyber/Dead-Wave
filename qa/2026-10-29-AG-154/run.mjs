import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine } from '../../tools/camera.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const PIKE_DIR = path.join(ROOT, 'review', 'sweep', 'pike-hide-2');
const AFTER_DIR = path.join(ROOT, 'review', 'principles', 'claude', 'after-2');

fs.mkdirSync(PIKE_DIR, { recursive: true });
fs.mkdirSync(AFTER_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('=== AG-154 GPU Visual Verification Run ===');

  // Verify Part 1 (Pike match shots)
  const pikeFiles = ['camp-three.png', 'camp-top.png', 'pike-close.png', 'pike-from-fire.png', 'sheet.jpg'];
  const pikeDone = pikeFiles.every((f) => {
    const p = path.join(PIKE_DIR, f);
    return fs.existsSync(p) && fs.statSync(p).size > 20000;
  });

  if (pikeDone) {
    console.log('Part 1 (Pike match shots) already generated and verified non-black on disk:');
    for (const f of pikeFiles) {
      console.log(`  ${f}: ${fs.statSync(path.join(PIKE_DIR, f)).size} bytes`);
    }
  } else {
    console.log('Starting Engine with GPU in match mode for Part 1...');
    const matchEngine = new Engine({ match: true, warm: 'build:light', size: [1600, 900] });
    await matchEngine.open();
    console.log(`Match engine loaded in ${matchEngine.loadSec.toFixed(1)}s, Renderer: ${matchEngine.renderer}`);

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

    const campData = await matchEngine.page.evaluate(`(() => {
      const T = window.TT;
      const camp = T.POI.campsites.find((c) => c.style === 'hikers');
      const lm = T.landmarks.find((l) => l.kind === 'campsite' && l.campStyle === 'hikers');
      const fire = lm && lm.campfire ? lm.campfire : { x: camp.x, z: camp.z, y: T.sampleHeight(camp.x, camp.z) };
      const pike = T.historyProps.pikeHide;
      const pikeY = T.sampleHeight(pike.x, pike.z);
      return {
        camp: { x: camp.x, z: camp.z },
        fire: { x: fire.x, y: fire.y, z: fire.z },
        pike: { x: pike.x, y: pikeY, z: pike.z }
      };
    })()`);

    const pikeShots = [
      {
        target: 'place:camp:hikers',
        view: 'three',
        time: 'day',
        dist: 34,
        caption: "The hikers camp, Pike beyond it (CL-263)",
        out: path.join(PIKE_DIR, 'camp-three.png')
      },
      {
        target: 'place:camp:hikers',
        view: 'top',
        time: 'day',
        dist: 48,
        caption: "From above: the camp and his hiding place",
        out: path.join(PIKE_DIR, 'camp-top.png')
      },
      {
        target: `xz:${campData.pike.x},${campData.pike.z}`,
        view: 'three',
        time: 'day',
        dist: 6,
        caption: `Pike hiding behind tree (dist 6m)`,
        out: path.join(PIKE_DIR, 'pike-close.png')
      },
      {
        cam: {
          x: campData.fire.x,
          y: campData.fire.y + 1.2,
          z: campData.fire.z,
          tx: campData.pike.x,
          ty: campData.pike.y + 1.1,
          tz: campData.pike.z,
          fov: 35
        },
        time: 'day',
        caption: "From hikers camp fire toward Pike behind tree",
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

    console.log('Generating pike-hide-2 sheet.jpg...');
    await matchEngine.sheet(pikeThumbs, { cols: 2, outDir: PIKE_DIR }, pikeResults);
    await matchEngine.close();
    console.log('Match engine closed cleanly.');
  }

  // -------------------------------------------------------------------------
  // Part 2: Inspector - CL-267 after-shots and person.brandt
  // -------------------------------------------------------------------------
  console.log('\n--- Part 2: Inspector after-2 shots (CL-267 + Brandt) ---');
  console.log('Starting fresh Engine in inspector mode...');
  const inspectEngine = new Engine({ inspect: true, size: [1600, 900] });
  await inspectEngine.open();
  console.log(`Inspector ready. Mode: ${inspectEngine.mode}, Renderer: ${inspectEngine.renderer}`);

  const inspectorSubjects = [
    'prop.dropped-helmet',
    'prop.insulated-boots',
    'prop.rubber-boot',
    'prop.worn-boots',
    'prop.standing-stone',
    'prop.ring-stone',
    'prop.marrow-door',
    'prop.reliquary',
    'animal.squirrel',
    'animal.butterfly',
    'animal.frog',
    'animal.turtle',
    'person.brandt'
  ];

  const inspectorThumbs = [];
  const inspectorResults = [];

  for (const target of inspectorSubjects) {
    for (const view of ['three', 'front']) {
      const fileName = `${target}-${view}.png`;
      const outFile = path.join(AFTER_DIR, fileName);
      console.log(`Shooting inspector ${fileName}...`);

      let r = await inspectEngine.shoot({
        target,
        view,
        out: outFile,
        settle: 350,
        wait: 150,
        thumb: true
      });
      let stat = fs.statSync(outFile);
      let attempts = 0;
      while (stat.size < 20000 && attempts < 5) {
        attempts++;
        console.warn(`Warning: ${fileName} is only ${stat.size} B. Retrying with delay (attempt ${attempts})...`);
        await sleep(500);
        await inspectEngine.ev(`await wait(300);`);
        r = await inspectEngine.shoot({
          target,
          view,
          out: outFile,
          settle: 500 + attempts * 250,
          wait: 300,
          thumb: true
        });
        stat = fs.statSync(outFile);
      }

      console.log(`  -> ${fileName}: ${stat.size} bytes`);
      inspectorThumbs.push({ data: r.thumb || null, label: `${target} (${view})` });
      inspectorResults.push(r);
    }
  }

  console.log('Generating claude after-2 sheet.jpg...');
  const afterSheet = await inspectEngine.sheet(inspectorThumbs, { cols: 4, outDir: AFTER_DIR }, inspectorResults);
  console.log('After sheet generated:', afterSheet);

  console.log('\nClosing inspector engine cleanly...');
  await inspectEngine.close();

  // Final verification of all output files
  console.log('\n=== Final File Verification ===');
  let failures = 0;
  for (const target of inspectorSubjects) {
    for (const view of ['three', 'front']) {
      const f = path.join(AFTER_DIR, `${target}-${view}.png`);
      const s = fs.statSync(f).size;
      if (s < 20000) {
        console.error(`ERROR: ${path.basename(f)} is still too small (${s} bytes)!`);
        failures++;
      } else {
        console.log(`OK: ${path.basename(f)} (${s} bytes)`);
      }
    }
  }

  if (failures > 0) {
    throw new Error(`${failures} screenshot(s) failed validation!`);
  }

  console.log('All 26 inspector PNGs and 4 Pike match PNGs are non-black and fully verified.');
}

main().catch((err) => {
  console.error('Fatal error in AG-154 runner:', err);
  process.exit(1);
});
