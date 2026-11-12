import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use the game-test slot');
const phase = process.argv[2] === 'after' ? 'after' : 'before';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20110');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
const report = { phase, at: new Date().toISOString() };
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 })) throw Error('game not ready');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 })) throw Error('opening not hidden');
  await page.evaluate(`(() => { document.getElementById('playerName').value='GP-20110 mark probe'; document.getElementById('modeTraining').click(); })()`);
  if (!await page.waitFor('TT.trainingDbg.state().active', { timeout: 90000 })) throw Error('Training not active');
  if (!await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 20000 })) throw Error('blackout stuck');
  await page.evaluate(`(() => { TT.player.position.set(0,-200,-641); TT.setShotView({x:3,y:-197,z:-619,tx:.7,ty:-198.65,tz:-610,fov:46}); })()`);
  await new Promise(r => setTimeout(r, 500));
  const state = `(() => { const tg=TT.trainingDbg.tg(); return {impact:tg.group.getObjectsByProperty('name','training-impact-marks').map(m=>({visible:m.visible,draw:m.geometry.drawRange.count})),char:tg.group.getObjectsByProperty('name','training-char-marks').map(m=>({visible:m.visible,draw:m.geometry.drawRange.count})),impacts:TT.trainingDbg.state().impacts.count(),chars:TT.trainingDbg.char().count()}; })()`;
  report.empty = await page.evaluate(state);
  if (phase === 'after') await page.evaluate(`(() => {
    window.__markPipelines=[];window.__markPrograms=[];
    const b=TT.renderer.backend,oldPipeline=b.createRenderPipeline.bind(b),oldProgram=b.createProgram.bind(b);
    b.createRenderPipeline=(o,...a)=>{window.__markPipelines.push(o.object?.name||'');return oldPipeline(o,...a);};
    b.createProgram=(...a)=>{window.__markPrograms.push(a[0]?.name||'');return oldProgram(...a);};
  })()`);
  await page.evaluate(`(() => { const tg=TT.trainingDbg.tg();
    TT.trainingDbg.round({prev:{x:1,y:-198.6,z:-615},pos:{x:1,y:-198.6,z:-609},hit:false});
    TT.trainingDbg.char().add({solid:{},point:{x:1.7,y:-198.75,z:-610.55},normal:{x:0,y:0,z:-1}},.9);
  })()`);
  await new Promise(r => setTimeout(r, 700));
  report.firstHit = await page.evaluate(state);
  if (phase === 'after') {
    report.pipelineWarmup = await page.evaluate(`({pipelines:window.__markPipelines,programs:window.__markPrograms})`);
    if (report.pipelineWarmup.pipelines.some(n => n === 'training-impact-marks' || n === 'training-char-marks')) throw Error('first mark compiled a new draw pipeline');
  }
  report.warnings = page.console.filter(c => ['error','warning','warn'].includes(c.type));
  report.pageErrors = page.errors.slice();
  await page.screenshot(path.join(out, `${phase}-first-hit.png`));
  console.log(`GP-20110 ${phase} first hit: impacts ${report.firstHit.impacts}, chars ${report.firstHit.chars}, empty impact visible ${report.empty.impact.map(x=>x.visible)}, empty char visible ${report.empty.char.map(x=>x.visible)}`);
} catch (e) { report.error = String(e?.stack || e); console.error(report.error); process.exitCode = 1; }
finally { fs.writeFileSync(path.join(out, `${phase}-first-hit.json`), JSON.stringify(report, null, 2) + '\n'); await browser.close(); await server.close(); }
