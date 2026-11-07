// t333 - GB-297 (J14, D-119): every gun's small hardware (rivets, screws, pins, bolts,
// dials, caps) has its bounds touching a bigger part's. Builds each gun through
// weaponModelContext; finishGun is wrapped so the check runs BEFORE the mesh merge.
// Optics (weapon-optics.js) need MeshPhysicalMaterial; fakethree has none and its
// module namespace is sealed, so optics stay covered by qa/2026-11-07-GB-297/audit.mjs.
(async () => {
  const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const { weaponModelContext } = await import('/tools/marine-inspector.js?' + Date.now());
    const L = await import('/studio/weapon-longarms.js?' + Date.now());
    const S = await import('/studio/weapon-sidearms.js?' + Date.now());
    const H = await import('/studio/weapon-heavy.js?' + Date.now());
    const THREE = (await import('three'));

    const MAKERS = {
      pistol: S.makePistolModel, revolver: S.makeRevolverModel, uzi: S.makeUziModel,
      m4: L.makeM4Model, ak: L.makeAkModel, aa12: L.makeAa12Model,
      shotgun: L.makeShotgunModel, sniper: L.makeSniperModel,
      minigun: H.makeMinigunModel, launcher: H.makeLauncherModel,
      flamer: H.makeFlamerModel, chainsaw: H.makeChainsawModel,
      m240: (ctx) => H.makeM240Model(ctx, false), mortar: (ctx) => H.makeMortarModel(ctx)
    };
    const SKIP_NAME = /flash|laser|flare|suppressor|light/i;
    const EPS = 0.0015, SMALL_MAX = 0.018;

    function aabbOf(mesh) {
      mesh.updateWorldMatrix(true, false);
      return new THREE.Box3().setFromObject(mesh);
    }
    function vol(b) {
      const s = b.getSize(new THREE.Vector3());
      return Math.max(0, s.x) * Math.max(0, s.y) * Math.max(0, s.z);
    }
    function longest(b) {
      const s = b.getSize(new THREE.Vector3());
      return Math.max(s.x, s.y, s.z);
    }
    function touches(a, b, eps) {
      return a.clone().expandByScalar(eps).intersectsBox(b);
    }

    function auditGun(name, gun) {
      gun.updateMatrixWorld(true);
      const meshes = [];
      gun.traverse((o) => {
        if (!o.isMesh) return;
        if (o.name && SKIP_NAME.test(o.name)) return;
        const mat = o.material;
        if (mat && mat.transparent && mat.opacity === 0) return;
        const b = aabbOf(o);
        if (b.isEmpty()) return;
        meshes.push({ mesh: o, box: b, vol: vol(b), long: longest(b) });
      });
      const smalls = meshes.filter((m) => m.long <= SMALL_MAX && m.vol > 0);
      const bigs = meshes.filter((m) => m.long > SMALL_MAX);
      const floaters = [];
      for (const s of smalls) {
        let any = false;
        for (const b of bigs) {
          if (b.mesh === s.mesh) continue;
          if (touches(s.box, b.box, EPS)) { any = true; break; }
        }
        if (!any) {
          const c = s.box.getCenter(new THREE.Vector3());
          floaters.push(c.x.toFixed(3) + ',' + c.y.toFixed(3) + ',' + c.z.toFixed(3));
        }
      }
      return { small: smalls.length, float: floaters.length, sample: floaters.slice(0, 3) };
    }

    const ctxBase = weaponModelContext();
    let gunsChecked = 0, totalFloat = 0;
    for (const [name, make] of Object.entries(MAKERS)) {
      let captured = null;
      const ctx = {
        ...ctxBase,
        finishGun(gun) {
          captured = auditGun(name, gun);
          return ctxBase.finishGun(gun);
        }
      };
      make(ctx);
      if (!captured) { ok(false, name + ': finishGun never ran'); continue; }
      gunsChecked++;
      totalFloat += captured.float;
      ok(captured.float === 0,
        name + ': every small part touches a bigger one (' + captured.small + ' small)' +
        (captured.float ? ' FLOAT ' + captured.float + ' at ' + captured.sample.join(' | ') : ''));
    }

    ok(gunsChecked === 14, 'checked all 14 guns (' + gunsChecked + ')');
    ok(totalFloat === 0, 'no floating hardware across the set (' + totalFloat + ')');
  } catch (e) {
    ok(false, 'threw ' + (e && e.stack || e));
  }
  return out.join('\n');
})();