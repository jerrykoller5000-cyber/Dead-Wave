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
    const kinds = ['demon'];
    const ray = new T.Raycaster(), dir = new T.Vector3(1,.137,.071).normalize(), point = new T.Vector3();
    function component(o, u) {
      for (let p=o;p;p=p.parent) {
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
      const u=z.mesh.userData, components=new Map(), parts=[];z.mesh.updateMatrixWorld(true);
      z.mesh.traverse(skin=>{
        if(!skin.isSkinnedMesh||!skin.visible)return;
        for(let p=skin.parent;p&&p!==z.mesh;p=p.parent)if(!p.visible)return;
        const geo=skin.geometry,P=geo.attributes.position,I=geo.attributes.skinIndex,C=geo.attributes.color,owners=skin.userData.joinBlend?.owners,bones=skin.skeleton.bones;
        for(let i=0;i<P.count;i+=3){
          const c=component(bones[owners?owners[i]:I.getX(i)],u);
          if(!['head','armL','armR','legL','legR'].includes(c))continue;
          let arr=components.get(c);if(!arr){arr={verts:[],meta:[]};components.set(c,arr);}
          for(let k=i;k<i+3;k++){skin.getVertexPosition(k,point).applyMatrix4(skin.matrixWorld);arr.verts.push(point.x,point.y,point.z);arr.meta.push({skin:skin.name,index:k,rgb:C?[C.getX(k),C.getY(k),C.getZ(k)].map(x=>+x.toFixed(2)):null});}
        }
      });
      for(const [c,data] of components){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data.verts,3));geo.computeBoundingBox();const o=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));const b=geo.boundingBox,s=b.getSize(new T.Vector3());if(Math.min(s.x,s.y,s.z)>=.005)parts.push({o,c,b,s,meta:data.meta});}
      const rows=[];
      for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
        const a=parts[i],b=parts[j];if(a.c===b.c||a.c==='torso'||b.c==='torso'||a.c==='hips'||b.c==='hips')continue;
        const pair=[a.c,b.c].sort().join('/');if(['armL/head','armR/head','armL/legL','armL/legR','armR/legL','armR/legR','armL/armR','legL/legR'].indexOf(pair)<0)continue;
        if(!a.b.intersectsBox(b.b))continue;
        const overlap=a.b.clone().intersect(b.b).getSize(new T.Vector3());if(Math.min(overlap.x,overlap.y,overlap.z)<.003)continue;
        let hits=0,total=0,contact=null,contactMeta=null;const pos=a.o.geometry.attributes.position,step=Math.max(1,Math.ceil(pos.count/128));
        for(let k=0;k<pos.count;k+=step){point.fromBufferAttribute(pos,k);if(b.b.containsPoint(point)){total++;if(inside(point,b.o)){hits++;contact=point.toArray();contactMeta=a.meta[k];}}}
        const q=b.o.geometry.attributes.position,stepB=Math.max(1,Math.ceil(q.count/128));
        for(let k=0;k<q.count;k+=stepB){point.fromBufferAttribute(q,k);if(a.b.containsPoint(point)){total++;if(inside(point,a.o)){hits++;contact=point.toArray();contactMeta=b.meta[k];}}}
        if(hits)rows.push({pair,a:a.c,b:b.c,hits,total,contact:contact?.map(x=>+x.toFixed(3)),contactMeta,aCenter:a.b.getCenter(new T.Vector3()).toArray().map(x=>+x.toFixed(3)),bCenter:b.b.getCenter(new T.Vector3()).toArray().map(x=>+x.toFixed(3)),overlap:overlap.toArray().map(x=>+x.toFixed(3))});
      }
      for(const p of parts){p.o.geometry.dispose();p.o.material.dispose();}
      return {parts:parts.length,collisions:rows};
    }
    function tune(z) {
      const u=z.mesh.userData,arms=[u.armLG,u.armRG],legs=[u.legLG,u.legRG];
      const orig={ax:arms.map(a=>a.rotation.x),az:arms.map(a=>a.rotation.z),lx:legs.map(l=>l.position.x)},counts=[];
      for(const pitch of [0,.1,.2,.3,.4,.5])for(const roll of [0,.1,.2])for(const hip of [0,.04,.08]){
        arms.forEach((a,i)=>{a.rotation.x=orig.ax[i]-pitch;a.rotation.z=orig.az[i]+(i?1:-1)*roll;});
        legs[0].position.x=orig.lx[0]-hip;legs[1].position.x=orig.lx[1]+hip;
        const collisions=scan(z).collisions;
        counts.push({pitch,roll,hip,n:collisions.length,pairs:collisions.map(c=>c.pair)});
      }
      arms.forEach((a,i)=>{a.rotation.x=orig.ax[i];a.rotation.z=orig.az[i];});legs.forEach((l,i)=>l.position.x=orig.lx[i]);z.mesh.updateMatrixWorld(true);
      return {zero:counts.filter(x=>x.n===0),best:counts.sort((a,b)=>a.n-b.n).slice(0,12)};
    }    for(const kind of kinds){await DWInspect.show('zombie.'+kind,{mode:'walk'});const samples=[];for(let f=0;f<8;f++){await DWInspect.stepAsync(6);const z=DWInspect.zombie.get(),s=scan(z);samples.push({frame:6*(f+1),...s,tune:s.collisions.length?tune(z):null});}results.push({kind,samples});}
    return results;
  })()`);
  fs.writeFileSync(path.join(out, 'actual-demon-tuning.json'), JSON.stringify({ result, errors: page.errors }, null, 2));
  console.log('ACTUAL SKIN INTERSECTIONS', JSON.stringify(result.map(r => ({ kind: r.kind, parts: r.samples[0].parts, collisions: r.samples.map(s => s.collisions.length) }))));
  console.log('PAGE ERRORS', page.errors.length);
} finally { await browser.close(); await server.close(); }
