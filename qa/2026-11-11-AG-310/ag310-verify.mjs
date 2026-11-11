// qa/2026-11-11-AG-310/ag310-verify.mjs
// RTX 5080 WebGPU BEFORE/AFTER visual + 3-run 1P/3P buy/mod/close benchmark for AG-310.
// Strictly one offscreen (-3800,-3800) browser instance at a time inside game-test slot.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_DIR = path.join(ROOT, 'qa/2026-11-11-AG-310');
fs.mkdirSync(OUT_DIR, { recursive: true });

const phaseArgIdx = process.argv.indexOf('--phase');
const PHASE = phaseArgIdx >= 0 && process.argv[phaseArgIdx + 1] ? process.argv[phaseArgIdx + 1] : 'after';
const VISUALS_ONLY = process.argv.includes('--visuals-only');
const RUNS = Number(process.env.AG310_RUNS || 3);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function writeAtomicJson(targetPath, data) {
  const tmp = targetPath + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, targetPath);
}

const ITEMS = [
  { id: 'pistol', kind: 'gun', buy: false, mod: true },
  { id: 'uzi', kind: 'gun', buy: true, mod: true },
  { id: 'shotgun', kind: 'gun', buy: true, mod: true },
  { id: 'revolver', kind: 'gun', buy: true, mod: true },
  { id: 'm4', kind: 'gun', buy: true, mod: true },
  { id: 'ak', kind: 'gun', buy: true, mod: true },
  { id: 'sniper', kind: 'gun', buy: true, mod: true },
  { id: 'launcher', kind: 'gun', buy: true, mod: true },
  { id: 'aa12', kind: 'gun', buy: true, mod: true },
  { id: 'minigun', kind: 'gun', buy: true, mod: true },
  { id: 'flamer', kind: 'gun', buy: true, mod: true },
  { id: 'chainsaw', kind: 'gun', buy: true, mod: true },
  { id: 'm240', kind: 'build', buy: true, mod: true },
  { id: 'mortar', kind: 'build', buy: true, mod: true }
];

async function moveOffscreen(page) {
  try {
    const win = await page.send('Browser.getWindowForTarget', {});
    if (win && win.windowId != null) {
      await page.send('Browser.setWindowBounds', {
        windowId: win.windowId,
        bounds: { left: -3800, top: -3800, width: 1280, height: 720, windowState: 'normal' }
      });
    }
  } catch (_) {}
}

async function withFreshPage(origin, fn) {
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ]
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.setViewport(1280, 720);
    await sleep(150);
    await moveOffscreen(page);
    await page.goto(`${origin}/index.html?debug=1`, { timeout: 120000 });
    await moveOffscreen(page);
    assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 }), 'TT ready');
    return await fn(page);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function installDiagAndEnterTraining(page, firstPerson) {
  await page.evaluate(`(() => {
    window.__ag310Diag = { inits: [], renders: [], toDataURLs: [], toBlobs: 0 };
    const RProto = window.TT.renderer.constructor.prototype;
    if (!RProto.__ag310Wrapped) {
      RProto.__ag310Wrapped = true;
      const origInit = RProto.init;
      const origRender = RProto.render;
      RProto.init = async function(...args) {
        const t0 = performance.now();
        const res = await origInit.apply(this, args);
        const dt = performance.now() - t0;
        const tag = this === window.TT.renderer ? 'main' : (this.domElement?.id || ((this.domElement?.width || 0) + 'x' + (this.domElement?.height || 0)));
        window.__ag310Diag.inits.push({ tag, ms: +dt.toFixed(1) });
        return res;
      };
      RProto.render = function(scene, cam) {
        const t0 = performance.now();
        const res = origRender.call(this, scene, cam);
        const dt = performance.now() - t0;
        const tag = this === window.TT.renderer ? 'main' : (this.domElement?.id || ((this.domElement?.width || 0) + 'x' + (this.domElement?.height || 0)));
        if (tag !== 'main' || dt > 20) {
          window.__ag310Diag.renders.push({ tag, ms: +dt.toFixed(1), at: +t0.toFixed(1) });
        }
        return res;
      };
    }
    if (!HTMLCanvasElement.prototype.__ag310Wrapped) {
      HTMLCanvasElement.prototype.__ag310Wrapped = true;
      const origTDU = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const t0 = performance.now();
        const out = origTDU.apply(this, args);
        const dt = performance.now() - t0;
        window.__ag310Diag.toDataURLs.push({ size: this.width + 'x' + this.height, ms: +dt.toFixed(1) });
        return out;
      };
      const origTB = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function(...args) {
        window.__ag310Diag.toBlobs++;
        return origTB.apply(this, args);
      };
    }
    DWOpening.dismissForTesting();
    document.getElementById('playerName').value = 'AG310';
    document.getElementById('modeTraining').click();
  })()`);
  assert(await page.waitFor('TT.trainingDbg.state().active', { timeout: 90000 }), 'Training active');
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 30000 }), 'Blackout lifted');
  await page.evaluate(`(() => {
    const T = TT, tg = T.trainingDbg.tg(), f = tg.stations.armory.front;
    T.player.position.set(f.x, tg.floorY, f.z);
    T.setVelDbg(0, 0);
    T.setViewFirstDbg(${firstPerson ? 'true' : 'false'});
    T.addCash(1000000);
  })()`);
  await sleep(1600);
}

