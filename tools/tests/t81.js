// t81 — CL-55 (CU-39): the rune bands in the pit are never under the drawn lake bed. The black
// specks cutting the runes were bed triangles poking up through bands draped over the smooth
// sampleHeight surface; now they drape over the ground mesh as drawn. Also: the finisher's
// grade is a canvas filter, not a grey blend layer (which, where the blend failed, was a
// milky grey sheet over the whole shot).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const THREE = T.THREE;
    // groundMeshY is the drawn ground: check it against a ray cast down onto the ground mesh.
    const L = T.LAKE_HOLE; let worstRay = 0, rays = 0;
    const gp = T.ground.geometry.attributes.position.array, gi = T.ground.geometry.index.array;
    const near = [];   // the ground's triangles within 14 m of the pit
    for (let t = 0; t < gi.length; t += 3) { const v = gi[t] * 3; if (Math.hypot(gp[v] - L.x, gp[v + 2] - L.z) < 14) near.push(t); }
    const drawnY = (x, z) => {   // a ray straight down onto those triangles
      for (const t of near) {
        const a = gi[t] * 3, b = gi[t + 1] * 3, c = gi[t + 2] * 3;
        const d = (gp[b + 2] - gp[c + 2]) * (gp[a] - gp[c]) + (gp[c] - gp[b]) * (gp[a + 2] - gp[c + 2]);
        const w0 = ((gp[b + 2] - gp[c + 2]) * (x - gp[c]) + (gp[c] - gp[b]) * (z - gp[c + 2])) / d;
        const w1 = ((gp[c + 2] - gp[a + 2]) * (x - gp[c]) + (gp[a] - gp[c]) * (z - gp[c + 2])) / d;
        const w2 = 1 - w0 - w1;
        if (w0 >= -1e-6 && w1 >= -1e-6 && w2 >= -1e-6) return w0 * gp[a + 1] + w1 * gp[b + 1] + w2 * gp[c + 1];
      }
      return null;
    };
    for (let k = 0; k < 40; k++) {
      const a = k * 2.4, r = (k % 10) + 1.5, x = L.x + Math.cos(a) * r, z = L.z + Math.sin(a) * r;
      const y = drawnY(x, z); if (y === null) continue;
      rays++; worstRay = Math.max(worstRay, Math.abs(y - T.groundMeshY(x, z)));
    }
    ok(rays > 30 && worstRay < 0.01, 'groundMeshY is the drawn ground (' + rays + ' rays, worst ' + worstRay.toFixed(4) + ' m)');
    // Every band vertex and every band-edge midpoint is above the drawn bed.
    const pit = T.POI.lakeHole; let below = 0, n = 0, minGap = 1e9, oldMin = 1e9;
    pit.children.forEach(o => {
      if (!(o.isMesh && o.userData.pitRunes)) return;
      const p = o.geometry.attributes.position, idx = o.geometry.index.array;
      const Y = (i) => p.getY(i) + pit.position.y, X = (i) => p.getX(i) + pit.position.x, Z = (i) => p.getZ(i) + pit.position.z;
      const test = (x, y, z) => { const g = y - T.groundMeshY(x, z); n++; minGap = Math.min(minGap, g); if (g < 0.02) below++; oldMin = Math.min(oldMin, T.sampleHeight(x, z) + 0.07 - T.groundMeshY(x, z)); };
      for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) {
        const i0 = idx[t + e], i1 = idx[t + (e + 1) % 3];
        test(X(i0), Y(i0), Z(i0));
        test((X(i0) + X(i1)) / 2, (Y(i0) + Y(i1)) / 2, (Z(i0) + Z(i1)) / 2);
        test((2 * X(i0) + X(i1)) / 3, (2 * Y(i0) + Y(i1)) / 3, (2 * Z(i0) + Z(i1)) / 3);
      }
    });
    ok(n > 5000 && below === 0, 'rune bands clear the drawn bed everywhere (' + below + '/' + n + ' under 2 cm, least gap ' + minGap.toFixed(3) + ' m)');
    out.push('INFO the old drape (sampleHeight + 7 cm) went ' + (-oldMin).toFixed(2) + ' m under the drawn bed at worst');
    // The finisher grade.
    const cv = T.renderer.domElement;
    const css = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch (_) { return []; } }).map(r => r.cssText).join('\n');
    ok(!/finishgrade[^{]*\.grade\s*\{[^}]*opacity:\s*0?\.[1-9]/.test(css), 'no grey blend sheet during the finisher');
    ok(/canvas\.fin-grade/.test(css), 'the finisher grade is a canvas filter');
    cv.classList.add('fin-grade');
    const f = getComputedStyle(cv).filter;
    ok(/saturate/.test(f), 'graded canvas has a saturate filter: ' + f);
    cv.classList.remove('fin-grade');
  } catch (e) { out.push('FAIL threw: ' + (e && (e.stack || e.message))); }
  return out.join('\n');
})()
