// Fine water, collision, and live player navigation survey of the SE shoreline passage around the quarter-se wall stub.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run through the shared game-test slot: node crew/crew.mjs slot run antigravity AG-192 -- node qa/2026-11-01-AG-192/verify-shore-route.mjs');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-192');
fs.mkdirSync(OUT, { recursive: true });

const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');

const WAYPOINTS = [
  { x: -55.25, z: -72.25 },
  { x: -56.00, z: -72.50 },
  { x: -57.00, z: -72.50 },
  { x: -58.00, z: -72.50 },
  { x: -59.00, z: -72.50 },
  { x: -60.00, z: -72.50 },
  { x: -61.00, z: -72.50 },
  { x: -61.25, z: -71.75 },
  { x: -61.50, z: -71.00 },
  { x: -61.75, z: -70.25 },
  { x: -61.75, z: -69.25 },
  { x: -61.75, z: -68.25 },
  { x: -61.75, z: -67.25 },
  { x: -61.50, z: -67.00 }
];

async function run() {
  console.log('Starting SE shoreline passage live survey...');
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: true });
  const page = await browser.newPage({ width: 960, height: 540 });

  try {
    const url = `${server.origin}/index.html?debug=1&raf=timer&renderer=webgl&quarterwalls=1`;
    console.log(`Loading ${url}...`);
    await page.goto(url, { timeout: 120000 });

    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate('DWOpening.dismissForTesting()');
      await page.evaluate('new Promise(r => setTimeout(r, 300))');
    }
    if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) {
      throw new Error(`TT timeout: ${page.errors.slice(0, 3)}`);
    }

    await page.evaluate(lib);
    console.log('Starting match for survey...');
    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'AG192-ShoreSurvey');
      if (T.clearZombies) T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.42);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      if (T.runDevCommand) T.runDevCommand('godmode');
      if (T.skipGrace) T.skipGrace();
      await new Promise(r => setTimeout(r, 500));
    })()`);

    const survey = await page.evaluate(`(async (waypoints) => {
      const T = TT;
      const res = {
        diagonalAnalysis: {},
        surveyedWaypoints: [],
        forwardWalk: {},
        reverseWalk: {},
        stubTipDistance: null,
        waterlineDistance: null
      };

      // 1. Analyze why the old diagonal (-55, -65) -> (-61, -71) hit maxWaterDepth = 0.357
      const p = T.player.position;
      const diagSamples = [];
      let diagMaxWater = 0;
      let diagMaxWaterPostStep = 0;

      p.set(-55, T.sampleHeight(-55, -65) + 0.05, -65);
      for (let i = 0; i <= 30; i++) {
        const sx = -55 - 0.2 * i;
        const sz = -65 - 0.2 * i;
        const sy = T.sampleHeight(sx, sz);
        const preWater = T.waterDepthAt(sx, sz);
        p.set(sx, sy + 0.05, sz);
        T.stepFrame(0.04);
        const postWater = T.waterDepthAt(p.x, p.z);
        if (preWater > diagMaxWater) diagMaxWater = preWater;
        if (postWater > diagMaxWaterPostStep) diagMaxWaterPostStep = postWater;
        diagSamples.push({
          step: i,
          target: { x: +sx.toFixed(2), z: +sz.toFixed(2) },
          preWater: +preWater.toFixed(3),
          postPos: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) },
          postWater: +postWater.toFixed(3)
        });
      }
      res.diagonalAnalysis = {
        maxPreWater: +diagMaxWater.toFixed(3),
        maxPostWater: +diagMaxWaterPostStep.toFixed(3),
        note: 'Diagonal (-55,-65)->(-61,-71) cuts southwest directly into the lake contour rather than following the shoreline curvature around the wall stub at (-57.2, -68.2).',
        samples: diagSamples.filter((_, idx) => idx % 5 === 0 || idx === 30)
      };

      // 2. Static resolver survey along the actual dry shoreline waypoints
      const wpResults = waypoints.map((wp) => {
        const y = T.sampleHeight(wp.x, wp.z);
        const water = T.waterDepthAt(wp.x, wp.z);
        const slope = T.terrainSlope(wp.x, wp.z);
        const resolved = T.resolveStaticProps(wp.x, wp.z, 0.35, y);
        const push = Math.hypot(resolved.x - wp.x, resolved.z - wp.z);
        const wallBlocked = T.wallBandsDbg ? T.wallBandsDbg.blocked(wp.x, wp.z, 0.35) : false;
        return {
          x: wp.x,
          z: wp.z,
          y: +y.toFixed(3),
          water: +water.toFixed(3),
          slope: +slope.toFixed(3),
          push: +push.toFixed(4),
          wallBlocked
        };
      });
      res.surveyedWaypoints = wpResults;

      // Distance from stub tip (-57.2, -68.2) to nearest waypoint and clearance
      const stubTip = { x: -57.2, z: -68.2 };
      let minStubDist = Infinity;
      for (const wp of waypoints) {
        const d = Math.hypot(wp.x - stubTip.x, wp.z - stubTip.z);
        if (d < minStubDist) minStubDist = d;
      }
      res.stubTipDistance = +minStubDist.toFixed(2);

      // 3. Forward walk along the waypoints using small interpolated steps + stepFrame
      let fwdStops = 0;
      let fwdMaxWater = 0;
      let fwdMaxPush = 0;
      let fwdSteps = 0;
      const fwdPositions = [];

      // Start at waypoint 0
      p.set(waypoints[0].x, T.sampleHeight(waypoints[0].x, waypoints[0].z) + 0.05, waypoints[0].z);
      for (let w = 0; w < waypoints.length - 1; w++) {
        const from = waypoints[w];
        const to = waypoints[w + 1];
        const dist = Math.hypot(to.x - from.x, to.z - from.z);
        const substeps = Math.max(1, Math.ceil(dist / 0.25));
        for (let s = 1; s <= substeps; s++) {
          const t = s / substeps;
          const targetX = from.x + (to.x - from.x) * t;
          const targetZ = from.z + (to.z - from.z) * t;
          const prevX = p.x, prevZ = p.z;
          p.set(targetX, T.sampleHeight(targetX, targetZ) + 0.05, targetZ);
          T.stepFrame(0.04);
          fwdSteps++;
          const actualWater = T.waterDepthAt(p.x, p.z);
          if (actualWater > fwdMaxWater) fwdMaxWater = actualWater;
          const deltaMove = Math.hypot(p.x - prevX, p.z - prevZ);
          if (deltaMove < 0.02) fwdStops++;
          fwdPositions.push({ x: +p.x.toFixed(2), z: +p.z.toFixed(2), water: +actualWater.toFixed(3) });
        }
      }
      res.forwardWalk = {
        totalSteps: fwdSteps,
        stops: fwdStops,
        maxWaterDepth: +fwdMaxWater.toFixed(3),
        isDry: fwdMaxWater <= 0.05,
        pass: fwdStops === 0 && fwdMaxWater <= 0.05
      };

      // 4. Reverse walk (return along the waypoints)
      let revStops = 0;
      let revMaxWater = 0;
      let revSteps = 0;
      const lastWp = waypoints[waypoints.length - 1];
      p.set(lastWp.x, T.sampleHeight(lastWp.x, lastWp.z) + 0.05, lastWp.z);
      for (let w = waypoints.length - 1; w > 0; w--) {
        const from = waypoints[w];
        const to = waypoints[w - 1];
        const dist = Math.hypot(to.x - from.x, to.z - from.z);
        const substeps = Math.max(1, Math.ceil(dist / 0.25));
        for (let s = 1; s <= substeps; s++) {
          const t = s / substeps;
          const targetX = from.x + (to.x - from.x) * t;
          const targetZ = from.z + (to.z - from.z) * t;
          const prevX = p.x, prevZ = p.z;
          p.set(targetX, T.sampleHeight(targetX, targetZ) + 0.05, targetZ);
          T.stepFrame(0.04);
          revSteps++;
          const actualWater = T.waterDepthAt(p.x, p.z);
          if (actualWater > revMaxWater) revMaxWater = actualWater;
          const deltaMove = Math.hypot(p.x - prevX, p.z - prevZ);
          if (deltaMove < 0.02) revStops++;
        }
      }
      res.reverseWalk = {
        totalSteps: revSteps,
        stops: revStops,
        maxWaterDepth: +revMaxWater.toFixed(3),
        isDry: revMaxWater <= 0.05,
        pass: revStops === 0 && revMaxWater <= 0.05
      };

      return res;
    })(${JSON.stringify(WAYPOINTS)})`);

    console.log('Survey results:');
    console.log('Diagonal analysis maxPreWater:', survey.diagonalAnalysis.maxPreWater, 'maxPostWater:', survey.diagonalAnalysis.maxPostWater);
    console.log('Forward walk:', survey.forwardWalk);
    console.log('Reverse walk:', survey.reverseWalk);
    console.log('Waypoints count:', survey.surveyedWaypoints.length);
    console.log('Stub tip distance to route:', survey.stubTipDistance);

    fs.writeFileSync(path.join(OUT, 'se-shore-survey.json'), JSON.stringify(survey, null, 2));
    console.log('Saved survey to qa/2026-11-01-AG-192/se-shore-survey.json');

    if (page.errors.length) {
      console.warn('Page errors occurred:', page.errors.slice(0, 3));
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

run().catch((err) => {
  console.error('Survey error:', err);
  process.exit(1);
});
