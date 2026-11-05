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
    const SC=[['m4','ak','uzi','revolver'],['ak','m4','revolver','pistol']];
    const f=(n)=>+n.toFixed(3);
    for(const [a,b,c,d] of SC){
      T.carryDbg({loadout:{primary:[a,b],secondary:[c,d]},inHand:null,akimbo:false}); marine.updateMatrixWorld(true);
      const torso=ud.torsoG, inv=new THREE.Matrix4().copy(torso.matrixWorld).invert(), tp=ud.torsoPivotY||0.7;
      const spots=[...rig.holsters,...rig.pairs];
      out.push('== '+[a,b,c,d].join('/')+' tp '+tp+' packFit '+JSON.stringify(rig.packFit));
      const skip=new Set([ud.weaponMount,ud.armLG,ud.armRG,ud.headG].filter(Boolean)); for(const s of [...rig.slings,...spots,rig.hip,rig.hipPair]) skip.add(s.g);
      const isEffect=(o)=>{const mt=Array.isArray(o.material)?o.material[0]:o.material;return o.name==='chapel-glow'||!!(o.userData&&(o.userData.effect||o.userData.halo))||!!(mt&&(mt.opacity===0||mt.visible===false||(mt.transparent&&mt.opacity<0.5)));};
      const bodyM=[]; marine.traverse((o)=>{if(!o.isMesh||!o.visible||o.isInstancedMesh||isEffect(o))return;for(let q=o;q;q=q.parent){if(skip.has(q)||!q.visible)return;}bodyM.push(o);});
      for(const sp of spots){ if(!sp.gun||!sp.g.visible)continue;
        const bb=new THREE.Box3(); sp.gun.updateMatrixWorld(true);
        sp.gun.traverse((o)=>{if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;for(let q=o;q&&q!==sp.gun;q=q.parent)if(!q.visible)return;const pa=o.geometry.attributes.position;for(let i=0;i<pa.count;i+=3)bb.expandByPoint(vp(o,pa,i,V()).applyMatrix4(inv));});
        out.push(sp.kind+' pos '+[f(sp.g.position.x),f(sp.g.position.y),f(sp.g.position.z)]+' gunBox torso x['+f(bb.min.x)+','+f(bb.max.x)+'] y['+f(bb.min.y)+','+f(bb.max.y)+'] z['+f(bb.min.z)+','+f(bb.max.z)+']');
        const side=sp.g.position.x>=0?1:-1; const dir=V(0,0,1).transformDirection(torso.matrixWorld);
        const P0=[]; sp.gun.traverse((g)=>{if(!g.isMesh||!g.geometry||!g.geometry.attributes.position)return;for(let q=g;q&&q!==sp.gun;q=q.parent)if(!q.visible)return;const pa=g.geometry.attributes.position;for(let i=0;i<pa.count;i+=Math.max(1,Math.floor(pa.count/200)))P0.push(vp(g,pa,i,V()));});
        for(const o of bodyM){ const T2=allTris([o]); if(!T2.length)continue; const mb=new THREE.Box3(); for(let i=0;i<T2.length;i+=3)mb.expandByPoint(V(T2[i],T2[i+1],T2[i+2]).applyMatrix4(inv)); if(mb.max.y<bb.min.y||mb.min.y>bb.max.y)continue;
          let mc=Infinity,h=0;
          for(const p of P0){const g2=rayHit(T2,p.clone().addScaledVector(dir,-0.25),dir,0.6)-0.25;if(g2===Infinity)continue;h++;mc=Math.min(mc,g2);}
          if(!h)continue;
          out.push('   '+sp.kind+(side>0?'+':'-')+' vs '+(o.name||(o.parent&&o.parent.name)||'?')+' box x['+f(mb.min.x)+','+f(mb.max.x)+'] y['+f(mb.min.y)+','+f(mb.max.y)+'] z['+f(mb.min.z)+','+f(mb.max.z)+'] hits '+h+' minAir '+f(mc));
        }
      }
    }
  } catch(e){ out.push('threw '+(e&&e.stack||e)); }
  return out.join('\n');
})();