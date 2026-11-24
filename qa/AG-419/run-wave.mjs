import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT = path.join(ROOT, 'qa', 'AG-419');
fs.mkdirSync(OUT, { recursive: true });
const tag = process.argv[2] || 'w1';
const skipLoad = process.argv.includes('--no-load');

function runCmd(label, args, logFile) {
  return new Promise((resolve) => {
    console.log(`\n=== [AG-419 ${tag}] ${label} ===`);
    const t0 = Date.now();
    const p = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    p.stdout.on('data', (d) => { const s = String(d); buf += s; process.stdout.write(s); });
    p.stderr.on('data', (d) => { const s = String(d); buf += s; process.stderr.write(s); });
    p.on('exit', (code) => {
      fs.writeFileSync(path.join(OUT, logFile), buf, 'utf8');
      console.log(`=== [AG-419 ${tag}] ${label} done (exit ${code}, ${((Date.now() - t0) / 1000).toFixed(1)}s) ===`);
      resolve({ label, code, elapsedS: +((Date.now() - t0) / 1000).toFixed(1) });
    });
  });
}

const results = [];
if (!skipLoad) {
  results.push(await runCmd('loadtime (warm fg)', [
    'tools/loadtime.mjs', '--runs', '1'
  ], `${tag}-loadtime.log`));
}

results.push(await runCmd('training --fight (High, vsync off)', [
  'tools/bench.mjs', '--scenario', 'training', '--fight', '--gfx', 'high',
  '--seconds', '14', '--window', '10', '--vsync', 'off',
  '--prof-all', '--cpu', '--alloc', '--census',
  '--out', `qa/AG-419/${tag}-training.json`
], `${tag}-training.log`));

results.push(await runCmd('night 20 (High, vsync off)', [
  'tools/bench.mjs', '--night', '20', '--gfx', 'high',
  '--seconds', '14', '--window', '10', '--vsync', 'off',
  '--prof-all', '--cpu', '--alloc', '--census',
  '--out', `qa/AG-419/${tag}-night20.json`
], `${tag}-night20.log`));

results.push(await runCmd('day 5 (High, vsync off)', [
  'tools/bench.mjs', '--scenario', 'day5', '--gfx', 'high',
  '--seconds', '14', '--window', '10', '--vsync', 'off',
  '--prof-all', '--cpu', '--alloc', '--census',
  '--out', `qa/AG-419/${tag}-day5.json`
], `${tag}-day5.log`));

results.push(await runCmd('strict48 (48 near brutes, High, vsync off)', [
  'tools/bench.mjs', '--count', '48', '--fixture', 'tools/strict48-fixture.js', '--gfx', 'high',
  '--seconds', '14', '--window', '10', '--vsync', 'off',
  '--prof-all', '--cpu', '--alloc', '--census',
  '--out', `qa/AG-419/${tag}-strict48.json`
], `${tag}-strict48.log`));

fs.writeFileSync(path.join(OUT, `${tag}-summary.json`), JSON.stringify({ tag, at: new Date().toISOString(), results }, null, 2), 'utf8');
console.log(`\n[AG-419 ${tag}] All runs complete.`);
