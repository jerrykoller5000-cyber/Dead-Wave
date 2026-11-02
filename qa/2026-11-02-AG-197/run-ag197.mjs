// qa/2026-11-02-AG-197/run-ag197.mjs
// AG-197: Real-hardware GPU validation of CL-275 score calm and regression suite:
// Tests: tcl275d, t73, t60, t61, tcl275a on NVIDIA GeForce RTX 5080 WebGPU.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Must run under the shared game-test slot');

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const TESTS = path.join(ROOT, 'tools', 'tests');
const OUT = path.join(ROOT, 'qa', '2026-11-02-AG-197');
fs.mkdirSync(OUT, { recursive: true });

const WIDTH = 1280;
const HEIGHT = 720;

const telemetry = {
  task: 'AG-197',
  agent: 'antigravity',
  timestamp: new Date().toISOString(),
  backend: null,
  tests: {}
};

console.log('Starting server and browser for AG-197 Real-GPU Score Calm & Regression Suite...');
const server = await serve(ROOT, 0);
console.log(`Server listening on ${server.origin}`);

const browser = await launch({
  headless: false,
  args: [
    `--window-size=${WIDTH},${HEIGHT}`,
    '--enable-precise-memory-info',
    '--task-id=AG-197-CALM'
  ]
});

try {
  const suite = ['tcl275d', 't73', 't60', 't61', 'tcl275a'];

  for (const name of suite) {
    console.log(`\n======================================================`);
    console.log(`Running [${name}] on real WebGPU renderer...`);
    console.log(`======================================================`);
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

    const backend = await page.evaluate('window.TT?.getRendererBackend ? window.TT.getRendererBackend() : "unknown"');
    if (!telemetry.backend) telemetry.backend = backend;

    telemetry.tests[name] = {
      pass,
      fail,
      backend,
      lines
    };

    console.log(`[${name}] Finished: ${pass} PASS, ${fail} FAIL (Backend: ${backend})`);
    for (const l of lines) console.log('    ' + l);

    const shotFile = path.join(OUT, `${name}.png`);
    await page.screenshot(shotFile);

    try { await page.send('Page.close', {}); } catch {}
  }

  // Save telemetry
  const telemPath = path.join(OUT, 'ag197-telemetry.json');
  fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2));
  console.log(`\n======================================================`);
  console.log(`All tests complete. Telemetry saved to ${telemPath}`);
  console.log(`======================================================`);
} finally {
  await browser.close();
  await server.close();
}
