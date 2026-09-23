(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const caves = T.POI.caves;
  const v = new T.THREE.Vector3();
  const rows = [];
  for (const c of caves) {
    c.group.updateMatrixWorld(true);
    let rMax = 0;
    c.group.traverse(o => { if (o.isMesh && o.geometry.attributes.position) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); rMax = Math.max(rMax, Math.hypot(v.x, v.z)); } } });
    let tMax = 0; for (const t of c.trees || []) tMax = Math.max(tMax, Math.hypot(t.x, t.z) + (t.canopyRadius || 2));
    // Hill: where does the raised ground reach? (the hill contribution before the wall fade)
    let hMax = 0;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
    for (let lx = -30; lx <= 30; lx += 0.5) for (let lz = -34; lz <= 18; lz += 0.5) {
      const h = T.caveHillHeight(c.design, lx, lz, c.hillSeed);
      if (h < 0.05) continue;
      const wx = c.x + rx * lx + fx * lz, wz = c.z + rz * lx + fz * lz;
      const r = Math.hypot(wx, wz);
      const fade = Math.max(0, Math.min(1, (220 - 4.5 - r) / 4)); const f = fade * fade * (3 - 2 * fade);
      if (h * f > 0.05) hMax = Math.max(hMax, r);
    }
    rows.push(c.theme + ' mesh ' + rMax.toFixed(1) + ' trees ' + tMax.toFixed(1) + ' hill ' + hMax.toFixed(1));
    ok(rMax < 216 && tMax < 216 && hMax < 216, c.theme + ' clear of the wall (mesh ' + rMax.toFixed(1) + ', trees ' + tMax.toFixed(1) + ', hill ' + hMax.toFixed(1) + ')');
    // Colossus: 4.7m tall, 1.05 radius — mouth half width at 4.9m and the corridor floor clear.
    const d = c.design; const k = 2 / d.p;
    // superellipse: at height y, |x| = w * (1 - (y/h)^(p/... )) — solve numerically
    let half = 0; for (let t = 0; t <= Math.PI / 2; t += 0.001) { const y = d.h * Math.pow(Math.sin(t), k); if (y >= 4.9) { half = d.w * Math.pow(Math.cos(t), k); break; } }
    ok(half > 1.3, c.theme + ' colossus fits the mouth (half-width at 4.9m ' + half.toFixed(2) + ')');
    // Floor of the corridor is walkable (heightfield at floor) where the horde spawns.
    let worst = 0; for (let lz = -3.6; lz <= 0.4; lz += 0.4) for (let lx = -1.2; lx <= 1.2; lx += 0.4) { const x0 = lx + d.skew * 1.2; const wx = c.x + rx * x0 + fx * lz, wz = c.z + rz * x0 + fz * lz; worst = Math.max(worst, Math.abs(T.sampleHeight(wx, wz) - c.gy)); }
    ok(worst < 0.3, c.theme + ' corridor floor level (max dev ' + worst.toFixed(2) + ')');
  }
  out.push('INFO ' + rows.join(' | '));
  return out.join('\n');
})()
