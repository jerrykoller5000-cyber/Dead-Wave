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
  function body(parent, material, rings, sides = 8) {
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
    segments = Math.min(segments, radius > .07 ? 8 : 6); sides = Math.min(sides, 5);
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

  body(u.hips, cloth, [[-.035,.17,.13],[.02,.23,.16],[.12,.25,.17],[.19,.22,.15]]);
  body(u.torso, skin, [[-.09,.19,.13],[.01,.23,.16],[.13,.28,.18],[.26,.34,.21],[.37,.35,.20],[.44,.31,.17],[.50,.24,.135],[.56,.14,.105],[.64,.09,.085]]);
  plate(u.torso, armor, [[.05,.055,.19],[.12,.19,.225],[.25,.29,.253],[.35,.30,.252],[.42,.25,.225],[.455,.20,.185]], .025);
  // Inlaid heat channels follow the breastplate instead of floating over blocks.
  for (const side of [-1, 1]) {
    A.path(u.torso, fire, [[side*.035,.115,.227],[side*.095,.21,.255],[side*.18,.30,.247],[side*.225,.382,.23]], .008);
    A.path(u.torso, edge, [[side*.055,.053,.195],[side*.194,.126,.196],[side*.287,.25,.218],[side*.295,.35,.217],[side*.245,.421,.19]], .009);
    const arm = side < 0 ? u.armLG : u.armRG, elbow = arm.userData.elbowG;
    const leg = side < 0 ? u.legLG : u.legRG, shin = leg.userData.shinG;
    arm.userData.upper = body(arm, skin, [[-.36,.082,.085],[-.30,.09,.09],[-.22,.127,.135],[-.12,.15,.15],[-.02,.16,.15],[.06,.145,.13],[.105,.085,.09]]);
    body(elbow, skin, [[-.40,.10,.055,.02],[-.35,.113,.067,.02],[-.29,.08,.068,.01],[-.22,.092,.082],[-.12,.125,.108],[-.04,.12,.108],[.035,.085,.085]]);
    body(arm, armor, [[.015,.161,.154],[.07,.16,.147],[.115,.126,.118],[.14,.065,.067]]);
    for (let j = 0; j < 2; j++) sweep(arm, edge, [[side*.075,.105,-.09+j*.17],[side*.14,.20,-.10+j*.18],[side*.19,.30,-.13+j*.19]], .045, 8);
    plate(elbow, armor, [[-.28,.068,.079],[-.23,.095,.102],[-.12,.117,.122],[-.055,.10,.113]]);
    // Claws turn BACK from the fingertips (negative local Z), opposite the old hooks.
    for (let f = 0; f < 4; f++) {
      const x = (f - 1.5) * .047, len = f === 0 || f === 3 ? .075 : .105;
      sweep(elbow, skin, [[x,-.36,.025],[x,-.415,.03],[x,-.42-len,.012]], .026, 8);
      sweep(elbow, hair, [[x,-.405-len,.015],[x,-.455-len,-.015],[x*.96,-.48-len,-.075],[x*.9,-.455-len,-.13]], .020, 12);
    }
    sweep(elbow, skin, [[side*.082,-.325,.02],[side*.139,-.38,.02],[side*.12,-.425,-.015]], .036, 10);
    sweep(elbow, hair, [[side*.12,-.415,-.01],[side*.10,-.46,-.045],[side*.075,-.445,-.10]], .021, 10);
    leg.userData.thigh = body(leg, skin, [[-.39,.09,.09],[-.30,.11,.13],[-.16,.147,.16],[-.02,.145,.14],[.06,.12,.11]]);
    body(shin, skin, [[-.38,.075,.07,.015],[-.29,.07,.077],[-.19,.10,.11,-.015],[-.08,.11,.115],[.025,.09,.09]]);
    plate(shin, armor, [[-.32,.068,.086],[-.24,.084,.11],[-.13,.10,.125],[0,.098,.12],[.045,.04,.095]]);
    body(shin, hair, [[-.415,.10,.13,.055],[-.39,.13,.175,.075],[-.34,.115,.145,.055],[-.29,.071,.065,.005]]);
    for (let f = 0; f < 3; f++) sweep(shin, edge, [[(f-1)*.069,-.37,.15],[(f-1)*.075,-.39,.215],[(f-1)*.08,-.40,.26]], .026, 7);
    for (let j = 0; j < 3; j++) sweep(u.torso, armor, [[side*.18,.20+j*.10,-.15],[side*.23,.27+j*.10,-.24],[side*.24,.36+j*.10,-.29]], .043, 8);
    A.rag(u.hips, cloth, side*.09,.13,.18,.15,.24,side*.08);
  }
  // One skull and jaw silhouette; brow and cheek ridges grow out of that surface.
  body(u.head, skin, [[-.18,.055,.055,.035],[-.15,.10,.09,.025],[-.09,.135,.12],[0,.175,.14,-.012],[.08,.181,.145,-.02],[.15,.16,.125,-.025],[.205,.115,.095,-.03],[.23,.04,.045,-.03]]);
  A.egg(u.head,mouth,0,-.105,.123,.20,.075,.055);
  for (const side of [-1, 1]) {
    A.egg(u.head,shadow,side*.087,.042,.123,.123,.067,.032,-side*.15);
    sweep(u.head, armor, [[side*.022,.058,.147],[side*.08,.095,.151],[side*.157,.087,.106]], .030, 10);
    sweep(u.head, skin, [[side*.15,.015,.092],[side*.128,-.05,.136],[side*.10,-.125,.12]], .030, 10);
    sweep(u.head, hair, [[side*.13,.16,-.03],[side*.27,.205,-.055],[side*.40,.30,-.09],[side*.41,.41,-.10],[side*.34,.48,-.08]], .087, 24, 10);
    // A single swept pale tip joins flush to the dark horn.
    sweep(u.head, teeth, [[side*.41,.41,-.10],[side*.39,.445,-.095],[side*.34,.48,-.08]], .021, 8, 8);
    A.spike(u.head,teeth,[side*.072,-.075,.155],[side*.067,-.125,.164],.014);
  }
  for (const eye of u.eyes) { eye.position.z = .15 * s; eye.scale.set(.65,.34,.4); }
  sweep(u.head, skin, [[0,.07,.14],[0,.005,.178],[0,-.035,.18]], .026, 10);
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * .024;
    A.spike(u.head,teeth,[x,-.075,.153],[x,-.096,.163],.009);
    A.spike(u.head,teeth,[x,-.137,.15],[x,-.117,.16],.008);
  }
}
