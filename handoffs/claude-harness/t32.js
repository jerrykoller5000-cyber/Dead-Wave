(async () => {
  const T = window.TT; const out = []; const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click(); await wait(1200);
  const r = T.devBaseBuild(); await wait(200);
  const gates = T.builds.filter(b => b.opening === 'gate' || (b.opening === 'door' && b.level === 0));
  // the road: gates on the line of the perimeter door
  const gdoor = T.builds.find(b => b.type === 'wall' && b.opening === 'door' && b.tier === 2);
  const roadX = gdoor.x;
  const road = T.builds.filter(b => (b.opening === 'gate' || b.opening === 'door') && Math.abs(b.x - roadX) < 0.1 && b.level === 0).sort((a, b) => a.z - b.z);
  out.push('road pieces: ' + road.map(b => b.type + '/' + b.opening + '@' + b.z.toFixed(1)).join(' '));
  const walk = (z0, z1, x) => {
    const p = { x, z: z0 }; const R = T.PLAYER_RADIUS_DBG; const dir = Math.sign(z1 - z0);
    let stuckAt = null;
    for (let i = 0; i < 2000; i++) {
      const before = p.z;
      p.z += dir * 0.06;
      const y = T.sampleHeight(p.x, p.z);
      let q = T.resolveSoftBarricades(p.x, p.z, R, 1);
      q = T.resolveHardBuildCollisions(q.x, q.z, R, true, y);
      p.x = q.x; p.z = q.z;
      if ((z1 - p.z) * dir <= 0) return 'made it (' + i + ' steps)';
      if (Math.abs(p.z - before) < 1e-4 && stuckAt == null) stuckAt = p.z;
      if (i > 400 && stuckAt != null) return 'STUCK at z=' + p.z.toFixed(2) + ' x=' + p.x.toFixed(2);
    }
    return 'ran out, at ' + p.z.toFixed(2);
  };
  const zin = gdoor.z - 3, zout = road[road.length - 1].z + 3;
  for (const side of [1, -1]) {
    for (const g of road) { g.doorOpen = true; g.doorAmt = 1; g.doorSide = side; }
    out.push('all open (swing ' + side + '): in->out ' + walk(zin, zout, roadX) + ' | out->in ' + walk(zout, zin, roadX));
  }
  // opened toward each other: the two gates swing into the square between them
  road[road.length - 2].doorSide = 1; road[road.length - 1].doorSide = -1;
  out.push('facing each other: in->out ' + walk(zin, zout, roadX) + ' | out->in ' + walk(zout, zin, roadX));
  // and off-centre, hugging one side of the gap
  out.push('off-centre +0.5: ' + walk(zin, zout, roadX + 0.5) + ' | ' + walk(zout, zin, roadX + 0.5));
  // shut: the gates must still block
  for (const g of road) { g.doorOpen = false; g.doorAmt = 0; }
  out.push('all shut: ' + walk(zin, zout, roadX));
  return out.join('\n');
})()
