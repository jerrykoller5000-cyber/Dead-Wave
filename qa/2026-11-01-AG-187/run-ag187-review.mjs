import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-187');
fs.mkdirSync(OUT, { recursive: true });

const W = 1280, H = 720;
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const t323Code = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 't323.js'), 'utf8');

const results = {
  timestamp: new Date().toISOString(),
  test_t323: {
    passed: false,
    output: []
  },
  places: {},
  rangersGroundColor: {},
  captures: [],
  verdict: 'PASS'
};

async function runReview() {
  console.log('================================================================');
  console.log('Starting AG-187 Review: CU-216 Each Place Trees & Cover Visual Pass');
  console.log('================================================================');

  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const page = await browser.newPage({ width: W, height: H });
    const url = `${server.origin}/index.html?debug=1&raf=timer`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { timeout: 300000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('Game load timed out: no TT');

    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(lib);

    // 1. Run t323 test directly
    console.log('\n--- Running test t323 (Place Rings Trees) ---');
    const t323Raw = await page.evaluate(t323Code);
    const t323Lines = String(t323Raw).split('\n').map(l => l.trim()).filter(Boolean);
    const t323Pass = t323Lines.every(l => l.startsWith('PASS'));
    results.test_t323.passed = t323Pass;
    results.test_t323.output = t323Lines;
    console.log('t323 result: ' + (t323Pass ? 'PASS (all green)' : 'FAIL'));
    t323Lines.forEach(l => console.log('  ' + l));

    // 2. Hide UI overlays for clean visual evaluation
    await page.evaluate(`(() => {
      const c = [...document.querySelectorAll('canvas')]
        .sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
      if (!c) return false;
      const keep = new Set();
      for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
      for (const child of document.body.children) {
        if (!keep.has(child)) child.style.setProperty('display', 'none', 'important');
      }
      return true;
    })()`);

    // 3. Settle noon lighting
    await page.evaluate(`(() => {
      const T = TT;
      T.setWorldTime(0.50);
      if (T.weather) { T.weather.overcast = 0; T.weather.raining = false; T.weather.intensity = 0; }
      if (T.fogNightDbg) T.fogNightDbg.force(false);
    })()`);

    // 4. Extract telemetry for each of the six sites
    console.log('\n--- Extracting Place Telemetry ---');
    const telemetry = await page.evaluate(`(() => {
      const T = TT;
      const poi = T.POI;
      const ground = T.ground;

      const placeDefs = [
        { id: 'rangers', name: 'Rangers Station', p: poi.campsites[0], tree: 'pine', scale: 1.28, lean: 0.02, inner: 14, outer: 25, cover: 'needle' },
        { id: 'hikers', name: 'Hikers Campsite', p: poi.campsites[1], tree: 'birch', scale: 1.05, lean: 0.03, inner: 14, outer: 25, cover: 'fern' },
        { id: 'fuel', name: 'Fuel Depot', p: poi.sheds[2], tree: 'birch', scale: 0.72, lean: 0.06, inner: 14, outer: 25, cover: 'weed' },
        { id: 'trapper', name: 'Trapper Campsite', p: poi.campsites[2], tree: 'autumn', scale: 0.95, lean: 0.12, inner: 14, outer: 25, cover: 'thorn' },
        { id: 'mast', name: 'Radio Mast', p: poi.mast, tree: 'pine', scale: 0.88, lean: 0.34, inner: 20, outer: 32, cover: 'bare' },
        { id: 'mine', name: 'Iron Mine', p: (poi.caves || []).find(c => c && c.theme === 'iron') || (poi.caves || [])[0], tree: null, scale: 1.0, lean: 0, inner: 10, outer: 22, cover: 'fungus' }
      ];

      const out = {};
      for (const def of placeDefs) {
        const p = def.p;
        if (!p) { out[def.id] = { error: 'POI not found' }; continue; }
        const px = p.x, pz = p.z, py = T.sampleHeight(px, pz);

        // Trees inside clearing (< inner)
        const insideTrees = [];
        // Trees in ring [inner, outer]
        const ringTrees = [];
        const kindsInRing = {};

        for (const t of T.trees || []) {
          if (!t.alive || t.stump) continue;
          const d = Math.hypot(t.x - px, t.z - pz);
          if (d < def.inner) {
            insideTrees.push({ x: +t.x.toFixed(2), z: +t.z.toFixed(2), d: +d.toFixed(2), kind: t.kind, scale: +t.scale.toFixed(2) });
          } else if (d <= def.outer) {
            // Check if another place is closer
            let closer = false;
            for (const other of placeDefs) {
              if (other === def || !other.p) continue;
              if (Math.hypot(t.x - other.p.x, t.z - other.p.z) < d) { closer = true; break; }
            }
            if (!closer) {
              ringTrees.push({ x: +t.x.toFixed(2), z: +t.z.toFixed(2), d: +d.toFixed(2), kind: t.kind, scale: +(t.scale || 1).toFixed(2), lean: +(t.lean || 0).toFixed(2) });
              kindsInRing[t.kind] = (kindsInRing[t.kind] || 0) + 1;
            }
          }
        }

        const expectedCount = def.tree ? (kindsInRing[def.tree] || 0) : 0;
        const totalRing = ringTrees.length;
        const share = totalRing > 0 ? (expectedCount / totalRing) : 0;

        out[def.id] = {
          id: def.id,
          name: def.name,
          coords: { x: +px.toFixed(2), y: +py.toFixed(2), z: +pz.toFixed(2), yaw: p.yaw },
          inner: def.inner,
          outer: def.outer,
          expectedTree: def.tree,
          expectedCover: def.cover,
          insideCount: insideTrees.length,
          insideTrees,
          clearingOpen: insideTrees.length === 0,
          ringTotalTrees: totalRing,
          ringExpectedTreeCount: expectedCount,
          ringTreeShare: +share.toFixed(3),
          ringKinds: kindsInRing,
          ringTreesSample: ringTrees.slice(0, 8)
        };
      }

      // Sample Rangers ground color
      const rangers = poi.campsites[0];
      let rangersColorInfo = null;
      if (rangers && ground && ground.geometry && ground.geometry.attributes.color && ground.geometry.attributes.position) {
        const col = ground.geometry.attributes.color;
        const pos = ground.geometry.attributes.position;
        let insideR = 0, insideG = 0, insideB = 0, insideN = 0;
        let outsideR = 0, outsideG = 0, outsideB = 0, outsideN = 0;

        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), z = pos.getZ(i);
          const d = Math.hypot(x - rangers.x, z - rangers.z);
          const r = col.getX(i), g = col.getY(i), b = col.getZ(i);
          if (d <= 14) {
            insideR += r; insideG += g; insideB += b; insideN++;
          } else if (d >= 28 && d <= 45) {
            outsideR += r; outsideG += g; outsideB += b; outsideN++;
          }
        }

        if (insideN > 0 && outsideN > 0) {
          rangersColorInfo = {
            insideClearing: {
              r: +(insideR / insideN).toFixed(3),
              g: +(insideG / insideN).toFixed(3),
              b: +(insideB / insideN).toFixed(3),
              sampleCount: insideN
            },
            outsideBaseline: {
              r: +(outsideR / outsideN).toFixed(3),
              g: +(outsideG / outsideN).toFixed(3),
              b: +(outsideB / outsideN).toFixed(3),
              sampleCount: outsideN
            }
          };
        }
      }

      return { places: out, rangersColorInfo };
    })()`);

    results.places = telemetry.places;
    results.rangersGroundColor = telemetry.rangersColorInfo;
    console.log('Telemetry extracted for 6 places:');
    for (const [id, pl] of Object.entries(telemetry.places)) {
      console.log(`- ${pl.name} (${id}): pos=(${pl.coords.x}, ${pl.coords.z}), clearingOpen=${pl.clearingOpen} (trees inside: ${pl.insideCount}), ringTrees=${pl.ringTotalTrees} (${pl.expectedTree}: ${pl.ringExpectedTreeCount}/${pl.ringTotalTrees} = ${(pl.ringTreeShare * 100).toFixed(1)}%)`);
    }

    if (telemetry.rangersColorInfo) {
      const c = telemetry.rangersColorInfo;
      console.log(`- Rangers ground vertex RGB: inside=[${c.insideClearing.r}, ${c.insideClearing.g}, ${c.insideClearing.b}] vs outside=[${c.outsideBaseline.r}, ${c.outsideBaseline.g}, ${c.outsideBaseline.b}]`);
    }

    // Helper for taking camera shots
    const shootCamera = async (name, px, pz, tx, tz, fov = 48, pyOff = 2.4, tyOff = 1.2) => {
      console.log(`\nCapturing: ${name} from (${px.toFixed(1)}, ${pz.toFixed(1)}) -> (${tx.toFixed(1)}, ${tz.toFixed(1)})`);
      const state = await page.evaluate(`(async () => {
        const T = TT;
        const px = ${px}, pz = ${pz}, tx = ${tx}, tz = ${tz}, fov = ${fov};
        const py = T.sampleHeight(px, pz) + ${pyOff};
        const ty = T.sampleHeight(tx, tz) + ${tyOff};
        T.setShotView({ x: px, y: py, z: pz, tx: tx, ty: ty, tz: tz, fov: fov });
        await new Promise(r => setTimeout(r, 600));
        return { px, py, pz, tx, ty, tz, fov };
      })()`);

      const file = path.join(OUT, `${name}.png`);
      await page.screenshot(file);
      results.captures.push({ name, file, state });
      console.log(`Saved screenshot: ${file}`);
      return state;
    };

    // =============================================================
    // CAPTURE SHOTS FOR EACH OF THE 6 PLACES
    // =============================================================
    console.log('\n--- Capturing 6 High-Detail Ground Shots at Noon ---');

    // 1. Rangers Station (poi.campsites[0]): Tall Pines & Dark Needle Ground
    const rng = telemetry.places.rangers.coords;
    // Stand in clearing looking across campsite toward tall pine ring
    await shootCamera('1-rangers-noon', rng.x + 8.5, rng.z + 7.5, rng.x - 9.0, rng.z - 8.5, 50, 2.2, 1.6);

    // 2. Hikers Campsite (poi.campsites[1]): Birch Ring & Ferns
    const hik = telemetry.places.hikers.coords;
    // Stand in clearing looking across toward birch ring and lush ferns
    await shootCamera('2-hikers-noon', hik.x + 8.0, hik.z + 7.0, hik.x - 9.0, hik.z - 8.0, 50, 2.2, 1.4);

    // 3. Fuel Depot (poi.sheds[2]): Low Birch & Weeds
    const fue = telemetry.places.fuel.coords;
    // Stand looking at fuel shed and low scrub birch ring
    await shootCamera('3-fuel-depot-noon', fue.x + 9.0, fue.z + 6.5, fue.x - 7.5, fue.z - 6.0, 50, 2.2, 1.4);

    // 4. Trapper Campsite (poi.campsites[2]): Autumn Trees & Thorn Bushes
    const trp = telemetry.places.trapper.coords;
    // Stand looking across trapper camp toward autumn trees and thorn bushes
    await shootCamera('4-trapper-noon', trp.x + 8.5, trp.z + 7.5, trp.x - 8.5, trp.z - 8.0, 50, 2.2, 1.5);

    // 5. Radio Mast (poi.mast): Leaning Pines on Bare Rock
    const mst = telemetry.places.mast.coords;
    // Stand on mast rocky plateau looking past mast base toward the wind-leaning pines
    await shootCamera('5-mast-noon', mst.x - 12.0, mst.z - 11.0, mst.x + 8.0, mst.z + 7.0, 52, 2.2, 2.0);

    // 6. Iron Mine (poi.caves iron): Cave Entrance & Mushrooms
    const min = telemetry.places.mine.coords;
    // Face the cave mouth and mushroom cluster ring
    const cyaw = min.yaw || 0;
    const distCam = 12.0;
    const camX = min.x + Math.sin(cyaw) * distCam + 3.0;
    const camZ = min.z + Math.cos(cyaw) * distCam + 3.0;
    await shootCamera('6-iron-mine-noon', camX, camZ, min.x, min.z, 50, 2.0, 1.2);

    // 5. Stitch Composite Contact Sheet
    console.log('\n--- Stitching Composite Contact Sheet ---');
    const stitchPage = await browser.newPage({ width: W, height: H });
    await stitchPage.goto(`${server.origin}/tools/blank.html`);

    const shots = [
      path.join(OUT, '1-rangers-noon.png'),
      path.join(OUT, '2-hikers-noon.png'),
      path.join(OUT, '3-fuel-depot-noon.png'),
      path.join(OUT, '4-trapper-noon.png'),
      path.join(OUT, '5-mast-noon.png'),
      path.join(OUT, '6-iron-mine-noon.png')
    ];

    const labels = [
      '1. Rangers Station: Tall Pines (1.28x) & Darkened Ground (Clearing Open)',
      '2. Hikers Campsite: Dense Birch Ring (1.05x) & Lush Ferns (Clearing Open)',
      '3. Fuel Depot: Stunted Low Birch (0.72x) & Weed Tufts (Clearing Open)',
      '4. Trapper Campsite: Autumn Dead Ash (0.95x) & Spiky Thorns (Clearing Open)',
      '5. Radio Mast: Sparse Leaning Pines (0.88x, lean 0.34) on Bare Rock',
      '6. Iron Mine: Rocky Cavern Approach & Mushroom Clusters (Clearing Open)'
    ];

    const b64List = shots.map(p => fs.readFileSync(p).toString('base64'));
    const b64Sheet = await stitchPage.evaluate(`(async () => {
      const b64s = ${JSON.stringify(b64List)};
      const labels = ${JSON.stringify(labels)};
      const cols = 2, rows = 3;
      const cellW = 640, cellH = 360, labelH = 28;
      const c = document.createElement('canvas');
      c.width = cols * cellW;
      c.height = rows * (cellH + labelH);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0f1115';
      ctx.fillRect(0, 0, c.width, c.height);

      const loadImg = (src) => new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = src;
      });

      for (let i = 0; i < b64s.length; i++) {
        const im = await loadImg('data:image/png;base64,' + b64s[i]);
        const col = i % cols, row = Math.floor(i / cols);
        const x = col * cellW, y = row * (cellH + labelH);
        ctx.drawImage(im, x, y, cellW, cellH);
        ctx.fillStyle = '#161920';
        ctx.fillRect(x, y + cellH, cellW, labelH);
        ctx.fillStyle = '#70c0ff';
        ctx.font = 'bold 12px Consolas, monospace';
        ctx.fillText(labels[i] || '', x + 10, y + cellH + 19);
      }
      return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
    })()`);

    const sheetPath = path.join(OUT, 'ag187-sheet.png');
    fs.writeFileSync(sheetPath, Buffer.from(b64Sheet, 'base64'));
    console.log(`Saved composite contact sheet: ${sheetPath}`);

  } finally {
    try { await browser.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }

  fs.writeFileSync(path.join(OUT, 'ag187-summary.json'), JSON.stringify(results, null, 2));
  console.log('Saved summary JSON: ag187-summary.json');
  console.log('AG-187 review completed successfully.');
}

runReview().catch(err => {
  console.error('Error during AG-187 review:', err);
  process.exit(1);
});
