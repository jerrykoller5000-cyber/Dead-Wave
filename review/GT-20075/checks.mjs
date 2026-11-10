import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../../tools/cdp.mjs';
import { serve } from '../../tools/serve.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Run through the crew slot');
const root = fileURLToPath(new URL('../../', import.meta.url));
const server = await serve(root, 0);
const names = process.argv.slice(2);
const lib = await fs.readFile(path.join(root, 'tools/tests/lib.js'), 'utf8');
try {
  for (const name of names) {
    assert(/^t[a-z0-9]+$/.test(name));
    const browser = await launch({headless:false});
    try {
      const page = await browser.newPage({width:1280, height:720});
      await page.goto(server.origin + '/index.html?debug=1&raf=timer&check=' + name);
      assert(await page.waitFor('window.TT && DWLoad.snapshot().state === "ready"'), 'load ' + name);
      await page.evaluate('localStorage.clear(); DWOpening.dismissForTesting()');
      assert(await page.waitFor('document.querySelector("#opening").hidden'));
      await page.evaluate(lib);
      const code = await fs.readFile(path.join(root, 'tools/tests', name + '.js'), 'utf8');
      const result = await page.evaluate(code, 220000);
      const lines = String(result).split('\n');
      const passed = lines.filter(line => line.startsWith('PASS')).length;
      const failed = lines.filter(line => line.startsWith('FAIL'));
      await fs.writeFile(path.join(root, 'review/GT-20075', name + '.txt'), result + '\n');
      console.log(name, passed, 'passed;', failed.length, 'failed', ...failed);
      if (!passed || failed.length || page.errors.length) process.exitCode = 1;
      if (page.errors.length) console.log(page.errors);
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
