// t338 - J159 / D-191 (Jerry, 17 Nov 2026: "two things to check on all of them are floating parts on them and the other is
// to make sure that they move realistically"), Claude 3 (CC-355): NO FLOATING PARTS on the humanoid zombies (shambler,
// feral, screamer, military, drowned, bomber). Every piece of the body (each connected surface of every mesh, on its bone:
// clothes, belts, pouches, straps, boards, laces, threads, weed, hair, teeth, eyes, nails, wounds) must touch another piece
// within 5 mm, and through those contacts reach the body, at rest AND in the game's own clips (walk, attack, a rifle hit's
// reaction, an explosion's fall and get-up, the rise out of the ground), sampled on game time. A group that can't reach the
// body is floating: listed as type / clip / time / parts / gap in mm. Two surfaces crossing count as touching (an edge
// through a triangle). Bodies on the shared humanoid body (studio/zombie-humanoids.js, meshes tagged cc355) FAIL on a gap;
// the types still on the concept body (ChatGPT's studio/zombie-concepts.js) are reported as INFO for their owner until
// they move onto the shared body. The feet's and hands' orientation in motion is Claude 5's audit (D-191), not this test.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m); const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  // J159 / D-191 (Claude 3, CC-355): floating parts. Every piece of a zombie (each connected, welded surface of each
  // source mesh on its bone) must reach another piece within THR; pieces that can't reach the main body through such
  // contacts float. Returns the floating groups with their gap (mm) to the rest of the body.
  const GAP = {};
  GAP.THR = 0.005;
  GAP.skipMesh = (m) => m.isSkinnedMesh || m.isInstancedMesh || m.isSprite || m.isPoints || m.isLine || m.userData.stump ||
    /^screamer-(sonic-shield|black-vapor)$/.test(m.name || '') || (m.material && (m.material.transparent && (m.material.opacity ?? 1) < .5));
  GAP.shown = (m, root) => { if (!(m.userData.skinSrc || m.visible !== false)) return false; for (let q = m.parent; q && q !== root; q = q.parent) if (q.visible === false) return false; return true; };
  GAP.label = (m) => { const f = m.userData.zombieFeature, s = m.material?.userData?.surface; return (m.name && m.name !== 'concept-surface' ? m.name + '/' : '') + (s || 'mesh') + (f ? '[' + f.kind + (f.slot ?? f.bit ?? '') + ']' : '') + '@' + (m.parent?.name || '?'); };
  // pieces: {mesh, bone, label, P: Float32Array world xyz per vertex (of the welded set), T: Uint32Array tris}
  GAP.pieces = (root) => {
    root.updateMatrixWorld(true); const out = [];
    root.traverse((m) => {
      if (!m.isMesh || GAP.skipMesh(m) || !GAP.shown(m, root)) return;
      const g = m.geometry, pa = g && g.attributes && g.attributes.position; if (!pa || pa.count < 3) return;
      const e = m.matrixWorld.elements, n = pa.count, W = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
        W[i*3] = e[0]*x + e[4]*y + e[8]*z + e[12]; W[i*3+1] = e[1]*x + e[5]*y + e[9]*z + e[13]; W[i*3+2] = e[2]*x + e[6]*y + e[10]*z + e[14]; }
      // weld (0.05 mm) then union by triangles
      const key = new Map(), wid = new Int32Array(n);
      for (let i = 0; i < n; i++) { const k = Math.round(W[i*3]*2e4) + ',' + Math.round(W[i*3+1]*2e4) + ',' + Math.round(W[i*3+2]*2e4); let w = key.get(k); if (w === undefined) key.set(k, w = i); wid[i] = w; }
      const par = new Int32Array(n); for (let i = 0; i < n; i++) par[i] = i;
      const f = (a) => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
      const idx = g.index ? g.index.array : null, nt = (idx ? idx.length : n) / 3 | 0;
      for (let t = 0; t < nt; t++) { const a = wid[idx ? idx[t*3] : t*3], b = wid[idx ? idx[t*3+1] : t*3+1], c = wid[idx ? idx[t*3+2] : t*3+2];
        const ra = f(a), rb = f(b), rc = f(c); par[rb] = ra; par[f(rc)] = f(ra); }
      const comp = new Map();
      for (let t = 0; t < nt; t++) { const a = idx ? idx[t*3] : t*3, r = f(wid[a]); let c = comp.get(r); if (!c) comp.set(r, c = []); c.push(t); }
      for (const tris of comp.values()) {
        const vmap = new Map(), P = [], T = new Uint32Array(tris.length * 3);
        tris.forEach((t, j) => { for (let q = 0; q < 3; q++) { const vi = idx ? idx[t*3+q] : t*3+q; let w = vmap.get(vi); if (w === undefined) { vmap.set(vi, w = P.length / 3); P.push(W[vi*3], W[vi*3+1], W[vi*3+2]); } T[j*3+q] = w; } });
        out.push({ mesh: m, bone: m.parent?.name || '?', label: GAP.label(m), P: new Float32Array(P), T });
      }
    });
    return out;
  };
  // closest distance^2 from p to triangle abc (Ericson)
  GAP.d2 = (px,py,pz, ax,ay,az, bx,by,bz, cx,cy,cz) => {
    const abx=bx-ax,aby=by-ay,abz=bz-az, acx=cx-ax,acy=cy-ay,acz=cz-az, apx=px-ax,apy=py-ay,apz=pz-az;
    const d1=abx*apx+aby*apy+abz*apz, d2=acx*apx+acy*apy+acz*apz; let qx,qy,qz;
    if (d1<=0&&d2<=0) { qx=ax;qy=ay;qz=az; } else {
    const bpx=px-bx,bpy=py-by,bpz=pz-bz, d3=abx*bpx+aby*bpy+abz*bpz, d4=acx*bpx+acy*bpy+acz*bpz;
    if (d3>=0&&d4<=d3) { qx=bx;qy=by;qz=bz; } else {
    const vc=d1*d4-d3*d2;
    if (vc<=0&&d1>=0&&d3<=0) { const v=d1/(d1-d3); qx=ax+abx*v;qy=ay+aby*v;qz=az+abz*v; } else {
    const cpx=px-cx,cpy=py-cy,cpz=pz-cz, d5=abx*cpx+aby*cpy+abz*cpz, d6=acx*cpx+acy*cpy+acz*cpz;
    if (d6>=0&&d5<=d6) { qx=cx;qy=cy;qz=cz; } else {
    const vb=d5*d2-d1*d6;
    if (vb<=0&&d2>=0&&d6<=0) { const w=d2/(d2-d6); qx=ax+acx*w;qy=ay+acy*w;qz=az+acz*w; } else {
    const va=d3*d6-d5*d4;
    if (va<=0&&(d4-d3)>=0&&(d5-d6)>=0) { const w=(d4-d3)/((d4-d3)+(d5-d6)); qx=bx+(cx-bx)*w;qy=by+(cy-by)*w;qz=bz+(cz-bz)*w; } else {
    const den=1/(va+vb+vc), v=vb*den, w=vc*den; qx=ax+abx*v+acx*w;qy=ay+aby*v+acy*w;qz=az+abz*v+acz*w; }}}}}}
    const dx=px-qx,dy=py-qy,dz=pz-qz; return dx*dx+dy*dy+dz*dz; };
  // grid of triangles (cell h), each tri in every cell its box (grown by pad) touches
  GAP.grid = (pieces, h, pad) => {
    const G = new Map();
    pieces.forEach((pc, pi) => { const P = pc.P, T = pc.T;
      for (let t = 0; t < T.length / 3; t++) { let x0=1e9,y0=1e9,z0=1e9,x1=-1e9,y1=-1e9,z1=-1e9;
        for (let q = 0; q < 3; q++) { const v = T[t*3+q]*3; x0=Math.min(x0,P[v]);x1=Math.max(x1,P[v]);y0=Math.min(y0,P[v+1]);y1=Math.max(y1,P[v+1]);z0=Math.min(z0,P[v+2]);z1=Math.max(z1,P[v+2]); }
        const i0=Math.floor((x0-pad)/h),i1=Math.floor((x1+pad)/h),j0=Math.floor((y0-pad)/h),j1=Math.floor((y1+pad)/h),k0=Math.floor((z0-pad)/h),k1=Math.floor((z1+pad)/h);
        for (let i=i0;i<=i1;i++) for (let j=j0;j<=j1;j++) for (let k=k0;k<=k1;k++) { const key=i+','+j+','+k; let a=G.get(key); if(!a) G.set(key,a=[]); a.push(pi,t); } } });
    return G; };
  // distance from piece a's vertices to piece set (pieces not in skip), via grid; returns min distance (<= pad) or Infinity
  GAP.analyse = (root, thr = GAP.THR) => {
    const pcs = GAP.pieces(root), h = 0.01, G = GAP.grid(pcs, h, thr);
    const par = pcs.map((_, i) => i), f = (a) => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
    const thr2 = thr * thr;
    pcs.forEach((pc, pi) => { const P = pc.P, seen = new Set();
      for (let v = 0; v < P.length; v += 3) { const key = Math.floor(P[v]/h)+','+Math.floor(P[v+1]/h)+','+Math.floor(P[v+2]/h), L = G.get(key); if (!L) continue;
        for (let q = 0; q < L.length; q += 2) { const qi = L[q]; if (qi === pi || seen.has(qi) || f(qi) === f(pi)) continue; const Q = pcs[qi], t = L[q+1], T = Q.T, A = Q.P;
          const a=T[t*3]*3,b=T[t*3+1]*3,c=T[t*3+2]*3;
          if (GAP.d2(P[v],P[v+1],P[v+2],A[a],A[a+1],A[a+2],A[b],A[b+1],A[b+2],A[c],A[c+1],A[c+2]) <= thr2) { seen.add(qi); par[f(qi)] = f(pi); } } } });
    // crossing surfaces: an edge of one piece through a triangle of another (their vertices can all be far from the other surface)
    const segTri = (ox,oy,oz,dx,dy,dz,A,a,b,c) => { const e1x=A[b]-A[a],e1y=A[b+1]-A[a+1],e1z=A[b+2]-A[a+2],e2x=A[c]-A[a],e2y=A[c+1]-A[a+1],e2z=A[c+2]-A[a+2];
      const px=dy*e2z-dz*e2y,py=dz*e2x-dx*e2z,pz=dx*e2y-dy*e2x, det=e1x*px+e1y*py+e1z*pz; if (Math.abs(det)<1e-12) return false; const inv=1/det;
      const tx=ox-A[a],ty=oy-A[a+1],tz=oz-A[a+2], u=(tx*px+ty*py+tz*pz)*inv; if(u<0||u>1) return false;
      const qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x, v=(dx*qx+dy*qy+dz*qz)*inv; if(v<0||u+v>1) return false;
      const s=(e2x*qx+e2y*qy+e2z*qz)*inv; return s>=0&&s<=1; };
    pcs.forEach((pc, pi) => { const P = pc.P, T = pc.T;
      for (let t = 0; t < T.length; t += 3) for (let e = 0; e < 3; e++) { const a = T[t+e]*3, b = T[t+(e+1)%3]*3;
        const mx=(P[a]+P[b])/2, my=(P[a+1]+P[b+1])/2, mz=(P[a+2]+P[b+2])/2, L = G.get(Math.floor(mx/h)+','+Math.floor(my/h)+','+Math.floor(mz/h)); if (!L) continue;
        for (let q = 0; q < L.length; q += 2) { const qi = L[q]; if (qi === pi || f(qi) === f(pi)) continue; const Q = pcs[qi], U = Q.T, A = Q.P, s = L[q+1];
          if (segTri(P[a],P[a+1],P[a+2],P[b]-P[a],P[b+1]-P[a+1],P[b+2]-P[a+2],A,U[s*3]*3,U[s*3+1]*3,U[s*3+2]*3)) par[f(qi)] = f(pi); } } });
    const groups = new Map(); pcs.forEach((pc, i) => { const r = f(i); let g = groups.get(r); if (!g) groups.set(r, g = { pieces: [], tris: 0 }); g.pieces.push(i); g.tris += pc.T.length / 3; });
    const list = [...groups.values()].sort((a, b) => b.tris - a.tris), main = list[0], out = [];
    for (const g of list.slice(1)) {
      const inG = new Set(g.pieces); let best = Infinity, bestTo = null;
      // exact gap: every vertex of the group vs every triangle outside it, pruned by box distance
      for (const pi of g.pieces) { const P = pcs[pi].P;
        for (let qi = 0; qi < pcs.length; qi++) { if (inG.has(qi)) continue; const Q = pcs[qi], T = Q.T, A = Q.P;
          for (let v = 0; v < P.length; v += 3) for (let t = 0; t < T.length; t += 3) { const a=T[t]*3,b=T[t+1]*3,c=T[t+2]*3;
            const d = GAP.d2(P[v],P[v+1],P[v+2],A[a],A[a+1],A[a+2],A[b],A[b+1],A[b+2],A[c],A[c+1],A[c+2]); if (d < best) { best = d; bestTo = qi; } } } }
      const c = [0,0,0]; let n = 0; for (const pi of g.pieces) { const P = pcs[pi].P; for (let v = 0; v < P.length; v += 3) { c[0]+=P[v];c[1]+=P[v+1];c[2]+=P[v+2]; n++; } }
      out.push({ boneDeg: (() => { const b = pcs[g.pieces[0]].mesh.parent; return b && b.quaternion ? +(2 * Math.acos(Math.min(1, Math.abs(b.quaternion.w))) * 180 / Math.PI).toFixed(0) : null; })(), gapMm: +(Math.sqrt(best) * 1000).toFixed(1), parts: [...new Set(g.pieces.map((i) => pcs[i].label))], tris: g.tris,
        nearest: bestTo == null ? null : pcs[bestTo].label, size: (() => { const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9]; for (const pi of g.pieces) { const P=pcs[pi].P; for (let v=0;v<P.length;v+=3) for (let k=0;k<3;k++){lo[k]=Math.min(lo[k],P[v+k]);hi[k]=Math.max(hi[k],P[v+k]);} } return hi.map((x,k)=>+((x-lo[k])*1000).toFixed(0)); })(), at: c.map((x, k) => +(x / n - (root.position ? [root.position.x, root.position.y, root.position.z][k] : 0)).toFixed(3)) });
    }
    out.sort((a, b) => b.gapMm - a.gapMm);
    return { pieces: pcs.length, mainTris: main ? main.tris : 0, groups: list.length, floating: out };
  };
  try {
    await startMatch(T, 'Gaps');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position;
    const sim = () => (T.getSimTime ? T.getSimTime() : performance.now() / 1000);
    const spawn = (type, dx, dz, move) => { const z = T.spawnZombie(P.x + dx, P.z + dz, type, true, true); if (!z) return null; z.hp = z.maxHp = 1e6; if (!move) { z.riseT = 0; z.speed = z.baseSpeed = 0; } return z; };
    // on the shared body: the bones carry the s27 pivots (humanoidPivots sets the head bone's scale, .74-.78; the concept body keeps 1)
    const shared = (z) => { const h = z.mesh.userData.head; return !!h && (h.userData.cc355CrownY != null || (Math.abs(h.scale.x - 1) > .1 && h.scale.x > .6)); };   // CC-359 s41: the v6 shambler's head bone is scale 1 (neck-base pivot) but it IS the shared body: its head carries cc355CrownY
    // bone names for the report: the rig's groups are unnamed in the game
    const nameBones = (z) => { const u = z.mesh.userData; for (const k of ['hips', 'torso', 'head']) if (u[k] && !u[k].name) u[k].name = k;
      for (const S of ['L', 'R']) { const a = u['arm' + S + 'G'], l = u['leg' + S + 'G']; if (a && !a.name) a.name = 'arm' + S; if (a?.userData.elbowG && !a.userData.elbowG.name) a.userData.elbowG.name = 'fore' + S;
        if (l && !l.name) l.name = 'thigh' + S; if (l?.userData.shinG && !l.userData.shinG.name) l.userData.shinG.name = 'shin' + S; }
      z.mesh.traverse((o) => { if (!o.isMesh && !o.name && o.parent && o.parent.name && o !== z.mesh) o.name = o.parent.name + '>'; }); };
    const found = {};   // type -> [{clip, t, gapMm, parts, nearest}]
    let looks = 0;
    const look = (type, clip, z, t) => { if (!z || !z.mesh) return; looks++; nameBones(z); const r = GAP.analyse(z.mesh); for (const f of r.floating) (found[type] = found[type] || []).push({ clip, t: +t.toFixed(2), ...f }); return r; };
    // sample a clip on game time: every `dt` s of game for `dur` s (wall cap 25 s)
    const sample = async (type, clip, z, dur, dt, until = null) => { const s0 = sim(), w0 = performance.now(); let next = 0;
      while (sim() - s0 < dur && performance.now() - w0 < 25000) { await frame(); const t = sim() - s0; if (t >= next) { look(type, clip, z, t); next = t + dt; } if (until && until(z)) break; } };
    const TYPES = ['shambler', 'feral', 'screamer', 'military', 'drowned', 'bomber'];
    const kinds = {};
    for (const type of TYPES) {
      T.clearZombies(); await wait(100);
      // rest
      let z = spawn(type, 0, 7, false); if (!z) { info(type + ': not spawnable here'); continue; }
      kinds[type] = shared(z) ? 'shared' : 'concept';
      await wait(300); const r0 = look(type, 'rest', z, 0);
      if (type === TYPES[0]) info('pieces on a ' + type + ': ' + r0.pieces + ' (' + r0.mainTris + ' tris in the body group)');
      // a rifle round's reaction, then an explosion's fall and get-up
      T.damageZombie(z, 20, { kind: 'bullet', dir: { x: 0, z: 1 }, hitY: z.mesh.position.y + (z.hitH || 1.6) * 0.6 });
      await sample(type, 'hit', z, .6, .15);
      T.damageZombie(z, 30, { kind: 'explosive', dir: { x: 0, z: 1 } });
      await sample(type, 'fall', z, Math.min(4, (z.knockDur || 2) + .3), .3, (q) => !q._fall && !(q.knockT > 0));
      // walking at him from 12 m, then the attack at arm's length
      T.clearZombies(); await wait(100);
      z = spawn(type, 1.5, 12, true); z.riseT = 0;
      await sample(type, 'walk', z, 1.6, .2);
      T.clearZombies(); await wait(100);
      z = spawn(type, 0, 1.1, true); z.riseT = 0;
      await sample(type, 'attack', z, 1.8, .2);
      // the rise out of the ground (its default spawn)
      T.clearZombies(); await wait(100);
      z = T.spawnZombie(P.x, P.z + 8, type, true, false); if (z) { z.hp = z.maxHp = 1e6; z.speed = z.baseSpeed = 0; await sample(type, 'rise', z, 1.2, .3); }
      T.clearZombies();
    }
    T.runDevCommand('godmode off');
    info('looked at ' + looks + ' frames; bodies: ' + Object.entries(kinds).map(([k, v]) => k + ' ' + v).join(', '));
    for (const type of TYPES) {
      if (!kinds[type]) continue;
      const list = (found[type] || []).sort((a, b) => b.gapMm - a.gapMm);
      // one line per part group (its worst frame), the worst first
      const seen = new Map(); for (const f of list) { const k = f.parts.join('+'); if (!seen.has(k)) seen.set(k, { ...f, n: 0 }); seen.get(k).n++; }
      const lines = [...seen.values()].map((f) => type + ' ' + f.clip + ' t=' + f.t + 's: ' + f.parts.join('+') + ' ' + f.gapMm + ' mm off ' + f.nearest + ' at ' + f.at.join(',') + ' (size ' + f.size.join('x') + ' mm, its bone turned ' + f.boneDeg + ' deg on its parent, ' + f.n + ' frames)');
      if (kinds[type] === 'shared') { ok(lines.length === 0, type + ' (shared body): no part floats more than 5 mm off the body, at rest or in its clips' + (lines.length ? ': ' + lines.length + ' groups' : '')); for (const l of lines.slice(0, 12)) info('  FLOATING ' + l); }
      else { info(type + ' (concept body, ChatGPT\'s): ' + lines.length + ' floating groups'); for (const l of lines.slice(0, 12)) info('  ' + l); }
    }
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
