(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  for (const c of T.POI.caves) {
    const g = c.capGrid, d = c.design;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
    const dhAt = (wx, wz) => { const i = Math.round((wx + 252) / 1) - g.i0, j = Math.round((wz + 252) / 1) - g.j0; return i < 0 || j < 0 || i >= g.ni || j >= g.nj ? 0 : g.dh[j * g.ni + i]; };
    const near = T.worldSolids.filter(s => Math.hypot(s.x - c.x, s.z - c.z) < 45);
    let leaks = 0, rays = 0, worst = '';
    const hx = c.x + fx * (d.dome.pz - 2), hz = c.z + fz * (d.dome.pz - 2);
    for (let a = 0; a < 360; a += 2) {
      const dx = Math.cos(a * Math.PI / 180), dz = Math.sin(a * Math.PI / 180);
      let blocked = false, door = false;
      for (let t = 34; t > 0; t -= 0.25) {
        const x = hx + dx * t, z = hz + dz * t;
        const lx = (x - c.x) * rx + (z - c.z) * rz, lz = (x - c.x) * fx + (z - c.z) * fz;
        if (Math.abs(lx - d.skew * 1.2) < d.w - 0.2 && lz > -4.6 - 2 && lz < 3) { door = true; break; }
        if (Math.hypot(x, z) > 217) continue;
        if (near.some(s => Math.hypot(s.x - x, s.z - z) < s.radius + 0.42 && s.y1 > T.sampleHeight(x, z) + 0.5)) { blocked = true; break; }
        if (dhAt(x, z) > 1.6) break;
      }
      if (door) continue;
      rays++;
      if (!blocked) { leaks++; if (!worst) worst = 'angle ' + a; }
    }
    ok(leaks === 0, c.theme + ': no way up the hill (' + leaks + ' of ' + rays + ' rays reach 1.6m of hill unblocked' + (worst ? ', first ' + worst : '') + ')');
  }
  return out.join('\n');
})()
