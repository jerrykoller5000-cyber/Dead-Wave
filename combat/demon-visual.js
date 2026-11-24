// GP-19921: fitted demon sculpture, built on the existing zombie joints.
// All surfaces go through the normal concept batching/cache/skinning path.
export function sculptDemon(A, T, g, s, materials) {
  const u = g.userData, { skin, shadow, mouth, teeth, hair, cloth } = materials;
  const armor = A.mat(0x292a29, false, .35, 'metal'), edge = A.mat(0x685b47, false, .4, 'metal');
  const fire = u.emberMat;
  const keep = new Set(u.eyes), old = [];
  g.traverse(o => { if (o.isMesh && !keep.has(o)) old.push(o); });
  for (const o of old) o.removeFromParent();

  function geometry(parent, material, positions, indices) {
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(positions.map(v => v * s), 3));
    geo.setIndex(indices); geo.computeVertexNormals();
    return A.put(parent, geo, material);
  }
  // Continuous rounded sections: no stacked spheres or exposed cylinder ends.
  function body(parent, material, rings, sides = 10) {   // D-242 P1 #7 (Q3): 8 -> 12 sides, round silhouettes; P2 (Q3): 10 on the limbs and small parts, 12 kept on the torso, pelvis and skull (pays for P2's new parts)
    const pos = [], idx = [];
    for (const [y, rx, rz, cz = 0] of rings) for (let i = 0; i < sides; i++) {
      const a = i / sides * Math.PI * 2;
      pos.push(Math.sin(a) * rx, y, cz + Math.cos(a) * rz);
    }
    for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < sides; i++) {
      const a = j * sides + i, b = j * sides + (i + 1) % sides;
      idx.push(a, b, a + sides, b, b + sides, a + sides);
    }
    for (const end of [0, rings.length - 1]) {
      const c = pos.length / 3; pos.push(0, rings[end][0], rings[end][3] || 0);
      for (let i = 0; i < sides; i++) {
        const a = end * sides + i, b = end * sides + (i + 1) % sides;
        idx.push(c, ...(end ? [a, b] : [b, a]));
      }
    }
    return geometry(parent, material, pos, idx);
  }
  // A single swept surface makes each horn/finger/claw; no rod-to-rod seams.
  function sweep(parent, material, points, radius, segments = 5, sides = 4) {
    segments = Math.min(segments, radius > .07 ? 8 : 6); sides = Math.min(sides, radius > .06 ? 8 : 5);   // D-242 P1 #8 (Q3): the horns 8-sided, the claws stay 5
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    const pos = [], idx = [], normal = new T.Vector3(), binormal = new T.Vector3();
    for (let j = 0; j <= segments; j++) {
      const t = j / segments, p = curve.getPointAt(t), tangent = curve.getTangentAt(t), r = radius * Math.pow(1 - t, .8) + .0005;
      // Parallel-transport a ring frame; also supported by the headless math engine.
      if (j === 0) normal.set(0, Math.abs(tangent.y) < .9 ? 1 : 0, Math.abs(tangent.y) < .9 ? 0 : 1).cross(tangent).normalize();
      else normal.addScaledVector(tangent, -normal.dot(tangent)).normalize();
      binormal.crossVectors(tangent, normal).normalize();
      for (let i = 0; i < sides; i++) {
        const a = i / sides * Math.PI * 2;
        const v = p.clone().addScaledVector(normal, Math.cos(a) * r).addScaledVector(binormal, Math.sin(a) * r);
        pos.push(v.x, v.y, v.z);
        if (j < segments) { const x = j * sides + i, y = j * sides + (i + 1) % sides; idx.push(x, y, x + sides, y, y + sides, x + sides); }
      }
    }
    for (const end of [0, segments]) {
      const p = curve.getPointAt(end / segments), c = pos.length / 3; pos.push(p.x,p.y,p.z);
      for (let i = 0; i < sides; i++) { const a = end * sides + i, b = end * sides + (i + 1) % sides; idx.push(c, ...(end ? [a,b] : [b,a])); }
    }
    return geometry(parent, material, pos, idx);
  }
  // Curved closed armor panels fitted to the anatomy, with a recessed collar.
  function plate(parent, material, rows, thickness = .018) {
    const pos = [], idx = [], n = 6, count = rows.length * (n + 1);
    for (const back of [false, true]) for (const [y, width, z, wrap = .04] of rows) for (let i = 0; i <= n; i++) {
      const x = i / n * 2 - 1;
      pos.push(x * width, y, z - wrap * x * x - (back ? thickness : 0));
    }
    for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i, b = a + n + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
      idx.push(a + count, b + count, a + 1 + count, b + count, b + 1 + count, a + 1 + count);
    }
    const rim = [];
    for (let i = 0; i <= n; i++) rim.push(i);
    for (let j = 1; j < rows.length; j++) rim.push(j * (n + 1) + n);
    for (let i = n - 1; i >= 0; i--) rim.push((rows.length - 1) * (n + 1) + i);
    for (let j = rows.length - 2; j > 0; j--) rim.push(j * (n + 1));
    for (let i = 0; i < rim.length; i++) { const a = rim[i], b = rim[(i + 1) % rim.length]; idx.push(a, a + count, b, b, a + count, b + count); }
    return geometry(parent, material, pos, idx);
  }

  // D-242 P1 #5 (Q1): the loincloth was a band with a flat shelf for a bottom; now a short band with its hem rolled in,
  // a leather belt with a buckle plate over its top, and flaps front and back (the thighs swing clear of them).
  body(u.hips, cloth, [[.0,.19,.14],[.015,.228,.162],[.05,.24,.168],[.12,.25,.17],[.19,.22,.15]]);
  body(u.hips, hair, [[.145,.243,.167],[.155,.258,.18],[.195,.248,.171],[.205,.226,.153]]);
  plate(u.hips, edge, [[.142,.045,.186],[.16,.055,.192],[.198,.055,.184],[.21,.045,.176]], .012);
  // D-242 P2 #8 (Q1): the thighs hung wider than the hips, plugged in under the band; a pelvis and two glutes now carry
  // the hip out over the thigh tops (the legs swing inside them; the hip join blends the rest).
  body(u.hips, skin, [[-.15,.06,.05,-.01],[-.12,.2,.13,-.01],[-.06,.31,.165,-.015],[.0,.30,.165,-.01],[.05,.24,.15]], 12);
  for (const side of [-1, 1]) { const gl = body(u.hips, skin, [[-.17,.02,.02,-.085],[-.14,.085,.07,-.1],[-.075,.118,.09,-.108],[-.005,.11,.085,-.1],[.035,.05,.04,-.088]]); gl.position.x = side*.118*s; }
  body(u.torso, skin, [[-.09,.19,.13],[.01,.23,.16],[.13,.28,.18],[.26,.34,.21],[.37,.35,.20],[.44,.32,.175],[.50,.28,.15],[.56,.235,.15,-.005],[.62,.19,.125,-.025],[.68,.14,.10,-.03]], 12);   // D-242 P1 #1 (Q1): a trapezius slope from the shoulders into the neck (was a notch)
  plate(u.torso, armor, [[.05,.055,.19],[.12,.19,.225],[.25,.29,.253],[.35,.30,.252],[.42,.25,.225],[.455,.20,.185]], .025);
  // D-242 P1 #9 (Q4): a rolled rim along the breastplate's collar and its point (it was a flat cut sheet)
  A.path(u.torso, edge, [[-.20,.452,.147],[-.10,.456,.176],[0,.458,.186],[.10,.456,.176],[.20,.452,.147]].map(p=>[p[0],p[1],p[2]+.004]), .011, .011);
  A.path(u.torso, edge, [[-.19,.122,.186],[-.10,.075,.205],[0,.05,.193],[.10,.075,.205],[.19,.122,.186]].map(p=>[p[0],p[1],p[2]+.004]), .011, .011);
  // D-242 P1 #6 (Q4): a spine ridge down the bare back, and an armoured socket round each back spike's root
  for (let j = 0; j < 7; j++) { const y = .06 + j*.064, z = -[.166,.183,.202,.216,.218,.21,.187][j]; body(u.torso, skin, [[y-.04,.004,.003,z+.004],[y-.024,.034,.008,z-.004],[y+.006,.04,.012,z-.008],[y+.03,.026,.008,z-.004],[y+.042,.004,.003,z+.004]], 6); }   // vertebrae (D-242 P2, Q3: 6-sided, under a ridge they read the same), overlapping: a ridge
  // Inlaid heat channels follow the breastplate instead of floating over blocks.
  for (const side of [-1, 1]) {
    A.path(u.torso, fire, [[side*.035,.115,.227],[side*.095,.21,.255],[side*.18,.30,.247],[side*.225,.382,.23]], .008);
    A.path(u.torso, edge, [[side*.055,.053,.195],[side*.194,.126,.196],[side*.287,.25,.218],[side*.295,.35,.217],[side*.245,.421,.19]], .009);
    const arm = side < 0 ? u.armLG : u.armRG, elbow = arm.userData.elbowG;
    const leg = side < 0 ? u.legLG : u.legRG, shin = leg.userData.shinG;
    // D-242 P2 #7 (Q1): a deltoid and lat mass from the chest out under the pauldron: the arm no longer hangs off the
    // torso's side with daylight at the armpit (it runs along x: rings are [out, height, depth])
    { const d = body(u.torso, skin, [[.12,.13,.15,-.01],[.24,.15,.165,-.015],[.36,.135,.15,-.02],[.45,.10,.115,-.015],[.50,.05,.06,-.01]]);
      d.position.set(0, .37*s, 0); d.rotation.z = -side*Math.PI/2; }
    arm.userData.upper = body(arm, skin, [[-.36,.082,.085],[-.30,.09,.09],[-.22,.127,.135],[-.12,.15,.15],[-.02,.16,.15],[.06,.145,.13],[.105,.085,.09]]);
    body(elbow, skin, [[-.40,.10,.055,.02],[-.35,.113,.067,.02],[-.29,.08,.068,.01],[-.22,.092,.082],[-.12,.125,.108],[-.04,.12,.108],[.035,.085,.085]]);
    // D-242 P1 #2 (Q1): the pauldron was a tube with flat ends; now a dome over the shoulder, its lip rolled in to the arm
    body(arm, armor, [[-.03,.163,.153],[-.012,.18,.17],[.015,.186,.176],[.07,.172,.162],[.115,.136,.128],[.15,.08,.078],[.168,.022,.022]]);
    for (let j = 0; j < 2; j++) sweep(arm, edge, [[side*.075,.105,-.09+j*.17],[side*.14,.20,-.10+j*.18],[side*.19,.30,-.13+j*.19]], .045, 8);
    // D-242 P1 #10 (Q1): the bracer's ends taper into the wrist and the elbow (they were cut square: a step)
    plate(elbow, armor, [[-.295,.045,.068],[-.28,.068,.079],[-.23,.095,.102],[-.12,.117,.122],[-.055,.10,.113],[-.035,.06,.1]]);
    // D-242 P1 #4 (Q1): an elbow, so the forearm's top and the upper arm's end never show a seam when it bends
    body(elbow, skin, [[-.07,.035,.035],[-.05,.082,.078],[-.01,.1,.094],[.03,.09,.086],[.06,.04,.04]]);
    // Claws turn BACK from the fingertips (negative local Z), opposite the old hooks.
    for (let f = 0; f < 4; f++) {
      const x = (f - 1.5) * .047, len = f === 0 || f === 3 ? .075 : .105;
      sweep(elbow, skin, [[x,-.36,.025],[x,-.415,.03],[x,-.42-len,.012]], .026, 8, 4);   // D-242 P2 (Q3): fingers 4-sided under the claws
      sweep(elbow, hair, [[x,-.405-len,.015],[x,-.455-len,-.015],[x*.96,-.48-len,-.075],[x*.9,-.455-len,-.13]], .020, 12);
    }
    // D-242 P2 #10 (Q1): the back of the hand: a knuckle ridge the four fingers grow from (they came out of the forearm's end)
    A.path(elbow, skin, [[-.085,-.372,.038],[-.03,-.38,.046],[.03,-.38,.046],[.085,-.372,.038]], .03, .028);
    sweep(elbow, skin, [[side*.082,-.325,.02],[side*.139,-.38,.02],[side*.12,-.425,-.015]], .036, 10, 4);
    sweep(elbow, hair, [[side*.12,-.415,-.01],[side*.10,-.46,-.045],[side*.075,-.445,-.10]], .021, 10);
    // D-242 P2 #9 (Q1): the thigh's end runs down over the shin's top and the calf has a belly: no ring seam behind the knee
    leg.userData.thigh = body(leg, skin, [[-.41,.085,.085,-.005],[-.37,.098,.098,-.008],[-.30,.11,.13],[-.16,.147,.16],[-.02,.145,.14],[.06,.12,.11]]);
    body(shin, skin, [[-.38,.075,.07,.015],[-.29,.075,.082,-.005],[-.19,.105,.12,-.025],[-.08,.112,.122,-.02],[.0,.105,.112,-.012],[.04,.08,.08,-.005]]);
    plate(shin, armor, [[-.32,.068,.086],[-.24,.084,.11],[-.13,.10,.125],[0,.098,.12],[.045,.04,.095]]);
    // D-242 P1 #3 (Q1): a knee (skin) and a domed knee cop over the greave's top edge: no seam or shelf at the knee
    body(shin, skin, [[-.06,.04,.04],[-.03,.1,.1],[.02,.112,.11],[.06,.1,.098],[.09,.05,.05]]);
    body(shin, armor, [[-.005,.004,.003,.125],[.012,.07,.035,.128],[.05,.082,.042,.125],[.088,.064,.032,.112],[.105,.004,.003,.105]], 10);
    body(shin, hair, [[-.415,.10,.13,.055],[-.39,.13,.175,.075],[-.34,.115,.145,.055],[-.29,.071,.065,.005]]);
    for (let f = 0; f < 3; f++) sweep(shin, edge, [[(f-1)*.069,-.37,.15],[(f-1)*.075,-.39,.215],[(f-1)*.08,-.40,.26]], .026, 7, 4);
    for (let j = 0; j < 3; j++) sweep(u.torso, armor, [[side*.18,.20+j*.10,-.15],[side*.23,.27+j*.10,-.24],[side*.24,.36+j*.10,-.29]], .043, 8);
    for (let j = 0; j < 3; j++) { const y0 = .215 + j*.10, sk = body(u.torso, armor, [[y0-.042,.004,.003,-.17],[y0-.032,.036,.02,-.178],[y0,.048,.028,-.184],[y0+.032,.036,.02,-.178],[y0+.042,.004,.003,-.17]], 6);
      sk.position.x = side*.188*s; }
    A.rag(u.hips, cloth, side*.09,.13,.17,.15,.24,side*.08);
    A.rag(u.hips, cloth, side*.085,.13,-.165,.14,.22,-side*.06);   // D-242 P1 #5: the back flaps
  }
  // One skull and jaw silhouette; brow and cheek ridges grow out of that surface.
  // D-242 P2 #1 (Q4): the skull was an egg (a tall dome over a small face); now a heavy jaw pushed forward, wide cheeks
  // and a lower, flatter crown
  body(u.head, skin, [[-.19,.05,.05,.05],[-.165,.105,.085,.045],[-.11,.15,.115,.03],[-.03,.172,.135,.005],[.05,.185,.145,-.015],[.12,.178,.132,-.03],[.165,.148,.112,-.04],[.195,.10,.082,-.045],[.21,.04,.038,-.045]], 12);
  A.egg(u.head,mouth,0,-.105,.123,.20,.075,.055);
  for (const side of [-1, 1]) {
    A.egg(u.head,shadow,side*.087,.042,.123,.123,.067,.032,-side*.15);
    // D-242 P2 #2 (Q4): the brows were black strips laid on the face; now a bony ridge of the skull over deep sockets
    sweep(u.head, skin, [[side*.012,.066,.16],[side*.075,.097,.156],[side*.165,.083,.108]], .033, 10);
    // D-242 P2 #6 (Q4): cheekbones under the eyes and a jaw muscle at each corner of the mouth (was one thin cord)
    A.egg(u.head, skin, side*.112, .012, .128, .115, .052, .07, side*.32);
    sweep(u.head, skin, [[side*.158,.02,.07],[side*.14,-.055,.128],[side*.105,-.13,.125]], .032, 10);
    // D-242 P2 #4 (Q4): pointed ears swept back under the horns
    sweep(u.head, skin, [[side*.16,.02,-.005],[side*.215,.06,-.035],[side*.265,.1,-.075]], .033, 8);
    // D-242 P2 #5 (Q1): a bony boss the horn grows out of (it went straight into the smooth skull)
    sweep(u.head, skin, [[side*.13,.118,-.03],[side*.17,.16,-.042],[side*.21,.19,-.054]], .066, 8);
    sweep(u.head, hair, [[side*.13,.16,-.03],[side*.27,.205,-.055],[side*.40,.30,-.09],[side*.41,.41,-.10],[side*.34,.48,-.08]], .087, 24, 10);
    // A single swept pale tip joins flush to the dark horn.
    sweep(u.head, teeth, [[side*.41,.41,-.10],[side*.39,.445,-.095],[side*.34,.48,-.08]], .021, 8, 8);
    A.spike(u.head,teeth,[side*.072,-.075,.155],[side*.067,-.125,.164],.014);
  }
  for (const eye of u.eyes) { eye.position.z = .15 * s; eye.scale.set(.65,.34,.4); }
  // D-242 P2 #3 (Q4): a broad flat nose with flared nostrils (was a thin beak)
  sweep(u.head, skin, [[0,.075,.158],[0,.03,.174],[0,-.022,.181]], .032, 8);
  for (const side of [-1, 1]) { A.egg(u.head, skin, side*.028, -.032, .17, .052, .03, .032); }
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * .024;
    A.spike(u.head,teeth,[x,-.075,.153],[x,-.096,.163],.009);
    A.spike(u.head,teeth,[x,-.137,.15],[x,-.117,.16],.008);
  }
}
