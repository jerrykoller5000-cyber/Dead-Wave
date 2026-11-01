(async () => {
  const T = window.TT;
  if (!T?.nightWarningsDbg || !T?.spawnZombie || !T?.devJumpToNight) throw new Error('warning debug hook missing');
  const errors = [];
  window.addEventListener('error', (e) => errors.push(e.message));
  if (!T.devJumpToNight(1, true)) throw new Error('could not start night');
  T.drainWavePlanDbg();
  const offset = Number.isFinite(window.__warningProbeOffset) ? window.__warningProbeOffset : 2;
  const tree = T.trees.find((t) => {
    if (!t.alive || t.falling || Math.hypot(t.x, t.z) < 70) return false;
    const px = t.x + offset + 12, pz = t.z;
    return T.waterDepthAt(px, pz) < 0.01 &&
      Math.abs(T.sampleHeight(px, pz) - T.sampleHeight(t.x + offset, pz)) < 0.8 &&
      T.nightWarningsDbg.cover(t.x + offset, pz) != null;
  });
  if (!tree) throw new Error('no dry forest approach found');
  const px = tree.x + offset + 12, pz = tree.z;
  T.player.position.set(px, T.entityGroundY(px, pz), pz);
  const zombie = T.spawnZombie(tree.x + offset, tree.z, 'shambler', true, true);
  if (!zombie) throw new Error('zombie spawn failed');
  const speed = zombie.speed;
  zombie.speed = 0;
  await new Promise((resolve) => setTimeout(resolve, 4300)); // keep one body alive while the sky becomes night
  zombie.speed = speed;
  const initial = Math.hypot(zombie.mesh.position.x - px, zombie.mesh.position.z - pz);
  const initialState = T.nightWarningsDbg.state(zombie);
  await new Promise((resolve) => setTimeout(resolve, 2700));
  const events = T.nightWarningsDbg.events().filter((e) => e.type === 'shambler' &&
    Math.hypot(e.x - tree.x, e.z - tree.z) < 20);
  return { enabled: T.nightWarningsDbg.enabled, night: T.nightWarningsDbg.stats(),
    forest: { x: tree.x, z: tree.z, cover: T.nightWarningsDbg.cover(tree.x + offset, tree.z) },
    initial, initialState, finalState: T.nightWarningsDbg.state(zombie),
    final: Math.hypot(zombie.mesh.position.x - px, zombie.mesh.position.z - pz),
    events, errors,
    zombie: { alive: zombie.alive, sleeping: !!zombie.sleeping, type: zombie.typeKey } };
})();
