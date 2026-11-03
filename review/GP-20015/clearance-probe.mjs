// Real-world J68 survey. Run only through the shared game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!await page.waitFor('!!window.TT?.wallBandsDbg', { timeout: 600000 })) throw new Error('wall debug hooks did not boot');
  const result = await page.evaluate(`(()=>{
    const T=window.TT, d=T.wallBandsDbg, crossings=d.crossings();
    const results=[];
    for(const c of crossings){
      let samples=0, blocked=0; const first=[];
      for(let j=1;j<c.pts.length;j++){
        const a=c.pts[j-1], b=c.pts[j], dx=b.x-a.x, dz=b.z-a.z, len=Math.hypot(dx,dz);
        if(len<1e-6)continue;
        const nx=-dz/len,nz=dx/len,n=Math.ceil(len/.5);
        for(let k=0;k<=n;k++)for(const side of [-1.2,0,1.2]){
          const t=k/n,x=a.x+dx*t+nx*side,z=a.z+dz*t+nz*side;
          const hit=d.blocked(x,z,.35);samples++;if(hit){blocked++;if(first.length<5)first.push({x:+x.toFixed(2),z:+z.toFixed(2),side});}
        }
      }
      results.push({id:c.id,pts:c.pts,halfWidth:c.halfWidth,samples,blocked,first});
    }
    return {backend:T.getRendererBackend(),bridges:T.POI.bridges.map(({x,z,yaw,deckY})=>({x,z,yaw,deckY})),
      bands:d.bands().map(({kind,solids,gaps})=>({kind,solids,crossingGaps:gaps.filter(g=>g.kind==='crossing').map(g=>g.id)})),results};
  })()`);
  const output = JSON.stringify(result, null, 2) + '\n';
  fs.writeFileSync(path.join(root, 'review/GP-20015/clearance-probe.json'), output, 'utf8');
  console.log(output);
  if (result.backend !== 'WebGPU' || result.bridges.length < 2 ||
      result.results.filter((c) => c.id.startsWith('bridge-')).length !== result.bridges.length ||
      result.results.some((c) => c.blocked)) throw new Error('J68 crossing corridor failed');
  if (page.errors.length) throw new Error('page errors: ' + page.errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  await server.close();
}
