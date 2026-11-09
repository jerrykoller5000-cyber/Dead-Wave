// GP-20062 focused t333 diagnostic before finishGun merges the M240 meshes.
export async function audit() {
  const { weaponModelContext } = await import('/tools/marine-inspector.js');
  const { makeM240Model } = await import('/studio/weapon-heavy.js');
  const THREE = await import('three');
  const ctxBase = weaponModelContext();
  let found = [];
  makeM240Model({ ...ctxBase, finishGun(gun) {
    gun.updateMatrixWorld(true);
    const meshes = [];
    gun.traverse(o => {
      if (!o.isMesh || /flash|laser|flare|suppressor|light/i.test(o.name)) return;
      if (o.material?.transparent && o.material.opacity === 0) return;
      const box = new THREE.Box3().setFromObject(o);
      const size = box.getSize(new THREE.Vector3());
      if (box.isEmpty()) return;
      meshes.push({ o, box, size, long: Math.max(size.x, size.y, size.z), vol: size.x * size.y * size.z });
    });
    const big = meshes.filter(m => m.long > 0.018);
    found = meshes.filter(m => m.long <= 0.018 && m.vol > 0 &&
      !big.some(b => b.o !== m.o && m.box.clone().expandByScalar(0.0015).intersectsBox(b.box)))
      .map(m => ({ center: m.box.getCenter(new THREE.Vector3()).toArray().map(v => +v.toFixed(4)),
        size: m.size.toArray().map(v => +v.toFixed(4)), material: m.o.material?.name || '' }));
    return gun;
  } });
  return { count: found.length, floats: found };
}
