// GP-20108: an actual downward-facing range ceiling. The hangar already has a
// trussed 24 m deck, and the holding passage already has a solid 6.3 m roof.
import { bakeStatic } from '../world/bake.js';

export function createTrainingCeiling(T, tg, layout) {
  const { RANGE: R, WALL_H: H } = layout;
  const root = new T.Group();
  root.name = 'training-range-ceiling';
  tg.group.add(root);
  const ownedGeometries = new Set(), ownedMaterials = new Set();
  const material = spec => { const m = new T.MeshStandardMaterial(spec); ownedMaterials.add(m); return m; };
  // A little reflected safety light keeps the deck legible when the room's
  // fixtures are off; it remains much darker than the powered range.
  const concrete = material({ color: 0x7d8588, emissive: 0x4a5358, emissiveIntensity: .32,
    roughness: .89, metalness: .02, side: T.FrontSide });
  const steel = material({ color: 0x49545a, roughness: .63, metalness: .43 });
  const rubber = material({ color: 0x343a3b, roughness: .91 });
  const pipe = material({ color: 0x737d80, roughness: .62, metalness: .46 });
  const lens = material({ color: 0xbacbce, emissive: 0xc9dce0, emissiveIntensity: .48, roughness: .42 });
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

  // The underside has no top face: the overhead third-person camera sees into
  // the range. These full-span panels seat on the wall tops at y=6.
  const deck = mesh(new T.PlaneGeometry(R.maxX - R.minX, R.maxZ - R.minZ), concrete,
    (R.minX + R.maxX) / 2, H - .015, (R.minZ + R.maxZ) / 2, Math.PI / 2);
  deck.receiveShadow = false;
  for (const z of [-9, -3, 3, 9, 15, 21, 27]) {
    box(15.8, .07, .12, steel, 0, H - .06, z);
  }

  // Across-lane safety baffles hang from the deck; the thick rubber face is
  // toward the firing line. Both long service runs sit outside the plate lanes.
  for (const z of [-.2, 5.4, 11, 16.6, 22.2, 27.8]) {
    box(13.7, .26, .20, steel, 0, H - .145, z);
    box(13.7, 1.00, .18, steel, 0, H - .66, z, -.12);
    box(13.5, .82, .07, rubber, 0, H - .67, z - .115, -.12);
  }

  // Caged linear fixtures sit between baffles, with lenses kept on one shared
  // material so the wall switch can extinguish all of them together.
  for (const z of [-8, -4.1, 2.5, 8.1, 13.7, 19.3, 24.9]) {
    box(7.4, .13, .56, steel, 0, H - .08, z);
    box(7.1, .018, .43, lens, 0, H - .155, z);
  }

  // Galvanized supply duct and sprinkler pipe have an actual ceiling contact.
  box(.58, .46, 41.5, pipe, 7.12, H - .245, 9);
  box(.68, .07, 41.5, steel, 7.12, H - .045, 9);
  mesh(new T.CylinderGeometry(.045, .045, 41.5, 8), pipe, -7.25, H - .16, 9, Math.PI / 2);
  for (const z of [-7, 1, 9, 17, 25]) {
    box(.16, .24, .15, pipe, -7.25, H - .12, z);
    mesh(new T.CylinderGeometry(.018, .052, .20, 8), pipe, -7.25, H - .36, z);
    mesh(new T.ConeGeometry(.14, .05, 8), pipe, -7.25, H - .49, z, Math.PI);
  }

  const lights = [];
  for (const z of [-6, 6, 18, 27]) {
    const light = new T.PointLight(0xd8e9ed, 1.8, 14, 1.7);
    light.position.set(0, H - .42, z);
    root.add(light);
    lights.push(light);
  }
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
      root.removeFromParent();
      for (const geometry of ownedGeometries) geometry.dispose();
      for (const mat of ownedMaterials) mat.dispose();
    }
  };
}
