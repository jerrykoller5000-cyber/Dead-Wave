import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', '2026-11-11-AG-310');
fs.mkdirSync(OUT_DIR, { recursive: true });

const phaseArgIdx = process.argv.indexOf('--phase');
const PHASE = phaseArgIdx >= 0 && process.argv[phaseArgIdx + 1] ? process.argv[phaseArgIdx + 1] : 'after';
const RUNS = Number(process.env.AG310_RUNS || 3);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream'
};

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url || '/', 'http://127.0.0.1');
        let rel = decodeURIComponent(u.pathname);
        if (rel === '/') rel = '/index.html';
        const full = path.resolve(ROOT, '.' + rel);
        if (!full.startsWith(ROOT)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        fs.stat(full, (err, st) => {
          if (err || !st.isFile()) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          const ext = path.extname(full).toLowerCase();
          res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Cache-Control': 'no-store'
          });
          fs.createReadStream(full).pipe(res);
        });
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

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

async function newOffscreenPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err && (err.stack || err.message || err))));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!/favicon\.ico/i.test(txt)) pageErrors.push('console.error: ' + txt);
    }
  });
  try {
    const cdp = await context.newCDPSession(page);
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', {
      windowId,
      bounds: { left: -3800, top: -3800, width: 1280, height: 720, windowState: 'normal' }
    });
  } catch (_) {}
  return { context, page, pageErrors };
}

