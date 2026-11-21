// AH-4 Step 1 (GP-20169): Check Armory WORKBENCH preview at 0.4s vs 5.0s on WebGPU and WebGL
// across both (A) fresh stock Training loadout (Pistol, then bought GW-4) and (B) AH-1 Run 2's TT.grantAllWeapons() (with Laser/light combo).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Must run inside game-test slot');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AH-4', 'gp20169');
fs.mkdirSync(OUT_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function prepareWindow(page) {
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: 1936, height: 1168 } });
  } catch {}
  await page.setViewport(1920, 1080, 1);
  try { await page.send('Page.bringToFront', {}); } catch {}
  try { await page.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
}

async function inspectWorkbenchDom(page) {
  return await page.evaluate(`(() => {
    const root = document.getElementById('cif');
    if (!root) return { hasRoot: false };
    // Find WORKBENCH container
    const headings = Array.from(root.querySelectorAll('h3, h4, div, span')).filter(el => el.textContent.trim() === 'WORKBENCH');
    const wbBox = headings.map(h => h.parentElement).find(p => p && p.querySelector('img, canvas, svg')) || headings[0]?.parentElement || null;
    const imgs = wbBox ? Array.from(wbBox.querySelectorAll('img')) : Array.from(root.querySelectorAll('img'));
    const canvases = wbBox ? Array.from(wbBox.querySelectorAll('canvas')) : Array.from(root.querySelectorAll('canvas'));
    return {
      hasWbBox: Boolean(wbBox),
      wbText: wbBox ? String(wbBox.textContent.replace(/\\s+/g, ' ').trim().slice(0, 220)) : '',
      imgCount: imgs.length,
      imgs: imgs.slice(0, 4).map(im => ({
        complete: Boolean(im.complete),
        naturalWidth: Number(im.naturalWidth || 0),
        naturalHeight: Number(im.naturalHeight || 0),
        width: Math.round(im.getBoundingClientRect().width),
        height: Math.round(im.getBoundingClientRect().height),
        srcPrefix: String((im.getAttribute('src') || '').slice(0, 40)),
        hidden: Boolean(im.hidden || getComputedStyle(im).display === 'none' || Number(getComputedStyle(im).opacity) === 0),
      })),
      canvasCount: canvases.length,
      canvases: canvases.slice(0, 4).map(c => ({
        w: Number(c.width || 0),
        h: Number(c.height || 0),
        cssW: Math.round(c.getBoundingClientRect().width),
        cssH: Math.round(c.getBoundingClientRect().height),
      })),
    };
  })()`);
}

