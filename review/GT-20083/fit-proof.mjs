import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});await page.goto(server.origin+'/index.html?debug=1&raf=timer'+(process.argv.includes('--webgl')?'&renderer=webgl':''));
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Grip fit';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(async m=>{window.vis=m.makeViews(TT);await vis.equip('chainsaw');return vis.pose('hip')})");
  const report=await page.evaluate("import('/review/GT-20083/contact.mjs').then(m=>m.contactAtEye(TT))",90000);
  await save(new URL('./contact.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);
  assert.equal(report.fov,48);assert(report.handVertices>50 && report.current.near>0 && report.current.closed);
  assert.equal(report.current.inside,0,'Final rail intersects the posed glove');
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
