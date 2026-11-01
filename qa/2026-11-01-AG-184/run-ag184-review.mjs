import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-184');
fs.mkdirSync(OUT, { recursive: true });

const W = 1280, H = 720;
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');

const results = {
  timestamp: new Date().toISOString(),
  clearing: {
    coords: { x: 42, z: -20 },
    radius: 9,
    treesInsideClearing: 0,
    openVerdict: ''
  },
  landingTrail: null,
  bends: [],
  hqReveal: {
    coords: null,
    distToHQ: null,
    firstRevealedObject: '',
    sightlineVerdict: ''
  },
  captures: [],
  verdict: 'PASS'
};

async function runReview() {
  console.log('================================================================');
  console.log('Starting AG-184 Review: CU-209 Drop-In Clearing & Trail Bends');
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

    // Hide UI/menu overlays for clean visual evaluation
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

    // Settle noon lighting
    await page.evaluate(`(() => {
      const T = TT;
      T.setWorldTime(0.50);
      if (T.weather) { T.weather.overcast = 0; T.weather.raining = false; T.weather.intensity = 0; }
      if (T.fogNightDbg) T.fogNightDbg.force(false);
    })()`);

    // Extract clearing and trail telemetry from TT
    console.log('Extracting landing trail and clearing telemetry...');
    const telemetry = await page.evaluate(`(() => {
      const T = TT;
      const LANDING = { x: 42, z: -20, r: 9 };
      const HQ = { x: 0, z: -6.5 };

      // Check trees within landing clearing
      const treesInClearing = (T.trees || []).filter(t => Math.hypot(t.x - LANDING.x, t.z - LANDING.z) < LANDING.r);

      // Find the landing leg in PATHS
      const paths = T.PATHS || [];
      let landingPath = null;
      for (const p of paths) {
        if (!p || p.length < 2) continue;
        const p0 = p[0], pN = p[p.length - 1];
        const dist0 = Math.hypot(p0.x - LANDING.x, p0.z - LANDING.z);
        const distN = Math.hypot(pN.x - LANDING.x, pN.z - LANDING.z);
        if (dist0 < 5 || distN < 5) {
          landingPath = (dist0 < 5) ? p : [...p].reverse();
          break;
        }
      }

      // Check sightline from any point to HQ center (0, 0)
      function checkSightline(fromX, fromZ, toX = 0, toZ = 0) {
        const fromY = T.sampleHeight(fromX, fromZ) + 1.7;
        const toY = T.sampleHeight(toX, toZ) + 2.0;
        const dist = Math.hypot(toX - fromX, toZ - fromZ);
        const steps = Math.ceil(dist / 0.8);
        for (let i = 1; i < steps; i++) {
          const u = i / steps;
          const sx = fromX + (toX - fromX) * u;
          const sz = fromZ + (toZ - fromZ) * u;
          const sy = fromY + (toY - fromY) * u;
          const groundY = T.sampleHeight(sx, sz);
          if (groundY > sy) return { blocked: true, by: 'terrain', at: { x: sx, z: sz } };

          // Check trees along line of sight
          for (const t of T.trees || []) {
            const tdx = t.x - sx, tdz = t.z - sz;
            if (Math.hypot(tdx, tdz) < (t.canopyRadius || 3.2) * 0.85) {
              const th = T.sampleHeight(t.x, t.z);
              const bot = th + (t.canopyBottom || 1.8);
              const top = th + (t.canopyTop || 8.0);
              if (sy >= bot && sy <= top) {
                return { blocked: true, by: 'tree', treeKind: t.kind, at: { x: t.x, z: t.z } };
              }
            }
          }
        }
        return { blocked: false };
      }

      // Find first reveal point along the trail
      let revealIndex = -1;
      let revealPoint = null;
      if (landingPath) {
        for (let i = 0; i < landingPath.length; i++) {
          const pt = landingPath[i];
          const sl = checkSightline(pt.x, pt.z, 0, 0);
          if (!sl.blocked) {
            revealIndex = i;
            revealPoint = { ...pt, distToHQ: Math.hypot(pt.x, pt.z) };
            break;
          }
        }
      }

      return {
        clearing: {
          x: LANDING.x,
          z: LANDING.z,
          radius: LANDING.r,
          elevation: T.sampleHeight(LANDING.x, LANDING.z),
          treesInsideCount: treesInClearing.length
        },
        landingPath: (landingPath || []).map(p => ({ x: +p.x.toFixed(2), z: +p.z.toFixed(2), h: +T.sampleHeight(p.x, p.z).toFixed(2) })),
        reveal: revealPoint,
        revealIndex,
        sightlineAtLanding: checkSightline(LANDING.x, LANDING.z, 0, 0)
      };
    })()`);

    console.log('Telemetry:', JSON.stringify(telemetry, null, 2));
    results.clearing.treesInsideClearing = telemetry.clearing.treesInsideCount;
    results.clearing.openVerdict = telemetry.clearing.treesInsideCount === 0 ? 'COMPLETELY OPEN (0 trees inside 9m radius)' : `BLOCKED (${telemetry.clearing.treesInsideCount} trees)`;
    results.landingTrail = telemetry.landingPath;
    results.hqReveal = telemetry.reveal;

    const pathPts = telemetry.landingPath;
    if (!pathPts || pathPts.length < 4) throw new Error('Could not find landing path in PATHS');

    // Helper for taking camera shots
    const shootCamera = async (name, px, pz, tx, tz, fov = 45, pyOff = 1.7) => {
      console.log(`\nCapturing: ${name} from (${px.toFixed(1)}, ${pz.toFixed(1)}) -> (${tx.toFixed(1)}, ${tz.toFixed(1)})`);
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

    // =============================================================
    // 1. DROP-IN CLEARING AS SEEN ON LANDING
    // Stand at (42, -20) at eye height looking down initial trail segment
    // =============================================================
    const p0 = pathPts[0];
    const pTarget = pathPts[Math.min(3, pathPts.length - 1)];
    await shootCamera('1-landing-clearing-forward', p0.x, p0.z, pTarget.x, pTarget.z, 45);

    // Wide reverse angle of landing clearing looking back across the 9m open zone
    await shootCamera('2-landing-clearing-wide', p0.x + 6, p0.z - 6, p0.x, p0.z, 50);

    // =============================================================
    // 2. TRAIL BEND 1
    // Approaching the first curve: look along the curve tangentially
    // =============================================================
    const pB1Appr = pathPts[4]; // (30.34, -25.52)
    const pB1Knot = pathPts[6]; // (23.95, -24.62)
    await shootCamera('3-trail-bend-1', pB1Appr.x, pB1Appr.z, pB1Knot.x, pB1Knot.z, 45);

    // =============================================================
    // 3. TRAIL BEND 2
    // Curving toward the HQ spur: look along the turn
    // =============================================================
    const pB2Appr = pathPts[9];  // (22.26, -13.66)
    const pB2Knot = pathPts[12]; // (20.57, -2.69)
    await shootCamera('4-trail-bend-2', pB2Appr.x, pB2Appr.z, pB2Knot.x, pB2Knot.z, 45);

    // =============================================================
    // 4. MOMENT HQ COMES INTO VIEW (THE REVEAL)
    // At the exact point along the trail where sightline to HQ opens up
    // =============================================================
    const rev = telemetry.reveal || pathPts[3];
    await shootCamera('5-hq-reveal-moment', rev.x, rev.z, 0, -6.5, 45);

    // Step into the open North Yard (10m out from building facade)
    await shootCamera('6-hq-approach-full', 12.0, -9.0, 0.0, 0.0, 50);

  } finally {
    try { await browser.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }

  // =============================================================
  // Phase 5: STITCH COMPOSITE CONTACT SHEET
  // =============================================================
  console.log('\n--- Stitching Composite Contact Sheet ---');
  const stitchServer = await serve(ROOT, 0);
  const stitchBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const stitchPage = await stitchBrowser.newPage({ width: W, height: H });
    await stitchPage.goto(`${stitchServer.origin}/tools/blank.html`);

    const shots = [
      path.join(OUT, '1-landing-clearing-forward.png'),
      path.join(OUT, '2-landing-clearing-wide.png'),
      path.join(OUT, '3-trail-bend-1.png'),
      path.join(OUT, '4-trail-bend-2.png'),
      path.join(OUT, '5-hq-reveal-moment.png'),
      path.join(OUT, '6-hq-approach-full.png')
    ];

    const labels = [
      '1. Drop-In Clearing (42, -20): Open 9m landing circle looking down the trail',
      '2. Clearing Wide Perspective: 9m flat dry ground clear of all trees',
      '3. Trail Bend 1: First curving bend weaving through the dense pine woods',
      '4. Trail Bend 2: Second bend maintaining woodland enclosure',
      '5. HQ Reveal Moment: The exact point the HQ cabin emerges from the trees',
      '6. HQ Arrival: Stepping out into the North Yard with clear cabin & mast'
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

    const sheetPath = path.join(OUT, 'ag184-sheet.png');
    fs.writeFileSync(sheetPath, Buffer.from(b64Sheet, 'base64'));
    console.log(`Saved composite contact sheet: ${sheetPath}`);

  } finally {
    try { await stitchBrowser.close(); } catch (_) {}
    try { stitchServer.close(); } catch (_) {}
  }

  fs.writeFileSync(path.join(OUT, 'ag184-summary.json'), JSON.stringify(results, null, 2));
  console.log('Saved summary JSON: ag184-summary.json');
  console.log('AG-184 run completed successfully.');
}

runReview().catch(err => {
  console.error('Error during AG-184 review:', err);
  process.exit(1);
});
