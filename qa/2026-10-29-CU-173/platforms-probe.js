(() => {
  // CU-173: the sizes of what updateZombies' grown stages scan at night 20's peak, and what one lookup costs there.
  //   platformHeightAt scans every deck (entityGroundY calls it, a few times per body per frame);
  //   resolveStaticProps reads a grid rebuilt from trees + rocks + worldSolids every 12 frames.
  const out = {};
  const len = (a) => (a && typeof a.length === 'number' ? a.length : (a && typeof a.size === 'number' ? a.size : null));
  const P = TT.platforms || [];
  out.platforms = P.length;
  out.ramps = P.filter((p) => p.rise).length;
  out.builds = len(TT.builds);
  out.trees = len(TT.trees);
  out.rocks = len(TT.rocks);
  out.worldSolids = len(TT.worldSolids);
  const zs = (TT.zombies || []).filter((z) => z.alive && z.mesh);
  out.zombies = zs.length;
  const pp = TT.player && TT.player.position;
  if (pp) out.platformsWithin60mOfHim = P.filter((p) => Math.hypot(p.x - pp.x, p.z - pp.z) < 60).length;
  const pts = zs.map((z) => [z.mesh.position.x, z.mesh.position.z, z.mesh.position.y + 3]);
  if (!pts.length) return out;
  const time = (name, fn) => {
    for (let r = 0; r < 30; r++) for (const p of pts) fn(p[0], p[1], p[2]);
    let n = 0, sink = 0;
    const t0 = performance.now();
    for (let r = 0; r < 400; r++) for (const p of pts) { const v = fn(p[0], p[1], p[2]); sink += typeof v === 'number' ? v : 0; n++; }
    out[name + '_ns'] = Math.round(((performance.now() - t0) * 1e6) / n);
    return sink;
  };
  if (typeof TT.platformHeightAt === 'function') time('platformHeightAt', (x, z, y) => TT.platformHeightAt(x, z, y));
  if (typeof TT.entityGroundY === 'function') time('entityGroundY', (x, z, y) => TT.entityGroundY(x, z, y));
  if (typeof TT.sampleHeight === 'function') time('sampleHeight', (x, z) => TT.sampleHeight(x, z));
  if (typeof TT.waterDepthAt === 'function') time('waterDepthAt', (x, z) => TT.waterDepthAt(x, z));
  if (typeof TT.resolveStaticProps === 'function') time('resolveStaticProps', (x, z, y) => TT.resolveStaticProps(x, z, 0.4, y).x);
  if (typeof TT.resolveHardBuildCollisions === 'function') time('resolveHardBuildCollisions', (x, z, y) => TT.resolveHardBuildCollisions(x, z, 0.4, false, y, null).x);
  return out;
})()