async function bootTraining(page, baseUrl, firstPerson) {
  await page.goto(baseUrl + '/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!(window.TT && window.TT.trainingDbg), null, { timeout: 60000 });
  await page.evaluate(async (wantFirst) => {
    const T = window.TT;
    if (window.DWOpening && window.DWOpening.dismissForTesting) window.DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName');
    if (nameEl) nameEl.value = 'AG310';
    // Instrument WebGPURenderer inits/renders and canvas readbacks for diagnostics
    window.__ag310Diag = { inits: [], toDataURLs: 0, toBlobs: 0 };
    if (window.THREE && window.THREE.WebGPURenderer && !window.THREE.WebGPURenderer.__ag310Wrapped) {
      window.THREE.WebGPURenderer.__ag310Wrapped = true;
      const origInit = window.THREE.WebGPURenderer.prototype.init;
      window.THREE.WebGPURenderer.prototype.init = async function (...args) {
        const cv = this.domElement;
        const tag = cv && cv.id ? cv.id : (cv ? cv.width + 'x' + cv.height : 'unknown');
        const t0 = performance.now();
        const r = await origInit.apply(this, args);
        window.__ag310Diag.inits.push({ tag, ms: +(performance.now() - t0).toFixed(1) });
        return r;
      };
    }
    if (!HTMLCanvasElement.prototype.__ag310Wrapped) {
      HTMLCanvasElement.prototype.__ag310Wrapped = true;
      const origTDU = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (...args) {
        window.__ag310Diag.toDataURLs++;
        return origTDU.apply(this, args);
      };
      const origTB = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (...args) {
        window.__ag310Diag.toBlobs++;
        return origTB.apply(this, args);
      };
    }
    document.getElementById('modeTraining').click();
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      const st = T.trainingDbg.state();
      const bo = T.trainingDbg.blackout && T.trainingDbg.blackout();
      if (st && st.active && !st.wake && (!bo || !bo.on)) break;
      await new Promise((r) => setTimeout(r, 60));
    }
    T.setViewFirstDbg(!!wantFirst);
    // Let post-blackout settle 40 frames before benchmarking Armory
    await new Promise((resolve) => {
      let n = 0;
      function step() {
        if (++n >= 40) resolve();
        else requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, firstPerson);
}

async function runBenchmarkView(browser, baseUrl, viewName, runIdx) {
  const firstPerson = viewName === '1P';
  const { context, page, pageErrors } = await newOffscreenPage(browser);
  try {
    await bootTraining(page, baseUrl, firstPerson);
    const result = await page.evaluate(async ({ items }) => {
      const T = window.TT;
      const waitFrames = (count) => new Promise((resolve) => {
        const gaps = [];
        let last = performance.now();
        let left = count;
        function tick(now) {
          const g = now - last;
          last = now;
          gaps.push(+g.toFixed(1));
          if (--left <= 0) resolve(gaps);
          else requestAnimationFrame(tick);
        }
        requestAnimationFrame((now) => {
          last = now;
          requestAnimationFrame(tick);
        });
      });

      const measureAction = async (fn, settleFrames) => {
        // Sync to a fresh rAF boundary first so previous work never bleeds in
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

      // Position marine right in front of the Training Armory station
      const tg = T.trainingDbg.tg();
      if (tg && tg.armoryFront) {
        T.player.position.set(tg.armoryFront.x, T.player.position.y, tg.armoryFront.z);
      }
      await waitFrames(8);

      const perItem = [];
      for (const item of items) {
        const panel = () => document.getElementById('armoryPanel');
        // 1. Open Armory
        const openRes = await measureAction(() => {
          T.openMenuDbg('armory');
        }, 6);

        // 2. Buy item (if purchasable)
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

        // 3. Mod item (workbench attachments + camo swatch for guns; build ammo refill if non-full for builds)
        let modRes = null;
        if (item.kind === 'gun') {
          modRes = await measureAction(async () => {
            T.armoryDbg.ui().bench(item.id);
            // Buy/fit up to 2 attachments on its workbench (e.g. suppressor/ext/heavy/optic/tank/auto)
            const modButtons = [...document.querySelectorAll('#armoryPanel .armory-mods li button')].filter((b) => !b.disabled);
            if (modButtons[0]) modButtons[0].click();
            const modButtons2 = [...document.querySelectorAll('#armoryPanel .armory-mods li.missing button')].filter((b) => !b.disabled);
            if (modButtons2[0]) modButtons2[0].click();
            // Also apply a camo finish swatch (m81 or first unlocked non-factory swatch)
            const sw = document.querySelector('#armoryPanel .armory-finish:not(.armory-laser) .armory-swatch[data-finish="m81"]:not(:disabled)')
              || [...document.querySelectorAll('#armoryPanel .armory-finish:not(.armory-laser) .armory-swatch:not(:disabled)')].find((b) => b.dataset.finish);
            if (sw) sw.click();
            // For shotgun, also exercise typed ammo purchase
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

        // 4. Close Armory + monitor 42 live gameplay frames (~0.7s) to catch any post-close async hitch!
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
    }, { items: ITEMS });

    return { view: viewName, run: runIdx, pageErrors, ...result };
  } finally {
    await context.close();
  }
}

async function captureVisuals(browser, baseUrl, phase) {
  const { context, page, pageErrors } = await newOffscreenPage(browser);
  try {
    await bootTraining(page, baseUrl, false);
    await page.evaluate(async () => {
      const T = window.TT;
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
      // Put m4 in primary:0 and ak in primary:1 so slots + shelf both show real pictures
      const arm = T.armoryDbg.ui().armory;
      arm.take('m4', 'primary', 0);
      arm.take('ak', 'primary', 1);
      T.armoryDbg.ui().render();
      T.armoryDbg.ui().bench('m4');
      const more = document.querySelector('#armoryPanel [data-finish-more]');
      if (more) more.click();
    });

    // Wait for all gun pictures + workbench preview to finish rendering
    await page.waitForFunction(() => {
      const panel = document.getElementById('armoryPanel');
      if (!panel || panel.hidden) return false;
      const realImgs = [...panel.querySelectorAll('.armory-pic.real img')];
      if (realImgs.length < 4 || !realImgs.every((i) => i.complete && i.naturalWidth > 0)) return false;
      const stage = panel.querySelector('.armory-preview-stage');
      const prevImg = stage && stage.querySelector('img');
      if (!stage || stage.dataset.ready !== 'true' || !prevImg || prevImg.hidden || !prevImg.complete || !prevImg.naturalWidth) return false;
      const swatches = panel.querySelectorAll('.armory-finish:not(.armory-laser) .armory-swatch');
      return swatches.length >= 30;
    }, null, { timeout: 25000 });
    await page.waitForTimeout(150);

    const benchShot = path.join(OUT_DIR, phase + '-armory-bench.png');
    await page.screenshot({ path: benchShot });

    // Also rotate preview right twice to verify interactive armoryPreview angle rendering
    await page.evaluate(() => {
      const rightBtn = document.querySelector('#armoryPanel .armory-preview-actions button[data-turn="right"]');
      if (rightBtn) { rightBtn.click(); rightBtn.click(); }
    });
    await page.waitForFunction(() => {
      const stage = document.querySelector('#armoryPanel .armory-preview-stage');
      const img = stage && stage.querySelector('img');
      return stage && stage.dataset.ready === 'true' && img && !img.hidden && img.complete && img.naturalWidth > 0;
    }, null, { timeout: 15000 });
    await page.waitForTimeout(120);

    const turnShot = path.join(OUT_DIR, phase + '-armory-preview-turned.png');
    await page.screenshot({ path: turnShot });

    // Close Armory, then open real CIF card (non-armory-only) and verify cifMarine + dress swatches
    await page.evaluate(async () => {
      const T = window.TT;
      document.querySelector('#armoryPanel .armory-actions button:last-child')?.click();
      if (T.isCIFOpen && T.isCIFOpen()) T.closeCIF();
      await new Promise((r) => setTimeout(r, 120));
      window.dwCifPose = (ud) => {
        if (ud.armLG) ud.armLG.rotation.set(0.04, 0.08, -0.14);
        if (ud.armRG) ud.armRG.rotation.set(0.04, -0.08, 0.14);
        if (ud.elbowLG) ud.elbowLG.rotation.set(-0.22, 0, 0);
        if (ud.elbowRG) ud.elbowRG.rotation.set(-0.22, 0, 0);
        return true;
      };
      T.openMenuDbg('cif');
      document.getElementById('cifFront')?.click();
    });
    await page.waitForFunction(() => {
      const m = document.getElementById('cifMarine');
      const cif = document.getElementById('cif');
      return cif && cif.classList.contains('show') && !cif.classList.contains('armory-only') && m && m.dataset.ready === 'true';
    }, null, { timeout: 20000 });
    await page.waitForTimeout(300);

    const cifShot = path.join(OUT_DIR, phase + '-cif-card.png');
    await page.screenshot({ path: cifShot });

    return { benchShot, turnShot, cifShot, pageErrors };
  } finally {
    await context.close();
  }
}

async function main() {
  const { server, port } = await startStaticServer();
  const baseUrl = 'http://127.0.0.1:' + port;
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--enable-unsafe-webgpu',
      '--ignore-gpu-blocklist',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  try {
    console.log('[AG-310] Capturing ' + PHASE + ' visual reference shots...');
    const visuals = await captureVisuals(browser, baseUrl, PHASE);
    console.log('[AG-310] Visuals captured (errors=' + visuals.pageErrors.length + ')');

    const runs = [];
    for (const view of ['1P', '3P']) {
      for (let r = 1; r <= RUNS; r++) {
        console.log('[AG-310] Running ' + PHASE + ' ' + view + ' run ' + r + '/' + RUNS + '...');
        const res = await runBenchmarkView(browser, baseUrl, view, r);
        const worstOpen = Math.max(...res.perItem.map((x) => x.openMs || 0));
        const worstBuy = Math.max(...res.perItem.map((x) => x.buyMs || 0));
        const worstMod = Math.max(...res.perItem.map((x) => x.modMs || 0));
        const worstClose = Math.max(...res.perItem.map((x) => x.closeMs || 0));
        console.log('  -> ' + view + ' run ' + r + ': open=' + worstOpen + 'ms buy=' + worstBuy + 'ms mod=' + worstMod + 'ms close=' + worstClose + 'ms cifHiddenInit=' + res.cifMarineReadyDuringArmoryOnly + ' errors=' + res.pageErrors.length);
        runs.push(res);
      }
    }

    // Aggregate per-view, per-item worst frame across the 3 runs
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
        totalPageErrors: vRuns.reduce((s, vr) => s + vr.pageErrors.length, 0),
        items: itemsAgg
      };
    }

    const outPayload = {
      phase: PHASE,
      timestamp: new Date().toISOString(),
      runsCount: RUNS,
      visualsPageErrors: visuals.pageErrors,
      summaryByView,
      runs
    };
    const outPath = path.join(OUT_DIR, 'ag310-' + PHASE + '.json');
    writeAtomicJson(outPath, outPayload);
    console.log('[AG-310] Wrote ' + outPath);
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
