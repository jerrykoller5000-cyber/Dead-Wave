// Capture the approved plan from one live preview instance via the shared slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('run through the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const server = await serve(root, 0);
const browser = await launch({ headless:true });
const page = await browser.newPage({ width:960, height:540 });
try {
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&renderer=webgl&quarterwalls=1`);
  await page.waitFor('!!window.DWOpening', { timeout:60000 });
  for (let i=0;i<2;i++) {
    await page.evaluate('DWOpening.dismissForTesting()');
    await page.evaluate('new Promise(r => setTimeout(r,300))');
  }
  if (!await page.waitFor('!!window.TT', { timeout:300000 })) throw new Error(`TT timeout: ${page.errors.slice(0,3)}`);
  const data = await page.evaluate(`(() => {
    const T=TT, P=T.POI, sites=[];
    const add=(id,p,r=14)=>{ if(p && Number.isFinite(p.x) && Number.isFinite(p.z)) sites.push({id,x:p.x,z:p.z,r}); };
    add('HQ',{x:0,z:0},24); add('landing',{x:42,z:-20},9);
    for(const key of ['campsites','cabins','sheds','wrecks','caves','bridges'])
      for(let i=0;i<(P[key]||[]).length;i++) add(key+'-'+i,P[key][i],key==='bridges'?9:14);
    add('mast',P.mast,20); add('graveyard',P.graveyard); add('tower',P.tower,12); add('dock',P.dock,9);
    const bands=T.wallBandsDbg.bands().filter(b=>b.kind==='hq-thicket'||b.kind.startsWith('quarter-'));
    const solids=T.worldSolids.filter(s=>s.wallBand && bands.some(b=>b.kind===s.wallBand.kind))
      .map(s=>({x:s.x,z:s.z,r:s.radius,kind:s.wallBand.kind}));
    const water=[];
    for(let z=-220;z<=220;z+=3) {
      const row=[]; for(let x=-220;x<=220;x+=3) row.push(T.waterDepthAt(x,z)>.05?1:0);
      water.push(row);
    }
    const trails=T.PATHS.map(p=>p.map(q=>({x:q.x,z:q.z})));
    return {sites,bands,solids,water,waterStep:3,waterMin:-220,trails,
      deadfalls:T.shortcutDbg.list()};
  })()`);
  fs.writeFileSync(path.join(root,'review/GP-20008/plan-data.json'),JSON.stringify(data));
  console.log(JSON.stringify({sites:data.sites.length,bands:data.bands.length,solids:data.solids.length,
    trails:data.trails.length,waterRows:data.water.length,deadfalls:data.deadfalls.length}));
  if(page.errors.length) throw new Error(`Page errors: ${page.errors.slice(0,3)}`);
} finally {
  await browser.close();
  await server.close();
}
