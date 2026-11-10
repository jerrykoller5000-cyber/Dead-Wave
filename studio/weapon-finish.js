// Separate a coated surface from hardware using the same factory material before
// the rigid-mesh batcher joins them. The armory owns each gun's mutable copies.
const paintVariants = new WeakMap();

export function markPaintSurface(mesh, role) {
  const base = mesh.material;
  let variants = paintVariants.get(base);
  if (!variants) { variants = new Map(); paintVariants.set(base, variants); }
  if (!variants.has(role)) {
    const coated = base.clone();
    coated.userData.weaponFinishRole = role;
    variants.set(role, coated);
  }
  mesh.material = variants.get(role);
}
