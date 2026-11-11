// qa/2026-11-11-AG-309-armory-hitch/probe-armory-hitch.mjs
// Exact RTX 5080 WebGPU attribution probe for GP-20105 / AG-309 Training Armory purchase/close hitch.
// Zero edits to game files; browser kept 100% offscreen (-3800,-3800) while Jerry sleeps.

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

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-309-armory-hitch');
const OUT_REV = path.join(ROOT, 'review/AG-304');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function writeSafe(p, buf) {
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, p);
}

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

async function runScenario(origin, label, patchInMemory) {
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
    await sleep(200);
    await moveOffscreen(page);

    await page.goto(`${origin}/index.html?debug=1`, { timeout: 120000 });
    await moveOffscreen(page);
    assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 }));

    // Instrument WebGPURenderer prototype + canvas toDataURL BEFORE opening Training / Armory
    await page.evaluate(`(() => {
      const events = window.__agProbeEvents = [];
      const RProto = window.TT.renderer.constructor.prototype;
      const origInit = RProto.init;
      const origRender = RProto.render;
      RProto.init = async function(...args) {
        const t0 = performance.now();
        const res = await origInit.apply(this, args);
        const dt = performance.now() - t0;
        const tag = this === window.TT.renderer ? 'main' : (this.domElement?.id || ((this.domElement?.width || 0) + 'x' + (this.domElement?.height || 0)));
        events.push({ kind: 'renderer.init', tag, t0: +t0.toFixed(1), ms: +dt.toFixed(2) });
        return res;
      };
      RProto.render = function(scene, cam) {
        const pBefore = this._pipelines?.caches?.size ?? 0;
        const t0 = performance.now();
        const res = origRender.call(this, scene, cam);
        const dt = performance.now() - t0;
        const pAfter = this._pipelines?.caches?.size ?? 0;
        const tag = this === window.TT.renderer ? 'main' : (this.domElement?.id || ((this.domElement?.width || 0) + 'x' + (this.domElement?.height || 0)));
        if (dt > 12 || pAfter !== pBefore || tag !== 'main') {
          events.push({
            kind: 'renderer.render',
            tag,
            t0: +t0.toFixed(1),
            ms: +dt.toFixed(2),
            pDelta: pAfter - pBefore,
            pTotal: pAfter
          });
        }
        return res;
      };
      const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const t0 = performance.now();
        const out = origToDataURL.apply(this, args);
        const dt = performance.now() - t0;
        if (dt > 2) {
          events.push({ kind: 'canvas.toDataURL', size: this.width + 'x' + this.height, t0: +t0.toFixed(1), ms: +dt.toFixed(2) });
        }
        return out;
      };
    })()`);

    if (patchInMemory) {
      // Test mitigation: pre-warm armoryPics/dress/finishes OR cancel background preview renders when closed?
      // Actually we'll inspect raw baseline attribution first, and optionally test warming in second scenario!
    }

    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 }));
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'AG309 probe';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active', { timeout: 90000 }));
    assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 30000 }));
    await sleep(2500);

    const runs = [];
    for (const [view, gun] of [['third', 'uzi'], ['first', 'shotgun']]) {
      await page.evaluate(`(() => {
        const T = TT, tg = T.trainingDbg.tg(), f = tg.stations.armory.front;
        T.player.position.set(f.x, tg.floorY, f.z);
        T.setVelDbg(0, 0);
        T.setViewFirstDbg(${view === 'first'});
      })()`);
      await sleep(1200);

      await page.evaluate('window.__agProbeEvents.length = 0');
      const openTiming = await page.evaluate(`(() => {
        const t0 = performance.now();
        TT.doAction();
        return { t0: +t0.toFixed(1), doActionMs: +(performance.now() - t0).toFixed(2) };
      })()`);
      assert(await page.waitFor('!document.getElementById("armoryPanel").hidden', { timeout: 5000 }));

      await page.evaluate(`(() => {
        TT.addCash(1000000);
        TT.resetPerf();
        const h = window.__armoryHitch = { gaps: [], stamps: [], last: 0, running: true };
        function tick(t) {
          if (h.last) {
            const g = t - h.last;
            h.gaps.push(g);
            if (g > 25) h.stamps.push({ at: +t.toFixed(1), gapMs: +g.toFixed(2) });
          }
          h.last = t;
          if (h.running) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      })()`);

      const event = await page.evaluate(`(() => {
        const b = document.querySelector('#armoryPanel [data-buy-gun="${gun}"]');
        if (!b || b.disabled) throw new Error('purchase unavailable: ${gun}');
        const p0 = TT.renderer._pipelines?.caches?.size ?? 0;
        const a = performance.now();
        b.click();
        const bought = performance.now();
        TT.armoryDbg.ui().close();
        const closed = performance.now();
        return {
          tBuyStart: +a.toFixed(1),
          tBought: +bought.toFixed(1),
          tClosed: +closed.toFixed(1),
          buyMs: +(bought - a).toFixed(2),
          closeMs: +(closed - bought).toFixed(2),
          mainPipelinesAtBuy: p0,
          gun: '${gun}',
          open: !document.getElementById('armoryPanel').hidden
        };
      })()`);

      await sleep(4000);

      const sample = await page.evaluate(`(() => {
        const h = window.__armoryHitch;
        h.running = false;
        const g = h.gaps.slice();
        return {
          maxGapMs: +Math.max(0, ...g).toFixed(2),
          over50: g.filter((x) => x > 50).length,
          over100: g.filter((x) => x > 100).length,
          topGaps: g.slice().sort((a, b) => b - a).slice(0, 8).map((x) => +x.toFixed(2)),
          gapStamps: h.stamps,
          mainPipelinesAfter: TT.renderer._pipelines?.caches?.size ?? 0,
          frames: g.length,
          perf: TT.perfSnapshot(),
          probeEvents: window.__agProbeEvents.slice()
        };
      })()`);

      runs.push({ view, openTiming, event, sample });
      if (view === 'third') await page.evaluate('TT.closeMenuDbg("cif")');
    }

    const errors = page.errors ? page.errors.slice() : [];
    await page.close().catch(() => {});
    return { label, runs, errors };
  } finally {
    await browser.close().catch(() => {});
  }
}

const server = await serve(ROOT, 0);
try {
  const baseline = await runScenario(server.origin, 'baseline', false);
  const outBuf = Buffer.from(JSON.stringify(baseline, null, 2), 'utf8');
  writeSafe(path.join(OUT_QA, 'armory-hitch-attribution.json'), outBuf);
  writeSafe(path.join(OUT_REV, 'armory-hitch-attribution.json'), outBuf);
  for (const r of baseline.runs) {
    console.log(`\n=== ${r.view} (${r.event.gun}) ===`);
    console.log(`doActionMs=${r.openTiming.doActionMs} buyMs=${r.event.buyMs} closeMs=${r.event.closeMs} maxGapMs=${r.sample.maxGapMs} over50=${r.sample.over50} pipelines=${r.event.mainPipelinesAtBuy}->${r.sample.mainPipelinesAfter}`);
    console.log('gapStamps:', JSON.stringify(r.sample.gapStamps));
    console.log('probeEvents:', JSON.stringify(r.sample.probeEvents, null, 2));
  }
} finally {
  await server.close();
}
