// GP-20108: an actual downward-facing range ceiling. The hangar already has a
// trussed 24 m deck, and the holding passage already has a solid 6.3 m roof.
import { bakeStatic } from '../world/bake.js';
import { getTrainingPBR, applyWorldUVByMaterial } from '../world/training-textures.js';

export function createTrainingCeiling(T, tg, layout) {
  const { RANGE: R, WALL_H: H } = layout;
  const root = new T.Group();
  root.name = 'training-range-ceiling';
  tg.group.add(root);
  const ownedGeometries = new Set(), ownedMaterials = new Set();
  const material = spec => { const m = new T.MeshStandardMaterial(spec); ownedMaterials.add(m); return m; };
  // A little reflected safety light keeps the deck legible when the room's
  // fixtures are off; it remains much darker than the powered range.
  const pbr = getTrainingPBR(T);
  const ownedTextures = [];
  const concrete = material({ color: 0x7d8588, emissive: 0x4a5358, emissiveIntensity: .32,
    roughness: .89, metalness: .02, side: T.FrontSide });
  // CF-24 / AG-405: 600 mm fissured mineral-fiber acoustic ceiling panels + aluminum T-bar PBR.
  let deckMap = null;
  if (pbr) {
    const rx = (R.maxX - R.minX) / .6, rz = (R.maxZ - R.minZ) / .6;
    const cloneRep = (src) => { const c = src.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = T.RepeatWrapping; c.repeat.set(rx, rz); c.anisotropy = 8; ownedTextures.push(c); return c; };
    deckMap = cloneRep(pbr.acousticCeiling.map);
    const dNrm = cloneRep(pbr.acousticCeiling.normalMap);
    const dOrm = cloneRep(pbr.acousticCeiling.ormMap);
    concrete.map = deckMap; concrete.normalMap = dNrm;
    if (T.Vector2) concrete.normalScale = new T.Vector2(1.05, 1.05);
    concrete.roughnessMap = dOrm; concrete.metalnessMap = dOrm; concrete.aoMap = dOrm; concrete.aoMapIntensity = 0.80;
    concrete.roughness = 1.0; concrete.metalness = 1.0; concrete.color.setHex(0xadb4b6); concrete.needsUpdate = true;
  } else if (typeof document !== 'undefined' && document.createElement) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext && cv.getContext('2d');
    if (g) {
      g.fillStyle = '#f2f2ef'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = 'rgba(70,76,80,.16)';
      for (let y = 12; y < 248; y += 9) for (let x = 12; x < 248; x += 9) g.fillRect(x, y, 2, 2);
      g.fillStyle = '#7b8184'; g.fillRect(0, 0, 256, 4); g.fillRect(0, 0, 4, 256);
      g.fillStyle = '#c9cbc9'; g.fillRect(0, 4, 256, 2); g.fillRect(4, 0, 2, 256);
      deckMap = new T.CanvasTexture(cv);
      deckMap.wrapS = deckMap.wrapT = T.RepeatWrapping;
      deckMap.repeat.set((R.maxX - R.minX) / .6, (R.maxZ - R.minZ) / .6);
      deckMap.anisotropy = 8;
      if (T.SRGBColorSpace) deckMap.colorSpace = T.SRGBColorSpace;
      concrete.map = deckMap; concrete.color.setHex(0x9aa1a3); concrete.needsUpdate = true;
    }
  }
  const steel = material(pbr ? pbr.steelDark.opts({ color: 0xb6c4cc }) : { color: 0x49545a, roughness: .63, metalness: .43 });
  const rubber = material(pbr ? pbr.rubberCrumb.opts({ color: 0x565e60, normalScale: 1.1 }) : { color: 0x343a3b, roughness: .91 });
  const pipe = material(pbr ? pbr.galvDuct.opts({ color: 0xd0dadc }) : { color: 0x737d80, roughness: .62, metalness: .46 });
  const lens = material({ color: 0xbacbce, emissive: 0xc9dce0, emissiveIntensity: .48, roughness: .35, ...(pbr ? { map: pbr.prismaticLens.map, normalMap: pbr.prismaticLens.normalMap, normalScale: T.Vector2 ? new T.Vector2(0.85, 0.85) : undefined } : {}) });
  const mesh = (geo, mat, x, y, z, rx = 0) => {
    ownedGeometries.add(geo);
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = false;
    m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const box = (w, h, d, mat, x, y, z, rx = 0) => mesh(new T.BoxGeometry(w, h, d), mat, x, y, z, rx);
  // Shear the hanging plate rather than rotating a box: its top stays level
  // against the deck, while its lower edge leans toward the firing line.
  const slantedBox = (w, h, d, mat, x, y, topZ, topY, lean) => {
    const geo = new T.BoxGeometry(w, h, d);
    const points = geo.getAttribute('position');
    for (let i = 0; i < points.count; i++) points.setZ(i, points.getZ(i) + lean * points.getY(i));
    geo.computeVertexNormals();
    return mesh(geo, mat, x, y, topZ + lean * (y - topY));
  };

  // The underside has no top face: the overhead third-person camera sees into
  // the range. These full-span panels seat on the wall tops at y=6.
  const deck = mesh(new T.PlaneGeometry(R.maxX - R.minX, R.maxZ - R.minZ), concrete,
    (R.minX + R.maxX) / 2, H - .015, (R.minZ + R.maxZ) / 2, Math.PI / 2);
  deck.receiveShadow = false;
  // Shallow panel joints touch the deck and end before the two service runs.
  // Structural cross-beams here would slice through the duct and pipe.
  for (const z of [-9, -3, 3, 9, 15, 21, 27]) box(13.6, .01, .025, steel, 0, H - .02, z);

  // Across-lane safety baffles hang from the deck; the thick rubber face is
  // toward the firing line. Both long service runs sit outside the plate lanes.
  const baffleSolids = [];
  const addPanelSolids = (z, width, height, thickness, topZ, topY, lean, slices) => {
    const bottomY = topY - height;
    for (let i = 0; i < slices; i++) {
      const low = bottomY + height * i / slices, high = bottomY + height * (i + 1) / slices;
      const solid = {
        minX: tg.origin.x - width / 2, maxX: tg.origin.x + width / 2,
        minY: tg.origin.y + low, maxY: tg.origin.y + high,
        minZ: tg.origin.z + topZ + lean * (low - topY) - thickness / 2,
        maxZ: tg.origin.z + topZ + lean * (high - topY) + thickness / 2,
        ceiling: true, baffle: true, baffleZ: z
      };
      tg.solids.push(solid);
      baffleSolids.push(solid);
    }
  };
  for (const z of [-.2, 5.4, 11, 16.6, 22.2, 27.8]) {
    const topY = H - .015, centerY = topY - .57, lean = .12;
    slantedBox(13.7, 1.14, .18, steel, 0, centerY, z, topY, lean);
    slantedBox(13.5, 1.04, .07, rubber, 0, centerY, z - .125, topY, lean);
    // Short AABB slices follow the lean to within 12 mm, so the rubber face
    // and exposed steel both stop rounds before the deck behind them.
    addPanelSolids(z, 13.7, 1.14, .18, z, topY, lean, 12);
    addPanelSolids(z, 13.5, 1.04, .07, z - .125 - lean * .05, topY - .05, lean, 12);
    // CF-24 (D-237 #13, CH-3 #3): a galvanized channel frame round the rubber face, seam battens every 2.25 m
    // (the face is panels, not one 13.5 m sheet) and bolt rows. All lean with the plate; visual only (solids above).
    const face = z - .16, botY = topY - 1.14;
    slantedBox(13.7, .06, .07, pipe, 0, botY + .03, face - .005, topY, lean);          // bottom lip (the edge you see)
    slantedBox(13.7, .05, .07, pipe, 0, topY - .025, face - .005, topY, lean);         // top lip against the deck
    for (const side of [-1, 1]) slantedBox(.08, 1.03, .07, pipe, side * 6.81, centerY, face - .005, topY, lean);
    for (let k = -2; k <= 2; k++) {
      slantedBox(.05, .98, .03, pipe, k * 2.25, centerY, face - .012, topY, lean);
      for (const y of [botY + .12, topY - .11]) slantedBox(.026, .026, .014, steel, k * 2.25, y, face - .034, topY, lean);
    }
    for (let i = 0; i < 18; i++) {
      const x = -6.375 + i * .75;
      for (const y of [botY + .03, topY - .025]) slantedBox(.028, .028, .016, steel, x, y, face - .046, topY, lean);
    }
  }

  // Caged linear fixtures sit between baffles, with lenses kept on one shared
  // material so the wall switch can extinguish all of them together.
  for (const z of [-8, -4.1, 2.5, 8.1, 13.7, 19.3, 24.9]) {
    box(7.4, .13, .56, steel, 0, H - .08, z);
    box(7.1, .018, .43, lens, 0, H - .154, z);
    // CF-24 (CH-3 #3): a galvanized bezel lip round the lens and a wire guard under it (caged range fixture).
    for (const side of [-1, 1]) {
      box(7.4, .025, .045, pipe, 0, H - .158, z + side * .2375);
      box(.045, .025, .52, pipe, side * 3.5725, H - .158, z);
      box(7.1, .014, .014, steel, 0, H - .205, z + side * .19);
      for (const x of [-3.4, 0, 3.4]) box(.014, .045, .014, steel, x, H - .19, z + side * .19);
    }
    for (let i = 0; i < 21; i++) box(.011, .011, .40, steel, -3.5 + i * .35, H - .2135, z);
  }

  // Galvanized supply duct and sprinkler pipe have an actual ceiling contact.
  box(.58, .46, 41.5, pipe, 7.12, H - .245, 9);
  mesh(new T.CylinderGeometry(.045, .045, 41.5, 8), pipe, -7.25, H - .16, 9, Math.PI / 2);
  for (const z of [-7, 1, 9, 17, 25]) {
    // A U-shaped clamp supports the pipe without a solid bracket through it.
    box(.16, .01, .15, steel, -7.25, H - .02, z);
    for (const side of [-1, 1]) box(.025, .18, .15, steel, -7.25 + side * .0575, H - .115, z);
    box(.115, .01, .15, steel, -7.25, H - .21, z);
    mesh(new T.CylinderGeometry(.018, .052, .20, 8), pipe, -7.25, H - .315, z);
    mesh(new T.ConeGeometry(.14, .05, 8), pipe, -7.25, H - .44, z, Math.PI);
  }

  const lights = [];
  for (const z of [-6, 6, 18, 27]) {
    const light = new T.PointLight(0xd8e9ed, 1.8, 14, 1.7);
    light.position.set(0, H - .42, z);
    root.add(light);
    lights.push(light);
  }
  applyWorldUVByMaterial(root, new Map([[steel, 1.2], [rubber, 0.75], [pipe, 1.4], [lens, 0.35]]));
  const baked = bakeStatic(T, root);
  root.traverse(o => { if (o.isMesh) ownedGeometries.add(o.geometry); });

  // A thin solid makes a raised round stop on the underside; the existing
  // Training impact batch uses its -Y normal for the mark.
  const solid = {
    minX: tg.origin.x + R.minX, maxX: tg.origin.x + R.maxX,
    minY: tg.origin.y + H - .025, maxY: tg.origin.y + H + .025,
    minZ: tg.origin.z + R.minZ, maxZ: tg.origin.z + R.maxZ,
    ceiling: true
  };
  tg.solids.push(solid);
  let on = true, firstPerson = false;
  const syncLights = () => {
    lens.emissiveIntensity = on ? .48 : 0;
    lens.color.setHex(on ? 0xbacbce : 0x424a4e);
    for (const light of lights) light.intensity = on && firstPerson ? 1.8 : 0;
  };
  function update(first) {
    const next = !!first;
    if (firstPerson === next) return;
    firstPerson = next;
    root.visible = next;
    syncLights();
  }
  function setLights(lit) {
    const next = !!lit;
    if (on === next) return;
    on = next;
    syncLights();
  }
  root.visible = false;
  syncLights();
  return {
    root, solid, baked, setLights, update,
    state: () => ({ visible: root.visible, on, firstPerson, baked, lightCount: lights.length }),
    dispose() {
      const index = tg.solids.indexOf(solid); if (index >= 0) tg.solids.splice(index, 1);
      for (const baffle of baffleSolids) {
        const i = tg.solids.indexOf(baffle); if (i >= 0) tg.solids.splice(i, 1);
      }
      root.removeFromParent();
      for (const geometry of ownedGeometries) geometry.dispose();
      for (const mat of ownedMaterials) mat.dispose();
      for (const tex of ownedTextures) tex.dispose();
      if (deckMap && !ownedTextures.includes(deckMap)) deckMap.dispose();
    }
  };
}
