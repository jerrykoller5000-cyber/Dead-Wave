// GB-249 probe: where is the shambler's head, by every way of reading it? (proof only, never a shipped test)
(async () => {
  const T = window.TT; const out = [];
  const f = (v) => (+v).toFixed(3);
  try {
    await startMatch(T, 'Feet');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const px = 10, pz = 10;
    T.levelGroundRect(px - 30, pz - 30, px + 30, pz + 30, T.sampleHeight(px, pz), 6);
    T.player.position.set(px, T.sampleHeight(px, pz), pz);
    out.push('three ' + (window.THREE && THREE.REVISION));
    for (const k of ['shambler', 'colossus', 'demon', 'feral']) {
      const zz = T.spawnZombie(px - 6, pz + 12, k, true, true); zz.riseT = 0; zz.hp = 5000; zz.maxHp = 5000;
      const root = zz.mesh, ud = root.userData; root.updateWorldMatrix(true, true);
      const V = root.position.constructor, p = new V(), q = new V();
      const head = ud.head; head.getWorldPosition(q);
      out.push(k + ' rootY ' + f(root.position.y) + ' rootScale ' + f(root.scale.y) + ' headWorldY-root ' + f(q.y - root.position.y) + ' hitH ' + f(zz.hitH));
      // (a) hidden sources under head, visibility ignored
      let lo = 1e9, hi = -1e9, n = 0;
      head.traverse((o) => { const pa = o.isMesh && !o.isSkinnedMesh && o.geometry?.attributes?.position; if (!pa) return;
        for (let j = 0; j < pa.count; j++) { p.fromBufferAttribute(pa, j).applyMatrix4(o.matrixWorld); lo = Math.min(lo, p.y); hi = Math.max(hi, p.y); n++; } });
      out.push('  (a) sources under head: ' + n + ' v, ' + f(lo - root.position.y) + '..' + f(hi - root.position.y));
      root.traverse((s) => {
        if (!s.isSkinnedMesh) return;
        const ga = s.geometry.attributes, sk = s.skeleton, bn = sk.bones;
        const isUnder = (b) => { for (let x = b; x; x = x.parent) if (x === head) return true; return false; };
        const mine = bn.map(isUnder);
        const headIdx = bn.map((b, i) => (mine[i] ? i + ':' + (b.name || b.type) : null)).filter(Boolean).slice(0, 6).join(',');
        out.push('  skin ' + s.name + ' bindMode ' + s.bindMode + ' bones ' + bn.length + ' headBones ' + headIdx + ' parentIsRoot ' + (s.parent === root) + ' visible ' + s.visible);
        let l1 = 1e9, h1 = -1e9, l2 = 1e9, h2 = -1e9, l3 = 1e9, h3 = -1e9, c = 0;
        const M = new s.matrixWorld.constructor(), b0 = new V(), t = new V();
        for (let j = 0; j < ga.position.count; j++) {
          let best = -1, bw = 0;
          for (let cc = 0; cc < 4; cc++) { const w = ga.skinWeight.getComponent(j, cc); if (w > bw) { bw = w; best = ga.skinIndex.getComponent(j, cc); } }
          if (best < 0 || !mine[best]) continue; c++;
          // bind pose (raw position, skin-local)
          p.fromBufferAttribute(ga.position, j).applyMatrix4(s.matrixWorld); l1 = Math.min(l1, p.y); h1 = Math.max(h1, p.y);
          // getVertexPosition
          if (s.getVertexPosition) { s.getVertexPosition(j, p); p.applyMatrix4(s.matrixWorld); l2 = Math.min(l2, p.y); h2 = Math.max(h2, p.y); }
          // by hand
          b0.fromBufferAttribute(ga.position, j).applyMatrix4(s.bindMatrix); p.set(0, 0, 0);
          for (let cc = 0; cc < 4; cc++) { const w = ga.skinWeight.getComponent(j, cc); if (!w) continue; const kk = ga.skinIndex.getComponent(j, cc); M.multiplyMatrices(bn[kk].matrixWorld, sk.boneInverses[kk]); p.addScaledVector(t.copy(b0).applyMatrix4(M), w); }
          p.applyMatrix4(s.bindMatrixInverse).applyMatrix4(s.matrixWorld); l3 = Math.min(l3, p.y); h3 = Math.max(h3, p.y);
        }
        const r = root.position.y;
        out.push('  verts ' + c + ' bind ' + f(l1 - r) + '..' + f(h1 - r) + ' getVP ' + f(l2 - r) + '..' + f(h2 - r) + ' hand ' + f(l3 - r) + '..' + f(h3 - r));
      });
      T.clearZombies();
    }
  } catch (e) { out.push('FAIL probe threw: ' + (e.stack || e).toString().slice(0, 500)); }
  return out.join('\n');
})();
