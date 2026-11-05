import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WT = 'C:\\Users\\Zero\\.gemini\\antigravity\\brain\\53107b3e-754b-4d62-b2fd-a4a4037916bb\\scratch\\wt-ag233';
const OUT_DIR = path.join(ROOT, 'qa', '2026-11-04-AG-233');

const CHANGED_FILES = [
  'index.html',
  'game/viewmodel.js',
  'game/viewmodel-poses.js',
  'game/wall-cull.js',
  'studio/motion.js',
  'studio/weapon-heavy.js',
  'studio/weapon-longarms.js',
  'studio/weapon-sidearms.js'
];

function gitWt(...args) {
  return execFileSync('git', ['-C', WT, ...args], { encoding: 'utf8' }).trim();
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

    // Also collect diagnostic info on sling positions & bounds
    diag = await page.evaluate(`(() => {
      try {
        const T = window.TT;
        const marine = T.getMarine ? T.getMarine() : (T.marine || window.worldMarine);
        const ud = marine.userData;
        const rig = ud.carry;
        return {
          sling0Pos: rig && rig.slings[0] ? rig.slings[0].g.position.toArray().map(n => +n.toFixed(4)) : null,
          sling1Pos: rig && rig.slings[1] ? rig.slings[1].g.position.toArray().map(n => +n.toFixed(4)) : null,
          sling0Kind: rig && rig.slings[0] ? rig.slings[0].kind : null,
          sling1Kind: rig && rig.slings[1] ? rig.slings[1].kind : null,
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

const results = [];
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });

try {
  // 1. Ensure WT is clean at 5adede46
  gitWt('checkout', '-f', '5adede46');
  gitWt('clean', '-fd');
  results.push(await runT189OnDir(browser, WT, '5adede46 (clean)'));

  // 2. Run on current working tree
  results.push(await runT189OnDir(browser, ROOT, 'WORKING_TREE (current)'));

  const wtClean = results[0];
  const curTree = results[1];

  if (wtClean.fail === 0 && curTree.fail > 0) {
    console.log('=== 5adede46 is GREEN and WORKING_TREE is RED. Narrowing by file in worktree ===');
    // Test applying ONE changed file at a time onto 5adede46
    for (const f of CHANGED_FILES) {
      gitWt('checkout', '-f', '5adede46');
      fs.copyFileSync(path.join(ROOT, f), path.join(WT, f));
      const r = await runT189OnDir(browser, WT, `5adede46 + working ${f}`);
      results.push(r);
      if (r.fail > 0) {
        console.log(`>>> CULPRIT IDENTIFIED: ${f} alone turns 5adede46 from 0 fail to ${r.fail} fail!`);
        // Now test all working tree files EXCEPT f
        for (const f2 of CHANGED_FILES) {
          fs.copyFileSync(path.join(ROOT, f2), path.join(WT, f2));
        }
        gitWt('checkout', '5adede46', '--', f);
        const rRevert = await runT189OnDir(browser, WT, `WORKING_TREE minus ${f} (reverted to 5adede46)`);
        results.push(rRevert);
        break;
      }
    }
  } else if (wtClean.fail > 0) {
    console.log('=== 5adede46 is ALSO RED! Bisecting commits between 82d75118 and 5adede46 ===');
    const commits = ['82d75118', 'c6b27f63', 'c3cd9c86', 'b117bc44', 'd395dc54', '3dd4890b', 'e10ed377', '2d9ab0b2', '5abd7576', 'f645ba77'];
    // Binary search over commits
    gitWt('checkout', '-f', '82d75118');
    gitWt('clean', '-fd');
    const rBase = await runT189OnDir(browser, WT, 'commit:82d75118');
    results.push(rBase);
    let lo = 0, hi = commits.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      const sha = commits[mid];
      gitWt('checkout', '-f', sha);
      gitWt('clean', '-fd');
      const rMid = await runT189OnDir(browser, WT, `commit:${sha}`);
      results.push(rMid);
      if (rMid.fail === 0) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    console.log(`Last green commit in list: ${commits[lo]}`);
  }
} finally {
  await browser.close?.();
}

fs.writeFileSync(path.join(OUT_DIR, 'bisect-results.json'), JSON.stringify(results, null, 2));
console.log('Saved qa/2026-11-04-AG-233/bisect-results.json');
