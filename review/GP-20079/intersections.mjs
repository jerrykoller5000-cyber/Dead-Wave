import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20079');
const server = await serve(root, 0), browser = await launch({ headless: false, args: ['--window-size=1000,1000'] });
try {
  const page = await browser.newPage({ width: 1000, height: 1000 });
  await page.goto(`${server.origin}/index.html?inspect&raf=timer`);
  if (!await page.waitFor('(window.DWInspect && window.DWInspect.ready) || !!window.DWInspectError', { timeout: 180000 })) throw Error('inspector not ready');
  const result = await page.evaluate(`(async () => {
    const T = TT.THREE, results = [];
    const kinds = ['shambler','feral','leaper','spider','drowned','military','brute','spitter','screamer','bomber','demon','colossus','guardian','caveguard'];
    const ray = new T.Raycaster(), dir = new T.Vector3(1,.137,.071).normalize(), point = new T.Vector3();
    function component(o, u) {
      for (let p=o.parent;p;p=p.parent) {
        if (p===u.head) return 'head';
        if (p===u.armLG) return 'armL'; if (p===u.armRG) return 'armR';
        if (p===u.legLG) return 'legL'; if (p===u.legRG) return 'legR';
        if (p===u.torso) return 'torso'; if (p===u.hips) return 'hips';
        if (/shoulderL/.test(p.name)) return 'armL'; if (/shoulderR/.test(p.name)) return 'armR';
        if (/hipL/.test(p.name)) return 'legL'; if (/hipR/.test(p.name)) return 'legR';
        if (p.name==='head') return 'head';
      }
      return 'other';
    }
    function inside(p, host) {
      ray.set(p, dir); ray.near=.00001; ray.far=Infinity;
      const m=host.material, side=m.side; m.side=T.DoubleSide;
      const hits=ray.intersectObject(host,false); m.side=side;
      let count=0,last=-Infinity;
      for(const h of hits) if(h.distance-last>.0001){count++;last=h.distance;}
      return (count&1)===1;
    }
    function scan(z) {
      const u=z.mesh.userData, parts=[];z.mesh.updateMatrixWorld(true);
      z.mesh.traverse(o=>{if(!o.isMesh||!o.userData.skinSrc)return;const c=component(o,u);if(c==='other')return;const b=new T.Box3().setFromObject(o),s=b.getSize(new T.Vector3());if(Math.min(s.x,s.y,s.z)<.005)return;parts.push({o,c,b,s});});
      const rows=[];
      for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
        const a=parts[i],b=parts[j];if(a.c===b.c||a.c==='torso'||b.c==='torso'||a.c==='hips'||b.c==='hips')continue;
        const pair=[a.c,b.c].sort().join('/');if(['armL/head','armR/head','armL/legL','armL/legR','armR/legL','armR/legR','armL/armR','legL/legR'].indexOf(pair)<0)continue;
        if(!a.b.intersectsBox(b.b))continue;
        const overlap=a.b.clone().intersect(b.b).getSize(new T.Vector3());if(Math.min(overlap.x,overlap.y,overlap.z)<.003)continue;
        let hits=0,total=0,contact=null;const pos=a.o.geometry.attributes.position,step=Math.max(1,Math.ceil(pos.count/32));
        for(let k=0;k<pos.count;k+=step){point.fromBufferAttribute(pos,k).applyMatrix4(a.o.matrixWorld);if(b.b.containsPoint(point)){total++;if(inside(point,b.o)){hits++;contact=point.toArray();}}}
        const q=b.o.geometry.attributes.position,stepB=Math.max(1,Math.ceil(q.count/32));
        for(let k=0;k<q.count;k+=stepB){point.fromBufferAttribute(q,k).applyMatrix4(b.o.matrixWorld);if(a.b.containsPoint(point)){total++;if(inside(point,a.o)){hits++;contact=point.toArray();}}}
        if(hits)rows.push({pair,a:a.o.name,b:b.o.name,hits,total,contact:contact?.map(x=>+x.toFixed(3)),aCenter:a.b.getCenter(new T.Vector3()).toArray().map(x=>+x.toFixed(3)),bCenter:b.b.getCenter(new T.Vector3()).toArray().map(x=>+x.toFixed(3)),overlap:overlap.toArray().map(x=>+x.toFixed(3))});
      }
      return {parts:parts.length,collisions:rows};
    }
    function tune(z) {
      const u=z.mesh.userData,R=u.bossRig?.userData?.rig;
      const arms=[u.armLG||R?.shoulderL,u.armRG||R?.shoulderR];
      const legs=[u.legLG||R?.hipL,u.legRG||R?.hipR];
      if(!arms[0]||!arms[1]||!legs[0]||!legs[1])return null;
      const original=[...arms,...legs].map(g=>g.rotation.z),counts=[];
      for(const spread of [0,.15,.3,.45,.6,.75,1]){
        for(const lSpread of [0,.12,.24,.36]){
          arms[0].rotation.z=original[0]-spread;arms[1].rotation.z=original[1]+spread;
          legs[0].rotation.z=original[2]-lSpread;legs[1].rotation.z=original[3]+lSpread;
          counts.push({spread,lSpread,n:scan(z).collisions.length});
        }
      }
      [...arms,...legs].forEach((g,i)=>g.rotation.z=original[i]);z.mesh.updateMatrixWorld(true);
      return counts.filter(x=>x.n===0).slice(0,4);
    }
    for(const kind of kinds){await DWInspect.show('zombie.'+kind,{mode:'walk'});const samples=[];for(let f=0;f<4;f++){await DWInspect.stepAsync(6);const z=DWInspect.zombie.get(),s=scan(z);samples.push({frame:6*(f+1),...s,tune:s.collisions.length?tune(z):null});}results.push({kind,samples});}
    return results;
  })()`);
  fs.writeFileSync(path.join(out, 'intersections.json'), JSON.stringify({ result, errors: page.errors }, null, 2));
  console.log('MOTION INTERSECTIONS', JSON.stringify(result.map(r => ({ kind: r.kind, parts: r.samples[0].parts, collisions: r.samples.map(s => s.collisions.length) }))));
  console.log('PAGE ERRORS', page.errors.length);
} finally { await browser.close(); await server.close(); }
