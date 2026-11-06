// Probe: after each check, list page targets; after tcl275d, try navigate blank + game.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HERE = path.join(ROOT, 'tools', 'tests');
const names = ['t0', 't6a', 'tcl275a', 'tcl275b', 'tcl275c', 'tcl275d'];

function buildTestPage() {
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const map = src.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  const fake = `<script type="importmap">
  {
    "imports": {
      "three": "./fakethree.mjs",
      "three/webgpu": "./fakethree.mjs",
      "three/tsl": "./faketsl.mjs",
      "three/addons/": "./addons/"
    }
  }
  </script>`;
  let out = src.replace(map[0], fake);
  out = out.replace('<head>', '<head>\n  <script>try{localStorage.clear()}catch(e){}</script>');
  out = out.replace(/(\s(?:src|href)=")(?!https?:|\/|data:|#)/g, '$1/');
  out = out.replace(/from (['"])\.\//g, 'from $1/');
  out = out.replace(/import (['"])\.\//g, 'import $1/');
  const file = path.join(HERE, `test-probe-${process.pid}.html`);
  fs.writeFileSync(file, out);
  return file;
}

const pageFile = buildTestPage();
const PAGE = path.basename(pageFile);
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });

async function listTargets(page, label) {
  try {
    const { targetInfos } = await page.conn.send('Target.getTargets', {});
    const pages = targetInfos.filter((t) => t.type === 'page');
    console.log(`TARGETS ${label}: ${pages.length} pages -> ` + pages.map((t) => (t.url || '').slice(0, 70)).join(' | '));
    return pages.length;
  } catch (e) {
    console.log(`TARGETS ${label}: ERR ${e.message}`);
    return -1;
  }
}

for (const name of names) {
  const code = fs.readFileSync(path.join(HERE, name + '.js'), 'utf8');
  const page = await browser.newPage({ width: 1280, height: 720 });
  const t0 = Date.now();
  let note = '', pass = 0, fail = 0;
  try {
    await page.goto(`${server.origin}/tools/tests/${PAGE}?debug=1&raf=timer`, { timeout: 120000 });
    const ready = await page.waitFor('!!window.TT', { timeout: 120000 });
    if (!ready) note = 'no TT';
    else {
      await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
      await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
      await page.evaluate(fs.readFileSync(path.join(HERE, 'lib.js'), 'utf8'));
      const out = await page.evaluate(code, 200000);
      const lines = String(out ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
      pass = lines.filter((l) => /^PASS\b/.test(l)).length;
      fail = lines.filter((l) => /^FAIL\b/.test(l)).length;
    }
  } catch (e) { note = e.message.split('\n')[0]; }
  console.log(`${note ? 'ERROR' : (fail ? 'FAIL' : 'ok')} ${name} ${pass}/${fail} ${((Date.now() - t0) / 1000).toFixed(1)}s ${note}`);
  await listTargets(page, `before-close ${name}`);
  try {
    await page.send('Page.close', {}, 8000);
    console.log(`close ${name}: ok`);
  } catch (e) {
    console.log(`close ${name}: ${e.message}`);
  }
  await listTargets(page, `after-close ${name}`);
}

console.log('--- post-wedge probes ---');
try {
  const p2 = await browser.newPage({ width: 1280, height: 720 });
  console.log('newPage: ok');
  await listTargets(p2, 'after-newPage');
  let t = Date.now();
  try {
    await p2.send('Page.navigate', { url: 'about:blank' }, 15000);
    console.log(`navigate about:blank: ok ${((Date.now() - t) / 1000).toFixed(1)}s`);
  } catch (e) {
    console.log(`navigate about:blank: ${e.message} ${((Date.now() - t) / 1000).toFixed(1)}s`);
  }
  t = Date.now();
  try {
    await p2.send('Page.navigate', { url: `${server.origin}/tools/tests/${PAGE}?debug=1&raf=timer` }, 30000);
    console.log(`navigate game: ok ${((Date.now() - t) / 1000).toFixed(1)}s`);
  } catch (e) {
    console.log(`navigate game: ${e.message} ${((Date.now() - t) / 1000).toFixed(1)}s`);
  }
  // Also try Target.getTargetInfo / Browser.getVersion to see if browser CDP is alive
  t = Date.now();
  try {
    const ver = await p2.conn.send('Browser.getVersion', {}, undefined, 10000);
    console.log(`Browser.getVersion: ok ${((Date.now() - t) / 1000).toFixed(1)}s ${ver.product || ''}`);
  } catch (e) {
    console.log(`Browser.getVersion: ${e.message} ${((Date.now() - t) / 1000).toFixed(1)}s`);
  }
} catch (e) {
  console.log('post probe failed: ' + e.message);
}

await browser.close();
await server.close();
try { fs.unlinkSync(pageFile); } catch {}
console.log('done');
