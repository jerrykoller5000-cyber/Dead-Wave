import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-06-AG-239');
const LIB_JS_PATH = path.join(ROOT, 'tools/tests/lib.js');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function captureFile(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 92;
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[AG-239] Saved screenshot: ${filename}`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function classifySound(entry) {
  const text = `${entry.kind || ''} ${entry.name || ''} ${entry.file || ''}`.toLowerCase();
  const flags = [];
  if (/chain/i.test(text)) flags.push('CHAIN');
  if (/jingle/i.test(text)) flags.push('JINGLE');
  if (/glass/i.test(text)) flags.push('GLASS');
  if (/metal|clink/i.test(text)) flags.push('METAL_CLINK');
  if (/rattle/i.test(text)) flags.push('RATTLE');
  return flags.length ? flags.join('|') : 'NONE';
}

function summarizeList(list, durationS) {
  const map = new Map();
  for (const item of list) {
    const key = `${item.kind}:${item.name || '?'}:${item.file || ''}`;
    if (!map.has(key)) {
      map.set(key, {
        kind: item.kind,
        name: item.name,
        file: item.file,
        v: item.v,
        count: 0,
        classification: classifySound(item),
        bus: (item.name && item.name.startsWith('world/')) ? 'amb' : (item.name && item.name.startsWith('music')) ? 'music' : 'fx',
      });
    }
    map.get(key).count += 1;
  }
  const items = [...map.values()].map((entry) => ({
    ...entry,
    ratePerSec: +(entry.count / (durationS || 20)).toFixed(2),
  })).sort((a, b) => b.count - a.count);
  return items;
}

async function main() {
  console.log('======================================================================================');
  console.log('=== [AG-239] The chain sound, his way: the log (CL-295, J53)                       ===');
  console.log('======================================================================================\n');

  const telemetry = {
    timestamp: new Date().toISOString(),
    agent: 'antigravity',
    task: 'AG-239',
    runs: {
      tg_first_person: {},
      tg_third_person: {},
      trail_first_person: {},
      trail_third_person: {},
    },
    tables: {},
  };

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-239] Server running at:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch { /* keep existing bounds */ }

    // Helper injected into page for moving and tracing
    const INJECTED_HELPERS = `
      window.__ag239 = {
        setupKeys() {
          this.key = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
        },
        async startLeg(isRun, area, viewFirst) {
          const T = window.TT;
          const A = T.AudioSys;
          if (T.setViewFirstDbg) T.setViewFirstDbg(viewFirst);
          if (A.unlock) A.unlock();
          if (A.setMuted) A.setMuted(false);
          if (A.takesInit) await A.takesInit();

          let p0, p1, tyawFwd, tyawRev;
          if (area === 'tg') {
            const g = T.trainingDbg && T.trainingDbg.tg && T.trainingDbg.tg();
            const floorY = g ? g.floorY : -200;
            p0 = { x: -26, y: floorY, z: -6 };
            p1 = { x: -26, y: floorY, z: 18 };
            tyawFwd = 0;
            tyawRev = Math.PI;
            T.player.position.set(-26, floorY, 6);
          } else {
            p0 = { x: 38, z: -19 };
            p1 = { x: 6, z: -8 };
            tyawFwd = Math.atan2(p1.x - p0.x, p1.z - p0.z);
            tyawRev = tyawFwd + Math.PI;
            const gy = T.sampleHeight(22, -13.5);
            T.player.position.set(22, gy, -13.5);
          }

          this.state = {
            isRun,
            area,
            viewFirst,
            dir: 1,
            p0,
            p1,
            tyawFwd,
            tyawRev,
            curYaw: tyawFwd,
            reversals: 0,
            totalDist: 0,
            lastPos: { x: T.player.position.x, y: T.player.position.y, z: T.player.position.z },
            t0: performance.now()
          };

          T.player.rotation.y = tyawFwd;
          T.setAimYawDbg(tyawFwd);
          T.setOtsAimDbg(tyawFwd, 0);
          T.setVelDbg(0, 0);

          A.traceDbg(true);
          this.key('keydown', 'KeyW');
          if (isRun) this.key('keydown', 'ShiftLeft');
        },
        async stepLeg(durationMs) {
          const T = window.TT;
          const st = this.state;
          const tEnd = performance.now() + durationMs;
          while (performance.now() < tEnd) {
            await new Promise(r => setTimeout(r, 40));
            const px = T.player.position.x, pz = T.player.position.z;
            const dStep = Math.hypot(px - st.lastPos.x, pz - st.lastPos.z);
            st.totalDist += dStep;
            st.lastPos = { x: px, y: T.player.position.y, z: pz };

            if (st.area === 'tg') {
              if (st.dir > 0 && pz >= st.p1.z) {
                st.dir = -1;
                st.curYaw = st.tyawRev;
                st.reversals++;
              } else if (st.dir < 0 && pz <= st.p0.z) {
                st.dir = 1;
                st.curYaw = st.tyawFwd;
                st.reversals++;
              }
            } else {
              const dToP1 = Math.hypot(px - st.p1.x, pz - st.p1.z);
              const dToP0 = Math.hypot(px - st.p0.x, pz - st.p0.z);
              if (st.dir > 0 && dToP1 < 3.5) {
                st.dir = -1;
                st.curYaw = st.tyawRev;
                st.reversals++;
              } else if (st.dir < 0 && dToP0 < 3.5) {
                st.dir = 1;
                st.curYaw = st.tyawFwd;
                st.reversals++;
              }
            }
            T.player.rotation.y = st.curYaw;
            T.setAimYawDbg(st.curYaw);
            T.setOtsAimDbg(st.curYaw, 0);
          }
        },
        stopLeg() {
          const T = window.TT;
          const A = T.AudioSys;
          const st = this.state;
          this.key('keyup', 'KeyW');
          if (st.isRun) this.key('keyup', 'ShiftLeft');
          T.setVelDbg(0, 0);

          const traceList = A.traceDbg(false);
          const elapsedS = +((performance.now() - st.t0) / 1000).toFixed(3);

          let distPath = null;
          let groundType = null;
          try {
            if (T.rabbitDbg && T.rabbitDbg.distToPath) {
              distPath = +T.rabbitDbg.distToPath(T.player.position.x, T.player.position.z).toFixed(3);
            }
            if (T.stepGround) groundType = T.stepGround();
          } catch (_) {}

          return {
            traceList,
            elapsedS,
            totalDist: +st.totalDist.toFixed(2),
            avgSpeed: +(st.totalDist / elapsedS).toFixed(2),
            reversals: st.reversals,
            finalPos: [+T.player.position.x.toFixed(2), +T.player.position.y.toFixed(2), +T.player.position.z.toFixed(2)],
            distToPath: distPath,
            groundType,
            isTraining: !!(T.trainingDbg && T.trainingDbg.state().active),
            viewFirst: !!(T.fpDbg && T.fpDbg().first)
          };
        }
      };
    `;

    // =========================================================================
    // PART 1: Training Ground (First Person & Third Person)
    // =========================================================================
    console.log('\n--- PART 1: Training Ground (Jerry\'s Launcher) ---');
    console.log('[AG-239] Navigating to game...');
    await page.goto(url, { timeout: 180000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
      throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
    }

    // Dismiss opening
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    const libCode = fs.readFileSync(LIB_JS_PATH, 'utf8');
    await page.evaluate(libCode);
    await page.evaluate(INJECTED_HELPERS);
    await page.evaluate(`window.__ag239.setupKeys()`);

    console.log('[AG-239] Entering Training Ground as JERRY...');
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'JERRY';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
    })()`);

    if (!(await page.waitFor('window.TT && window.TT.trainingDbg && window.TT.trainingDbg.state().active', { timeout: 30000 }))) {
      throw new Error('Training Ground failed to become active');
    }
    await wait(2000);
    console.log('[AG-239] Training Ground active.');

    // --- Run 1: Training Ground - First Person ---
    console.log('\n>>> Starting Run 1: Training Ground - First Person (Walk 20s, Run 20s)...');
    // Walk 20s
    console.log('  [TG-FP] Walking for 20 s...');
    await page.evaluate(`window.__ag239.startLeg(false, 'tg', true)`);
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    await captureFile(page, 'tg-fp-walk.jpg');
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    const tgFpWalk = await page.evaluate(`window.__ag239.stopLeg()`);
    console.log(`  [TG-FP Walk Done] Moved ${tgFpWalk.totalDist} m in ${tgFpWalk.elapsedS} s (${tgFpWalk.avgSpeed} m/s, ${tgFpWalk.reversals} reversals), ${tgFpWalk.traceList.length} sound events`);

    await wait(1000);

    // Run 20s
    console.log('  [TG-FP] Running for 20 s...');
    await page.evaluate(`window.__ag239.startLeg(true, 'tg', true)`);
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    await captureFile(page, 'tg-fp-run.jpg');
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    const tgFpRun = await page.evaluate(`window.__ag239.stopLeg()`);
    console.log(`  [TG-FP Run Done] Moved ${tgFpRun.totalDist} m in ${tgFpRun.elapsedS} s (${tgFpRun.avgSpeed} m/s, ${tgFpRun.reversals} reversals), ${tgFpRun.traceList.length} sound events`);

    telemetry.runs.tg_first_person = {
      walk: tgFpWalk,
      run: tgFpRun,
      walkSummary: summarizeList(tgFpWalk.traceList, tgFpWalk.elapsedS),
      runSummary: summarizeList(tgFpRun.traceList, tgFpRun.elapsedS),
    };

    await wait(1500);

    // --- Run 2: Training Ground - Third Person ---
    console.log('\n>>> Starting Run 2: Training Ground - Third Person (Walk 20s, Run 20s)...');
    // Walk 20s
    console.log('  [TG-TP] Walking for 20 s...');
    await page.evaluate(`window.__ag239.startLeg(false, 'tg', false)`);
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    await captureFile(page, 'tg-tp-walk.jpg');
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    const tgTpWalk = await page.evaluate(`window.__ag239.stopLeg()`);
    console.log(`  [TG-TP Walk Done] Moved ${tgTpWalk.totalDist} m in ${tgTpWalk.elapsedS} s (${tgTpWalk.avgSpeed} m/s, ${tgTpWalk.reversals} reversals), ${tgTpWalk.traceList.length} sound events`);

    await wait(1000);

    // Run 20s
    console.log('  [TG-TP] Running for 20 s...');
    await page.evaluate(`window.__ag239.startLeg(true, 'tg', false)`);
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    await captureFile(page, 'tg-tp-run.jpg');
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    const tgTpRun = await page.evaluate(`window.__ag239.stopLeg()`);
    console.log(`  [TG-TP Run Done] Moved ${tgTpRun.totalDist} m in ${tgTpRun.elapsedS} s (${tgTpRun.avgSpeed} m/s, ${tgTpRun.reversals} reversals), ${tgTpRun.traceList.length} sound events`);

    telemetry.runs.tg_third_person = {
      walk: tgTpWalk,
      run: tgTpRun,
      walkSummary: summarizeList(tgTpWalk.traceList, tgTpWalk.elapsedS),
      runSummary: summarizeList(tgTpRun.traceList, tgTpRun.elapsedS),
    };

    // =========================================================================
    // PART 2: Trail outside Threshold (First Person & Third Person)
    // =========================================================================
    console.log('\n--- PART 2: Trail Outside Threshold (Jerry\'s Launcher Match) ---');
    console.log('[AG-239] Reloading fresh page for outdoor match...');
    await page.goto(url, { timeout: 180000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
      throw new Error('window.TT never appeared on reload');
    }

    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    await page.evaluate(libCode);
    await page.evaluate(INJECTED_HELPERS);
    await page.evaluate(`window.__ag239.setupKeys()`);

    console.log('[AG-239] Starting match as JERRY...');
    await page.evaluate(`(async () => {
      await startMatch(window.TT, 'JERRY');
    })()`, 120000);

    // Stabilize match
    await page.evaluate(`(() => {
      const T = window.TT;
      if (T.clearZombies) T.clearZombies();
      T.setHp(1e5);
      if (T.setWorldTime) T.setWorldTime(12);
    })()`);
    await wait(1500);

    // --- Run 3: Trail outside Threshold - First Person ---
    console.log('\n>>> Starting Run 3: Trail Outside Threshold - First Person (Walk 20s, Run 20s)...');
    // Walk 20s
    console.log('  [Trail-FP] Walking for 20 s...');
    await page.evaluate(`window.__ag239.startLeg(false, 'trail', true)`);
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    await captureFile(page, 'trail-fp-walk.jpg');
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    const trailFpWalk = await page.evaluate(`window.__ag239.stopLeg()`);
    console.log(`  [Trail-FP Walk Done] Moved ${trailFpWalk.totalDist} m in ${trailFpWalk.elapsedS} s (${trailFpWalk.avgSpeed} m/s, ${trailFpWalk.reversals} reversals, distToPath=${trailFpWalk.distToPath} m), ${trailFpWalk.traceList.length} sound events`);

    await wait(1000);

    // Run 20s
    console.log('  [Trail-FP] Running for 20 s...');
    await page.evaluate(`window.__ag239.startLeg(true, 'trail', true)`);
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    await captureFile(page, 'trail-fp-run.jpg');
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    const trailFpRun = await page.evaluate(`window.__ag239.stopLeg()`);
    console.log(`  [Trail-FP Run Done] Moved ${trailFpRun.totalDist} m in ${trailFpRun.elapsedS} s (${trailFpRun.avgSpeed} m/s, ${trailFpRun.reversals} reversals, distToPath=${trailFpRun.distToPath} m), ${trailFpRun.traceList.length} sound events`);

    telemetry.runs.trail_first_person = {
      walk: trailFpWalk,
      run: trailFpRun,
      walkSummary: summarizeList(trailFpWalk.traceList, trailFpWalk.elapsedS),
      runSummary: summarizeList(trailFpRun.traceList, trailFpRun.elapsedS),
    };

    await wait(1500);

    // --- Run 4: Trail outside Threshold - Third Person ---
    console.log('\n>>> Starting Run 4: Trail Outside Threshold - Third Person (Walk 20s, Run 20s)...');
    // Walk 20s
    console.log('  [Trail-TP] Walking for 20 s...');
    await page.evaluate(`window.__ag239.startLeg(false, 'trail', false)`);
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    await captureFile(page, 'trail-tp-walk.jpg');
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    const trailTpWalk = await page.evaluate(`window.__ag239.stopLeg()`);
    console.log(`  [Trail-TP Walk Done] Moved ${trailTpWalk.totalDist} m in ${trailTpWalk.elapsedS} s (${trailTpWalk.avgSpeed} m/s, ${trailTpWalk.reversals} reversals, distToPath=${trailTpWalk.distToPath} m), ${trailTpWalk.traceList.length} sound events`);

    await wait(1000);

    // Run 20s
    console.log('  [Trail-TP] Running for 20 s...');
    await page.evaluate(`window.__ag239.startLeg(true, 'trail', false)`);
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    await captureFile(page, 'trail-tp-run.jpg');
    await page.evaluate(`window.__ag239.stepLeg(10000)`);
    const trailTpRun = await page.evaluate(`window.__ag239.stopLeg()`);
    console.log(`  [Trail-TP Run Done] Moved ${trailTpRun.totalDist} m in ${trailTpRun.elapsedS} s (${trailTpRun.avgSpeed} m/s, ${trailTpRun.reversals} reversals, distToPath=${trailTpRun.distToPath} m), ${trailTpRun.traceList.length} sound events`);

    telemetry.runs.trail_third_person = {
      walk: trailTpWalk,
      run: trailTpRun,
      walkSummary: summarizeList(trailTpWalk.traceList, trailTpWalk.elapsedS),
      runSummary: summarizeList(trailTpRun.traceList, trailTpRun.elapsedS),
    };

    // Build unified comparison tables per place and view
    function buildTable(walkList, runList, walkS, runS) {
      const combined = new Map();
      const add = (list, isRun) => {
        for (const it of list) {
          const key = `${it.kind}|${it.name || '?'}|${it.file || ''}`;
          if (!combined.has(key)) {
            combined.set(key, {
              kind: it.kind,
              name: it.name,
              file: it.file,
              bus: (it.name && it.name.startsWith('world/')) ? 'amb' : (it.name && it.name.startsWith('music')) ? 'music' : 'fx',
              classification: classifySound(it),
              walkCount: 0,
              runCount: 0,
            });
          }
          if (isRun) combined.get(key).runCount += 1;
          else combined.get(key).walkCount += 1;
        }
      };
      add(walkList, false);
      add(runList, true);

      return [...combined.values()].map((e) => ({
        ...e,
        totalCount: e.walkCount + e.runCount,
        walkRate: +(e.walkCount / walkS).toFixed(2),
        runRate: +(e.runCount / runS).toFixed(2),
      })).sort((a, b) => b.totalCount - a.totalCount);
    }

    telemetry.tables.tg_first_person = buildTable(tgFpWalk.traceList, tgFpRun.traceList, tgFpWalk.elapsedS, tgFpRun.elapsedS);
    telemetry.tables.tg_third_person = buildTable(tgTpWalk.traceList, tgTpRun.traceList, tgTpWalk.elapsedS, tgTpRun.elapsedS);
    telemetry.tables.trail_first_person = buildTable(trailFpWalk.traceList, trailFpRun.traceList, trailFpWalk.elapsedS, trailFpRun.elapsedS);
    telemetry.tables.trail_third_person = buildTable(trailTpWalk.traceList, trailTpRun.traceList, trailTpWalk.elapsedS, trailTpRun.elapsedS);

    // Save telemetry JSON
    const telemetryPath = path.join(OUT_DIR, 'telemetry.json');
    fs.writeFileSync(telemetryPath, JSON.stringify(telemetry, null, 2), 'utf8');
    console.log(`\n[AG-239] Wrote full telemetry to: ${telemetryPath}`);

    // Print summary tables
    for (const [tableKey, rows] of Object.entries(telemetry.tables)) {
      console.log(`\n=== Table: ${tableKey} ===`);
      console.log(`| Sound Name / ID | File | Bus | Walk Count (20s) | Run Count (20s) | Total | Classification |`);
      console.log(`|---|---|---|---|---|---|---|`);
      for (const r of rows) {
        const fileBase = r.file ? r.file.split('/').pop() : '-';
        console.log(`| ${r.name} | ${fileBase} | ${r.bus} | ${r.walkCount} | ${r.runCount} | ${r.totalCount} | ${r.classification} |`);
      }
    }

    console.log('\n[AG-239] All 4 runs completed successfully.');
  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[AG-239] Fatal error:', err);
  process.exit(1);
});
