import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';

const phase = process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && (['before','after','catalog-nov11','catalog-chain-skin'].includes(phase) || /^catalog-fix-[a-z0-9-]+$/.test(phase)));
const root = fileURLToPath(new URL('../../',import.meta.url));
const webgl=process.argv.includes('--webgl');
const selection = process.argv.slice(3).filter(arg=>arg!=='--webgl');
const folder = selection.length && !phase.startsWith('catalog-') ? path.join(root,'review/GT-20076','surfaces',phase) : path.join(root,'review/GT-20076',phase,webgl?'inspector-webgl':'inspector');
await fs.mkdir(folder,{recursive:true});
const server = await serve(root,0);
const browser = await launch({headless:false});
try {
  const page = await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?inspect&debug=1&raf=timer'+(webgl?'&renderer=webgl':''));
  assert(await page.waitFor('window.DWInspect?.ready && !TT.trainingDbg.state().warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:60000}));
  const backend=await page.evaluate("TT.inspectHost().renderer?.backend?.constructor?.name || TT.renderer?.backend?.constructor?.name");
  if(webgl) assert.match(backend,/WebGL/i);
  if(phase.startsWith('catalog-fix-') || webgl) await fs.writeFile(path.join(folder,'backend.txt'),backend+'\n');
  const diagnostics=()=>{
    const redact=s=>String(s).replace(/(__gameTestToken=)[^&\\s)]+/g,'$1[redacted]');
    const warnings=page.console.filter(r=>['error','warning'].includes(r.type)&&!/404|powerPreference/.test(r.text));
    return {errors:page.errors.map(redact),console:warnings.map(r=>({...r,text:redact(r.text)}))};
  };
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
        await fs.writeFile(path.join(folder,'renderer-errors.json'),JSON.stringify(diagnostics(),null,2));
      }
      assert(bytes.length>4000,id+' '+light+' capture ('+bytes.length+' bytes)');
      await fs.writeFile(path.join(folder,id.slice(7)+'-'+light+'.jpg'),bytes);
    }
  }
  const diagnostic=diagnostics();
  if(phase.startsWith('catalog-fix-')) await fs.writeFile(path.join(folder,'renderer-errors.json'),JSON.stringify(diagnostic,null,2)+'\n');
  assert.deepEqual(page.errors,[]);
  assert.deepEqual(diagnostic.console.filter(r=>/setPipeline|usage.*(conflict|synchronization)|invalid.*command buffer/i.test(r.text)),[]);
  console.log('PASS',backend,ids.length,'weapon models, four inspector views each');
} finally {await browser.close();await server.close();}
