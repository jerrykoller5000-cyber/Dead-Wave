import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {originalHeat} from './original.mjs';
const phase=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN&&['before','after'].includes(phase));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
const report={};
try{
  for(const name of ['tag290','tag296']){
    const p=await browser.newPage({width:1280,height:720});
    const original=phase==='before'?await originalHeat(p,server.origin):null;
    await p.goto(server.origin+'/index.html?debug=1&raf=timer');
    assert(await p.waitFor('!!window.TT',{timeout:240000}));await p.evaluate('DWOpening.dismissForTesting()');assert(await p.waitFor('!DWOpening.active'));
    await p.evaluate(await readFile(new URL('../../tools/tests/lib.js',import.meta.url),'utf8'));
    const result=String(await p.evaluate(await readFile(new URL('../../tools/tests/'+name+'.js',import.meta.url),'utf8'),300000));
    const lines=result.split('\n').map(s=>s.trim());report[name]={pass:lines.filter(s=>s.startsWith('PASS')).length,fail:lines.filter(s=>s.startsWith('FAIL'))};
    await writeFile(new URL('./'+phase+'/'+name+'.txt',import.meta.url),result+'\n');original?.();
    console.log(name,report[name]);await p.send('Page.close',{});
  }
  await writeFile(new URL('./'+phase+'/legacy.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();await server.close();}
