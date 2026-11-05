import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WT = 'C:\\Users\\Zero\\.gemini\\antigravity\\brain\\53107b3e-754b-4d62-b2fd-a4a4037916bb\\scratch\\wt-ag233';
const OUT_DIR = path.join(ROOT, 'qa', '2026-11-04-AG-233');

function gitWt(...args) {
  return execFileSync('git', ['-C', WT, ...args], { encoding: 'utf8' }).trim();
}

function revertChapelHaloVisible(indexPath) {
  let src = fs.readFileSync(indexPath, 'utf8');
  src = src.replace(
    /chapelHalo\.visible\s*=\s*false;\s*\/\/[^\r\n]*/,
    '// chapelHalo.visible = false; // REVERTED FOR AG-233 BISECTION'
  );
  src = src.replace(
    /chapelHalo\.visible\s*=\s*chapelGlowT\s*>\s*0;/,
    '// chapelHalo.visible = chapelGlowT > 0; // REVERTED FOR AG-233 BISECTION'
  );
  fs.writeFileSync(indexPath, src, 'utf8');
}

async function runT189OnDir(browser, dir, label) {
  const t0 = Date.now();
  const server = await serve(dir, 0);
  const page = await browser.newPage({ width: 1280, height: 720 });
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
  } catch {}
  let lines = [], diag = null;
  try {
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) {
      throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
    }
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
    const libCode = fs.readFileSync(path.join(dir, 'tools', 'tests', 'lib.js'), 'utf8');
    const t189Code = fs.readFileSync(path.join(dir, 'tools', 'tests', 't189.js'), 'utf8');
    await page.evaluate(libCode);
    const out = await page.evaluate(t189Code, 300000);
    lines = String(typeof out === 'string' ? out : JSON.stringify(out)).split('\n').map((l) => l.trim()).filter(Boolean);
    diag = await page.evaluate(`(() => {
      try {
        const T = window.TT;
        const marine = T.getMarine ? T.getMarine() : (T.marine || window.worldMarine);
        const rig = marine.userData.carry;
        return {
          sling0Pos: rig && rig.slings[0] ? rig.slings[0].g.position.toArray().map(n => +n.toFixed(4)) : null,
          sling1Pos: rig && rig.slings[1] ? rig.slings[1].g.position.toArray().map(n => +n.toFixed(4)) : null
        };
      } catch (e) { return { err: String(e) }; }
    })()`);
  } catch (e) {
    lines = ['FAIL t189 did not run: ' + String(e.message || e).split('\n')[0]];
  }
  try { await page.send('Page.close', {}); } catch {}
  await server.close?.();
  const pass = lines.filter((l) => l.startsWith('PASS')).length;
  const fail = lines.filter((l) => l.startsWith('FAIL')).length;
  const failLines = lines.filter((l) => l.startsWith('FAIL'));
  const elapsedS = +((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[${label}] ${fail ? 'FAIL' : 'OK  '} ${pass} pass / ${fail} fail (${elapsedS}s) diag=${JSON.stringify(diag)}`);
  for (const fl of failLines) console.log(`    ${fl}`);
  return { label, pass, fail, elapsedS, diag, lines, failLines };
}

const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const extraResults = [];

try {
  // Test each changed file from WORKING_TREE on top of 5adede46 (with chapelHalo.visible reverted)
  const candidates = [
    ['index.html (working) + studio/weapon-heavy.js (working)', ['index.html', 'studio/weapon-heavy.js']],
    ['index.html (working) only', ['index.html']],
    ['studio/weapon-heavy.js (working) only', ['studio/weapon-heavy.js']],
    ['studio/weapon-sidearms.js (working) only', ['studio/weapon-sidearms.js']],
    ['studio/motion.js (working) only', ['studio/motion.js']]
  ];

  for (const [label, files] of candidates) {
    gitWt('checkout', '-f', '5adede46');
    gitWt('clean', '-fd');
    for (const f of files) {
      fs.copyFileSync(path.join(ROOT, f), path.join(WT, f));
    }
    revertChapelHaloVisible(path.join(WT, 'index.html'));
    extraResults.push(await runT189OnDir(browser, WT, `5adede46 (chapelHalo vis=true) + ${label}`));
  }

  gitWt('checkout', '-f', '5adede46');
  gitWt('clean', '-fd');
} finally {
  fs.writeFileSync(path.join(OUT_DIR, 'post-5adede46-breakdown.json'), JSON.stringify(extraResults, null, 2));
  await browser.close();
}
