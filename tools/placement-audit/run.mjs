// tools/placement-audit/run.mjs — CF-19 (D-218, Claude 6): dump the Training Ground the game builds, for audit.py.
//
//   node tools/game-test-slot.mjs run <agent> <task> -- node tools/placement-audit/run.mjs [out-dir] [--bake]
//   (on Jerry's PC through the slot: node crew/crew.mjs slot run <you> <task> --checks "placement-audit" -- node tools/placement-audit/run.mjs)
//
// It builds a copy of the test page (the same fakethree import map as tools/tests/run-all.mjs), but with the static
// bakers off (world/bake.js -> no-bake.js through the import map), so every prop keeps its own mesh and name and a hit
// says which prop it is. --bake keeps the game's baking (to compare). Writes <out>/scene.json (meshes, lights, plan)
// and <out>/tris.f32 (every mesh's world triangles, float32, in scene.json's order). Default out: review/CF-19/run.
// Read-only: no game file is changed; the page is tools/placement-audit/page-<pid>.html, deleted at the end.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../serve.mjs';
import { launch } from '../cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const args = process.argv.slice(2);
const keepBake = args.includes('--bake');
const OUT = path.resolve(ROOT, args.find((a) => !a.startsWith('--')) || 'review/CF-19/run');
fs.mkdirSync(OUT, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const map = src.match(/<script type="importmap">([\s\S]*?)<\/script>/);
if (!map) throw new Error('no import map in index.html');
const imports = { three: '/tools/tests/fakethree.mjs', 'three/webgpu': '/tools/tests/fakethree.mjs', 'three/tsl': '/tools/tests/faketsl.mjs', 'three/addons/': '/tools/tests/addons/' };
if (!keepBake) imports['/world/bake.js'] = '/tools/placement-audit/no-bake.js';
// Line numbers stay the game's own (the new import map is padded to the old one's line count, the extras share the
// <head> line), so a mesh's source line in the report is index.html's line.
const pad = '\n'.repeat((map[0].match(/\n/g) || []).length);
let page;
// Provenance: the first time a mesh is added to anything, the call stack that added it (file:line of the builder).
const hook = `<script type="module">import * as T from 'three';Error.stackTraceLimit=40;const W=window.__CF19SRC=new WeakMap();const add=T.Object3D.prototype.add;T.Object3D.prototype.add=function(...o){let s=null;for(const x of o){if(x&&typeof x==='object'&&!W.has(x)){s=s||new Error().stack;W.set(x,s);}}return add.apply(this,o);};</script>`;
page = src.replace(map[0], `<script type="importmap">${JSON.stringify({ imports })}</script>${hook}${pad}`);
page = page.replace('<head>', '<head><script>try{localStorage.clear()}catch(e){}</script>');
page = page.replace(/(\s(?:src|href)=")(?!https?:|\/|data:|#)/g, '$1/');
page = page.replace(/from (['"])\.\//g, 'from $1/').replace(/import (['"])\.\//g, 'import $1/');
// The page has to be one the server lets through the slot (tools/serve.mjs: tools/tests/test-<n>.html).
const PAGE = `test-${process.pid}.html`;
const pageFile = path.join(ROOT, 'tools', 'tests', PAGE);
fs.writeFileSync(pageFile, page);

const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
let code = 0;
try {
  const tab = await browser.newPage({ width: 1280, height: 720 });
  const token = process.env.DW_GAME_TEST_TOKEN ? '&__gameTestToken=' + encodeURIComponent(process.env.DW_GAME_TEST_TOKEN) : '';
  await tab.goto(`${server.origin}/tools/tests/${PAGE}?debug=1&raf=timer${token}`, { timeout: 180000 });
  if (!(await tab.waitFor('!!window.TT', { timeout: 180000 }))) throw new Error('window.TT never appeared: ' + (tab.errors[0] || '').split('\n')[0]);
  await tab.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await tab.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  const raw = await tab.evaluate(fs.readFileSync(path.join(HERE, 'dump.js'), 'utf8'), 400000);
  const data = JSON.parse(raw);
  if (!data.ok) throw new Error(data.error || 'dump failed');
  const SIZE = 4 << 20, parts = [];
  for (let i = 0; i * SIZE < data.bytes; i++) parts.push(Buffer.from(await tab.evaluate(`window.__CF19.slice(${i}, ${SIZE})`, 120000), 'base64'));
  const buf = Buffer.concat(parts);
  if (buf.length !== data.bytes) throw new Error(`triangles: got ${buf.length} bytes of ${data.bytes}`);
  fs.writeFileSync(path.join(OUT, 'tris.f32'), buf);
  data.baked = keepBake; data.pageErrors = tab.errors.slice(0, 10).map((e) => e.split('\n')[0]);
  fs.writeFileSync(path.join(OUT, 'scene.json'), JSON.stringify(data));
  console.log(`placement-audit: ${data.meshes.length} meshes, ${data.lights.length} lights, ${data.triTotal} triangles -> ${path.relative(ROOT, OUT)}`);
  if (data.notes.length) console.log('notes: ' + data.notes.join(' | '));
  if (data.pageErrors.length) console.log('page errors: ' + data.pageErrors.join(' | '));
} catch (e) {
  console.error('placement-audit: ' + e.message); code = 1;
} finally {
  try { await browser.close(); } catch {}
  try { server.close(); } catch {}
  try { fs.unlinkSync(pageFile); } catch {}
}
process.exit(code);
