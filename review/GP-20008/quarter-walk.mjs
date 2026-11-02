// One-off zombie quarter-crossing check in a fake-renderer page owned by this task.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw new Error('run through shared game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const dir=path.join(root,'review/GP-20008');
const file=path.join(dir,`test-quarter-${process.pid}.html`);
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const map=html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
if(!map)throw new Error('import map missing');
html=html.replace(map[0],`<script type="importmap">{"imports":{
  "three":"/tools/tests/fakethree.mjs",
  "three/webgpu":"/tools/tests/fakethree.mjs",
  "three/tsl":"/tools/tests/faketsl.mjs",
  "three/addons/":"/tools/tests/addons/"}}</script>`);
html=html.replace('<head>','<head>\n<base href="/">\n<script>try{localStorage.clear()}catch(e){}</script>');
fs.writeFileSync(file,html);
const server=await serve(root,0),browser=await launch({headless:true});
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/review/GP-20008/${path.basename(file)}?debug=1&raf=timer&quarterwalls=1`,{timeout:120000});
  if(!await page.waitFor('!!window.TT',{timeout:120000}))throw new Error(`TT timeout: ${page.errors.slice(0,3)}`);
  await page.evaluate('DWOpening?.dismissForTesting?.()');
  await page.waitFor('!window.DWOpening||DWOpening.active===false',{timeout:30000});
  await page.evaluate(fs.readFileSync(path.join(root,'tools/tests/lib.js'),'utf8'));
  const results=await page.evaluate(fs.readFileSync(path.join(dir,'quarter-walk-code.js'),'utf8'),240000);
  fs.writeFileSync(path.join(dir,'quarter-walk.json'),JSON.stringify(results,null,2));
  for(const row of results)console.log(JSON.stringify(row));
  if(results.length!==4||results.some(r=>!r.pass))throw new Error('quarter zombie crossing failed');
  if(page.errors.length)throw new Error(`Page errors: ${page.errors.slice(0,3)}`);
}finally{
  await browser.close();await server.close();fs.unlinkSync(file);
}
