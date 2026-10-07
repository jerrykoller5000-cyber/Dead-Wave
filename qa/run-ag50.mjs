import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-05-AG-50');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });

function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findHtmlFiles(filePath, fileList);
    } else if (file === 'index.html') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function run() {
  console.log('[AG-50] Starting visual verification script...');
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: true });
  
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    
    // 1. Capture all review/ HTML files
    const reviewDir = path.join(ROOT, 'review');
    const htmlFiles = findHtmlFiles(reviewDir);
    
    for (const file of htmlFiles) {
      const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
      const url = `${server.origin}/${relPath}?debug=1`;
      console.log(`[AG-50] Capturing ${relPath}`);
      await page.goto(url, { waitUntil: 'none' });
      // wait a bit for it to render
      await new Promise(r => setTimeout(r, 2000));
      
      const shotName = relPath.replace('review/', '').replace('/index.html', '').replace(/\//g, '-') + '.png';
      await page.screenshot(path.join(SHOTS_DIR, shotName));
    }
    
    // 2. Main game captures (HQ, Training Ground, Perf HUD)
    console.log('[AG-50] Capturing main game views...');
    await page.goto(`${server.origin}/index.html?debug=1`, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    await page.evaluate(`(() => {
      if (window.DWOpening && window.DWOpening.dismissForTesting) {
        window.DWOpening.dismissForTesting();
      }
    })()`);
    await page.waitFor('!!window.TT', { timeout: 180000 });
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
    await new Promise(r => setTimeout(r, 1500));

    // HQ Perf HUD
    await page.screenshot(path.join(SHOTS_DIR, 'hq-perf-hud.png'));
    
    // Training ground
    console.log('[AG-50] Entering Training Ground...');
    await page.evaluate(`(() => {
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot(path.join(SHOTS_DIR, 'training-ground-start.png'));
    
    // Perf HUD in training ground
    await page.screenshot(path.join(SHOTS_DIR, 'training-ground-perf-hud.png'));
    
    console.log('[AG-50] Visual verification completed.');
  } catch (e) {
    console.error('[AG-50] Error:', e);
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(console.error);
