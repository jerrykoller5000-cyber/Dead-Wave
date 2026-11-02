// Verify the mapped dry passage with the actual player collision resolver.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('run through the shared game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const points=JSON.parse(fs.readFileSync(path.join(root,'review/GP-20008/shore-audit-summary.json'),'utf8')).path;
const server=await serve(root,0), browser=await launch({headless:true});
const page=await browser.newPage({width:960,height:540});
try {
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&renderer=webgl&quarterwalls=1`);
  await page.waitFor('!!window.DWOpening',{timeout:60000});
  for(let i=0;i<2;i++){await page.evaluate('DWOpening.dismissForTesting()');await page.evaluate('new Promise(r=>setTimeout(r,300))');}
  if(!await page.waitFor('!!window.TT',{timeout:300000})) throw new Error(`TT timeout: ${page.errors.slice(0,3)}`);
  const results=await page.evaluate(`(() => ${JSON.stringify(points)}.map(p => {
    const q=TT.resolveStaticProps(p.x,p.z,.35,TT.sampleHeight(p.x,p.z));
    return {x:p.x,z:p.z,water:TT.waterDepthAt(p.x,p.z),slope:TT.terrainSlope(p.x,p.z),
      push:Math.hypot(q.x-p.x,q.z-p.z)};
  }))()`);
  const worst={maxWet:Math.max(...results.map(r=>r.water)),maxPush:Math.max(...results.map(r=>r.push)),
    maxSlope:Math.max(...results.map(r=>r.slope)),points:results.length};
  fs.writeFileSync(path.join(root,'review/GP-20008/shore-verify.json'),JSON.stringify({worst,results},null,2));
  console.log(JSON.stringify(worst));
  if(worst.maxWet>.05 || worst.maxPush>.1 || worst.maxSlope>.5) throw new Error('SE shore passage fails dry collision check');
  if(page.errors.length) throw new Error(`Page errors: ${page.errors.slice(0,3)}`);
} finally {await browser.close();await server.close();}
