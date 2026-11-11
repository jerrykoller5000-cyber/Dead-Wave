import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:800,height:450});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  const result=await page.evaluate(`(async()=>{
    const T=TT.THREE,issued=TT.weaponMeshes.sniper,old=issued.getObjectByName('scope'),nx=issued.getObjectByName('optic.nx8');
    const was=old.visible;old.visible=true;old.traverse(()=>{});const duringWarmup=old.children.length;old.visible=was;
    if(!nx||duringWarmup)throw Error('The issued model created the superseded alternative');
    const make=(await import('/studio/weapon-longarms.js')).makeSniperModel;
    const raw=make(TT.inspectHost().builders.weaponContext()),fallback=raw.getObjectByName('scope');
    const cold=fallback.children.length;
    const display=new T.Group();display.add(raw);display.traverseVisible(()=>{});
    const first=fallback.children.slice();display.traverseVisible(()=>{});
    if(cold||!first.length||fallback.children.some((o,i)=>o!==first[i]))throw Error('Standalone fallback did not realize exactly once '+cold+'/'+first.length);
    return {issued:nx.name,duringWarmup,standaloneBeforeDisplay:cold,standaloneAfterDisplay:first.length};
  })()`);
  await save(new URL('./fallback-proof.json',import.meta.url),JSON.stringify(result,null,2));
  assert.deepEqual(page.errors,[]);console.log('PASS issued fallback suppression and standalone display',JSON.stringify(result));
}finally{await browser.close();await server.close()}
