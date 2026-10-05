// GP-105. Head-local surfaces; the existing rig and wardrobe own their materials.
// Rings run bottom to top. Front is +z. A shared vertex grid keeps cloth and skin
// softly shaded without adding an asset loader, texture or per-frame work.
function surface(T, rings, {opening = false, frontOnly = false} = {}) {
  const segments = 32, positions = [], uv = [], indices = [];
  for (let r = 0; r < rings.length; r++) {
    const [y, width, front, back] = rings[r];
    for (let j = 0; j <= segments; j++) {
      const a = -Math.PI + j / segments * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      let yy = y;
      if (frontOnly && r === rings.length - 1) yy += .05 * s * s;
      if (opening && r === 4 && c > 0) yy += .015 * c ** 8 + .01 * s ** 4;
      if (opening && r === 5 && c > 0) yy += .019 * c;
      positions.push(width * s, yy - 1.22, c >= 0 ? front * c ** .55 : -back * (-c) ** .8);
      uv.push(j / segments, (y - 1.2) * 3);
    }
  }
  for (let r = 0; r < rings.length - 1; r++) for (let j = 0; j < segments; j++) {
    const a = -Math.PI + (j + .5) / segments * Math.PI * 2;
    if (frontOnly && Math.abs(a) > Math.PI * .46) continue;
    if (opening && r === 4 && Math.abs(a) < Math.PI / 4) continue;
    const p = r * (segments + 1) + j, q = p + segments + 1;
    indices.push(p, p + 1, q, p + 1, q + 1, q);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
  return g;
}

export function buildMarineHead(T, material) {
  const mesh = new T.Mesh(surface(T, [
    [1.275,.035,.09,.048], [1.291,.065,.127,.07],
    [1.323,.094,.149,.09], [1.365,.115,.152,.111],
    [1.402,.124,.151,.122], [1.455,.125,.148,.125],
    [1.50,.118,.13,.12], [1.534,.085,.094,.087], [1.548,.001,.001,.001]
  ]), material);
  mesh.name = 'marine-shaped-head';mesh.castShadow = true;mesh.receiveShadow = true;
  return mesh;
}

export function buildBalaclava(T, material) {
  material.roughness = .98;material.metalness = 0;material.side = T.DoubleSide;
  const mesh = new T.Mesh(surface(T, [
    [1.19,.089,.087,.09], [1.245,.084,.115,.098],
    [1.291,.092,.154,.108], [1.35,.132,.177,.129],
    [1.396,.145,.187,.142], [1.446,.145,.173,.142],
    [1.494,.139,.149,.145], [1.535,.108,.118,.114], [1.564,.001,.001,.001]
  ], {opening:true}), material);
  mesh.name = 'cloth-balaclava';mesh.castShadow = true;mesh.receiveShadow = true;
  const group = new T.Group();group.name = 'balaclava';group.add(mesh);
  // A narrow rolled cloth hem finishes the eye opening; same wardrobe material.
  const edge = [];
  for (const upper of [true, false]) for (let j = 0; j <= 16; j++) {
    const a = (upper ? -1 + j / 8 : 1 - j / 8) * Math.PI / 4, c = Math.cos(a), sn = Math.sin(a);
    const y = upper ? 1.446 + .019 * c : 1.396 + .015 * c ** 8 + .01 * sn ** 4;
    edge.push(new T.Vector3(.145 * sn, y - 1.22, (upper ? .173 : .187) * c ** .55 + .001));
  }
  const hem = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(edge, true), 48, .0016, 4, true), material);
  hem.castShadow = true;hem.receiveShadow = true;group.add(hem);
  return group;
}

export function buildSurvivorBeard(T, material) {
  const mesh = new T.Mesh(surface(T, [
    [1.273,.036,.098,.05], [1.291,.069,.134,.07],
    [1.323,.098,.155,.09], [1.341,.125,.156,.1]
  ], {frontOnly:true}), material);
  mesh.name = 'survivor-fitted-beard';mesh.castShadow = true;mesh.receiveShadow = true;
  return mesh;
}
