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
    const kinds = ['spider'];
    const ray = new T.Raycaster(), dir = new T.Vector3(1,.137,.071).normalize(), point = new T.Vector3();
    function component(o, u) {
      for (let p=o;p;p=p.parent) {
        if (u.crawlLimbs) for (let i=0;i<u.crawlLimbs.length;i++) if (p===u.crawlLimbs[i].root||p===u.crawlLimbs[i].knee) return 'crawl'+i;
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
      if(!z?.mesh)return {parts:0,collisions:[],gone:true};
      const u=z.mesh.userData, components=new Map(), parts=[];z.mesh.updateMatrixWorld(true);
      z.mesh.traverse(skin=>{
        if(!skin.isSkinnedMesh||!skin.visible)return;
        for(let p=skin.parent;p&&p!==z.mesh;p=p.parent)if(!p.visible)return;
        const geo=skin.geometry,P=geo.attributes.position,I=geo.attributes.skinIndex,C=geo.attributes.color,owners=skin.userData.joinBlend?.owners,bones=skin.skeleton.bones;
        for(let i=0;i<P.count;i+=3){
          const c=component(bones[owners?owners[i]:I.getX(i)],u);
          if(!(c==='head'||c.startsWith('crawl')))continue;
          let arr=components.get(c);if(!arr){arr={verts:[],meta:[]};components.set(c,arr);}
          for(let k=i;k<i+3;k++){skin.getVertexPosition(k,point).applyMatrix4(skin.matrixWorld);arr.verts.push(point.x,point.y,point.z);arr.meta.push({skin:skin.name,index:k,rgb:C?[C.getX(k),C.getY(k),C.getZ(k)].map(x=>+x.toFixed(2)):null});}
        }
      });
      for(const [c,data] of components){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data.verts,3));geo.computeBoundingBox();const o=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));const b=geo.boundingBox,s=b.getSize(new T.Vector3());if(Math.min(s.x,s.y,s.z)>=.005)parts.push({o,c,b,s,meta:data.meta});}
      const rows=[];
      for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
        const a=parts[i],b=parts[j];if(a.c===b.c||a.c==='torso'||b.c==='torso'||a.c==='hips'||b.c==='hips')continue;
        const pair=[a.c,b.c].sort().join('/');if(!a.c.startsWith('crawl')&&!b.c.startsWith('crawl'))continue;
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
      const u=z.mesh.userData,R=u.bossRig?.userData?.rig;
      const arms=[u.armLG||R?.shoulderL,u.armRG||R?.shoulderR];
      const legs=[u.legLG||R?.hipL,u.legRG||R?.hipR];
      if(!arms[0]||!arms[1]||!legs[0]||!legs[1])return null;
      const elbows=arms.map(a=>a.userData.elbowG),original={ax:arms.map(a=>a.rotation.x),az:arms.map(a=>a.rotation.z),px:arms.map(a=>a.position.x),ex:elbows.map(e=>e?.rotation.x),lx:legs.map(l=>l.position.x)},counts=[];
      for(const position of [.15,.3,.45])for(const roll of [.1,.3,.5])for(const pitch of [-.3,0,.3])for(const elbow of [0,.3,.6]){
        arms[0].position.x=original.px[0]-position;arms[1].position.x=original.px[1]+position;
        arms[0].rotation.z=original.az[0]-roll;arms[1].rotation.z=original.az[1]+roll;
        arms[0].rotation.x=original.ax[0]+pitch;arms[1].rotation.x=original.ax[1]+pitch;
        if(elbows[0])elbows[0].rotation.x=original.ex[0]-elbow;
        if(elbows[1])elbows[1].rotation.x=original.ex[1]-elbow;
        legs[0].position.x=original.lx[0]-.08;legs[1].position.x=original.lx[1]+.08;
        counts.push({position,roll,pitch,elbow,n:scan(z).collisions.length});
      }
      arms.forEach((a,i)=>{a.position.x=original.px[i];a.rotation.z=original.az[i];a.rotation.x=original.ax[i];});
      elbows.forEach((e,i)=>{if(e)e.rotation.x=original.ex[i];});legs.forEach((l,i)=>l.position.x=original.lx[i]);z.mesh.updateMatrixWorld(true);
      return {zero:counts.filter(x=>x.n===0).slice(0,12),best:counts.sort((a,b)=>a.n-b.n).slice(0,8)};
    }
    for(const kind of kinds){
      const phases={};
      await DWInspect.show('zombie.'+kind,{mode:'walk'});
      phases.walk=[];
      for(let f=0;f<8;f++){await DWInspect.stepAsync(6);phases.walk.push({frame:6*(f+1),...scan(DWInspect.zombie.get())});}
      const charge=DWInspect.zombie.get();charge.chargeT=1.5;charge.chargeBase=charge.baseSpeed*2;
      phases.charge=[];
      for(let f=0;f<6;f++){await DWInspect.stepAsync(6);phases.charge.push({frame:6*(f+1),...scan(DWInspect.zombie.get())});}
      await DWInspect.show('zombie.'+kind,{mode:'live'});
      const attacker=DWInspect.zombie.get();attacker.attackWindup=.22;attacker._pendingAttack=null;
      phases.attack=[];
      for(let f=0;f<8;f++){await DWInspect.stepAsync(3);phases.attack.push({frame:3*(f+1),...scan(DWInspect.zombie.get())});}
      await DWInspect.show('zombie.'+kind,{mode:'live'});DWInspect.zombie.hit('body',1);
      phases.hit=[];
      for(let f=0;f<6;f++){await DWInspect.stepAsync(3);phases.hit.push({frame:3*(f+1),...scan(DWInspect.zombie.get())});}
      await DWInspect.show('zombie.'+kind,{mode:'live'});DWInspect.zombie.kill();
      const corpse=TT.getCorpses().at(-1);
      phases.death=[];
      for(let f=0;f<8;f++){await DWInspect.stepAsync(6);phases.death.push({frame:6*(f+1),...scan({mesh:corpse?.mesh})});}
      results.push({kind,phases});
    }    return results;
  })()`);
  fs.writeFileSync(path.join(out, 'actual-assert-spider.json'), JSON.stringify({ result, errors: page.errors }, null, 2));
  console.log('ACTUAL SKIN INTERSECTIONS', JSON.stringify(result.map(r => ({ kind: r.kind, phases: Object.fromEntries(Object.entries(r.phases).map(([k,v])=>[k,v.map(s=>s.collisions.length)])) }))));
  console.log('PAGE ERRORS', page.errors.length);
  if (page.errors.length || result.some(r => Object.values(r.phases).some(frames => frames.some(f => f.collisions.length)))) process.exitCode = 1;
} finally { await browser.close(); await server.close(); }
