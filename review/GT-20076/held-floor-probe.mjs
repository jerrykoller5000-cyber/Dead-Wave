import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from './save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Cover review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.vis=m.makeViews(TT);return vis.equip('chainsaw')})");
  const result=[];
  for (const candidate of [[0,-.55,0],[0,4,0],[0,-5,0],[3,-5,0],[-3,-5,0],[0,-5,Math.PI],[3,-7,Math.PI/2],[-3,-7,-Math.PI/2],[3,8,Math.PI]]) {
    const state=await page.evaluate('vis.pose("held-right",'+JSON.stringify(candidate)+')');
    const constraints=await page.evaluate(`(()=>{
      const t=TT.trainingDbg.state(),p=TT.player.position;
      const box=(b)=>[b.minX,b.maxX,b.minY,b.maxY,b.minZ,b.maxZ];
      const near=b=>b.maxY>p.y+.4 && b.minY<p.y+2.2 && p.x>b.minX-2 && p.x<b.maxX+2 && p.z>b.minZ-2 && p.z<b.maxZ+2;
      return {range:t.tg.solids.filter(b=>!b.floor && b.target==null && near(b)).map(box).slice(0,8),
        camera:(t.cameraCollision?.boxes||[]).filter(near).map(box).slice(0,8)};
    })()`);
    result.push({candidate,actual:state.actualSpot,elevation:state.heldElevation,...constraints});
  }
  await save(new URL('./visible-repairs/chainsaw/floor-probe.json',import.meta.url),JSON.stringify(result,null,2));
  console.log(result.map(r=>[r.candidate,'actual',r.actual,'angle',r.elevation.toFixed(2),'nearby',[r.range.length,r.camera.length]].join(' ')).join('\n'));
  assert.deepEqual(page.errors,[]);
} finally {await browser.close();await server.close();}
