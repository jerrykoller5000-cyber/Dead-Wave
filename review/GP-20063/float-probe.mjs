// Identify the actual unseated small meshes reported by t333, before merging.
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1`, { timeout: 240000 });
  const data = await page.evaluate(`(async () => {
    const {weaponModelContext}=await import('/tools/marine-inspector.js');
    const L=await import('/studio/weapon-longarms.js'), S=await import('/studio/weapon-sidearms.js');
    const T=await import('three');
    const makers={uzi:S.makeUziModel,ak:L.makeAkModel,aa12:L.makeAa12Model,shotgun:L.makeShotgunModel};
    const out={};
    const box=o=>{o.updateWorldMatrix(true,false);return new T.Box3().setFromObject(o)};
    const vol=b=>{const s=b.getSize(new T.Vector3());return s.x*s.y*s.z};
    const longest=b=>{const s=b.getSize(new T.Vector3());return Math.max(s.x,s.y,s.z)};
    for(const [name,make] of Object.entries(makers)) {
      const ctx0=weaponModelContext();let found=[];
      make({...ctx0,finishGun(g){
        g.updateMatrixWorld(true);const meshes=[];
        g.traverse(o=>{if(!o.isMesh||/flash|laser|flare|suppressor|light/i.test(o.name||''))return;
          if(o.material?.transparent&&o.material.opacity===0)return;
          const b=box(o);if(!b.isEmpty())meshes.push({o,b,v:vol(b),l:longest(b)});
        });
        const big=meshes.filter(m=>m.l>0.018);
        for(const s of meshes.filter(m=>m.l<=0.018&&m.v>0)){
          if(big.some(b=>s.b.clone().expandByScalar(0.0015).intersectsBox(b.b)))continue;
          const c=s.b.getCenter(new T.Vector3());
          const near=big.map(b=>({b,d:s.b.distanceToPoint(b.b.getCenter(new T.Vector3()))})).sort((a,b)=>a.d-b.d)[0];
          found.push({at:c.toArray().map(x=>+x.toFixed(4)),mesh:s.o.name||'(unnamed)',parent:s.o.parent?.name||'(unnamed)',mat:s.o.material?.name||'',size:s.b.getSize(new T.Vector3()).toArray().map(x=>+x.toFixed(4)),nearest:near&&{name:near.b.o.name||'(unnamed)',at:near.b.b.getCenter(new T.Vector3()).toArray().map(x=>+x.toFixed(4))}});
        }
        return ctx0.finishGun(g);
      }});
      out[name]=found;
    }
    return out;
  })()`);
  console.log(JSON.stringify(data, null, 2));
  if (page.errors.length) throw new Error(page.errors.join('\n'));
} finally { await browser.close(); await server.close(); }
