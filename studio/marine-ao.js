// studio/marine-ao.js — CL-186: baked shade and wear on the marine, in vertex colours (Claude's).
//
// Jerry (2026-10-12): "All anatomy and textures improved ... close that difference that makes it hard to tell that
// this game studio is one guy and a lot of AI Agents." The rig is lit by the sun and the sky alone; where his own
// body blocks the sky (the armpits, under the chin, the brow under the cap, the pack against the back, between the
// legs, the cuffs over the boots) it was as bright as his shoulders, which is the flat look of a figure made of
// parts. This bakes that occlusion once, at build time, into a colour attribute on every mesh of his own wardrobe
// materials (the shared hardware materials are left alone), from a set of capsules placed on his joints with the
// arms hanging, so the shade sits where a body's would in any pose. With it: dust on the boots and the cuffs, and
// the worn knees and elbows of a uniform that has been crawled in.
//
//   bakeMarineAO(THREE, marine, { mats: Set<Material>, strength, floor, dust, wear })
//
// Pure arithmetic over the geometry; nothing animates. Re-callable (the attribute is written fresh each time).

export const AO_DEFAULTS = {
  strength: 1.0,     // how dark a blocking body gets, per occluder
  floor: 0.4,        // the darkest a vertex goes
  spread: 1.0,       // occluder radii scale
  dust: 0.5,         // boots and cuffs: how much dust
  wear: 0.5          // knees and elbows: how worn
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Build the occluders: spheres along capsules between the rig's joints, each owned by the joint group the body
// part hangs from (a vertex is never shaded by its own part).
function occluders(T, ud, g, spread) {
  const W = (o, x = 0, y = 0, z = 0) => { const v = new T.Vector3(x, y, z); o.localToWorld(v); return g.worldToLocal(v); };
  const S = [];
  const sphere = (c, r, owner) => S.push({ c, r: r * spread, owner });
  const capsule = (a, b, r, owner, n = 0) => {
    const len = a.distanceTo(b), steps = n || Math.max(2, Math.ceil(len / (r * 0.8)) + 1);
    for (let i = 0; i < steps; i++) sphere(a.clone().lerp(b, i / (steps - 1)), r, owner);
  };
  for (const s of ['L', 'R']) {
    const leg = ud['leg' + s + 'G'], knee = ud['knee' + s + 'G'], ankle = ud['ankle' + s + 'G'];
    if (leg && knee && ankle) {
      const hip = W(leg), kn = W(knee), an = W(ankle);
      capsule(hip.clone().add(new T.Vector3(0, -0.03, 0.01)), kn.clone().add(new T.Vector3(0, 0.02, 0.01)), 0.085, leg);
      capsule(kn.clone().add(new T.Vector3(0, -0.03, 0.012)), an.clone().add(new T.Vector3(0, 0.03, 0.005)), 0.068, knee);
      sphere(an.clone().add(new T.Vector3(0, -0.045, 0.06)), 0.085, ankle);   // the boot
      sphere(an.clone().add(new T.Vector3(0, -0.03, -0.03)), 0.07, ankle);    // its heel
    }
    const arm = ud['arm' + s + 'G'], elbow = ud['elbow' + s + 'G'];
    if (arm && elbow) {
      const sh = W(arm), el = W(elbow), wr = W(elbow, elbow.userData.wrist ? elbow.userData.wrist.position.x : 0, -0.214, 0.06);
      sphere(sh.clone().add(new T.Vector3(0, -0.01, 0)), 0.082, arm);         // the deltoid
      capsule(sh.clone().add(new T.Vector3(0, -0.08, 0)), el.clone().add(new T.Vector3(0, 0.02, 0)), 0.064, arm);
      capsule(el.clone().add(new T.Vector3(0, -0.03, 0.01)), wr, 0.052, elbow);
      sphere(wr.clone().add(new T.Vector3(0, -0.055, 0.02)), 0.058, elbow);   // the hand
    }
  }
  const lower = ud.lowerBody, torso = ud.torsoG, head = ud.headG;
  if (lower) {
    const p = W(lower, 0, 0.6, 0);
    capsule(p.clone().add(new T.Vector3(-0.12, 0, 0)), p.clone().add(new T.Vector3(0.12, 0, 0)), 0.115, lower, 3);
    sphere(W(lower, 0, 0.53, 0.02), 0.1, lower);   // the seat
  }
  if (torso) {
    const tp = ud.torsoPivotY || 0.7;
    const a = W(torso, 0, 0.78 - tp, 0), b = W(torso, 0, 1.17 - tp, 0);
    capsule(a, b, 0.165, torso);
    for (const sx of [-1, 1]) capsule(W(torso, sx * 0.1, 0.8 - tp, 0), W(torso, sx * 0.11, 1.15 - tp, 0), 0.125, torso);
    // The pack, against the back.
    capsule(W(torso, 0, 0.9 - tp, -0.265), W(torso, 0, 1.12 - tp, -0.265), 0.1, torso);
    for (const sx of [-1, 1]) capsule(W(torso, sx * 0.085, 0.9 - tp, -0.265), W(torso, sx * 0.085, 1.12 - tp, -0.265), 0.08, torso);
  }
  if (head) {
    const hp = ud.headPivotY || 1.22;
    sphere(W(head, 0, 1.43 - hp, 0.015), 0.152, head);      // the skull
    sphere(W(head, 0, 1.36 - hp, 0.05), 0.11, head);        // the jaw
    sphere(W(head, 0, 1.25 - hp, 0.005), 0.075, head);      // the neck (shades the collar; the head's own parts skip it)
    sphere(W(head, 0, 1.5 - hp, 0.195), 0.06, null);        // the cap's brim or the helmet's rim, over the eyes (shades the face below it)
  }
  return S;
}

// The joint group a mesh hangs from (for the owner test).
function ownerOf(o, joints) {
  for (let n = o; n; n = n.parent) if (joints.has(n)) return n;
  return null;
}

export function bakeMarineAO(T, g, opts = {}) {
  const ud = g.userData || {};
  const O = { ...AO_DEFAULTS, ...opts };
  const mats = opts.mats;
  if (!mats || !mats.size) return null;
  const joints = new Set();
  for (const k of ['legLG', 'legRG', 'kneeLG', 'kneeRG', 'ankleLG', 'ankleRG', 'armLG', 'armRG', 'elbowLG', 'elbowRG', 'lowerBody', 'torsoG', 'headG']) if (ud[k]) joints.add(ud[k]);
  // Pose: the arms hanging, the legs straight, so the shade is a standing body's. Everything is put back after.
  const saved = [];
  const pose = (o, x, y, z) => { if (!o) return; saved.push([o, o.rotation.x, o.rotation.y, o.rotation.z]); o.rotation.set(x, y, z); };
  pose(ud.armLG, -0.05, 0, 0.12); pose(ud.armRG, -0.05, 0, -0.12);
  pose(ud.elbowLG, -0.22, 0, 0); pose(ud.elbowRG, -0.22, 0, 0);
  for (const k of ['legLG', 'legRG', 'kneeLG', 'kneeRG', 'ankleLG', 'ankleRG', 'lowerBody', 'torsoG', 'headG']) pose(ud[k], 0, 0, 0);
  const savedPos = [];
  for (const k of ['lowerBody', 'torsoG', 'headG']) if (ud[k]) { savedPos.push([ud[k], ud[k].position.x, ud[k].position.y, ud[k].position.z]); }
  if (ud.lowerBody) ud.lowerBody.position.set(0, 0, 0);
  if (ud.torsoG) ud.torsoG.position.set(0, ud.torsoPivotY || 0.7, 0);
  g.updateMatrixWorld(true);
  const S = occluders(T, ud, g, O.spread);
  const inv = new T.Matrix4().copy(g.matrixWorld).invert();
  const M = new T.Matrix4(), NM = new T.Matrix3(), p = new T.Vector3(), n = new T.Vector3();
  // Joint spots for the wear: the knees (front) and the elbows (back), in g space.
  const W = (o, x = 0, y = 0, z = 0) => { const v = new T.Vector3(x, y, z); o.localToWorld(v); return g.worldToLocal(v); };
  const knees = [ud.kneeLG, ud.kneeRG].filter(Boolean).map((k) => W(k, 0, -0.01, 0.06));
  const elbows = [ud.elbowLG, ud.elbowRG].filter(Boolean).map((e) => W(e, 0, 0.0, -0.045));
  const bootMats = opts.bootMats || new Set(), trouserMats = opts.trouserMats || new Set(), shirtMats = opts.shirtMats || new Set();
  let verts = 0, meshes = 0;
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  const done = new Set();
  g.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return;
    const mat = o.material;
    if (Array.isArray(mat) || !mats.has(mat)) return;
    let geo = o.geometry;
    if (!geo.userData.aoOwner || geo.userData.aoOwner !== o.uuid) { geo = geo.clone(); geo.userData.aoOwner = o.uuid; o.geometry = geo; }
    if (done.has(geo)) return; done.add(geo);
    const P = geo.attributes.position, N = geo.attributes.normal, count = P.count;
    const col = new Float32Array(count * 3);
    M.multiplyMatrices(inv, o.matrixWorld); NM.getNormalMatrix(M);
    const owner = ownerOf(o, joints);
    const isBoot = bootMats.has(mat), isTrouser = trouserMats.has(mat), isShirt = shirtMats.has(mat);
    const owners = o.userData.aoOwners ? new Set(o.userData.aoOwners) : null;   // CL-188: a cap worn by two parts is shaded by neither
    const SS = S.filter((s) => s.owner !== owner && !(owners && owners.has(s.owner)));   // never shaded by its own part
    const SX = new Float64Array(SS.length), SY = new Float64Array(SS.length), SZ = new Float64Array(SS.length), SR = new Float64Array(SS.length), SF = new Float64Array(SS.length);
    SS.forEach((s, k) => { SX[k] = s.c.x; SY[k] = s.c.y; SZ[k] = s.c.z; SR[k] = s.r; SF[k] = s.r * s.r * 36; });   // beyond 6 radii a sphere takes under 1.4% of the sky: skipped
    for (let i = 0; i < count; i++) {
      p.fromBufferAttribute(P, i).applyMatrix4(M);
      if (N) n.fromBufferAttribute(N, i).applyMatrix3(NM).normalize(); else n.set(0, 1, 0);
      const px = p.x, py = p.y, pz = p.z, nx = n.x, ny = n.y, nz = n.z;
      let vis = 1;
      for (let k = 0; k < SS.length; k++) {
        const dx = SX[k] - px, dy = SY[k] - py, dz = SZ[k] - pz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > SF[k]) continue;
        const r = SR[k], dist = Math.max(r * 1.02, Math.sqrt(d2));
        const cos = (dx * nx + dy * ny + dz * nz) / dist;
        if (cos <= 0.02) continue;
        const q = r / dist;
        const occ = (1 - Math.sqrt(Math.max(0, 1 - q * q))) * 2 * (cos - 0.02) / 0.98;   // the sky it takes, weighted by the normal
        vis *= 1 - clamp(occ * O.strength, 0, 1);
      }
      let r = Math.max(O.floor, vis), gg = r, b = r;
      // Dust: the boots, and the trouser cuffs over them, lightened toward a dry earth.
      if (O.dust > 0 && (isBoot || isTrouser)) {
        const w = (isBoot ? smooth(0.2, 0.0, p.y) * 0.9 + 0.1 : smooth(0.3, 0.1, p.y)) * O.dust;
        const k = isBoot ? [1.75, 1.58, 1.28] : [1.14, 1.09, 0.96];
        r *= 1 + (k[0] - 1) * w; gg *= 1 + (k[1] - 1) * w; b *= 1 + (k[2] - 1) * w;
      }
      // Wear: the fabric over the knees and the points of the elbows, rubbed lighter.
      if (O.wear > 0 && (isTrouser || isShirt)) {
        let w = 0;
        if (isTrouser) for (const k of knees) { const dd = p.distanceTo(k); w = Math.max(w, smooth(0.085, 0.02, dd) * Math.max(0, n.z)); }
        if (isShirt) for (const e of elbows) { const dd = p.distanceTo(e); w = Math.max(w, smooth(0.075, 0.02, dd) * Math.max(0, -n.z)); }
        w *= O.wear;
        r *= 1 + 0.16 * w; gg *= 1 + 0.14 * w; b *= 1 + 0.08 * w;
      }
      col[i * 3] = r; col[i * 3 + 1] = gg; col[i * 3 + 2] = b;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    verts += count; meshes++;
  });
  for (const m of mats) { if (!m.vertexColors) { m.vertexColors = true; m.needsUpdate = true; } }
  for (const [o, x, y, z] of saved) o.rotation.set(x, y, z);
  for (const [o, x, y, z] of savedPos) o.position.set(x, y, z);
  g.updateMatrixWorld(true);
  return { verts, meshes, occluders: S.length, ms: Math.round((typeof performance !== 'undefined' ? performance : Date).now() - t0) };
}
