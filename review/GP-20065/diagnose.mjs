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
  await page.goto(`${server.origin}/index.html?debug=1`);
  if (!await page.waitFor('!!window.TT?.opticDbg', { timeout: 45000 })) throw new Error('Game did not expose optic hooks');
  const data = await page.evaluate(`(() => {
    const T=window.TT, O=T.opticDbg, g=T.weaponMeshes.minigun;
    O.grant('minigun','rmr'); O.fit('minigun','rmr');
    const m=g.userData.fittedOptic;
    const box=(o)=>{let lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];o.traverse(v=>{if(!v.isMesh)return;
      v.geometry.computeBoundingBox();const b=v.geometry.boundingBox;
      for(const x of [b.min.x,b.max.x]) for(const y of [b.min.y,b.max.y]) for(const z of [b.min.z,b.max.z]){
        const p=v.localToWorld(v.position.clone().set(x,y,z));
        for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],p.toArray()[i]);hi[i]=Math.max(hi[i],p.toArray()[i]);}
      }
    });return [lo,hi];};
    return {gun:{pos:g.position.toArray(),rot:g.rotation.toArray(),scale:g.scale.toArray()},
      mount:{pos:m.position.toArray(),box:box(m),children:m.children.map(c=>({name:c.name,pos:c.position.toArray()}))},
      stock:{box:box(g.userData.defaultSight),visible:g.userData.defaultSight.visible},
      whole:box(g)};
  })()`);
  console.log(JSON.stringify(data,null,2));
  if (page.errors.length) throw new Error(`Browser errors: ${page.errors.slice(0,4).join(' | ')}`);
} finally { await browser.close(); await server.close(); }
