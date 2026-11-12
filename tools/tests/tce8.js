// tce8 - CE-8 (Claude 5; from ChatGPT 2's GT-20076 #167, 12 Nov): the minigun's reload at the eye carried the right-mounted
// drum across the receiver to the left (x +0.140 to -0.465 at half way) and 3 of 48 phases crossed the fitted right side
// plate. Held at 48 phases (TT.reloadClipDbg.hold), the first-person drum (the view gun's copy of the world ammoBox) is set
// on a freshly built minigun (the real artwork, unmerged) and measured with the seating audit (tools/tests/weapon-seating.js):
// - 0 of 48 phases: the drum through the right plate or its two fitted strips (visibleSurfaceGap: penetrating);
// - the drum stays on its own side: its centre never inboard of the rest (x >= rest - 1 mm) while it is shown;
// - the swap is seen: the drum off in the palm through several phases, away (hidden) through a few;
// - the world (third-person) drum unchanged: 0 of 48 crossing as before;
// - the reload starts and ends with the drum seated (no jump), and it is shown at its start and end.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    if (!T.reloadClipDbg || !T.viewmodelDbg || !T.setViewFirstDbg || !T.inspectHost || !T.stepFrame) { ok(false, 'the hooks are there (reloadClipDbg, viewmodelDbg, setViewFirstDbg, inspectHost, stepFrame)'); return out.join('\n'); }
    await startMatch(T, 'CE8');
    T.clearZombies && T.clearZombies(); T.setHp(1e6); T.grantAllWeapons();
    const G = T.THREE || window.THREE;
    const take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } await until(() => !T.getSwapDbg || T.getSwapDbg().swapT <= 0, 3000); await wait(300); return T.getCurrentWeapon() === w; };
    ok(await take('minigun'), 'the minigun in hand');
    T.setViewFirstDbg(true);
    ok(await until(() => { T.stepFrame(1 / 30); const v = T.viewmodelDbg(); return v && v.info.active && v.info.raise > 0.99; }, 20000), 'first person: the view gun is up');
    const { makeMinigunModel } = await import(new URL('/studio/weapon-heavy.js', location.origin).href);
    const { minigunSidePanelGeometry } = await import(new URL('/studio/weapon-minigun-panel.js', location.origin).href);
    const { visibleSurfaceGap } = await import(new URL('/tools/tests/weapon-seating.js', location.origin).href);
    // the real artwork, built unmerged so the right plate and its strips are their own meshes
    const ctx = T.inspectHost().builders.weaponContext();
    const model = makeMinigunModel({ ...ctx, finishGun: (g) => g, mergeRigidMeshes: () => {} });
    model.scale.copy(T.weaponMeshes.minigun.scale);
    const nPlate = minigunSidePanelGeometry(G).attributes.position.count;
    const nUp = minigunSidePanelGeometry(G, 'upperStrip').attributes.position.count, nLo = minigunSidePanelGeometry(G, 'lowerStrip').attributes.position.count;
    const kids = model.children.filter((o) => o.isMesh && o.position.x >= 0);
    const plate = kids.find((o) => o.geometry.attributes.position.count === nPlate);
    const strips = kids.filter((o) => o !== plate && (o.geometry.attributes.position.count === nUp || o.geometry.attributes.position.count === nLo));
    const holder = model.userData.ammoBox, drum = holder && holder.children[0];
    ok(!!plate && strips.length === 2 && !!drum, 'the right plate, its two strips and the drum found on the built gun (' + (plate ? 'plate' : 'no plate') + ', ' + strips.length + ' strips)');
    if (!plate || !drum) return out.join('\n');
    const rest = { p: holder.position.clone(), q: holder.quaternion.clone(), s: holder.scale.clone() };
    const world = T.weaponMeshes.minigun.userData.ammoBox;
    const V = T.viewmodelDbg();
    const eye = new Map(V.gun.pairs).get(world);
    ok(!!eye, 'the first-person drum is the view copy of the world ammoBox');
    if (!eye) return out.join('\n');
    const MPU = 1.8 / 1.655;
    const measure = (drawn) => {
      holder.position.copy(drawn.position); holder.quaternion.copy(drawn.quaternion); holder.scale.copy(drawn.scale);
      model.updateMatrixWorld(true);
      const g = [plate, ...strips].map((m) => visibleSurfaceGap(drum, m, MPU));
      holder.position.copy(rest.p); holder.quaternion.copy(rest.q); holder.scale.copy(rest.s);
      return { crossed: g.some((x) => x.penetrating), mm: Math.min(...g.map((x) => x.upperMm)) };
    };
    T.setAmmoDbg && T.setAmmoDbg('minigun', 0); T.startReload && T.startReload();
    const recs = [];
    try {
      for (let i = 0; i < 48; i++) {
        const phase = i / 48; T.reloadClipDbg.hold(phase);
        for (let j = 0; j < 3; j++) T.stepFrame(1 / 60);
        const st = T.getReloadDbg ? T.getReloadDbg() : null;
        if (i === 0) ok(!!st && st.weapon === 'minigun', 'a minigun reload is running');
        const e = measure(eye), w = measure(world);
                recs.push({ phase, vis: eye.visible !== false, e, w, x: eye.position.x, place: V.info.handPlace, ms: V.info.magState });
      }
    } finally { T.reloadClipDbg.hold(null); }
    const eyeCross = recs.filter((r) => r.vis && r.e.crossed), worldCross = recs.filter((r) => r.w.crossed);
    info('eye drum per phase: ' + recs.map((r) => (r.phase * 48 | 0) + ':' + (r.vis ? (r.e.crossed ? 'X' : '') + r.x.toFixed(3) : 'hid')).join(' '));
    ok(eyeCross.length === 0, 'at the eye 0 of 48 reload phases put the drum through the right plate or its strips (' + eyeCross.length + ': ' + eyeCross.map((r) => r.phase * 48 | 0).join(',') + ')');
    ok(worldCross.length === 0, 'third person (the world drum) 0 of 48 crossing, as before (' + worldCross.length + ')');
    const inboard = recs.filter((r) => r.vis && r.x < rest.p.x - 0.001);
    ok(inboard.length === 0, 'the drum stays on its own side: never inboard of its seat while shown (' + inboard.map((r) => (r.phase * 48 | 0) + ':' + r.x.toFixed(3)).join(' ') + ')');
    ok(recs[0].vis && recs[47].vis && Math.abs(recs[0].x - rest.p.x) < 1e-4 && Math.abs(recs[47].x - rest.p.x) < 1e-4, 'seated and shown at the start and the end of the reload');
    const shownOff = recs.filter((r) => r.vis && r.ms === 'hand').length, hidden = recs.filter((r) => !r.vis).length;
    ok(shownOff >= 8 && hidden >= 3, 'the swap is seen: the drum off in the palm in ' + shownOff + ' phases, away (hidden) in ' + hidden);
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { ok(false, 'threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' / ') : e)); }
  return out.join('\n');
})();
