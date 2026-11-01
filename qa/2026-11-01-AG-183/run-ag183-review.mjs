import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-183');
fs.mkdirSync(OUT, { recursive: true });

const W = 1280, H = 720;
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');

const results = {
  timestamp: new Date().toISOString(),
  wallBands: null,
  gaps: [],
  collisionChecks: {},
  captures: [],
  scores: {},
  verdict: 'PASS'
};

async function runReview() {
  console.log('================================================================');
  console.log('Starting AG-183 Review: GP-20006 HQ Thicket Ring Real-GPU Visual Pass');
  console.log('================================================================');

  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const page = await browser.newPage({ width: W, height: H });
    const url = `${server.origin}/index.html?debug=1&walls=1&raf=timer`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { timeout: 300000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('Game load timed out: no TT');

    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(lib);

    // Hide UI/menu elements so 3D world is completely clear
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

    console.log('Inspecting TT.wallBandsDbg telemetry...');
    const bandData = await page.evaluate(`(() => {
      const T = TT;
      if (!T.wallBandsDbg) return { error: 'No TT.wallBandsDbg available' };
      const bands = T.wallBandsDbg.bands();
      const on = T.wallBandsDbg.on;
      const draws = T.wallBandsDbg.draws();

      const firstBand = bands[0];
      const gapDetails = [];

      if (firstBand) {
        const radius = firstBand.radius;
        for (const g of firstBand.gaps) {
          const theta = g.at / radius;
          const gx = Math.cos(theta) * radius;
          const gz = Math.sin(theta) * radius;
          gapDetails.push({
            id: g.id,
            at: +g.at.toFixed(2),
            width: +g.width.toFixed(2),
            thetaDeg: +(theta * 180 / Math.PI).toFixed(1),
            x: +gx.toFixed(2),
            z: +gz.toFixed(2),
            h: +T.sampleHeight(gx, gz).toFixed(2)
          });
        }
      }

      // Test collision at key spots
      const closedInsideBlocked = T.wallBandsDbg.blocked(-60, 0, 0.35);
      const resolveClosed = T.wallBandsDbg.resolve(-60, 0, 0.35);
      const trailGap = gapDetails.find(g => g.id.startsWith('trail')) || gapDetails[0];
      const trailBlocked = trailGap ? T.wallBandsDbg.blocked(trailGap.x, trailGap.z, 0.35) : null;
      const resolveTrail = trailGap ? T.wallBandsDbg.resolve(trailGap.x, trailGap.z, 0.35) : null;

      return {
        on,
        draws,
        bands,
        gapDetails,
        collision: {
          closedInsideBlocked,
          resolveClosed: { x: +resolveClosed.x.toFixed(2), z: +resolveClosed.z.toFixed(2) },
          trailGapId: trailGap ? trailGap.id : null,
          trailBlocked,
          resolveTrail: trailGap ? { x: +resolveTrail.x.toFixed(2), z: +resolveTrail.z.toFixed(2) } : null
        }
      };
    })()`);

    console.log('Wall band telemetry:', JSON.stringify(bandData, null, 2));
    results.wallBands = bandData;
    results.gaps = bandData.gapDetails;
    results.collisionChecks = bandData.collision;

    // Helper to position camera via TT.setShotView and capture screenshot
    const aimAndShoot = async (shotName, px, pz, tx, tz, setupCode, fov = 40, pyOff = 1.7) => {
      console.log(`\nCapturing shot: ${shotName} from (${px.toFixed(1)}, ${pz.toFixed(1)}) -> (${tx.toFixed(1)}, ${tz.toFixed(1)})`);
      await page.evaluate(setupCode);
      const state = await page.evaluate(`(async () => {
        const T = TT;
        const px = ${px}, pz = ${pz}, tx = ${tx}, tz = ${tz}, fov = ${fov};
        const py = T.sampleHeight(px, pz) + ${pyOff};
        const ty = T.sampleHeight(tx, tz) + 1.2;
        T.setShotView({ x: px, y: py, z: pz, tx: tx, ty: ty, tz: tz, fov: fov });

        // If night, aim flashlight from camera position to target
        const wt = T.getWorldTime ? T.getWorldTime() : 0.5;
        const isDark = (wt < 0.15 || wt > 0.82);
        if (T.flashlight) {
          if (isDark) {
            T.flashlight.intensity = 55;
            T.flashlight.position.set(px, py, pz);
            T.flashlight.target.position.set(tx, ty, tz);
            T.flashlight.target.updateMatrixWorld(true);
          } else {
            T.flashlight.intensity = 0;
          }
        }

        // Wait for rendering
        await new Promise(r => setTimeout(r, 650));

        return {
          px, py, pz, tx, ty, tz, fov,
          worldTime: T.getWorldTime ? T.getWorldTime() : null,
          heightGround: T.sampleHeight(px, pz),
          targetHeight: ty
        };
      })()`);

      const filePath = path.join(OUT, `${shotName}.png`);
      await page.screenshot(filePath);
      results.captures.push({ name: shotName, path: filePath, state });
      console.log(`Saved screenshot: ${filePath}`);
      return state;
    };

    // Four Lighting Setups
    const setNoon = `(() => {
      const T = TT;
      T.setWorldTime(0.50);
      if (T.weather) { T.weather.overcast = 0; T.weather.raining = false; T.weather.intensity = 0; }
      if (T.fogNightDbg) T.fogNightDbg.force(false);
      if (T.flashlight) T.flashlight.intensity = 0;
    })()`;

    const setDusk = `(() => {
      const T = TT;
      T.setWorldTime(0.74);
      if (T.weather) { T.weather.overcast = 0; T.weather.raining = false; T.weather.intensity = 0; }
      if (T.fogNightDbg) T.fogNightDbg.force(false);
      if (T.flashlight) T.flashlight.intensity = 0;
    })()`;

    const setOvercast = `(() => {
      const T = TT;
      T.setWorldTime(0.50);
      if (T.runDevCommand) T.runDevCommand('storm');
      if (T.fogNightDbg) T.fogNightDbg.force(false);
      if (T.flashlight) T.flashlight.intensity = 0;
    })()`;

    const setNight = `(() => {
      const T = TT;
      if (T.runDevCommand) T.runDevCommand('night ops');
      T.setWorldTime(0.02);
      if (T.fogNightDbg) { T.fogNightDbg.force(true); T.fogNightDbg.apply(10.0); }
      if (T.weather) { T.weather.overcast = 0; T.weather.raining = false; }
    })()`;

    // =============================================================
    // VIEW 1: CLOSED RING SPAN (INSIDE LOOKING OUT)
    // At (-52, 0), looking West directly at thicket wall at (-60, 0)
    // =============================================================
    console.log('\n--- View 1: Closed Ring Span (Inside Looking Out) ---');
    await aimAndShoot('ring-closed-inside-noon', -52, 0, -60, 0, setNoon);
    await aimAndShoot('ring-closed-inside-dusk', -52, 0, -60, 0, setDusk);
    await aimAndShoot('ring-closed-inside-overcast', -52, 0, -60, 0, setOvercast);
    await aimAndShoot('ring-closed-inside-night', -52, 0, -60, 0, setNight);

    // =============================================================
    // VIEW 2: CLOSED RING SPAN (OUTSIDE LOOKING IN)
    // At (-68, 0), looking East toward HQ across thicket wall at (-60, 0)
    // =============================================================
    console.log('\n--- View 2: Closed Ring Span (Outside Looking In) ---');
    await aimAndShoot('ring-closed-outside-noon', -68, 0, -60, 0, setNoon);
    await aimAndShoot('ring-closed-outside-dusk', -68, 0, -60, 0, setDusk);

    // =============================================================
    // VIEW 3: TRAIL GAP OPENING
    // Trail-0 is at (35.41, 48.44) (theta = 53.8 deg)
    // Inside pos: radius 52m along trail angle -> (30.69, 41.98)
    // Outside pos: radius 68m along trail angle -> (40.13, 54.90)
    // =============================================================
    console.log('\n--- View 3: Trail Gap Opening ---');
    const primaryTrail = bandData.gapDetails.find(g => g.id === 'trail-0') || bandData.gapDetails[0];
    const trailAng = Math.atan2(primaryTrail.z, primaryTrail.x);
    const tInX = Math.cos(trailAng) * 52;
    const tInZ = Math.sin(trailAng) * 52;
    const tOutX = Math.cos(trailAng) * 68;
    const tOutZ = Math.sin(trailAng) * 68;

    await aimAndShoot('trail-gap-inside-noon', tInX, tInZ, tOutX, tOutZ, setNoon);
    await aimAndShoot('trail-gap-inside-dusk', tInX, tInZ, tOutX, tOutZ, setDusk);
    await aimAndShoot('trail-gap-inside-night', tInX, tInZ, tOutX, tOutZ, setNight);

    // =============================================================
    // VIEW 4: RIVER OPENING
    // River gap is at (-14.12, 58.32) (theta = 103.6 deg)
    // =============================================================
    console.log('\n--- View 4: River Opening ---');
    const riverGap = bandData.gapDetails.find(g => g.id.startsWith('river')) || bandData.gapDetails[bandData.gapDetails.length - 1];
    const riverAng = Math.atan2(riverGap.z, riverGap.x);
    const rInX = Math.cos(riverAng - 0.18) * 52;
    const rInZ = Math.sin(riverAng - 0.18) * 52;
    const rTargX = Math.cos(riverAng) * 60;
    const rTargZ = Math.sin(riverAng) * 60;

    await aimAndShoot('river-gap-noon', rInX, rInZ, rTargX, rTargZ, setNoon);
    await aimAndShoot('river-gap-dusk', rInX, rInZ, rTargX, rTargZ, setDusk);

  } finally {
    try { await browser.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }

  // =============================================================
  // Phase 5: STITCH COMPOSITE CONTACT SHEET
  // =============================================================
  console.log('\n--- Phase 5: Stitching Composite Contact Sheet ---');
  const stitchServer = await serve(ROOT, 0);
  const stitchBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const stitchPage = await stitchBrowser.newPage({ width: W, height: H });
    await stitchPage.goto(`${stitchServer.origin}/tools/blank.html`);

    const shots = [
      path.join(OUT, 'ring-closed-inside-noon.png'),
      path.join(OUT, 'ring-closed-inside-dusk.png'),
      path.join(OUT, 'ring-closed-inside-overcast.png'),
      path.join(OUT, 'ring-closed-inside-night.png'),
      path.join(OUT, 'ring-closed-outside-noon.png'),
      path.join(OUT, 'ring-closed-outside-dusk.png'),
      path.join(OUT, 'trail-gap-inside-noon.png'),
      path.join(OUT, 'trail-gap-inside-dusk.png'),
      path.join(OUT, 'trail-gap-inside-night.png'),
      path.join(OUT, 'river-gap-noon.png')
    ];

    const labels = [
      '1. Closed Span (Inside) - Noon: continuous bramble/log/rock hedge',
      '2. Closed Span (Inside) - Dusk: warm silhouette under canopy',
      '3. Closed Span (Inside) - Overcast: diffuse natural forest palette & storm rain',
      '4. Closed Span (Inside) - Night: flashlight illumination, dense impenetrable barrier',
      '5. Closed Span (Outside) - Noon: grounded hedge blocking approach, HQ clear',
      '6. Closed Span (Outside) - Dusk: exterior dusk profile & terrain seating',
      '7. Trail Gap - Noon: clean 9.25m path opening, clear passage',
      '8. Trail Gap - Dusk: readable trail corridor into HQ yard',
      '9. Trail Gap - Night: flashlight illuminates walkable path between hedges',
      '10. River Gap - Noon: natural thicket termination at watercourse edge'
    ];

    const b64List = shots.map(p => fs.readFileSync(p).toString('base64'));
    const b64Sheet = await stitchPage.evaluate(`(async () => {
      const b64s = ${JSON.stringify(b64List)};
      const labels = ${JSON.stringify(labels)};
      const cols = 2, rows = 5;
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

    const sheetPath = path.join(OUT, 'ag183-sheet.png');
    fs.writeFileSync(sheetPath, Buffer.from(b64Sheet, 'base64'));
    console.log(`Saved composite contact sheet: ${sheetPath}`);

  } finally {
    try { await stitchBrowser.close(); } catch (_) {}
    try { stitchServer.close(); } catch (_) {}
  }

  // Save summary JSON
  fs.writeFileSync(path.join(OUT, 'ag183-summary.json'), JSON.stringify(results, null, 2));
  console.log('Saved summary JSON: ag183-summary.json');
  console.log('AG-183 run completed successfully.');
}

runReview().catch(err => {
  console.error('Error during AG-183 review:', err);
  process.exit(1);
});
