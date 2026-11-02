// Fine water/collision survey of the SE shore gap, under one game-test lease.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('run through the shared game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const server=await serve(root,0), browser=await launch({headless:true});
const page=await browser.newPage({width:960,height:540});
try {
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&renderer=webgl&quarterwalls=1`);
  await page.waitFor('!!window.DWOpening',{timeout:60000});
  for(let i=0;i<2;i++) { await page.evaluate('DWOpening.dismissForTesting()'); await page.evaluate('new Promise(r=>setTimeout(r,300))'); }
  if(!await page.waitFor('!!window.TT',{timeout:300000})) throw new Error(`TT timeout: ${page.errors.slice(0,3)}`);
  const data=await page.evaluate(`(() => {
    const T=TT, step=.25, xmin=-72,xmax=-46,zmin=-83,zmax=-58;
    const rows=[];
    for(let z=zmin;z<=zmax+1e-8;z+=step) {
      const row=[];
      for(let x=xmin;x<=xmax+1e-8;x+=step)
        row.push([+T.waterDepthAt(x,z).toFixed(3),T.wallBandsDbg.blocked(x,z,.35)?1:0,+T.terrainSlope(x,z).toFixed(2)]);
      rows.push(row);
    }
    return {xmin,xmax,zmin,zmax,step,rows,band:T.wallBandsDbg.bands().find(b=>b.kind==='quarter-se')};
  })()`);
  fs.writeFileSync(path.join(root,'review/GP-20008/shore-audit.json'),JSON.stringify(data));
  console.log(JSON.stringify({size:[data.rows[0].length,data.rows.length],band:data.band.kind,
    solids:data.band.solids}));
  if(page.errors.length) throw new Error(`Page errors: ${page.errors.slice(0,3)}`);
} finally { await browser.close(); await server.close(); }
