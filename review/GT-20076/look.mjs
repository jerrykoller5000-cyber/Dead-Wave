import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';

const phase = process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const root = fileURLToPath(new URL('../../',import.meta.url));
const folder = path.join(root,'review/GT-20076',phase,'inspector');
await fs.mkdir(folder,{recursive:true});
const server = await serve(root,0);
const browser = await launch({headless:false});
try {
  const page = await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?inspect&debug=1&raf=timer');
  assert(await page.waitFor('window.DWInspect?.ready'));
  const ids = await page.evaluate("DWInspect.list().map(s=>s.id).filter(id=>id.startsWith('weapon.'))");
  for (const id of ids) {
    await page.evaluate(`DWInspect.show(${JSON.stringify(id)},{instant:true})`);
    for (const [view,light] of [['side','noon'],['three','overcast'],['rear3','dusk'],['three','night']]) {
      const data=await page.evaluate(`(async()=>{DWInspect.light('${light}'); DWInspect.view('${view}',{instant:true}); await DWInspect.stepAsync(2); return DWInspect.shot({type:'image/jpeg',quality:0.88});})()`);
      const bytes=Buffer.from(data.split(',')[1],'base64');
      assert(bytes.length>4000,id+' '+light+' capture');
      await fs.writeFile(path.join(folder,id.slice(7)+'-'+light+'.jpg'),bytes);
    }
  }
  assert.deepEqual(page.errors,[]);
  console.log('PASS',ids.length,'weapon models, four inspector views each');
} finally {await browser.close();await server.close();}
