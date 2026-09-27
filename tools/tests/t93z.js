(async () => {
  const T = window.TT; const out = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(3);
  try {
    await startMatch(T, 'Feet');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const px = 10, pz = 10;
    T.levelGroundRect(px - 30, pz - 30, px + 30, pz + 30, T.sampleHeight(px, pz), 6);
    T.player.position.set(px, T.sampleHeight(px, pz), pz);
    const kinds = ['shambler','feral','leaper','drowned','military','brute','spitter','screamer','colossus','demon','guardian','bomber','tank'];
    let i = 0;
    for (const k of kinds) {
      let zz; try { zz = T.spawnZombie(px - 14 + (i % 5) * 6, pz + 12 + Math.floor(i / 5) * 5, k, true, true); } catch (e) { out.push('FAIL dbg ' + k + ' spawn err ' + e.message); continue; }
      i++;
      if (!zz) { out.push('FAIL dbg ' + k + ' none'); continue; }
      zz.riseT = 0;
      const ud = zz.mesh.userData; const s = (ud.hitH||1) ;
      const sole = () => { let m = 1e9; zz.mesh.updateWorldMatrix(true, true); zz.mesh.traverse((o) => { if (!o.isMesh || !o.visible || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return; let vis = true; for (let q = o; q; q = q.parent) { if (q.visible === false) vis = false; if (q.scale && q.scale.y < 0.01) vis = false; } if (!vis) return; const a = o.geometry.attributes.position; const arr = a.array; const e = o.matrixWorld.elements; for (let j = 0; j < a.count; j++) { const x = arr[j*3], y = arr[j*3+1], z = arr[j*3+2]; const wy = e[1]*x + e[5]*y + e[9]*z + e[13]; if (wy < m) m = wy; } }); return m; };
      const headY = () => { const h = ud.head; if (!h) return NaN; h.updateWorldMatrix(true,false); return h.matrixWorld.elements[13]; };
      zz.mesh.updateWorldMatrix(true, true);
      const g0 = T.sampleHeight(zz.mesh.position.x, zz.mesh.position.z);
      const r0 = sole() - g0, hd0 = headY() - g0;
      let mn = 1e9, mx = -1e9;
      const t0 = performance.now(); while (performance.now() - t0 < 900) { await wait(30); const g = T.sampleHeight(zz.mesh.position.x, zz.mesh.position.z); const v = sole() - g; mn = Math.min(mn, v); mx = Math.max(mx, v); }
      out.push('FAIL dbg ' + k + ' rest sole ' + f2(r0) + ' head ' + f2(hd0) + ' hitH ' + f2(ud.hitH) + ' baseHips ' + f2(ud.baseHipsY) + ' walk sole min ' + f2(mn) + ' max ' + f2(mx) + ' rootdy ' + f2(zz.mesh.position.y - T.sampleHeight(zz.mesh.position.x, zz.mesh.position.z)));
    }
  } catch (e) { out.push('FAIL dbg err ' + (e.stack || e)); }
  return out.join('\n');
})();