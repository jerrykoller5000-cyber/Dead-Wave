// t340 - CB-339c (a) (Claude 2, Director OK 10:47Z): the guardian's and the cave guardian's hit column holds the whole posed head,
// in every pose (coming on at a gallop, standing, reared winding up, the strike, a flinch), at forced heights 0.93 / 1.00 / 1.07;
// the eyes stay over the 0.78 head line; the column never drops under the body's own (hitH0) nor over 1.35 x it.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m); const info = (m) => out.push('INFO ' + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'CB339a column');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position, B = T.guardianBossDbg, TH = T.THREE, wp = new TH.Vector3(), sv = new TH.Vector3();
    const shows = (o) => { for (let a = o; a; a = a.parent) if (!a.visible) return false; return true; };
    for (const key of ['guardian', 'caveguard']) for (const V of [0, 0.5, 0.9999]) {
      T.clearZombies();
      const r0 = Math.random, want = 0.93 + V * 0.14; let z = null;
      Math.random = () => V;
      try { for (let i = 0; i < 40 && !z; i++) { const c = T.spawnZombie(P.x + 16, P.z, key, true, true); if (Math.abs(c.mesh.userData.variant.height - want) < 1e-6) z = c; else { c.mesh.position.x += 300 + 12 * i; c.mesh.position.z += 300; } } } finally { Math.random = r0; }
      if (!z) { ok(false, key + ' ' + V + ': no body of the forced height'); continue; }
      const rig = B.rigOf(z), R = rig.userData.rig, H0 = z.bossRig.hitH0 || z.hitH;
      const under = new Set(); R.head.traverse((o) => under.add(o));
      const headTop = () => {
        rig.updateWorldMatrix(true, true); let v = -1e9;
        R.head.traverse((o) => { const pa = o.isMesh && o.geometry && o.geometry.attributes.position; if (!pa || !shows(o) || o.isSkinnedMesh) return; const e = o.matrixWorld.elements, a = pa.array; for (let j = 0; j < pa.count; j++) v = Math.max(v, e[1] * a[j * 3] + e[5] * a[j * 3 + 1] + e[9] * a[j * 3 + 2] + e[13]); });
        rig.traverse((o) => {
          if (!o.isSkinnedMesh || !shows(o) || !o.skeleton) return;
          const g = o.geometry, pa = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight; if (!pa || !si || !sw) return;
          const bones = o.skeleton.bones, e = o.matrixWorld.elements;
          for (let j = 0; j < pa.count; j++) { let bi = -1, bw = -1; for (let c = 0; c < 4; c++) { const w = sw.getComponent(j, c); if (w > bw) { bw = w; bi = si.getComponent(j, c); } } if (!under.has(bones[bi])) continue; sv.fromBufferAttribute(pa, j); o.applyBoneTransform(j, sv); v = Math.max(v, e[1] * sv.x + e[5] * sv.y + e[9] * sv.z + e[13]); }
        });
        return v - z.mesh.position.y;
      };
      const eyes = () => { let s = 0, n = 0; for (const o of (R.eyes || [])) { if (!o || !shows(o)) continue; o.getWorldPosition(wp); s += wp.y; n++; } return n ? s / n - z.mesh.position.y : NaN; };
      const res = {};
      const phase = (name, setup, step, n = 80) => {
        setup && setup(); let over = -1e9, eyeMin = 9, hiMax = 0, loMin = 9;
        for (let i = 0; i < n; i++) { step && step(i); B.update(1 / 60); if (i < 8) continue; const t = headTop(); over = Math.max(over, t - z.hitH); eyeMin = Math.min(eyeMin, eyes() / z.hitH); hiMax = Math.max(hiMax, z.hitH / H0); loMin = Math.min(loMin, z.hitH / H0); }
        res[name] = { over: +over.toFixed(3), eye: +eyeMin.toFixed(3), col: [+loMin.toFixed(3), +hiMax.toFixed(3)] };
      };
      const toward = () => { const dx = P.x - z.mesh.position.x, dz = P.z - z.mesh.position.z, d = Math.hypot(dx, dz) || 1; z.mesh.position.x += dx / d * 4.5 / 60; z.mesh.position.z += dz / d * 4.5 / 60; };
      phase('gallop', null, toward);
      phase('stand', () => { z.attackWindup = 0; z.swingT = 0; z.hitReact = 0; }, null, 140);
      phase('windup', () => { z.attackWindup = 5; }, null);
      phase('strike', () => { z.attackWindup = 0; z.swingT = 0.28; }, (i) => { z.swingT = Math.max(0.001, 0.28 - i / 60); }, 20);
      phase('flinch', () => { z.swingT = 0; z.hitReact = 0.35; }, null, 30);
      z.attackWindup = 0; z.swingT = 0; z.hitReact = 0;
      const worst = Math.max(...Object.values(res).map((r) => r.over)), eyeLow = Math.min(...Object.values(res).map((r) => r.eye));
      const colLo = Math.min(...Object.values(res).map((r) => r.col[0])), colHi = Math.max(...Object.values(res).map((r) => r.col[1]));
      info(key + ' h' + want.toFixed(2) + ' hitH0 ' + H0.toFixed(3) + ' ' + JSON.stringify(res));
      ok(worst <= 0.005, key + ' h' + want.toFixed(2) + ': the whole posed head inside the column in every pose (worst ' + (worst >= 0 ? '+' : '') + worst.toFixed(3) + ' m)');
      ok(eyeLow > 0.78, key + ' h' + want.toFixed(2) + ': its eyes over the head line in every pose (lowest ' + eyeLow.toFixed(3) + ')');
      ok(colLo >= 0.9999 && colHi <= 1.3501, key + ' h' + want.toFixed(2) + ': the column between its own and 1.35 x (' + colLo.toFixed(3) + '-' + colHi.toFixed(3) + ')');
    }
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
    T.resetGame && T.resetGame();
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})();
