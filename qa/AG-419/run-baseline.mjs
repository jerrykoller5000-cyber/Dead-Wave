import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT = path.join(ROOT, 'qa', 'AG-419');
fs.mkdirSync(OUT, { recursive: true });

// Guard against AH-15's temporary ReferenceError on fuelSiteDone during Hunt profiling without editing index.html.
let huntPage = null;
const idxText = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (idxText.includes('!fuelSiteDone()') && !/function\s+fuelSiteDone\b|const\s+fuelSiteDone\b|let\s+fuelSiteDone\b/.test(idxText)) {
  const patched = idxText.replaceAll('!fuelSiteDone()', "!(typeof fuelSiteDone === 'function' ? fuelSiteDone() : !!fs.done)");
  const shimPath = path.join(OUT, '_hunt_shim.html');
  fs.writeFileSync(shimPath, patched, 'utf8');
  huntPage = path.relative(ROOT, shimPath);
  console.log('[AG-419] Using read-only Hunt shim (fuelSiteDone guard) -> ' + huntPage);
}

function runCmd(label, args, logFile) {
  return new Promise((resolve) => {
    console.log(`\n=== [AG-419] ${label} ===`);
    const t0 = Date.now();
    const p = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    p.stdout.on('data', (d) => { const s = String(d); buf += s; process.stdout.write(s); });
    p.stderr.on('data', (d) => { const s = String(d); buf += s; process.stderr.write(s); });
    p.on('exit', (code) => {
      fs.writeFileSync(path.join(OUT, logFile), buf, 'utf8');
      console.log(`=== [AG-419] ${label} done (exit ${code}, ${((Date.now() - t0) / 1000).toFixed(1)}s) ===`);
      resolve({ label, code, elapsedS: +((Date.now() - t0) / 1000).toFixed(1) });
    });
  });
}

const results = [];
results.push(await runCmd('loadtime (warm fg)', [
  'tools/loadtime.mjs', '--runs', '1'
], 'base-loadtime.log'));

results.push(await runCmd('training --fight (High, vsync off)', [
  'tools/bench.mjs', '--scenario', 'training', '--fight', '--gfx', 'high',
  '--seconds', '14', '--window', '10', '--vsync', 'off',
  '--prof-all', '--cpu', '--alloc', '--census',
  '--out', 'qa/AG-419/base-training.json'
], 'base-training.log'));

const pageArgs = huntPage ? ['--page', huntPage] : [];

results.push(await runCmd('night 20 (High, vsync off)', [
  'tools/bench.mjs', '--night', '20', '--gfx', 'high',
  '--seconds', '14', '--window', '10', '--vsync', 'off',
  '--prof-all', '--cpu', '--alloc', '--census',
  ...pageArgs,
  '--out', 'qa/AG-419/base-night20.json'
], 'base-night20.log'));

results.push(await runCmd('day 5 (High, vsync off)', [
  'tools/bench.mjs', '--scenario', 'day5', '--gfx', 'high',
  '--seconds', '14', '--window', '10', '--vsync', 'off',
  '--prof-all', '--cpu', '--alloc', '--census',
  ...pageArgs,
  '--out', 'qa/AG-419/base-day5.json'
], 'base-day5.log'));

results.push(await runCmd('strict48 (48 near brutes, High, vsync off)', [
  'tools/bench.mjs', '--count', '48', '--fixture', 'tools/strict48-fixture.js', '--gfx', 'high',
  '--seconds', '14', '--window', '10', '--vsync', 'off',
  '--prof-all', '--cpu', '--alloc', '--census',
  ...pageArgs,
  '--out', 'qa/AG-419/base-strict48.json'
], 'base-strict48.log'));

fs.writeFileSync(path.join(OUT, 'base-summary.json'), JSON.stringify({ at: new Date().toISOString(), huntPage, results }, null, 2), 'utf8');
console.log('\n[AG-419] All baseline runs complete.');
