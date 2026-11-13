// CC-347 part 2 (claude3): how far each carried holster, pair, hip shell and sling strap sits off his body and kit, across
// loadout x vest x gun-in-hand. Third person, Training Ground, the game's own carry plan applied through TT.carryDbg(o) AFTER
// the fresh entry (part 1's stray check is tcc347's). For every visible carry part: its vertices against the nearest body/kit
// vertex (every visible marine mesh that is not a carry mount and not the gun in his hands), signed by that vertex's normal:
//   holster/pair/hip: gap = the smallest distance from the shell+gun to the body/kit (air under it), pen = the deepest point inside;
//   sling strap: the profile of distances along the strap (steps 0..56) and the worst on-body stretch.
// PHASE=before|after, OUT json in review/CC-347/measure-<phase>.json. One game instance (rule 16).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const phase = process.env.PHASE || 'before';
const PRIM = [['m4', 'shotgun'], ['shotgun', 'm4'], ['ak', 'sniper'], ['sniper', 'ak'], ['aa12', 'launcher'], ['launcher', 'aa12'], ['flamer', 'chainsaw'], ['chainsaw', 'flamer'], ['minigun', null], [null, 'minigun']];
const SEC = [['revolver', 'uzi'], ['uzi', 'revolver'], ['pistol', 'revolver'], ['revolver', 'pistol'], ['revolver', null], [null, 'revolver'], ['pistol', null], ['uzi', null], ['pistol', 'uzi'], [null, null]];
const CONFIGS = [];
for (const vest of [false, true]) PRIM.forEach((p, i) => {
  const s = SEC[i % SEC.length];
  CONFIGS.push({ id: `${p.join('/')}+${s.join('/')}${vest ? '+vest' : ''}`, o: { loadout: { primary: p, secondary: s }, inHand: null, akimbo: false, vest, grenades: 3, dualOwned: i === 8 ? { pistol: true, uzi: true } : {} } });
});
// the low pack holster in every secondary pairing, with an empty back
for (const vest of [false, true]) for (const s of SEC) CONFIGS.push({ id: `-/-+${s.join('/')}${vest ? '+vest' : ''}`, o: { loadout: { primary: [null, null], secondary: s }, inHand: null, akimbo: false, vest, grenades: 0, dualOwned: { pistol: true, revolver: true, uzi: true } } });
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
const results = [];
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 600000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 600000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 600000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CC-347';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 600000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 120000 });
  await page.evaluate(`(()=>{ TT.setViewFirstDbg(false);
  window.__cc347m = (C) => { const T=TT, THREE=T.THREE; { const g=T.getGearOwned(); if(!!g.vest!==!!C.o.vest){ g.vest=!!C.o.vest; T.applyGearVisibility(); } } if(!C.noApply) T.carryDbg(C.o); if(C.after) C.after(); T.getMarine().userData.carry.t=1e6; const m=T.getMarine(); m.updateMatrixWorld(true); const rig=m.userData.carry;
    const vis=(o)=>{ for(let q=o;q;q=q.parent){ if(!q.visible) return false; if(q===m) return true;} return true; };
    const mounts=[...rig.slings.map(s=>s.g),...rig.holsters.map(s=>s.g),...rig.pairs.map(s=>s.g),rig.hip.g,rig.hipPair.g,rig.harness,rig.bandolier,rig.belt40,rig.mags,rig.grenades,rig.shells,rig.rounds40,rig.boxes,rig.tanks];
    const skip=new Set(); for(const r of mounts) if(r) r.traverse(o=>skip.add(o));
    m.traverse(o=>{ const wm=o.userData&&o.userData.weaponMount; if(wm&&wm.isObject3D&&wm!==m) wm.traverse(q=>skip.add(q)); }); if(T.offhandMountDbg) T.offhandMountDbg().traverse(q=>skip.add(q));
    // the body and kit as a point cloud with normals (skinned meshes posed), on a 2 cm grid
    const H=new Map(), CELL=0.02, P=[], N=[]; const v=new THREE.Vector3(), w=new THREE.Vector3(), nn=new THREE.Vector3();
    const key=(x,y,z)=>Math.floor(x/CELL)+','+Math.floor(y/CELL)+','+Math.floor(z/CELL);
    m.traverse(o=>{ if(!o.isMesh||o.isInstancedMesh||skip.has(o)||!vis(o)) return; const g=o.geometry, pa=g&&g.attributes.position, na=g&&g.attributes.normal; if(!pa) return;
      if(o.material&&(o.material.visible===false||(o.material.opacity!==undefined&&o.material.transparent&&o.material.opacity<0.05))) return;
      for(let i=0;i<pa.count;i++){
        if(o.isSkinnedMesh&&o.getVertexPosition){ o.getVertexPosition(i,v); } else v.fromBufferAttribute(pa,i);
        v.applyMatrix4(o.matrixWorld);
        if(na){ nn.fromBufferAttribute(na,i); if(o.isSkinnedMesh&&o.getVertexPosition){ w.fromBufferAttribute(pa,i); const base=w.clone(); /* normal through the bone transform */ o.applyBoneTransform? (o.applyBoneTransform(i,w.add(nn.clone().multiplyScalar(0.01))), o.applyBoneTransform(i,base), nn.copy(w).sub(base)) : null; }
          nn.transformDirection(o.matrixWorld); } else nn.set(0,0,0);
        const k=key(v.x,v.y,v.z); let a=H.get(k); if(!a){a=[];H.set(k,a);} a.push(P.length/3); P.push(v.x,v.y,v.z); N.push(nn.x,nn.y,nn.z); } });
    const nearest=(p)=>{ let best=1e9, bi=-1; const cx=Math.floor(p.x/CELL), cy=Math.floor(p.y/CELL), cz=Math.floor(p.z/CELL);
      for(let r=0;r<=6&&(bi<0||r*CELL<best+CELL);r++) for(let dx=-r;dx<=r;dx++) for(let dy=-r;dy<=r;dy++) for(let dz=-r;dz<=r;dz++){ if(Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dz))!==r) continue;
        const a=H.get((cx+dx)+','+(cy+dy)+','+(cz+dz)); if(!a) continue; for(const j of a){ const d=Math.hypot(P[j*3]-p.x,P[j*3+1]-p.y,P[j*3+2]-p.z); if(d<best){best=d;bi=j;} } }
      if(bi<0) return { d: 0.12, s: 1 }; const s=(p.x-P[bi*3])*N[bi*3]+(p.y-P[bi*3+1])*N[bi*3+1]+(p.z-P[bi*3+2])*N[bi*3+2]; return { d: best, s: s>=0?1:-1 }; };
    const pts=(r)=>{ const out=[]; r.updateMatrixWorld(true); r.traverse(o=>{ if(!o.isMesh||o.isInstancedMesh||!vis(o)) return; const pa=o.geometry.attributes.position; const step=Math.max(1,Math.floor(pa.count/400));
      for(let i=0;i<pa.count;i+=step) out.push(v.fromBufferAttribute(pa,i).applyMatrix4(o.matrixWorld).clone()); }); return out; };
    const res={ id:C.id, parts:{} };
    const toLocal=(p)=>{ const q=p.clone(); m.worldToLocal(q); return q.toArray().map(x=>+x.toFixed(3)); };
    const spots=[...rig.holsters.map((s,i)=>['holster'+i,s]),...rig.pairs.map((s,i)=>['pair'+i,s]),['hip',rig.hip],['hipPair',rig.hipPair]];
    for(const [k,s] of spots){ if(!vis(s.g)) continue; const ps=pts(s.g); if(!ps.length) continue; let gap=1e9, pen=0, gp=null; const ds=[];
      for(const p of ps){ const n=nearest(p); const sd=n.d*n.s; ds.push(sd); if(sd<gap){gap=sd;gp=p;} if(sd<pen) pen=sd; }
      ds.sort((a,b)=>a-b); const box=new THREE.Box3().setFromObject(s.g);
      res.parts[k]={ kind:s.kind||s.fitKind, gun:!!s.gun, n:ps.length, gap:+(Math.max(0,gap)*100).toFixed(1), pen:+(-pen*100).toFixed(1), p10:+(ds[Math.floor(ds.length*.1)]*100).toFixed(1), at: gp?toLocal(gp):null,
        lowY:+(m.worldToLocal(box.min.clone()).y).toFixed(3), shell: s.shell?{vis:vis(s.shell)}:null }; }
    rig.slings.forEach((s,i)=>{ if(!vis(s.sling)||!s.sling.geometry) return; s.sling.updateMatrixWorld(true); const pa=s.sling.geometry.attributes.position; const steps=Math.floor(pa.count/4); const prof=[];
      for(let j=0;j<steps;j++){ let best=1e9; for(let c=0;c<4;c++){ const p=v.fromBufferAttribute(pa,j*4+c).applyMatrix4(s.sling.matrixWorld).clone(); const n=nearest(p); best=Math.min(best,n.d*n.s);} prof.push(+(best*100).toFixed(1)); }
      // the on-body stretch: from the lower turn round the front and the shoulder (the ribbon's middle), not the leads to the gun's studs
      const mid=prof.slice(Math.floor(steps*0.22),Math.floor(steps*0.80)); res.parts['sling'+i]={ kind:s.kind, profile:prof, midMax:Math.max(...mid), midPen:Math.min(...mid) }; });
    return res; };
  })()`);
  for (const C of CONFIGS) {
    const r = await page.evaluate(`window.__cc347m(${JSON.stringify(C)})`, 120000);
    results.push(r);
    const brief = Object.entries(r.parts).map(([k, p]) => k + ':' + (p.profile ? `${p.kind} mid<=${p.midMax} pen ${p.midPen}` : `${p.kind} gap ${p.gap} pen ${p.pen}`)).join(' | ');
    console.log(C.id, brief);
  }
} catch (e) { console.log('ERR', e && e.stack || e); } finally {
  fs.writeFileSync(path.join(root, 'review/CC-347', `measure-${phase}.json`), JSON.stringify(results, null, 1));
  await browser.close(); server.close && server.close(); setTimeout(() => process.exit(0), 2000);
}
