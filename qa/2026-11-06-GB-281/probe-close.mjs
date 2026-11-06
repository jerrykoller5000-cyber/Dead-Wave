// Confirm Target.closeTarget drops page targets (GB-281).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HERE = path.join(ROOT, 'tools', 'tests');

function buildTestPage() {
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const map = src.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  const fake = `<script type="importmap">
  { "imports": { "three": "./fakethree.mjs", "three/webgpu": "./fakethree.mjs", "three/tsl": "./faketsl.mjs", "three/addons/": "./addons/" } }
  </script>`;
  let out = src.replace(map[0], fake);
  out = out.replace('<head>', '<head>\n  <script>try{localStorage.clear()}catch(e){}</script>');
  out = out.replace(/(\s(?:src|href)=")(?!https?:|\/|data:|#)/g, '$1/');
  out = out.replace(/from (['"])\.\//g, 'from $1/');
  out = out.replace(/import (['"])\.\//g, 'import $1/');
  const file = path.join(HERE, `test-probe-close-${process.pid}.html`);
  fs.writeFileSync(file, out);
  return file;
}

const pageFile = buildTestPage();
const PAGE = path.basename(pageFile);
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });

async function countPages(page) {
  const { targetInfos } = await page.conn.send('Target.getTargets', {});
  return targetInfos.filter((t) => t.type === 'page').length;
}

const names = ['t0', 't6a', 'tcl275a'];
let lastPage = null;
for (const name of names) {
  const code = fs.readFileSync(path.join(HERE, name + '.js'), 'utf8');
  const page = await browser.newPage({ width: 1280, height: 720 });
  lastPage = page;
  await page.goto(`${server.origin}/tools/tests/${PAGE}?debug=1&raf=timer`, { timeout: 120000 });
  await page.waitFor('!!window.TT', { timeout: 120000 });
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
  await page.evaluate(fs.readFileSync(path.join(HERE, 'lib.js'), 'utf8'));
  await page.evaluate(code, 200000);
  const before = await countPages(page);
  await page.close();
  // briefly wait for target detach
  await new Promise((r) => setTimeout(r, 200));
  const after = await countPages(page);
  console.log(`${name}: pages before-close=${before} after-close=${after}`);
}

// leftover should be ~1 (launch about:blank) if closes work
if (lastPage) {
  const n = await countPages(lastPage);
  console.log(`final page targets: ${n} (expect 1 = launch about:blank)`);
}

await browser.close();
await server.close();
try { fs.unlinkSync(pageFile); } catch {}
