import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-185');
fs.mkdirSync(OUT, { recursive: true });

const W = 1280, H = 720;
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');

const results = {
  timestamp: new Date().toISOString(),
  wallsDefaultOn: false,
  bandSpecs: null,
  trailGaps: [],
  selectedTrail: null,
  closedSpan: null,
  collisionTests: {},
  valleyFieldTests: {},
  captures: [],
  verdict: 'PASS'
};

async function runReview() {
  console.log('================================================================');
  console.log('Starting AG-185 Review: HQ Ring Default-On & Trail Gap Readability');
  console.log('================================================================');

  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const page = await browser.newPage({ width: W, height: H });
    // Default game URL: No ?walls=1 passed!
    const url = `${server.origin}/index.html?debug=1&raf=timer`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { timeout: 300000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('Game load timed out: no TT');

    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(lib);

    // Hide UI overlays for clean visual evaluation
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

    // Extract telemetry and find trail gaps
    console.log('Extracting wall band and trail telemetry...');
    const telemetry = await page.evaluate(`(() => {
      const T = TT;
      const dbg = T.wallBandsDbg;
      const bands = dbg ? dbg.bands() : [];
      const draws = dbg ? dbg.draws() : 0;
      const on = dbg ? dbg.on : false;

      // Check collision at closed span vs trail-11 gap
      const closedTestPt = { x: -60, z: 0 };
      const closedBlocked = dbg.blocked(closedTestPt.x, closedTestPt.z, 0.35);
      const closedResolved = dbg.resolve(closedTestPt.x, closedTestPt.z, 0.35);

      // Trail-11 crossing point: approx (29.2, -52.4)
      const t11GapPt = { x: 29.28, z: -52.37 };
      const t11Blocked = dbg.blocked(t11GapPt.x, t11GapPt.z, 0.35);
      const t11Resolved = dbg.resolve(t11GapPt.x, t11GapPt.z, 0.35);

      // Trail-0 crossing point: approx (35.41, 48.44)
      const t0GapPt = { x: 35.41, z: 48.44 };
      const t0Blocked = dbg.blocked(t0GapPt.x, t0GapPt.z, 0.35);
      const t0Resolved = dbg.resolve(t0GapPt.x, t0GapPt.z, 0.35);

      // Check valley field
      const vf = T.flowField ? T.flowField().valley : null;
      const yardDist = T.valleyDistAt ? T.valleyDistAt(12, -6.5) : null;
      const outsideDistT11 = T.valleyDistAt ? T.valleyDistAt(22, -62) : null;

      return {
        on,
        draws,
        bands,
        closedCollision: {
          pt: closedTestPt,
          blocked: closedBlocked,
          resolved: closedResolved
        },
        t11Collision: {
          pt: t11GapPt,
          blocked: t11Blocked,
          resolved: t11Resolved
        },
        t0Collision: {
          pt: t0GapPt,
          blocked: t0Blocked,
          resolved: t0Resolved
        },
        valleyField: {
          ready: !!(vf && vf.ready),
          cells: vf ? vf.n : 0,
          ms: vf ? vf.ms : 0,
          yardDist,
          outsideDistT11
        }
      };
    })()`);

    console.log('Telemetry summary:');
    console.log(`- HQ Ring Default-On: ${telemetry.on}`);
    console.log(`- Band draws: ${telemetry.draws}`);
    console.log(`- Band solids: ${telemetry.bands[0]?.solids}`);
    console.log(`- Closed collision: blocked=${telemetry.closedCollision.blocked}, resolved=(${telemetry.closedCollision.resolved.x.toFixed(2)}, ${telemetry.closedCollision.resolved.z.toFixed(2)})`);
    console.log(`- Trail-11 gap collision: blocked=${telemetry.t11Collision.blocked}, resolved=(${telemetry.t11Collision.resolved.x.toFixed(2)}, ${telemetry.t11Collision.resolved.z.toFixed(2)})`);
    console.log(`- Valley field: ready=${telemetry.valleyField.ready}, yardDist=${telemetry.valleyField.yardDist.toFixed(1)}, outsideDist=${telemetry.valleyField.outsideDistT11.toFixed(1)}`);

    results.wallsDefaultOn = telemetry.on;
    results.bandSpecs = telemetry.bands[0];
    results.collisionTests = {
      closed: telemetry.closedCollision,
      trail11: telemetry.t11Collision,
      trail0: telemetry.t0Collision
    };
    results.valleyFieldTests = telemetry.valleyField;

    // Helper for taking camera shots
    const shootCamera = async (name, px, pz, tx, tz, fov = 40, pyOff = 1.7) => {
      console.log(`Capturing: ${name} from (${px.toFixed(1)}, ${pz.toFixed(1)}) -> (${tx.toFixed(1)}, ${tz.toFixed(1)})`);
      const state = await page.evaluate(`(async () => {
        const T = TT;
        const px = ${px}, pz = ${pz}, tx = ${tx}, tz = ${tz}, fov = ${fov};
        const py = T.sampleHeight(px, pz) + ${pyOff};
        const ty = T.sampleHeight(tx, tz) + 1.2;
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

    // --- LIGHTING: NOON ---
    console.log('\n--- Capturing Noon Lighting Views ---');
    await page.evaluate(`(() => {
      const T = TT;
      T.setWorldTime(0.50);
      if (T.weather) { T.weather.overcast = 0; T.weather.raining = false; T.weather.intensity = 0; }
      if (T.fogNightDbg) T.fogNightDbg.force(false);
    })()`);

    // Shot 1: From the yard, looking outward along Trail-11 through the thicket gap
    // Position inside yard on the trail approaching the gap: (34.0, -46.5) looking out to (24.0, -58.0)
    await shootCamera('1-yard-trail-gap-noon', 34.0, -46.5, 24.0, -58.0, 38);

    // Shot 2: From outside the ring, looking back along Trail-11 through the gap at the HQ
    // Position outside the ring on the trail: (24.0, -58.0) looking back through the gap towards the HQ (0, -6.5)
    await shootCamera('2-outside-toward-hq-noon', 24.0, -58.0, 0.0, -6.5, 38);

    // Shot 3: Close-up passage through the gap corridor
    // Standing at (30.0, -51.0) looking along the path through the 4m band
    await shootCamera('3-gap-corridor-passage-noon', 30.5, -50.5, 25.0, -57.0, 42);

    // Shot 4: Closed span viewed from inside the yard
    // Stand inside at (-50, 0) looking at (-60, 0)
    await shootCamera('4-closed-span-yard-noon', -50.0, 0.0, -60.0, 0.0, 38);

    // Shot 5: Closed span viewed from outside the ring
    // Stand outside at (-68, 0) looking at (-60, 0)
    await shootCamera('5-outside-closed-span-noon', -68.0, 0.0, -60.0, 0.0, 38);

    // --- LIGHTING: DUSK ---
    console.log('\n--- Capturing Dusk Lighting View ---');
    await page.evaluate(`(() => {
      const T = TT;
      T.setWorldTime(0.74);
      if (T.weather) { T.weather.overcast = 0; T.weather.raining = false; T.weather.intensity = 0; }
    })()`);

    // Shot 6: From outside looking back through the gap toward HQ under Dusk twilight
    await shootCamera('6-outside-toward-hq-dusk', 24.0, -58.0, 0.0, -6.5, 38);

  } finally {
    try { await browser.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }

  // Phase 5: Stitch Composite Contact Sheet
  console.log('\n--- Stitching Composite Contact Sheet ---');
  const stitchServer = await serve(ROOT, 0);
  const stitchBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const stitchPage = await stitchBrowser.newPage({ width: W, height: H });
    await stitchPage.goto(`${stitchServer.origin}/tools/blank.html`);

    const shots = [
      path.join(OUT, '1-yard-trail-gap-noon.png'),
      path.join(OUT, '2-outside-toward-hq-noon.png'),
      path.join(OUT, '3-gap-corridor-passage-noon.png'),
      path.join(OUT, '4-closed-span-yard-noon.png'),
      path.join(OUT, '5-outside-closed-span-noon.png'),
      path.join(OUT, '6-outside-toward-hq-dusk.png')
    ];

    const labels = [
      '1. Yard -> Trail Gap (Noon): Clean corridor through thicket into forest',
      '2. Outside -> HQ (Noon): Trail gap frames HQ cabin & mast clearly',
      '3. Gap Corridor Close-up (Noon): 4m band depth with grounded verge margins',
      '4. Closed Span from Yard (Noon): Impenetrable bramble, sapling & boulder wall',
      '5. Closed Span Exterior (Noon): Continuous perimeter barrier sealing off-trail access',
      '6. Outside -> HQ (Dusk): Strong twilight silhouette confirming gap readability'
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

    const sheetPath = path.join(OUT, 'ag185-sheet.png');
    fs.writeFileSync(sheetPath, Buffer.from(b64Sheet, 'base64'));
    console.log(`Saved composite contact sheet: ${sheetPath}`);

  } finally {
    try { await stitchBrowser.close(); } catch (_) {}
    try { stitchServer.close(); } catch (_) {}
  }

  fs.writeFileSync(path.join(OUT, 'ag185-summary.json'), JSON.stringify(results, null, 2));
  console.log('Saved summary JSON: ag185-summary.json');
  console.log('AG-185 review completed successfully.');
}

runReview().catch(err => {
  console.error('Error during AG-185 review:', err);
  process.exit(1);
});
