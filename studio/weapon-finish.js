// Separate a coated surface from hardware using the same factory material before
// the rigid-mesh batcher joins them. The armory owns each gun's mutable copies.
const paintVariants = new WeakMap();

let walnutGrain;
export function walnutTexture(T) {
  if (walnutGrain) return walnutGrain;
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = 2 * Math.PI * x / size, v = 2 * Math.PI * y / size;
    const cut = u + 0.31 * Math.sin(v + u) + 0.13 * Math.sin(2 * v - u);
    const streak = (1 + Math.cos(12 * cut + 0.7 * Math.sin(5 * cut))) / 2;
    const value = Math.round(242 - 45 * streak ** 5 - 12 * Math.sin(4 * cut));
    const i = (y * size + x) * 4;
    data[i] = value; data[i + 1] = value; data[i + 2] = value; data[i + 3] = 255;
  }
  walnutGrain = new T.DataTexture(data, size, size);
  walnutGrain.wrapS = walnutGrain.wrapT = T.RepeatWrapping;
  walnutGrain.magFilter = T.LinearFilter;
  walnutGrain.minFilter = T.LinearMipmapLinearFilter;
  walnutGrain.generateMipmaps = true; walnutGrain.needsUpdate = true;
  walnutGrain.repeat.set(3, 1.5);
  return walnutGrain;
}

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