async function captureVisuals(origin, phase) {
  return withFreshPage(origin, async (page) => {
    await installDiagAndEnterTraining(page, false);
    await page.evaluate(`(() => {
      const T = TT;
      T.setTimeDbg && T.setTimeDbg(12);
      T.addCash(1000000);
      for (const g of ['m4', 'ak', 'shotgun', 'uzi']) {
        if (!T.getWeaponOwned()[g]) {
          T.openMenuDbg('armory');
          document.querySelector('#armoryPanel [data-buy-gun="' + g + '"]')?.click();
          document.querySelector('#armoryPanel .armory-actions button:last-child')?.click();
        }
      }
      T.buySuppressor('m4');
      T.armoryDbg.fit('m4', 'suppressor', true);
      T.opticDbg.grant('m4', 'reddot');
      T.opticDbg.fit('m4', 'reddot');
      T.buyExtMag('ak');
      T.armoryDbg.fit('ak', 'ext', true);
      T.armoryFinishDbg.paint('m4', 'm81');

      T.openMenuDbg('armory');
      const arm = T.armoryDbg.ui().armory;
      arm.take('m4', 'primary', 0);
      arm.take('ak', 'primary', 1);
      T.armoryDbg.ui().render();
      T.armoryDbg.ui().bench('m4');
      const more = document.querySelector('#armoryPanel [data-finish-more]');
      if (more) more.click();
    })()`);

    assert(await page.waitFor(`(() => {
      const panel = document.getElementById('armoryPanel');
      if (!panel || panel.hidden) return false;
      const realImgs = [...panel.querySelectorAll('.armory-pic.real img')];
      if (realImgs.length < 4 || !realImgs.every((i) => i.complete && i.naturalWidth > 0)) return false;
      const stage = panel.querySelector('.armory-preview-stage');
      const prevImg = stage && stage.querySelector('img');
      if (!stage || stage.dataset.ready !== 'true' || !prevImg || prevImg.hidden || !prevImg.complete || !prevImg.naturalWidth) return false;
      const swatches = panel.querySelectorAll('.armory-finish:not(.armory-laser) .armory-swatch');
      return swatches.length >= 30;
    })()`, { timeout: 25000, every: 100 }), 'Armory bench + pictures + swatches ready');
    await sleep(150);

    const benchShot = path.join(OUT_DIR, `${phase}-armory-bench.png`);
    await page.screenshot(benchShot);

    await page.evaluate(`(() => {
      const rightBtn = document.querySelector('#armoryPanel .armory-preview-actions button[data-turn="right"]');
      if (rightBtn) { rightBtn.click(); rightBtn.click(); }
    })()`);
    assert(await page.waitFor(`(() => {
      const stage = document.querySelector('#armoryPanel .armory-preview-stage');
      const img = stage && stage.querySelector('img');
      return stage && stage.dataset.ready === 'true' && img && !img.hidden && img.complete && img.naturalWidth > 0;
    })()`, { timeout: 15000, every: 100 }), 'Armory rotated preview ready');
    await sleep(120);

    const turnShot = path.join(OUT_DIR, `${phase}-armory-preview-turned.png`);
    await page.screenshot(turnShot);

    // Scroll #armoryPanel down to show all 34 .armory-swatch camo swatches clearly
    await page.evaluate(`(() => {
      const fin = document.querySelector('#armoryPanel .armory-finish:not(.armory-laser)');
      if (fin) fin.scrollIntoView({ block: 'center', behavior: 'instant' });
    })()`);
    await sleep(150);
    const swatchShot = path.join(OUT_DIR, `${phase}-armory-swatches.png`);
    await page.screenshot(swatchShot);

    await page.evaluate(`(async () => {
      const T = TT;
      document.querySelector('#armoryPanel .armory-actions button:last-child')?.click();
      if (T.isCIFOpen && T.isCIFOpen()) T.closeCIF();
      await new Promise((r) => setTimeout(r, 150));
      window.dwCifPose = (ud) => {
        if (ud.armLG) ud.armLG.rotation.set(0.04, 0.08, -0.14);
        if (ud.armRG) ud.armRG.rotation.set(0.04, -0.08, 0.14);
        if (ud.elbowLG) ud.elbowLG.rotation.set(-0.22, 0, 0);
        if (ud.elbowRG) ud.elbowRG.rotation.set(-0.22, 0, 0);
        return true;
      };
      T.openMenuDbg('cif');
      document.getElementById('cifFront')?.click();
    })()`);
    assert(await page.waitFor(`(() => {
      const m = document.getElementById('cifMarine');
      const cif = document.getElementById('cif');
      return cif && cif.classList.contains('show') && !cif.classList.contains('armory-only') && m && m.dataset.ready === 'true';
    })()`, { timeout: 20000, every: 100 }), 'CIF card + cifMarine ready');
    await page.evaluate(`(() => {
      const list = document.getElementById('cifList');
      const scroller = list && (list.closest('.cif-right') || list.parentElement);
      if (scroller) scroller.scrollTop = 220;
    })()`);
    await sleep(300);

    const cifShot = path.join(OUT_DIR, `${phase}-cif-card.png`);
    await page.screenshot(cifShot);

    const consoleErrors = page.console.filter((c) => c.type === 'error' && !/favicon\.ico/i.test(c.text) && !/status of 404/i.test(c.text)).map((c) => c.text);
    return { benchShot, turnShot, swatchShot, cifShot, runtimeErrors: [...page.errors], pageErrors: [...page.errors, ...consoleErrors] };
  });
}