async function runBackend(origin, backend) {
  const browser = await launch({
    headless: false,
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--force_high_performance_gpu',
      '--disable-features=CalculateNativeWinOcclusion',
      '--window-size=1936,1168',
    ],
  });
  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    await prepareWindow(page);
    const url = backend === 'webgl' ? `${origin}/index.html?debug=1&renderer=webgl` : `${origin}/index.html?debug=1`;
    console.log(`[GP-20169] Booting ${backend} -> ${url}`);
    await page.goto(url, { timeout: 180000 });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    for (let i = 0; i < 3; i++) {
      await page.evaluate(`(() => { window.DWOpening?.dismissForTesting?.(); return true; })()`);
      await sleep(300);
    }
    await page.waitFor('Boolean(window.TT) && !window.DWOpening?.active', { timeout: 120000 });
    await sleep(400);
    await page.evaluate(`(() => {
      document.getElementById('perf')?.classList.remove('on');
      const n = document.getElementById('playerName');
      if (n) { n.value = 'Jerry'; n.blur(); }
      document.getElementById('modeTraining')?.click();
      return true;
    })()`);
    await page.waitFor(
      'window.TT?.trainingDbg?.state()?.active && !window.TT?.trainingDbg?.state()?.warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',
      { timeout: 90000, every: 100 }
    );
    await sleep(1200);

    const out = { backend, checks: [], pageErrors: [], consoleErrorsBeforeArmory: page.console.filter(c => c.type === 'error').length };

    // --- CHECK 1: Fresh stock Armory -> click hip Pistol -> capture at 0.4s and 5.0s ---
    await page.evaluate(`(() => { TT.trainingDbg.act('armory'); return true; })()`);
    await sleep(600);
    await page.evaluate(`(() => {
      const slot = Array.from(document.querySelectorAll('#cif button, #cif [role="button"], #cif .armory-slot')).find(el => /Pistol/i.test(el.textContent));
      if (slot) slot.click();
      return true;
    })()`);
    await sleep(400);
    const fStockPistolEarly = path.join(OUT_DIR, `${backend}-1a-stock-pistol-0.4s.png`);
    await page.screenshot(fStockPistolEarly);
    const domStockPistolEarly = await inspectWorkbenchDom(page);
    await sleep(4600); // total 5.0s after click!
    const fStockPistol5s = path.join(OUT_DIR, `${backend}-1b-stock-pistol-5.0s.png`);
    await page.screenshot(fStockPistol5s);
    const domStockPistol5s = await inspectWorkbenchDom(page);
    out.checks.push({ id: 'stock-pistol', early04s: domStockPistolEarly, after5s: domStockPistol5s });

    // --- CHECK 2: Buy GW-4 Carbine in Armory UI -> capture at 0.4s and 5.0s ---
    const boughtM4 = await page.evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('#cif *')).filter(el => /GW-4 Carbine/i.test(el.textContent));
      for (const c of cards) {
        const buyBtn = c.querySelector('button');
        if (buyBtn && /Buy|Equip|Take|Select|WORKBENCH/i.test(buyBtn.textContent)) {
          buyBtn.click();
          return buyBtn.textContent.trim();
        }
      }
      const anyBtn = Array.from(document.querySelectorAll('#cif button')).find(b => /GW-4/i.test(b.parentElement?.textContent || '') || /GW-4/i.test(b.textContent));
      if (anyBtn) { anyBtn.click(); return anyBtn.textContent.trim(); }
      return null;
    })()`);
    await sleep(200);
    // Ensure GW-4 slot is selected in CARRIED/STORED
    await page.evaluate(`(() => {
      const slot = Array.from(document.querySelectorAll('#cif .armory-slot, #cif button, #cif [data-gun], #cif [data-armory-gun]')).find(el => /GW-4 Carbine/i.test(el.textContent));
      if (slot) slot.click();
      return true;
    })()`);
    await sleep(400);
    const fStockM4Early = path.join(OUT_DIR, `${backend}-2a-bought-m4-0.4s.png`);
    await page.screenshot(fStockM4Early);
    const domStockM4Early = await inspectWorkbenchDom(page);
    await sleep(4600); // total 5.0s!
    const fStockM45s = path.join(OUT_DIR, `${backend}-2b-bought-m4-5.0s.png`);
    await page.screenshot(fStockM45s);
    const domStockM45s = await inspectWorkbenchDom(page);
    out.checks.push({ id: 'bought-m4', boughtBtn: boughtM4, early04s: domStockM4Early, after5s: domStockM45s });

    // Close Armory, run exact AH-1 Run 2 setup: TT.grantAllWeapons(), re-open Armory, click #cif .armory-slot, check 0.5s vs 5.0s!
    await page.evaluate(`(() => { document.querySelector('#cifClose')?.click(); return true; })()`);
    await sleep(350);
    await page.evaluate(`(() => { TT.grantAllWeapons(); return true; })()`);
    await sleep(400);
    await page.evaluate(`(() => { TT.trainingDbg.act('armory'); return true; })()`);
    await sleep(700);
    const clickedSelector = await page.evaluate(`(() => {
      const btn = document.querySelector('#cif [data-armory-gun="m4"], #cif [data-gun="m4"], #cif .armory-slot, #cif .armory-card button');
      if (btn) { btn.click(); return btn.className || btn.tagName; }
      return null;
    })()`);
    await sleep(500);
    const fGrantM4Early = path.join(OUT_DIR, `${backend}-3a-grantAll-m4-0.5s.png`);
    await page.screenshot(fGrantM4Early);
    const domGrantM4Early = await inspectWorkbenchDom(page);
    await sleep(4500); // total 5.0s!
    const fGrantM45s = path.join(OUT_DIR, `${backend}-3b-grantAll-m4-5.0s.png`);
    await page.screenshot(fGrantM45s);
    const domGrantM45s = await inspectWorkbenchDom(page);
    out.checks.push({ id: 'grantAll-m4-ah1-exact', clickedSelector, early05s: domGrantM4Early, after5s: domGrantM45s });

    // Also clickKR-7 Rifle in STORED GUNS and wait 5.0s!
    await page.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('#cif button')).find(b => /WORKBENCH/i.test(b.textContent) && /KR-7/i.test(b.parentElement?.parentElement?.textContent || b.parentElement?.textContent || ''));
      if (btn) btn.click();
      return true;
    })()`);
    await sleep(500);
    const fGrantAkEarly = path.join(OUT_DIR, `${backend}-4a-grantAll-ak-0.5s.png`);
    await page.screenshot(fGrantAkEarly);
    const domGrantAkEarly = await inspectWorkbenchDom(page);
    await sleep(4500); // total 5.0s!
    const fGrantAk5s = path.join(OUT_DIR, `${backend}-4b-grantAll-ak-5.0s.png`);
    await page.screenshot(fGrantAk5s);
    const domGrantAk5s = await inspectWorkbenchDom(page);
    out.checks.push({ id: 'grantAll-ak', early05s: domGrantAkEarly, after5s: domGrantAk5s });

    out.pageErrors = [...page.errors];
    out.consoleErrorsTotal = page.console.filter(c => c.type === 'error').length;
    console.log(`[GP-20169] ${backend} done:`, JSON.stringify(out.checks.map(c => ({
      id: c.id,
      earlyImgs: (c.early04s || c.early05s)?.imgs?.map(i => `${i.naturalWidth}x${i.naturalHeight}(hid=${i.hidden})`),
      after5sImgs: c.after5s?.imgs?.map(i => `${i.naturalWidth}x${i.naturalHeight}(hid=${i.hidden})`),
    }))));
    await page.close();
    return out;
  } finally {
    await browser.close();
    await sleep(300);
  }
}

const server = await serve(ROOT, 0);
try {
  const webgpu = await runBackend(server.origin, 'webgpu');
  const webgl = await runBackend(server.origin, 'webgl');
  fs.writeFileSync(path.join(OUT_DIR, 'gp20169-5s-results.json'), JSON.stringify({ webgpu, webgl }, null, 2), 'utf8');
  console.log('[GP-20169] Saved qa/AH-4/gp20169/gp20169-5s-results.json');
} finally {
  await server.close();
}
