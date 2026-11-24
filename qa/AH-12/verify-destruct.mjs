// qa/AH-12/verify-destruct.mjs — Native RTX 5080 WebGPU before/after visual verification & performance benchmark
// Run strictly through the game-test slot queue (Rule 16):
//   node crew/crew.mjs slot run antigravity2 AH-12 --checks "AH-12 native GPU proof + perf" -- node qa/AH-12/verify-destruct.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT = path.join(ROOT, 'qa', 'AH-12');
fs.mkdirSync(OUT, { recursive: true });

const WIDTH = 1600, HEIGHT = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false, args: ['--window-size=1620,960'] });
  try {
    const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
    await page.goto(`${server.origin}/?debug=1`);

    // 1. Wait for opening overlay, dismiss it cleanly, and wait until boot warmup + handover are 100% finished
    //    (matching tools/shoot.mjs so we never collide with boot warmup!)
    await page.waitFor(`!!window.DWOpening`, { timeout: 60000, every: 150 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
        const b = document.getElementById('openingSkip'); if (b) b.click();
      })()`);
      await sleep(300);
    }
    const ready = await page.waitFor(`!!(window.TT && document.getElementById('modeTraining') && window.DWOpening && window.DWOpening.active === false)`, { timeout: 120000, every: 200 });
    if (!ready) {
      console.error('PAGE_ERRORS:', page.errors);
      console.error('PAGE_CONSOLE:', page.console.slice(-25));
      throw new Error('Title menu / DWOpening did not finish within 120s');
    }
    await sleep(800);

    // 2. Enter Training Ground and wait until trainingWarmCompile finishes and frames are actively drawing!
    await page.evaluate(`(() => {
      const nm = document.getElementById('playerName'); if (nm) nm.value = 'AH-12';
      document.getElementById('modeTraining').click();
    })()`);
    const entered = await page.waitFor(`(() => {
      const st = window.TT?.trainingDbg?.state?.();
      const blk = document.getElementById('trainingBlackout');
      const info = window.TT?.renderer?.info?.render || {};
      const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
      return !!(st && st.active && !st.warming && (!blk || !blk.classList.contains('on')) && draws > 0);
    })()`, { timeout: 45000, every: 200 });
    if (!entered) {
      const diag = await page.evaluate(`(() => ({
        openingActive: window.DWOpening?.active,
        training: { active: TT?.trainingDbg?.state?.()?.active, warming: TT?.trainingDbg?.state?.()?.warming },
        blackoutOn: document.getElementById('trainingBlackout')?.classList.contains('on'),
        renderInfo: TT?.renderer?.info?.render
      }))()`).catch(() => null);
      console.error('ENTER_DIAG:', JSON.stringify(diag));
      console.error('PAGE_ERRORS:', page.errors);
      console.error('PAGE_CONSOLE:', page.console.slice(-25));
      throw new Error('Training Ground did not render live frames after entry');
    }
    await sleep(600);

    const setView = async (spec) => {
      await page.evaluate(`(() => {
        const O = TT.trainingDbg.tg().origin;
        const s = ${JSON.stringify(spec)};
        // Move player close enough for cutaway/LOD to stay crisp without blocking lens
        if (s.px != null && TT.player) {
          TT.player.position.set(O.x + s.px, O.y, O.z + s.pz);
        }
        TT.setShotView({ x: O.x + s.x, y: O.y + s.y, z: O.z + s.z, tx: O.x + s.tx, ty: O.y + s.ty, tz: O.z + s.tz, fov: s.fov || 56 });
      })()`);
      await sleep(320);
    };

    const snap = async (name) => {
      const p = path.join(OUT, name);
      await page.screenshot(p);
      console.log('SHOT', name, fs.statSync(p).size, 'bytes');
    };

    const samplePerf = async (frames = 60) => page.evaluate(`(async () => {
      const dts = [], calls = [], tris = [];
      let prev = performance.now();
      for (let i = 0; i < ${frames}; i++) {
        await new Promise(r => requestAnimationFrame(r));
        const now = performance.now();
        dts.push(now - prev);
        prev = now;
        const info = TT.renderer?.info?.render;
        if (info) {
          calls.push(info.drawCalls != null ? info.drawCalls : (info.calls || 0));
          tris.push(info.triangles || 0);
        }
      }
      dts.sort((a, b) => a - b);
      const avg = dts.reduce((a, b) => a + b, 0) / dts.length;
      const p95 = dts[Math.min(dts.length - 1, Math.floor(dts.length * 0.95))];
      const max = dts[dts.length - 1];
      const maxCalls = calls.length ? Math.max(...calls) : -1;
      const avgCalls = calls.length ? Math.round(calls.reduce((a, b) => a + b, 0) / calls.length) : -1;
      const maxTris = tris.length ? Math.max(...tris) : -1;
      return { avgMs: +avg.toFixed(2), p95Ms: +p95.toFixed(2), maxMs: +max.toFixed(2), fps: +(1000 / Math.max(0.1, avg)).toFixed(1), avgCalls, maxCalls, maxTris };
    })()`);

    // Verify backend & bindings
    const meta = await page.evaluate(`(() => {
      const tg = TT.trainingDbg.tg();
      const D = tg.destructibles, K = tg.kitProps;
      return {
        backend: TT.renderer?.backend?.isWebGPUBackend ? 'WebGPU' : (TT.renderer?.isWebGPURenderer ? 'WebGPU/Fallback' : 'WebGL'),
        destructCount: D ? D.entries.length : 0,
        destructBound: D ? D.entries.filter(e => e.recs.every(r => r.range || r.unbaked)).length : 0,
        kitCount: K ? K.entries.length : 0,
        spillsVisibleAtRest: tg.group.getObjectByName('training-prop-spills')?.visible,
        moundsVisibleAtRest: tg.group.getObjectByName('training-sand-mounds')?.visible
      };
    })()`);
    console.log('META', JSON.stringify(meta));

    // ---- 1. Baseline Idle Performance & BEFORE Shots
    const views = {
      range: { x: -4.1, y: 1.85, z: -2.6, tx: -7.1, ty: 1.05, tz: -0.1, fov: 56, px: -3.2, pz: -4.0 },
      backwall: { x: 2.2, y: 1.75, z: -6.2, tx: 3.1, ty: 1.35, tz: -11.9, fov: 58, px: 1.5, pz: -5.0 },
      infirmary: { x: -37.6, y: 1.95, z: -7.6, tx: -40.2, ty: 0.9, tz: -10.8, fov: 62, px: -36.5, pz: -5.8 },
      sandbags: { x: -21.2, y: 1.55, z: 24.4, tx: -20.95, ty: 0.25, tz: 27.6, fov: 50, px: -22.5, pz: 22.0 },
      mop: { x: -40.5, y: 1.65, z: 24.0, tx: -43.4, ty: 0.5, tz: 26.6, fov: 52, px: -38.5, pz: 22.0 }
    };

    await setView(views.range);
    const perfIdle = await samplePerf(60);
    console.log('PERF_IDLE', JSON.stringify(perfIdle));
    await snap('01-range-before.png');

    await setView(views.backwall);
    await snap('02-backwall-before.png');

    await setView(views.infirmary);
    await snap('03-infirmary-before.png');

    await setView(views.sandbags);
    await snap('04-sandbags-before.png');

    await setView(views.mop);
    await snap('05-mop-before.png');

    // ---- 2. Measure First-Hit Frame Time & Destroy Range Bench / Monitor / Signs
    await setView(views.range);
    const firstHitMs = await page.evaluate(`(async () => {
      const tg = TT.trainingDbg.tg(), D = tg.destructibles, K = tg.kitProps;
      const cen = s => ({ x: (s.minX + s.maxX) * 0.5, y: (s.minY + s.maxY) * 0.5, z: (s.minZ + s.maxZ) * 0.5 });
      const mug = K.entries.find(e => e.id === 'mug');
      const clip = K.entries.find(e => e.id === 'clipboard');
      const bucket = K.entries.find(e => e.id === 'brassBucket');
      const tray = K.entries.find(e => e.id === 'earTray');
      const mon = D.byId('crackedMonitor');
      const signC = D.byId('signCease');
      const t0 = performance.now();
      K.hit(mug.solid, cen(mug.solid), { x: 0.3, y: -0.1, z: 0.9 }, 25, 'bullet');
      K.hit(clip.solid, cen(clip.solid), { x: 0.4, y: 0.1, z: 0.9 }, 25, 'bullet');
      K.hit(bucket.solid, cen(bucket.solid), { x: 0.6, y: -0.1, z: -0.7 }, 25, 'bullet');
      K.hit(tray.solid, cen(tray.solid), { x: 0.2, y: 0.1, z: 0.9 }, 25, 'bullet');
      D.hit(mon.solid, cen(mon.solid), { x: -1, y: 0, z: 0 }, 25, 'bullet');
      D.hit(signC.solid, cen(signC.solid), { x: -0.7, y: 0, z: 0.7 }, 25, 'bullet');
      await new Promise(r => requestAnimationFrame(r));
      const dt1 = performance.now() - t0;
      await new Promise(r => requestAnimationFrame(r));
      const dt2 = performance.now() - t0;
      return { dt1: +dt1.toFixed(2), dt2: +dt2.toFixed(2) };
    })()`);
    console.log('FIRST_HIT_MS', JSON.stringify(firstHitMs));
    await sleep(550);
    await snap('01-range-after.png');

    // ---- 3. Back wall: DAYS board crooked + roster/calendar ripped + rack ear defenders + markers + radio
    await setView(views.backwall);
    await page.evaluate(`(() => {
      const tg = TT.trainingDbg.tg(), D = tg.destructibles, K = tg.kitProps;
      const cen = s => ({ x: (s.minX + s.maxX) * 0.5, y: (s.minY + s.maxY) * 0.5, z: (s.minZ + s.maxZ) * 0.5 });
      for (const id of ['daysBoard', 'roster', 'calendar', 'rackMuff0', 'rackMuff1', 'radio']) {
        const e = D.byId(id);
        if (e) D.hit(e.solid, cen(e.solid), { x: 0.15, y: 0.1, z: -0.95 }, 25, 'bullet');
      }
      const mk = K.entries.find(e => e.id === 'markers');
      if (mk) K.hit(mk.solid, cen(mk.solid), { x: 0.1, y: 0.1, z: -0.95 }, 25, 'bullet');
    })()`);
    await sleep(500);
    await snap('02-backwall-after.png');

    // ---- 4. Infirmary: Mid-flight Pressurized O2 Rocket + IV Saline Burst + Shattered Vitals Monitor + Med Boxes + Mug
    await setView(views.infirmary);
    await page.evaluate(`(() => {
      const tg = TT.trainingDbg.tg(), D = tg.destructibles, K = tg.kitProps;
      const cen = s => ({ x: (s.minX + s.maxX) * 0.5, y: (s.minY + s.maxY) * 0.5, z: (s.minZ + s.maxZ) * 0.5 });
      const hitD = (id, dir) => { const e = D.byId(id); if (e) D.hit(e.solid, cen(e.solid), dir, 25, 'bullet'); };
      hitD('oxygenTank', { x: 0.4, y: 0.1, z: 0.9 });
      hitD('ivStand', { x: 0.6, y: 0.0, z: 0.7 });
      hitD('medMonitor', { x: 0.0, y: 0.0, z: -1.0 });
      hitD('medBoxes', { x: -0.2, y: 0.1, z: 0.9 });
      hitD('firstAidCase', { x: 0.3, y: 0.1, z: 0.9 });
      hitD('cotBlanket', { x: -0.5, y: 0.2, z: 0.8 });
      const mm = K.entries.find(e => e.id === 'medMug');
      if (mm) K.hit(mm.solid, cen(mm.solid), { x: 0.2, y: 0, z: -0.9 }, 25, 'bullet');
    })()`);
    await sleep(420);
    await snap('03-o2-rocket-mid.png');

    // Measure active destruction performance during O2 rocket flight + rupture + particles!
    const perfActive = await samplePerf(90);
    console.log('PERF_ACTIVE', JSON.stringify(perfActive));

    // Wait for O2 rupture & debris settle, then break medMonitor Stage 2 too
    await sleep(1400);
    await page.evaluate(`(() => {
      const tg = TT.trainingDbg.tg(), D = tg.destructibles;
      const cen = s => ({ x: (s.minX + s.maxX) * 0.5, y: (s.minY + s.maxY) * 0.5, z: (s.minZ + s.maxZ) * 0.5 });
      const mm = D.byId('medMonitor');
      if (mm && mm.state !== 'broken') D.hit(mm.solid, cen(mm.solid), { x: 0.1, y: 0.1, z: 0.95 }, 30, 'bullet');
      const oc = D.byId('obsChart');
      if (oc) D.hit(oc.solid, cen(oc.solid), { x: 0.9, y: 0.1, z: 0.2 }, 25, 'bullet');
    })()`);
    await sleep(650);
    await snap('03-infirmary-after.png');

    // ---- 5. Sandbags rupture -> slumped sand mounds + top bag collapse
    await setView(views.sandbags);
    await page.evaluate(`(() => {
      const tg = TT.trainingDbg.tg(), D = tg.destructibles;
      const cen = s => ({ x: (s.minX + s.maxX) * 0.5, y: (s.minY + s.maxY) * 0.5, z: (s.minZ + s.maxZ) * 0.5 });
      const b0 = D.byId('sandbag0'), b1 = D.byId('sandbag1');
      if (b0) for (let i = 0; i < 3; i++) D.hit(b0.solid, cen(b0.solid), { x: 0, y: 0, z: 1 }, 25, 'bullet');
      if (b1) D.hit(b1.solid, cen(b1.solid), { x: 0, y: 0, z: 1 }, 25, 'bullet'); // slumped visibly!
    })()`);
    await sleep(750);
    await snap('04-sandbags-after.png');

    // ---- 6. Mop bucket tipped -> wet floor puddle + fallen mop & squeegee
    await setView(views.mop);
    await page.evaluate(`(() => {
      const tg = TT.trainingDbg.tg(), K = tg.kitProps;
      const cen = s => ({ x: (s.minX + s.maxX) * 0.5, y: (s.minY + s.maxY) * 0.5, z: (s.minZ + s.maxZ) * 0.5 });
      const mb = K.entries.find(e => e.id === 'mopBucket');
      const sq = K.entries.find(e => e.id === 'squeegee');
      if (mb) K.hit(mb.solid, cen(mb.solid), { x: 0.8, y: 0.1, z: -0.6 }, 25, 'bullet');
      if (sq) K.hit(sq.solid, cen(sq.solid), { x: 0.7, y: 0.1, z: -0.4 }, 25, 'bullet');
    })()`);
    await sleep(700);
    await snap('05-mop-after.png');

    // ---- 7. Clean Reset Verification (via real trainingClear) & Post-Reset Performance Check
    await setView(views.infirmary);
    const resetStats = await page.evaluate(`(() => {
      const tg = TT.trainingDbg.tg();
      TT.trainingDbg.clear();
      return {
        loose: tg.destructibles.loose(),
        spills: tg.destructibles.spills(),
        mounds: tg.destructibles.mounds(),
        kitLoose: tg.kitProps.loose(),
        spillsVis: tg.group.getObjectByName('training-prop-spills')?.visible,
        moundsVis: tg.group.getObjectByName('training-sand-mounds')?.visible,
        allStill: tg.destructibles.entries.every(e => e.state === 'still')
      };
    })()`);
    await sleep(400);
    await snap('06-infirmary-reset.png');

    await setView(views.range);
    const perfReset = await samplePerf(60);
    const errors = [...page.errors, ...page.console.filter(c => c.type === 'error').map(c => c.text)];
    console.log('RESET_STATS', JSON.stringify(resetStats));
    console.log('PERF_RESET', JSON.stringify(perfReset));
    console.log('ERRORS', errors.length, errors);

    fs.writeFileSync(path.join(OUT, 'perf.json'), JSON.stringify({
      meta, perfIdle, firstHitMs, perfActive, perfReset, resetStats, errors
    }, null, 2));

    if (errors.length) {
      throw new Error('Browser console/page errors: ' + errors.join(' | '));
    }
    if (!resetStats.allStill || resetStats.loose !== 0 || resetStats.spills !== 0 || resetStats.mounds !== 0) {
      throw new Error('Reset incomplete: ' + JSON.stringify(resetStats));
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
