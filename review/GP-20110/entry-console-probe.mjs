import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20110');
const phase = ['before', 'after', 'final', 'part3-before', 'part3-after', 'part3-final'].includes(process.argv[2]) ? process.argv[2] : 'before';
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
const coreFile = fs.readFileSync(path.join(root, 'vendor/three/three.core.js'), 'utf8');
const coreClass = coreFile.indexOf('class BufferGeometry extends EventDispatcher {');
const coreSuper = coreFile.indexOf('\t\tsuper();', coreClass);
if (coreClass < 0 || coreSuper < 0) throw Error('core geometry marker missing');
const taggedCore = coreFile.slice(0, coreSuper + '\t\tsuper();'.length) +
  '\n\t\tthis.__originStack = (new Error).stack;' + coreFile.slice(coreSuper + '\t\tsuper();'.length);
const vendorFile = fs.readFileSync(path.join(root, 'vendor/three/three.webgpu.js'), 'utf8');
const taggedVendor = vendorFile
  .replace('console.warn( `AttributeNode: Vertex attribute "${ attributeName }" not found on geometry.` );',
    'console.warn( `AttributeNode: Vertex attribute "${ attributeName }" not found on geometry. OBJECT ${builder.object?.name} PARENT ${builder.object?.parent?.name} GEO ${builder.geometry?.uuid} GTYPE ${builder.geometry?.type} ATTRS ${Object.keys(builder.geometry?.attributes||{})} MAT ${builder.material?.type} ORIGIN ${(builder.geometry?.__originStack||\"\").split(\"\\n\").slice(2,7).join(\" > \")}` );')
  .replace('console.warn( \'THREE.TSL: Vertex attribute "normal" not found on geometry.\' );',
    'console.warn( `THREE.TSL: Vertex attribute "normal" not found on geometry. OBJECT ${builder.object?.name} PARENT ${builder.object?.parent?.name} GEO ${builder.geometry?.uuid} GTYPE ${builder.geometry?.type} ATTRS ${Object.keys(builder.geometry?.attributes||{})} MAT ${builder.material?.type} ORIGIN ${(builder.geometry?.__originStack||\"\").split(\"\\n\").slice(2,7).join(\" > \")}` );');
if (taggedVendor === vendorFile) throw Error('vendor diagnostic injection did not match');
const report = { at: new Date().toISOString(), requests: [], console: [], failures: [], inventory: [], zero: [] };
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  page.conn.onEvent((msg) => {
    if (msg.sessionId !== page.sessionId || msg.method !== 'Fetch.requestPaused') return;
    const p = msg.params || {};
    const isVendor = p.request?.url?.includes('/vendor/three/three.webgpu.js');
    const isCore = p.request?.url?.includes('/vendor/three/three.core.js');
    const send = isVendor || isCore
      ? page.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: 'text/javascript; charset=utf-8' }],
        body: Buffer.from(isVendor ? taggedVendor : taggedCore).toString('base64') })
      : page.send('Fetch.continueRequest', { requestId: p.requestId });
    send.catch(e => report.failures.push({ intercept: String(e) }));
  });
  page.conn.onEvent((msg) => {
    if (msg.sessionId !== page.sessionId) return;
    const p = msg.params || {};
    if (msg.method === 'Network.requestWillBeSent') report.requests.push({ id: p.requestId, url: p.request?.url, initiator: p.initiator?.stack?.callFrames?.slice(0, 3) || [], type: p.type });
    if (msg.method === 'Network.loadingFailed') report.failures.push({ id: p.requestId, error: p.errorText });
    if (msg.method === 'Network.responseReceived' && p.response?.status >= 400) report.failures.push({ id: p.requestId, url: p.response.url, status: p.response.status });
  });
  await page.send('Network.enable', {});
  await page.send('Fetch.enable', { patterns: [
    { urlPattern: '*three.webgpu.js*', requestStage: 'Request' },
    { urlPattern: '*three.core.js*', requestStage: 'Request' }
  ] });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const oldWarn = console.warn;
    console.warn = (...args) => {
      (window.__warnStacks ||= []).push({ text: args.map(String).join(' '), stack: (new Error).stack });
      oldWarn.apply(console, args);
    };
  })()` });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 })) throw Error('game not ready');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 })) throw Error('opening not hidden');
  await page.evaluate(`(() => { document.getElementById('playerName').value='GP-20110 console probe'; document.getElementById('modeTraining').click(); })()`);
  if (!await page.waitFor('TT.trainingDbg.state().active', { timeout: 90000 })) throw Error('Training not active');
  if (!await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 20000 })) throw Error('blackout stuck');
  await page.screenshot(path.join(out, `${phase}-entry.png`));
  await new Promise(r => setTimeout(r, phase === 'final' || phase.startsWith('part3-') ? 60000 : 10000));
  report.console = page.console.filter(c => ['error', 'warning', 'warn'].includes(c.type));
  report.stacks = await page.evaluate('window.__warnStacks || []');
  report.inventory = await page.evaluate(`(() => {
    const rows=[]; TT.scene.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const g=o.geometry, a=g.attributes || {}, mats=Array.isArray(o.material)?o.material:[o.material];
      const missing=['position','normal','ember'].filter(k=>!a[k]);
      if (!missing.length) return;
      rows.push({name:o.name || '', parent:o.parent?.name || '', type:o.type, geometry:g.type,
        attributes:Object.keys(a), count:a.position?.count ?? 0, missing,
        materials:mats.map(m=>({type:m?.type, name:m?.name, uuid:m?.uuid})), visible:o.visible});
    }); return rows;
  })()`);
  report.zero = await page.evaluate(`(() => {const rows=[];TT.scene.traverse(o=>{
    if(!o.isMesh || !o.geometry || !o.visible)return;
    if((o.geometry.getAttribute('position')?.count ?? 0)===0) rows.push({name:o.name,parent:o.parent?.name,geo:o.geometry.uuid,material:o.material?.type});
  });return rows;})()`);
  console.log(`GP-20110: ${report.console.length} warnings/errors, ${report.failures.length} network failures, ${report.inventory.length} meshes missing an attribute`);
} catch (e) { report.error = String(e?.stack || e); console.error(report.error); process.exitCode = 1; }
finally { fs.writeFileSync(path.join(out, `${phase}-console.json`), JSON.stringify(report, null, 2) + '\n'); await browser.close(); await server.close(); }
