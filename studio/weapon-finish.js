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

// Original, tileable lacquered birch. The lower half is long grain and the upper
// half is the exposed laminate. Both share one texture and one render material.
export function birchTexture(T) {
  const width = 512, half = 128, data = new Uint8Array(width * half * 2 * 4);
  const noise = new Uint8Array(256 * 256);
  let seed = 0x64a243f7;
  for (let i = 0; i < noise.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    noise[i] = seed >>> 24;
  }
  function field(u, v, columns, rows) {
    const x = u * columns, y = v * rows;
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const tx = fx * fx * (3 - 2 * fx), ty = fy * fy * (3 - 2 * fy);
    const a = (ix % columns + columns) % columns, b = (a + 1) % columns;
    const row = ((iy % rows + rows) % rows) * 256, next = ((row / 256 + 1) % rows) * 256;
    const top = noise[row + a] + tx * (noise[row + b] - noise[row + a]);
    const bottom = noise[next + a] + tx * (noise[next + b] - noise[next + a]);
    return (top + ty * (bottom - top)) / 255;
  }
  for (let y = 0; y < half * 2; y++) for (let x = 0; x < width; x++) {
    const u = x / width, v = (y % half) / half, edge = y >= half;
    const bent = v + .065 * (field(u, v, 3, 3) - .5) + .016 * (field(u, v, 8, 4) - .5);
    const band = field(u, bent, 4, 15) - .5;
    const fibres = field(u, bent, 12, 72) - .5;
    const pore = Math.max(0, field(u, bent, 110, 100) - .70) * 50;
    const layer = .5 + .5 * Math.cos(Math.PI * 2 * (bent * 12 + .10 * field(u, v, 3, 5)));
    const shade = 37 * band + 27 * fibres - pore + (edge ? 6 - 19 * layer ** 4 : 0);
    const i = (y * width + x) * 4;
    data[i] = 168 + shade; data[i+1] = 102 + .89 * shade; data[i+2] = 66 + .66 * shade; data[i+3] = 255;
  }
  const map = new T.DataTexture(data, width, half * 2);
  map.name = 'lacquered birch grain and cut edges';
  map.anisotropy = 4;
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = T.RepeatWrapping;
  map.magFilter = T.LinearFilter;
  map.minFilter = T.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}

// Slabs are unindexed, so cap and edge triangles can use separate atlas regions
// without a seam stretching through the face or a second material draw.
export function mapBirchSlab(mesh, angle, offset) {
  const {position, normal, uv} = mesh.geometry.attributes;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  let minAcross = Infinity, maxAcross = -Infinity, halfWidth = 0;
  for (let i = 0; i < position.count; i++) {
    const across = cos * position.getY(i) - sin * position.getZ(i);
    minAcross = Math.min(minAcross, across); maxAcross = Math.max(maxAcross, across);
    halfWidth = Math.max(halfWidth, Math.abs(position.getX(i)));
  }
  const middle = (maxAcross + minAcross) / 2;
  for (let tri = 0; tri < position.count; tri += 3) {
    const side = Math.abs(normal.getX(tri) + normal.getX(tri+1) + normal.getX(tri+2)) > 2.25;
    const end = Math.abs(cos * normal.getZ(tri) + sin * normal.getY(tri)) > .70;
    for (let i = tri; i < tri + 3; i++) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      const along = cos * z + sin * y, across = cos * y - sin * z - middle;
      const u = offset + (side || !end ? along : across) * 3.8;
      const section = side ? .5 + across / .24 : .5 + x / (2 * halfWidth);
      const v = (side ? 0 : .5) + .02 + .46 * Math.min(1, Math.max(0, section));
      uv.setXY(i, u, v);
    }
  }
  return mesh;
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
