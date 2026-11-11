import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';

const phase = process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && (['before','after','catalog-nov11','catalog-chain-skin'].includes(phase) || /^catalog-fix-[a-z0-9-]+$/.test(phase)));
const root = fileURLToPath(new URL('../../',import.meta.url));
const selection = process.argv.slice(3);
const folder = selection.length && !phase.startsWith('catalog-') ? path.join(root,'review/GT-20076','surfaces',phase) : path.join(root,'review/GT-20076',phase,'inspector');
await fs.mkdir(folder,{recursive:true});
const server = await serve(root,0);
const browser = await launch({headless:false});
try {
  const page = await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?inspect&debug=1&raf=timer');
  assert(await page.waitFor('window.DWInspect?.ready && !TT.trainingDbg.state().warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:60000}));
  const catalog = await page.evaluate("DWInspect.list().map(s=>s.id).filter(id=>id.startsWith('weapon.'))");
  const ids = selection.length ? selection.map(id=>'weapon.'+id) : catalog;
  assert(ids.every(id=>catalog.includes(id)));
  for (const id of ids) {
    const selected=await page.evaluate(`DWInspect.show(${JSON.stringify(id)},{instant:true})`);
    if(phase.startsWith('catalog-fix-')) await fs.writeFile(path.join(folder,id.slice(7)+'-selection.json'),JSON.stringify(selected,null,2)+'\n');
    for (const [view,light] of [['side','noon'],['three','overcast'],['rear3','dusk'],['three','night']]) {
      await page.evaluate(`DWInspect.light('${light}'); DWInspect.view('${view}',{instant:true})`);
      let bytes;
      // Allow a newly compiled subject to present its first complete frame.
      for(let attempt=0;attempt<5;attempt++){
        const data=await page.evaluate(`(async()=>{await DWInspect.stepAsync(3);return DWInspect.shot({type:'image/jpeg',quality:0.88});})()`);
        bytes=Buffer.from(data.split(',')[1],'base64');
        if(bytes.length>4000)break;
        await new Promise(resolve=>setTimeout(resolve,220));
      }
      if(bytes.length<=4000){
        await fs.writeFile(path.join(folder,'failed-'+id.slice(7)+'-'+light+'.jpg'),bytes);
        await fs.writeFile(path.join(folder,'renderer-errors.json'),JSON.stringify({errors:page.errors,console:page.console.filter(r=>['error','warning'].includes(r.type)&&!/404|powerPreference/.test(r.text)).slice(0,20)},null,2));
      }
      assert(bytes.length>4000,id+' '+light+' capture ('+bytes.length+' bytes)');
      await fs.writeFile(path.join(folder,id.slice(7)+'-'+light+'.jpg'),bytes);
    }
  }
  assert.deepEqual(page.errors,[]);
  console.log('PASS',ids.length,'weapon models, four inspector views each');
} finally {await browser.close();await server.close();}