async function runBenchmarkView(origin, viewName, runIdx) {
  const firstPerson = viewName === '1P';
  return withFreshPage(origin, async (page) => {
    await installDiagAndEnterTraining(page, firstPerson);
    const itemsJson = JSON.stringify(ITEMS);
    const result = await page.evaluate(`(async () => {
      const T = TT;
      const items = ${itemsJson};

      const waitFrames = (count) => new Promise((resolve) => {
        let left = count;
        function tick() {
          if (--left <= 0) resolve();
          else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });

      const measureAction = async (fn, settleFrames) => {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const gaps = [];
        let last = performance.now();
        let active = true;
        function monitor(now) {
          if (!active) return;
          gaps.push(+(now - last).toFixed(1));
          last = now;
          requestAnimationFrame(monitor);
        }
        requestAnimationFrame(monitor);
        const t0 = performance.now();
        await fn();
        const syncMs = +(performance.now() - t0).toFixed(1);
        await new Promise((resolve) => {
          let left = settleFrames;
          function doneTick() {
            if (--left <= 0) resolve();
            else requestAnimationFrame(doneTick);
          }
          requestAnimationFrame(doneTick);
        });
        active = false;
        const maxGap = gaps.length ? Math.max(...gaps) : syncMs;
        return {
          worstFrameMs: +Math.max(maxGap, syncMs).toFixed(1),
          maxRafGapMs: +maxGap.toFixed(1),
          syncMs
        };
      };

      await waitFrames(12);
      const perItem = [];

      for (const item of items) {
        T.addCash(1000000);
        const openRes = await measureAction(() => {
          T.doAction();
        }, 6);

        let buyRes = null;
        if (item.buy) {
          buyRes = await measureAction(() => {
            const sel = item.kind === 'gun'
              ? '#armoryPanel [data-buy-gun="' + item.id + '"]'
              : '#armoryPanel [data-buy-build="' + item.id + '"]';
            const btn = document.querySelector(sel);
            if (!btn || btn.disabled) throw new Error('Missing or disabled buy button for ' + item.id);
            btn.click();
          }, 8);
        }

        let modRes = null;
        if (item.kind === 'gun') {
          modRes = await measureAction(() => {
            T.armoryDbg.ui().bench(item.id);
            const modButtons = [...document.querySelectorAll('#armoryPanel .armory-mods li button')].filter((b) => !b.disabled);
            if (modButtons[0]) modButtons[0].click();
            const sw = document.querySelector('#armoryPanel .armory-finish:not(.armory-laser) .armory-swatch[data-finish="m81"]:not(:disabled)')
              || [...document.querySelectorAll('#armoryPanel .armory-finish:not(.armory-laser) .armory-swatch:not(:disabled)')].find((b) => b.dataset.finish);
            if (sw) sw.click();
            if (item.id === 'shotgun') {
              const typedBtn = document.querySelector('#armoryPanel [data-buy-ammo-type="buck"]:not(:disabled)');
              if (typedBtn) typedBtn.click();
            }
          }, 8);
        } else {
          modRes = await measureAction(() => {
            const ammoBtn = document.querySelector('#armoryPanel [data-buy-build-ammo="' + item.id + '"]:not(:disabled)');
            if (ammoBtn) ammoBtn.click();
          }, 6);
        }

        const closeRes = await measureAction(() => {
          const doneBtn = document.querySelector('#armoryPanel .armory-actions button:last-child');
          if (doneBtn) doneBtn.click();
          if (T.isCIFOpen && T.isCIFOpen()) T.closeCIF();
        }, 42);

        perItem.push({
          id: item.id,
          kind: item.kind,
          openMs: openRes.worstFrameMs,
          buyMs: buyRes ? buyRes.worstFrameMs : null,
          modMs: modRes ? modRes.worstFrameMs : null,
          closeMs: closeRes.worstFrameMs,
          detail: { open: openRes, buy: buyRes, mod: modRes, close: closeRes }
        });
      }

      return {
        view: T.fpDbg && T.fpDbg().first ? '1P' : '3P',
        diag: window.__ag310Diag,
        cifMarineReadyDuringArmoryOnly: document.getElementById('cifMarine')?.dataset.ready === 'true',
        perItem
      };
    })()`, 240000);

    const consoleErrors = page.console.filter((c) => c.type === 'error' && !/favicon\.ico/i.test(c.text) && !/status of 404/i.test(c.text)).map((c) => c.text);
    return {
      view: viewName,
      run: runIdx,
      runtimeErrors: [...page.errors],
      pageErrors: [...page.errors, ...consoleErrors],
      ...result
    };
  });
}

