(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const tm = new THREE.Matrix4().makeRotationX(0.3), tmE = tm.elements.slice(); tm.transpose();
  const real = tm.elements[6] === tmE[9] && tm.elements[9] === tmE[6] && tmE[6] !== tmE[9];
  const realOk = (c, m) => out.push(real ? (c ? 'PASS ' : 'FAIL ') + m : 'SKIP (test-page geometry; real renderer: handoffs/2026-10-09-grokbot-GB-148/real-test.mjs) ' + m);
  try {
    await startMatch(T, 'Holster');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));
    const marine = T.getMarine(), ud = marine.userData, rig = ud.carry;
    ok(!!rig && !!rig.packFit && !!rig.packFit.revolver && !!rig.packFit.pistol, 'the rig carries the pack spots (' + JSON.stringify(rig && rig.packFit) + ')');
    // GB-220: the body is skinned since CL-210; read his posed vertices (getVertexPosition), not the bind-pose buffer.
    const vp = (o, P, i, v) => (o.isSkinnedMesh && o.getVertexPosition ? o.getVertexPosition(i, v) : v.fromBufferAttribute(P, i)).applyMatrix4(o.matrixWorld);
    const allTris = (meshes) => { const t = []; const a = V(), b = V(), c = V(); for (const o of meshes) { const g = o.geometry, P = g && g.attributes && g.attributes.position; if (!P) continue; const idx = g.index ? g.index.array : null, n = idx ? idx.length : P.count; for (let i = 0; i + 2 < n; i += 3) { vp(o, P, idx ? idx[i] : i, a); vp(o, P, idx ? idx[i + 1] : i + 1, b); vp(o, P, idx ? idx[i + 2] : i + 2, c); t.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); } } return new Float32Array(t); };
    const rayHit = (t, o, d, far) => { let best = Infinity; for (let i = 0; i < t.length; i += 9) { const e1x = t[i + 3] - t[i], e1y = t[i + 4] - t[i + 1], e1z = t[i + 5] - t[i + 2], e2x = t[i + 6] - t[i], e2y = t[i + 7] - t[i + 1], e2z = t[i + 8] - t[i + 2]; const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x, det = e1x * px + e1y * py + e1z * pz; if (Math.abs(det) < 1e-12) continue; const inv = 1 / det, sx = o.x - t[i], sy = o.y - t[i + 1], sz = o.z - t[i + 2], u = (sx * px + sy * py + sz * pz) * inv; if (u < 0 || u > 1) continue; const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, v = (d.x * qx + d.y * qy + d.z * qz) * inv; if (v < 0 || u + v > 1) continue; const tt = (e2x * qx + e2y * qy + e2z * qz) * inv; if (tt > 0 && tt < far && tt < best) best = tt; } return best; };
    const f=(n)=>+n.toFixed(3);
    T.carryDbg({loadout:{primary:['ak','m4'],secondary:['revolver','pistol']},inHand:null,akimbo:false}); marine.updateMatrixWorld(true);
    const torso=ud.torsoG, inv=new THREE.Matrix4().copy(torso.matrixWorld).invert();
    const spots=[...rig.holsters,...rig.pairs];
    const skip=new Set([ud.weaponMount,ud.armLG,ud.armRG,ud.headG].filter(Boolean)); for(const s of [...rig.slings,...spots,rig.hip,rig.hipPair]) skip.add(s.g);
    const isEffect=(o)=>{const mt=Array.isArray(o.material)?o.material[0]:o.material;return o.name==='chapel-glow'||!!(o.userData&&(o.userData.effect||o.userData.halo))||!!(mt&&(mt.opacity===0||mt.visible===false||(mt.transparent&&mt.opacity<0.5)));};
    const bodyM=[]; marine.traverse((o)=>{if(!o.isMesh||!o.visible||o.isInstancedMesh||isEffect(o))return;for(let q=o;q;q=q.parent){if(skip.has(q)||!q.visible)return;}bodyM.push(o);});
    const tris=allTris(bodyM), dirW=V(0,0,1).transformDirection(torso.matrixWorld);
    for(const sp of spots){ if(!sp.gun||!sp.g.visible||sp.kind!=='revolver')continue;
      sp.gun.updateMatrixWorld(true);
      const bins={};
      sp.gun.traverse((o)=>{if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;for(let q=o;q&&q!==sp.gun;q=q.parent)if(!q.visible)return;const pa=o.geometry.attributes.position;
        for(let i=0;i<pa.count;i+=Math.max(1,Math.floor(pa.count/400))){const w=vp(o,pa,i,V());const p=w.clone().applyMatrix4(inv);const t=rayHit(tris,w.clone().addScaledVector(dirW,-0.25),dirW,0.6);
          const k=(Math.floor(p.y/0.05)*0.05).toFixed(2);const b=bins[k]||(bins[k]={n:0,hit:0,maxz:-9,minAir:9,xmin:9,xmax:-9});b.n++;b.maxz=Math.max(b.maxz,p.z);b.xmin=Math.min(b.xmin,p.x);b.xmax=Math.max(b.xmax,p.x);if(t!==Infinity){b.hit++;b.minAir=Math.min(b.minAir,t-0.25);}}});
      out.push(sp.kind+(sp.g.position.x>0?'+':'-')+' per 5cm of torso y: n, hit, max z of points, x range, min air');
      for(const k of Object.keys(bins).sort()){const b=bins[k];out.push('  y '+k+' n '+b.n+' hit '+b.hit+' maxz '+f(b.maxz)+' x['+f(b.xmin)+','+f(b.xmax)+'] minAir '+(b.hit?f(b.minAir):'-'));}
    }
  } catch(e){ out.push('threw '+(e&&e.stack||e)); }
  return out.join('\n');
})();