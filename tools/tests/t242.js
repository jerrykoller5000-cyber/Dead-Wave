// t242 - GB-154 (Jerry, 2026-10-09: "the pistol['s] slide and frame are too short and do not reach the muzzle like a
// pistol should. The magazine does not actually fit into the grip like it should. Both regular and extended. The pistol
// suppressor is too skinny"). Measured on the pistol model in its own space (gun-local, before the game's scale):
//  - the slide's front face is flush with the barrel's crown (crown flush or just proud, never a bare barrel or a
//    muzzle device in front of the slide), the frame's dust cover runs on under the slide to near its front, the front
//    sight rides at the slide's front; the muzzle point (bullets, flash) is still at the crown;
//  - both magazines sit in the grip's magazine well: every part of the magazine above the grip's bottom is inside the
//    grip (side view outline and the rounded sides; nothing out through the front, back or sides), on the grip's rake,
//    the regular one's baseplate closes the grip's bottom and the extended one only comes out below it;
//  - the pistol can is about a quarter fatter than CL-95's 22 mm radius, on the bore, its back on the crown in front
//    of the slide. (t217 checks it against the barrel like the other five cans.)
// GT-20107 (Director approved14Nov, --review): the moving barrel is barrelAssembly.
// The shaft keeps the original grip limits. The complete round and its fixed feed
// head are instead checked on their actual follower/lip triangles and against the
// actual receiver, slide and barrel; neither ammo trimming nor hiding may pass.
// GB-172: the grip is narrower than GB-154's. Its outline is shapedGrip(-0.02, -0.08, 0.18, 0.074, 0.25, pistolGrip)
// in makePistolModel (studio/weapon-sidearms.js), rebuilt here; the slab is 46 mm wide with an 8 mm bevel.
// The centre line is unchanged, so the hand anchor stays. The akimbo left gun is a clone of this model.
(async () => {
  const T = window.TT, THREE = T.THREE, out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const mm = (v) => (v * 1000).toFixed(1) + ' mm';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const gun = T.weaponMeshes.pistol, ud = gun && gun.userData;
    if (!ud || !ud.slide || !ud.mag) { ok(false, 'no pistol model'); return out.join('\n'); }
    T.setGunSuppressor(gun, false);
    // every vertex of o's subtree, in the gun's own space (skip: subtrees to leave out)
    const verts = (root, skip = new Set()) => {
      gun.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(gun.matrixWorld).invert(), V = [], v = new THREE.Vector3();
      const walk = (o) => {
        if (skip.has(o) || o.visible === false) return;
        if (o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
          const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), p = o.geometry.attributes.position;
          for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(m); V.push([v.x, v.y, v.z]); }
        }
        for (const c of o.children) walk(c);
      };
      walk(root);
      return V;
    };
    const fx = new Set([ud.suppressor, ud.flash, ud.flashLight, ud.laser].filter(Boolean));
    const max = (V, f) => V.reduce((a, p) => Math.max(a, f(p)), -1e9);
    // 1) slide to the muzzle
    const mz = (ud.muzzleBase || ud.muzzleLocal).clone(), bx = mz.x, by = mz.y;
    // GT-20107: J151's barrel moves separately from the frame rails. Same limits.
    ok(!!ud.barrelAssembly, 'the independent barrel assembly exists');
    if (!ud.barrelAssembly) return out.join('\n');
    ok(!!ud.frame, 'the fixed frame assembly exists');
    if (!ud.frame) return out.join('\n');
    const slide = verts(ud.slide, fx), frame = verts(ud.barrelAssembly, fx), fixedFrame = verts(ud.frame, fx);
    const slideFront = max(slide, (p) => p[2]);
    const crown = max(frame.filter((p) => Math.hypot(p[0] - bx, p[1] - by) < 0.016), (p) => p[2]);
    ok(crown - slideFront >= -0.001 && crown - slideFront <= 0.006, `slide front (${mm(slideFront)}) flush with the barrel crown (${mm(crown)}): crown ${mm(crown - slideFront)} proud`);
    // Keep the original guard on the fixed frame as well as the now-moving barrel.
    const proud = [...fixedFrame, ...frame].filter((p) => p[2] > slideFront + 0.001);
    const proudR = proud.reduce((a, p) => Math.max(a, Math.hypot(p[0] - bx, p[1] - by)), 0);
    ok(proudR <= 0.016, `nothing but the barrel in front of the slide (widest part ahead of it ${mm(proudR)} from the bore)`);
    ok(Math.abs(mz.z - crown) <= 0.01 && Math.hypot(mz.x, mz.y - 0.05) < 1e-6 && Math.abs(mz.z - 0.32) < 1e-6, `the muzzle point is unchanged (0, 50, 320 mm) and at the crown (${mm(mz.z - crown)} ahead)`);
    const body = [];
    for (const c of gun.children) if (![ud.slide, ud.frame, ud.barrelAssembly, ud.mag, ...fx].includes(c)) body.push(...verts(c, fx));
    const dust = max(body.filter((p) => p[1] > -0.036 && p[1] < 0.016 && Math.abs(p[0]) < 0.04), (p) => p[2]);
    ok(dust >= slideFront - 0.06 && dust < slideFront, `the frame's dust cover runs on under the slide (front ${mm(dust)}, ${mm(slideFront - dust)} short of the slide's front)`);
    const topY = max(slide, (p) => p[1]);
    const front = max(slide.filter((p) => p[1] > topY - 0.008 && p[2] > 0), (p) => p[2]);
    ok(front >= slideFront - 0.05, `the front sight rides at the slide's front (${mm(slideFront - front)} back)`);
    // 2) magazines in the grip
    const cz = -0.02, cy = -0.08, h = 0.18, d = 0.1, rake = 0.3, sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;   // GB-179: 17 deg; GB-180 v2: d 0.1
    const P = [[0.00, 0.026], [0.08, 0.032], [0.20, 0.030], [0.30, 0.035], [0.42, 0.029], [0.54, 0.034], [0.68, 0.030], [0.84, 0.031], [0.96, 0.029], [1.00, 0.024], [1.00, -0.026], [0.96, -0.030], [0.70, -0.031], [0.40, -0.030], [0.18, -0.029], [0.08, -0.033], [0.05, -0.024]];   // GB-180 v2
    const poly = P.map(([u, v]) => { const uu = (u - 0.5) * h, vv = v * k; return [cz - uu * sr + vv * cr, cy - uu * cr - vv * sr]; });
    const uv = (z, y) => { const dz = z - cz, dy = y - cy; return [-(dz * sr + dy * cr) / h + 0.5, (dz * cr - dy * sr) / k]; };   // grip (u down the grip 0..1, v forward in outline units)
    const inside = (z, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [zi, yi] = poly[i], [zj, yj] = poly[j]; if ((yi > y) !== (yj > y) && z < (zj - zi) * (y - yi) / (yj - yi) + zi) c = !c; } return c; };
    const edge = (z, y) => { let m = 1e9; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[j], [bx2, by2] = poly[i], ex = bx2 - ax, ey = by2 - ay, t = Math.max(0, Math.min(1, ((z - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey))); m = Math.min(m, Math.hypot(z - ax - ex * t, y - ay - ey * t)); } return m; };
    const R = 0.009, HW = 0.026;   // GB-180: the grip is 52 mm wide, 9 mm bevel
    const halfW = (m) => HW - (m >= R ? 0 : R - Math.sqrt(R * R - (R - m) * (R - m)));
    const {visibleSurfaceGap, visiblePieces} = await import('/tools/tests/weapon-seating.js');
    const feedCheck = (g, label) => {
      const round = g.userData.magazineTopRound, head = g.userData.magFeed, shaft = g.userData.magStretch;
      ok(!!round && !!head && !!shaft, label + ': a complete round, fixed feed head and extending shaft exist');
      if (!round || !head || !shaft) return;
      const wasVisible = round.visible;
      try {
      g.userData.setMagazineRounds(0);
      ok(!round.visible, label + ': an empty magazine shows no top round');
      g.userData.setMagazineRounds(1);
      ok(round.visible, label + ': the loaded top round is visible during the feed checks');
      round.geometry.computeBoundingBox(); const rb = round.geometry.boundingBox;
      ok(Math.abs(rb.max.y-rb.min.y-.0324)<1e-6 && Math.abs(rb.max.x-.0061)<1e-6,
        label + ': the whole .45 cartridge retains its32.4mm length and6.1mm rim radius');
      // Bound the whole cartridge/head by the actual shaft mouth, not merely
      // a nearby contact. X/Z are unaffected by the shaft's length-only scale.
      g.updateMatrixWorld(true);
      const gunToShaft = new THREE.Matrix4().copy(shaft.matrixWorld).invert().multiply(g.matrixWorld);
      const inShaft = p => new THREE.Vector3(...p).applyMatrix4(gunToShaft).toArray();
      const shaftPoints = verts(shaft).map(inShaft), roofY = max(shaftPoints,p=>p[1]);
      const roof = shaftPoints.filter(p=>Math.abs(p[1]-roofY)<1e-6);
      const mouth = new THREE.Box3().setFromPoints(roof.map(p=>new THREE.Vector3(...p)));
      ok(roof.length>=4 && Number.isFinite(mouth.min.x) && mouth.max.x>mouth.min.x && mouth.max.z>mouth.min.z,
        label + ': the actual shaft has a finite feed mouth');
      const feedVertices = [...verts(round),...verts(head)];
      ok(feedVertices.length>0 && feedVertices.map(inShaft).every(p=>p[0]>=mouth.min.x-1e-6 && p[0]<=mouth.max.x+1e-6 &&
        p[2]>=mouth.min.z-1e-6 && p[2]<=mouth.max.z+1e-6),
        label + ': complete round and feed head stay inside the shaft feed mouth');
      // Read the two real receiver rails in gun space. Neither a protruding
      // head nor a sideways round can pass on proximity to the frame alone.
      const railFixture = g.userData.frame.clone(true);
      new THREE.Matrix4().copy(g.matrixWorld).invert().multiply(g.userData.frame.matrixWorld)
        .decompose(railFixture.position,railFixture.quaternion,railFixture.scale);
      railFixture.visible=true; railFixture.updateMatrixWorld(true);
      const railPieces=visiblePieces(railFixture), span=p=>p.box.max.z-p.box.min.z;
      const left=railPieces.filter(p=>p.box.max.x<0).sort((a,b)=>span(b)-span(a))[0];
      const right=railPieces.filter(p=>p.box.min.x>0).sort((a,b)=>span(b)-span(a))[0];
      ok(!!left && !!right && span(left)>.1 && span(right)>.1, label + ': both actual receiver rails bound the feed well');
      if(left && right)ok(feedVertices.every(p=>p[0]>=left.box.max.x+.0005-1e-6 && p[0]<=right.box.min.x-.0005+1e-6),
        label + ': entire feed assembly stays inside both receiver rails with0.5mm clearance');
      const touch = visibleSurfaceGap(round,head);
      ok(!touch.penetrating && touch.upperMm <= .5, label + ': the complete round is supported by its feed head (' + touch.upperMm.toFixed(3) + 'mm)');
      const join = visibleSurfaceGap(head,shaft);
      ok(!join.penetrating && join.upperMm <= .5, label + ': the fixed feed head stays seated on the shaft (' + join.upperMm.toFixed(3) + 'mm)');
      // Inspect actual rendered triangles in the feed head's own insertion space.
      // The follower crosses x=0; a separate returned lip retains each side.
      head.updateWorldMatrix(true,true); round.updateWorldMatrix(true,true);
      const flat = head.clone(true); flat.position.set(0,0,0); flat.rotation.set(0,0,0); flat.scale.set(1,1,1); flat.visible=true;
      const cartridge = round.clone(); cartridge.matrix.copy(new THREE.Matrix4().copy(head.matrixWorld).invert().multiply(round.matrixWorld));
      cartridge.matrix.decompose(cartridge.position,cartridge.quaternion,cartridge.scale); cartridge.visible=true;
      flat.updateMatrixWorld(true); cartridge.updateMatrixWorld(true);
      const pieces = visiblePieces(flat), sides=[pieces.filter(p=>p.box.max.x < -1e-5),pieces.filter(p=>p.box.min.x > 1e-5)];
      const floor = pieces.filter(p=>p.box.min.x < 0 && p.box.max.x > 0);
      ok(sides.every(p=>p.length===1) && floor.length===1, label + ': actual feed triangles have one follower and two returned lips');
      const physicalScale = head.getWorldScale(new THREE.Vector3()).x;
      for (const [i, parts] of [...sides,floor].entries()) {
        if (parts.length!==1) continue;
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(parts[0].faces.flatMap(f=>f.p.flatMap(p=>p.toArray())),3));
        const metal=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());
        const gap=visibleSurfaceGap(cartridge,metal,physicalScale);
        ok(!gap.penetrating && gap.upperMm<=.5, label + ': '+['left lip','right lip','follower'][i]+' supports/retains without cutting the round ('+gap.upperMm.toFixed(3)+'mm)');
        geometry.dispose(); metal.material.dispose();
      }
      for (const [name,part] of [['slide',g.userData.slide],['frame',g.userData.frame],['barrel',g.userData.barrelAssembly]]) {
        const ammoGap=visibleSurfaceGap(round,part), headGap=visibleSurfaceGap(head,part);
        ok(!ammoGap.penetrating && !headGap.penetrating, label + ': round and feed head do not cross the actual '+name);
        if(name==='frame')ok(ammoGap.upperMm<=10 && headGap.upperMm<=10,label+': round and feed head remain in the receiver feed area, within10mm of its frame');
      }
      } finally { g.userData.setMagazineRounds(wasVisible ? 1 : 0); }
    };
    const magCheck = async (g, label, ext) => {
      g.userData.mag.position.copy(g.userData.baseMagPos);
      if (g.userData.baseMagRot) g.userData.mag.rotation.copy(g.userData.baseMagRot);   // GB-179: a reload swing left over from startMatch tilted it (offline: in by 8.5 mm at rest)
      // The fixed feed head and live round have the stronger receiver/feed checks
      // above; the extending metal shaft keeps every original grip-envelope limit.
      const V = verts(g.userData.mag, new Set([g.userData.magazineTopRound,g.userData.magFeed].filter(Boolean)));
      let poke = -1e9, n = 0, low = -1e9, where = '';
      const fr = [], bk = [];
      for (const [x, y, z] of V) {
        const [u, v] = uv(z, y);
        low = Math.max(low, (u - 1) * h);
        if (u > 0.985) continue;
        n++;
        const m = inside(z, y) ? edge(z, y) : -edge(z, y);
        const pk = Math.max(0.001 - m, Math.abs(x) - (halfW(Math.max(0, m)) - 0.0005));
        if (pk > poke) { poke = pk; where = `at u ${u.toFixed(3)} v ${(v * k * 1000).toFixed(1)} mm x ${(x * 1000).toFixed(1)} mm`; }
        (u < 0.45 ? fr : bk).push(v * k);
      }
      ok(n > 8 && poke <= 0, `${label}: the magazine is inside the grip above its bottom (worst ${poke > 0 ? mm(poke) + ' out' : mm(-poke) + ' in'} ${where}; ${n} points)`);
      // the rake: the middle of the magazine's front-to-back extent is the same high in the grip as low in it (the
      // slabs' rounded corners make the caps' outer rings narrower, so compare the middles, not the faces)
      const mid = (A) => (Math.min(...A) + Math.max(...A)) / 2;
      if (!ext && fr.length && bk.length) {
        const drift = Math.abs(mid(fr) - mid(bk));
        ok(drift < 0.0015, `${label}: it sits on the grip's rake (its middle drifts ${mm(drift)} from top to bottom)`);
      }
      if (ext) {
        const st = g.userData.magStretch;
        ok(!!st && Math.abs(st.rotation.x - rake) < 0.01 && st.scale.x === 1 && st.scale.z === 1 && st.scale.y > 1.3, `${label}: it grows only down its own axis, on the grip's rake (tilt ${st ? st.rotation.x.toFixed(3) : '-'}, scale ${st ? st.scale.toArray().map((x) => x.toFixed(2)).join('/') : '-'})`);
      }
      if (!ext) ok(low >= 0 && low <= 0.015, `${label}: the regular baseplate closes the grip's bottom (${mm(low)} below it)`);
      else ok(low >= 0.04, `${label}: the extended magazine comes out below the grip (${mm(low)} below it)`);
      feedCheck(g,label);
      return low;
    };
    const lowR = await magCheck(gun, 'regular', false);
    T.addCash(99999);
    if (!T.weaponMods('pistol').ext) { try { T.buyExtMag('pistol'); } catch (e) { if (typeof startMatch === 'function') { await startMatch(T, 'PistolFit'); T.addCash(99999); T.buyExtMag('pistol'); } else throw e; } }
    T.armoryDbg.fit('pistol', 'ext', true);
    await wait(50);
    const lowE = await magCheck(gun, 'extended', true);
    ok(lowE - lowR >= 0.04, `extended reaches ${mm(lowE - lowR)} further below than the regular one`);
    T.armoryDbg.fit('pistol', 'ext', false);
    // 3) the can
    const S = T.SUPPRESSOR.pistol, can = ud.suppressor;
    ok(S.r >= 0.0264 && S.r <= 0.0286, `the pistol can is fatter: ${mm(S.r * 2)} across (CL-95 had 44.0 mm; +${Math.round((S.r / 0.022 - 1) * 100)}%)`);
    ok(Math.hypot(can.position.x - bx, can.position.y - by) < 1e-6, 'the can is on the bore line');
    ok(can.position.z >= slideFront - 0.0005 && can.position.z <= crown + 0.001, `its back face (${mm(can.position.z)}) is on the crown, in front of the slide (${mm(slideFront)})`);
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
