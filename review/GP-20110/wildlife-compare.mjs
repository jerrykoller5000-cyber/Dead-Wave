import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use the game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20110');
const current = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const nowBird = "const params = { side: THREE.DoubleSide, transparent: wing, depthWrite: !wing, color: 0xffffff, ...(!basic ? { roughness } : {}) };";
const oldBird = "const params = { side: THREE.DoubleSide, transparent: wing, depthWrite: !wing, roughness, color: 0xffffff };";
const emberLine = "      for (const geo of Object.values(geos)) geo.setAttribute('ember', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count), 1));\n";
if (!current.includes(nowBird) || !current.includes(emberLine)) throw Error('expected wildlife fixes missing from fresh index');
const beforeSource = current.replace(nowBird, oldBird).replace(emberLine, '');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
const report = { at: new Date().toISOString(), phases: [] };
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  page.conn.onEvent(msg => {
    if (msg.sessionId !== page.sessionId || msg.method !== 'Fetch.requestPaused') return;
    page.send('Fetch.fulfillRequest', { requestId: msg.params.requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }],
      body: Buffer.from(beforeSource).toString('base64') }).catch(e => { report.interceptError = String(e); });
  });
  let views;
  for (const phase of ['before', 'after']) {
    if (phase === 'before') await page.send('Fetch.enable', { patterns: [{ urlPattern: '*index.html*', requestStage: 'Request' }] });
    else await page.send('Fetch.disable', {});
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer&compare=${phase}`);
    if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 })) throw Error(`${phase}: game not ready`);
    await page.evaluate('DWOpening.dismissForTesting()');
    if (!await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 })) throw Error(`${phase}: opening not hidden`);
    await page.evaluate(`document.getElementById('modeSelect').style.display='none'`);
    await new Promise(r => setTimeout(r, 500));
    if (!views) {
      views = await page.evaluate(`(() => {
        const body=TT.scene.getObjectByName('bird-flock-body-instanced');
        if (!body || !body.visible) return {error:'bird batch not visible',body:!!body,visible:body?.visible};
        const m=new TT.THREE.Matrix4();body.getMatrixAt(0,m);const p=new TT.THREE.Vector3().setFromMatrixPosition(m);
        return {bird:{x:p.x+3,y:p.y+1.5,z:p.z+5,tx:p.x,ty:p.y,tz:p.z,fov:40},
          forest:{x:p.x+10,y:p.y+15,z:p.z+18,tx:p.x,ty:p.y-25,tz:p.z,fov:45},point:p.toArray()};
      })()`);
      if (!views.bird) throw Error(JSON.stringify(views));
    }
    for (const kind of ['bird','forest']) {
      await page.evaluate(`TT.setShotView(${JSON.stringify(views[kind])})`);
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot(path.join(out, `${phase}-${kind}.png`));
    }
    report.phases.push({ phase, console: page.console.filter(c => ['warning','warn','error'].includes(c.type)), errors:page.errors.slice() });
    page.console.length = 0; page.errors.length = 0;
  }
  report.views = views;
  console.log(`GP-20110 wildlife same-camera before/after: ${views.point.join(',')}; before ${report.phases[0].console.length} warnings/errors, after ${report.phases[1].console.length}`);
} catch (e) { report.error = String(e?.stack || e); console.error(report.error); process.exitCode = 1; }
finally { fs.writeFileSync(path.join(out, 'wildlife-compare.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); await server.close(); }
