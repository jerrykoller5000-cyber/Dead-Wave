// qa/2026-11-02-AG-194/run-ag194-motifs.mjs
// AG-194 addition: Real-hardware GPU validation of CL-275 Training Ground motifs on RTX 5080 WebGPU:
// 1. Suite test tcl275c (Training Ground motifs with score on: feral brings Frenzy motif from drums, cleared when practice ends)
// 2. Suite test t182 (Training Ground baseline mechanics and audio unharmed)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Must run under the shared game-test slot');

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const TESTS = path.join(ROOT, 'tools', 'tests');
const OUT = path.join(ROOT, 'qa', '2026-11-02-AG-194');
fs.mkdirSync(OUT, { recursive: true });

const WIDTH = 1280;
const HEIGHT = 720;

const results = {
  task: 'AG-194',
  subtask: 'tcl275c and t182',
  timestamp: new Date().toISOString(),
  backend: null,
  tests: {}
};

console.log('Starting server and browser for AG-194 Training Ground Motifs (tcl275c & t182)...');
const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: [
    `--window-size=${WIDTH},${HEIGHT}`,
    '--enable-precise-memory-info'
  ]
});

try {
  for (const name of ['tcl275c', 't182']) {
    console.log(`\n--- Running ${name} on real WebGPU renderer ---`);
    const code = fs.readFileSync(path.join(TESTS, name + '.js'), 'utf8');
    const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
    await page.waitFor('!!window.TT', { timeout: 600000 });
    await page.evaluate('DWOpening?.dismissForTesting?.()');
    await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));

    const out = await page.evaluate(code, 300000);
    const lines = String(typeof out === 'string' ? out : JSON.stringify(out)).split('\n').map((l) => l.trim()).filter(Boolean);
    const pass = lines.filter((l) => l.startsWith('PASS')).length;
    const fail = lines.filter((l) => l.startsWith('FAIL')).length;

    results.tests[name] = { pass, fail, lines };
    console.log(`[${name}] Result: ${pass} PASS, ${fail} FAIL`);
    for (const l of lines) console.log('    ' + l);

    if (name === 'tcl275c') {
      await page.screenshot(path.join(OUT, 'tg-motifs-feral.png'));
    }

    try { await page.send('Page.close', {}); } catch {}
  }

  // Update telemetry JSON
  const telemPath = path.join(OUT, 'ag194-telemetry.json');
  let existing = {};
  if (fs.existsSync(telemPath)) {
    try { existing = JSON.parse(fs.readFileSync(telemPath, 'utf8')); } catch {}
  }
  existing.trainingGroundMotifs = results;
  fs.writeFileSync(telemPath, JSON.stringify(existing, null, 2));
  console.log('\nTelemetry successfully updated with tcl275c and t182 results.');

} finally {
  await browser.close();
  await server.close();
}