async function main() {
  const srv = await serve(ROOT, 0);
  try {
    console.log(`[AG-310] Capturing ${PHASE} visual reference shots on ${srv.origin}...`);
    const visuals = await captureVisuals(srv.origin, PHASE);
    console.log(`[AG-310] Visuals captured (runtimeErrors=${visuals.runtimeErrors.length}, consoleErrors=${visuals.pageErrors.length})`);
    if (VISUALS_ONLY) return;

    const runs = [];
    for (const view of ['1P', '3P']) {
      for (let r = 1; r <= RUNS; r++) {
        console.log(`[AG-310] Running ${PHASE} ${view} run ${r}/${RUNS}...`);
        const res = await runBenchmarkView(srv.origin, view, r);
        const worstOpen = Math.max(...res.perItem.map((x) => x.openMs || 0));
        const worstBuy = Math.max(...res.perItem.map((x) => x.buyMs || 0));
        const worstMod = Math.max(...res.perItem.map((x) => x.modMs || 0));
        const worstClose = Math.max(...res.perItem.map((x) => x.closeMs || 0));
        console.log(`  -> ${view} run ${r}: open=${worstOpen}ms buy=${worstBuy}ms mod=${worstMod}ms close=${worstClose}ms cifHiddenInit=${res.cifMarineReadyDuringArmoryOnly} runtimeErr=${res.runtimeErrors.length}`);
        runs.push(res);
      }
    }

    const summaryByView = {};
    for (const view of ['1P', '3P']) {
      const vRuns = runs.filter((x) => x.view === view);
      const itemsAgg = ITEMS.map((item) => {
        const entries = vRuns.map((vr) => vr.perItem.find((p) => p.id === item.id));
        const openRuns = entries.map((e) => e.openMs);
        const buyRuns = entries.map((e) => e.buyMs).filter((v) => v != null);
        const modRuns = entries.map((e) => e.modMs).filter((v) => v != null);
        const closeRuns = entries.map((e) => e.closeMs);
        return {
          id: item.id,
          kind: item.kind,
          openRuns,
          openWorstMs: Math.max(...openRuns),
          buyRuns,
          buyWorstMs: buyRuns.length ? Math.max(...buyRuns) : null,
          modRuns,
          modWorstMs: modRuns.length ? Math.max(...modRuns) : null,
          closeRuns,
          closeWorstMs: Math.max(...closeRuns)
        };
      });
      const allActionMax = Math.max(
        ...itemsAgg.map((i) => Math.max(i.openWorstMs || 0, i.buyWorstMs || 0, i.modWorstMs || 0, i.closeWorstMs || 0))
      );
      summaryByView[view] = {
        allActionWorstFrameMs: allActionMax,
        allUnder50Ms: allActionMax <= 50,
        cifMarineBootedInArmoryOnly: vRuns.some((vr) => vr.cifMarineReadyDuringArmoryOnly),
        totalRuntimeErrors: vRuns.reduce((s, vr) => s + vr.runtimeErrors.length, 0),
        totalPageErrors: vRuns.reduce((s, vr) => s + vr.pageErrors.length, 0),
        items: itemsAgg
      };
    }

    const outPayload = {
      phase: PHASE,
      timestamp: new Date().toISOString(),
      runsCount: RUNS,
      visualsRuntimeErrors: visuals.runtimeErrors,
      visualsPageErrors: visuals.pageErrors,
      summaryByView,
      runs
    };
    const outPath = path.join(OUT_DIR, `ag310-${PHASE}.json`);
    writeAtomicJson(outPath, outPayload);
    console.log(`[AG-310] Wrote ${outPath}`);
  } finally {
    await srv.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
