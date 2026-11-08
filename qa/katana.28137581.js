// studio/katana.js — CL-184: the red katana (Claude's).
//
// Jerry (2026-10-12): "If you do it on the final day you get a crazy rare weapon. The weapon is going to be a red
// katana that does crazy damage and cuts through hordes like butter." It is the top of the blade line (knife, machete,
// katana) and rides the same hand as the others, so it is laid out like the machete in studio/weapon-sidearms.js:
// +z is the point, -y is the edge, the hand's grip at the origin, the handle running back along -z.
//
//   makeKatanaModel({ THREE })   a Group: a curved red blade (one vertex-coloured mesh, the edge's hamon lighter), a
//                                gold habaki and tsuba, a black and red wrapped handle and a gold pommel cap.

export const KATANA = Object.freeze({
  BLADE_FROM: 0.03, BLADE_TO: 0.66,   // the blade along z
  HANDLE_FROM: -0.235, HANDLE_TO: -0.005,
  WIDTH: 0.04,                        // spine to edge at the guard
  SORI: 0.026                         // the curve: how far the tip rises above a straight blade
});

export function makeKatanaModel({ THREE }) {
  const g = new THREE.Group();
  g.name = 'katana';
  const red = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.86, roughness: 0.18, emissive: 0x420408, emissiveIntensity: 0.58, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4ad52, metalness: 0.92, roughness: 0.24 });
  const darkGold = new THREE.MeshStandardMaterial({ color: 0x9a7428, metalness: 0.88, roughness: 0.34 });
  const black = new THREE.MeshStandardMaterial({ color: 0x141215, metalness: 0.22, roughness: 0.68 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x221c20, metalness: 0.78, roughness: 0.36 });
  const wrap = new THREE.MeshStandardMaterial({ color: 0x7c0d15, metalness: 0.12, roughness: 0.72 });
  const sameMat = new THREE.MeshStandardMaterial({ color: 0x38080c, metalness: 0.18, roughness: 0.55 });
  const crimsonGlow = new THREE.MeshStandardMaterial({ color: 0xd81824, emissive: 0x58040a, emissiveIntensity: 0.65, metalness: 0.6, roughness: 0.25 });

  g.add(bladeMesh(THREE, red));

  // Habaki (two-stage sculpted blade collar) seated flush against the front seppa and tsuba (no air gap).
  const habakiGroup = new THREE.Group();
  habakiGroup.name = 'katana-habaki';
  const habakiBase = new THREE.Mesh(new THREE.BoxGeometry(0.0155, 0.043, 0.014), darkGold);
  habakiBase.position.set(0, 0, 0.016); habakiGroup.add(habakiBase);
  const habakiMain = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.0405, 0.022), gold);
  habakiMain.position.set(0, 0, 0.029); habakiGroup.add(habakiMain);
  for (let i = 0; i < 4; i++) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.0148, 0.036, 0.0018), iron);
    groove.position.set(0, 0, 0.021 + i * 0.0048); habakiGroup.add(groove);
  }
  g.add(habakiGroup);

  // Front and rear seppa (notched oval spacer washers clamping the tsuba).
  for (const [z, r, mat] of [[0.0095, 0.028, gold], [-0.0045, 0.029, gold], [-0.0085, 0.026, iron]]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.004, 20), mat);
    s.rotation.x = Math.PI / 2; s.scale.set(0.68, 1, 1); s.position.set(0, 0, z); g.add(s);
  }

  // Ornate openwork tsuba (guard): recessed iron web, sculpted gold rim, four spokes, and crimson-gold accents.
  const tsubaCore = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.006, 28), iron);
  tsubaCore.rotation.x = Math.PI / 2; tsubaCore.scale.set(0.82, 1, 1); tsubaCore.position.set(0, 0, 0.0025); g.add(tsubaCore);
  const tsubaRim = new THREE.Mesh(new THREE.TorusGeometry(0.0425, 0.0048, 12, 32), gold);
  tsubaRim.scale.set(0.82, 1, 1.15); tsubaRim.position.set(0, 0, 0.0025); g.add(tsubaRim);
  const tsubaInnerRing = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0026, 10, 24), darkGold);
  tsubaInnerRing.scale.set(0.76, 1, 1.1); tsubaInnerRing.position.set(0, 0, 0.0025); g.add(tsubaInnerRing);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 8, 6), i % 2 === 0 ? gold : crimsonGlow);
    stud.position.set(Math.cos(a) * 0.0345, Math.sin(a) * 0.042, 0.0025);
    g.add(stud);
  }

  // Fuchi (front hilt collar) bridging seppa to the handle core with zero gap.
  const fuchi = new THREE.Mesh(new THREE.CylinderGeometry(0.0174, 0.0168, 0.018, 18), iron);
  fuchi.rotation.x = Math.PI / 2; fuchi.scale.set(0.8, 1, 1); fuchi.position.set(0, 0, -0.015); g.add(fuchi);
  for (const dz of [-0.0075, 0.0075]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0172, 0.0018, 8, 20), gold);
    ring.scale.set(0.8, 1, 1); ring.position.set(0, 0, -0.015 + dz); g.add(ring);
  }

  // Tsuka (handle): crimson samegawa (ray-skin) under-core, dark inner core, gold menuki, and braided tsuka-ito wrap.
  const len = KATANA.HANDLE_TO - KATANA.HANDLE_FROM, mid = (KATANA.HANDLE_TO + KATANA.HANDLE_FROM) / 2;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.0162, len + 0.006, 18), black);
  core.rotation.x = Math.PI / 2; core.scale.set(0.78, 1, 1); core.position.set(0, 0, mid); g.add(core);
  const sameStrip = new THREE.Mesh(new THREE.BoxGeometry(0.0258, 0.014, len - 0.012), sameMat);
  sameStrip.position.set(0, 0, mid); g.add(sameStrip);

  // Gold dragon menuki ornaments under the cord wrap on left and right sides.
  for (const s of [-1, 1]) {
    const menukiZ = mid + s * 0.028;
    for (let j = 0; j < 3; j++) {
      const nodule = new THREE.Mesh(new THREE.SphereGeometry(0.0034 - j * 0.0004, 8, 6), gold);
      nodule.scale.set(0.65, 1.1, 1.6);
      nodule.position.set(s * 0.0126, (j - 1) * 0.0022, menukiZ + (j - 1) * 0.008);
      g.add(nodule);
    }
  }

  // Tightly woven diamond tsuka-ito wrap (9 stations of crossed X-straps on the handle flats + flush oval edge collars).
  const turns = 9;
  for (let i = 0; i < turns; i++) {
    const z = KATANA.HANDLE_FROM + 0.022 + (i + 0.5) * (len - 0.044) / turns;
    const t = i / (turns - 1);
    const rTap = 0.0158 + (0.0166 - 0.0158) * t;
    for (const s of [-1, 1]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.0258, 0.025, 0.0068), wrap);
      band.position.set(0, 0, z);
      band.rotation.x = s * 0.58;
      g.add(band);
    }
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(rTap, rTap, 0.0075, 18), wrap);
    collar.rotation.x = Math.PI / 2;
    collar.scale.set(0.76, 1.03, 1);
    collar.position.set(0, 0, z);
    g.add(collar);
  }

  // Kashira (ornate pommel cap with gold shitodome eyelets and crimson end-knot).
  const kashira = new THREE.Mesh(new THREE.CylinderGeometry(0.0164, 0.0152, 0.018, 18), iron);
  kashira.rotation.x = Math.PI / 2; kashira.scale.set(0.82, 1, 1); kashira.position.set(0, 0, KATANA.HANDLE_FROM - 0.003); g.add(kashira);
  const kashiraCap = new THREE.Mesh(new THREE.SphereGeometry(0.0156, 14, 10), gold);
  kashiraCap.scale.set(0.8, 1, 0.42); kashiraCap.position.set(0, 0, KATANA.HANDLE_FROM - 0.01); g.add(kashiraCap);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.0032, 0.001, 6, 12), gold);
    eye.rotation.y = Math.PI / 2; eye.position.set(s * 0.0128, 0, KATANA.HANDLE_FROM - 0.002); g.add(eye);
  }
  const pommelKnot = new THREE.Mesh(new THREE.TorusGeometry(0.0065, 0.0024, 8, 14), wrap);
  pommelKnot.rotation.y = Math.PI / 2; pommelKnot.position.set(0, 0, KATANA.HANDLE_FROM - 0.013); g.add(pommelKnot);

  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
  return g;
}

// High-fidelity curved red katana blade:
// - Starts at z = 0.006 inside the habaki/tsuba so there is zero gap at the hilt.
// - 12-vertex cross-section with a deep recessed bo-hi (blood groove) on both sides, a sharp shinogi ridge,
//   and a procedural wavy gunome-midare hamon glowing along the razor edge up to the geometric yokote & kissaki tip.
function bladeMesh(THREE, mat) {
  const N = 48, { BLADE_FROM: z0, BLADE_TO: z1, WIDTH: W, SORI } = KATANA;
  const zStart = 0.006; // rooted inside the habaki and front seppa
  const pos = [], col = [], idx = [];
  const spineCol = new THREE.Color(0x3b0408);
  const fullerCol = new THREE.Color(0x240104);
  const bodyCol = new THREE.Color(0xb8111b);
  const shinogiCol = new THREE.Color(0xe02430);
  const hamonCol = new THREE.Color(0xff7868);
  const edgeCol = new THREE.Color(0xffe0d6);
  const tmpCol = new THREE.Color();
  const ring = 12;

  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const z = zStart + (z1 - zStart) * u;
    const uBlade = Math.max(0, (z - z0) / (z1 - z0));
    const lift = SORI * uBlade * uBlade;
    const tip = uBlade > 0.84 ? (uBlade - 0.84) / 0.16 : 0;
    const w = W * (1 - 0.25 * uBlade) * (1 - 0.80 * tip * tip);
    const t = 0.0058 * (1 - 0.32 * uBlade) * (1 - 0.68 * tip);
    const top = lift + w * 0.5 - tip * w * 0.44;
    const bot = lift - w * 0.5 + tip * w * 0.10;
    const span = top - bot;

    // Bo-hi (blood groove) runs from inside the habaki up to 78% of the blade before the yokote.
    const grooveFade = (uBlade > 0.02 && uBlade < 0.78)
      ? Math.min(1, (uBlade - 0.02) / 0.04, (0.78 - uBlade) / 0.06)
      : 0;
    const grooveDepth = t * 0.52 * grooveFade;

    // Undulating gunome-midare hamon wave height along the lower bevel.
    const wave = 0.5 + 0.5 * (Math.sin(z * 115) * 0.6 + Math.cos(z * 210 + 0.8) * 0.4);
    const ySpinePeak = top;
    const ySpineShoulder = top - span * 0.07;
    const yGrooveTop = top - span * 0.13;
    const yGrooveMid = top - span * 0.23;
    const yGrooveBot = top - span * 0.33;
    const yShinogi = bot + span * 0.42;
    const yHamon = bot + span * (0.16 + 0.055 * wave * (1 - tip * 0.6));
    const yEdge = bot;

    const ts = t * 0.58;
    const tg = Math.max(0.0008, t * 0.82 - grooveDepth);
    const th = t * 0.52;

    // 12-point cross-section around the blade perimeter (clockwise from top spine ridge).
    const pts = [
      [0, ySpinePeak],
      [ts, ySpineShoulder],
      [t * 0.88, yGrooveTop],
      [tg, yGrooveMid],
      [t * 0.92, yGrooveBot],
      [t, yShinogi],
      [th, yHamon],
      [0, yEdge],
      [-th, yHamon],
      [-t, yShinogi],
      [-t * 0.92, yGrooveBot],
      [-tg, yGrooveMid]
    ];
    // Replace index 11/10 symmetry cleanly with 12 symmetric points:
    pts[10] = [-tg, yGrooveMid];
    pts[11] = [-ts, ySpineShoulder];

    const grooveC = tmpCol.copy(bodyCol).lerp(fullerCol, grooveFade * 0.85);
    const cols = [
      spineCol,
      spineCol,
      bodyCol,
      grooveC,
      bodyCol,
      shinogiCol,
      hamonCol,
      edgeCol,
      hamonCol,
      shinogiCol,
      grooveC,
      spineCol
    ];
    for (let k = 0; k < ring; k++) {
      pos.push(pts[k][0], pts[k][1], z);
      col.push(cols[k].r, cols[k].g, cols[k].b);
    }
  }
  for (let i = 0; i < N; i++) for (let k = 0; k < ring; k++) {
    const a = i * ring + k, b = i * ring + (k + 1) % ring, c = a + ring, d = b + ring;
    idx.push(a, c, b, b, c, d);
  }
  // Close kissaki tip to a sharp point and cap the tang base inside the habaki.
  const tipI = pos.length / 3;
  pos.push(0, SORI - W * 0.015, z1 + 0.012);
  col.push(edgeCol.r, edgeCol.g, edgeCol.b);
  for (let k = 0; k < ring; k++) idx.push(N * ring + k, tipI, N * ring + (k + 1) % ring);
  for (let k = 1; k < ring - 1; k++) idx.push(0, k + 1, k);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.name = 'katana-blade';
  return m;
}

// Worn: the katana in a smooth, curved, lacquered saya (scabbard) with gold koiguchi throat, seme-gane bands,
// crimson lacquer accents, kurikata knob, braided sageo cord wrap with hanging tassels, and sculpted gold kojiri chape.
// userData.hilt is the handle and guard (index.html hides it while the drawn katana is in his hand).
export function makeSheathedKatana({ THREE }) {
  const g = new THREE.Group(); g.name = 'katana-sheathed';
  const hilt = makeKatanaModel({ THREE });
  hilt.traverse((m) => {
    if (m.isMesh && m.name === 'katana-blade') m.visible = false;
    if (m.name === 'katana-habaki') m.visible = false;
  });
  g.add(hilt);

  const lacquer = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.42, roughness: 0.22 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4ad52, metalness: 0.92, roughness: 0.24 });
  const darkGold = new THREE.MeshStandardMaterial({ color: 0x9a7428, metalness: 0.88, roughness: 0.34 });
  const redCord = new THREE.MeshStandardMaterial({ color: 0x860f18, metalness: 0.14, roughness: 0.72 });
  const crimsonLacquer = new THREE.MeshStandardMaterial({ color: 0x5c0810, metalness: 0.48, roughness: 0.24 });

  // Smoothly lofted curved saya body from the front seppa (z = 0.008) to the tip (z = 0.68).
  const { BLADE_FROM: z0, BLADE_TO: z1, SORI } = KATANA;
  const zStart = 0.008, zEnd = z1 + 0.02;
  const N = 36, ring = 10;
  const pos = [], col = [], idx = [];
  const colBlack = new THREE.Color(0x140d10);
  const colCrimson = new THREE.Color(0x4a070d);
  const colRidge = new THREE.Color(0x281216);

  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const z = zStart + (zEnd - zStart) * u;
    const uCurve = Math.max(0, (z - z0) / (z1 - z0));
    const lift = SORI * uCurve * uCurve;
    const hHalf = (0.0245 - 0.0045 * u) * (u > 0.92 ? 1 - 0.35 * ((u - 0.92) / 0.08) : 1);
    const wHalf = (0.0108 - 0.002 * u) * (u > 0.92 ? 1 - 0.35 * ((u - 0.92) / 0.08) : 1);
    const stripe = (Math.sin(u * Math.PI * 14) > 0.65 && u > 0.18 && u < 0.86) ? colCrimson : colBlack;
    for (let k = 0; k < ring; k++) {
      const a = (k / ring) * Math.PI * 2;
      const x = Math.sin(a) * wHalf * (1 + 0.08 * Math.pow(Math.cos(a), 2));
      const y = lift + Math.cos(a) * hHalf;
      pos.push(x, y, z);
      const c = (k === 0 || k === 5) ? colRidge : stripe;
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < N; i++) for (let k = 0; k < ring; k++) {
    const a = i * ring + k, b = i * ring + (k + 1) % ring, c = a + ring, d = b + ring;
    idx.push(a, c, b, b, c, d);
  }
  const tipCenter = pos.length / 3;
  const tipLift = SORI * Math.pow((zEnd - z0) / (z1 - z0), 2);
  pos.push(0, tipLift, zEnd + 0.006);
  col.push(colBlack.r, colBlack.g, colBlack.b);
  for (let k = 0; k < ring; k++) idx.push(N * ring + k, tipCenter, N * ring + (k + 1) % ring);

  const sayaGeo = new THREE.BufferGeometry();
  sayaGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sayaGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  sayaGeo.setIndex(idx);
  sayaGeo.computeVertexNormals();
  const sayaMesh = new THREE.Mesh(sayaGeo, lacquer);
  sayaMesh.castShadow = true;
  g.add(sayaMesh);

  // Helper to place contoured fittings along the curved saya spine.
  const sayaPose = (z) => {
    const u = Math.max(0, (z - z0) / (z1 - z0));
    const y = SORI * u * u;
    const dy = (2 * SORI * u) / (z1 - z0);
    return { y, rx: -Math.atan(dy) };
  };

  // Koiguchi (sculpted gold scabbard mouth collar meeting the tsuba seamlessly at z = 0.008..0.034).
  const koi = new THREE.Mesh(new THREE.CylinderGeometry(0.0265, 0.026, 0.024, 20), gold);
  koi.rotation.x = Math.PI / 2; koi.scale.set(0.46, 1, 1); koi.position.set(0, 0, 0.020); g.add(koi);
  const koiRim = new THREE.Mesh(new THREE.TorusGeometry(0.0265, 0.0022, 8, 20), darkGold);
  koiRim.scale.set(0.46, 1, 1); koiRim.position.set(0, 0, 0.031); g.add(koiRim);

  // Kurikata (side cord knob) with gold shitodome eyelet and multi-wrap braided sageo cord + hanging tassels.
  const kuri = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 8), gold);
  kuri.scale.set(0.7, 0.9, 1.5); kuri.position.set(0.0115, 0.004, z0 + 0.082); g.add(kuri);
  for (let i = 0; i < 6; i++) {
    const sz = z0 + 0.068 + i * 0.0085;
    const { y, rx } = sayaPose(sz);
    const turn = new THREE.Mesh(new THREE.CylinderGeometry(0.0258, 0.0258, 0.007, 18), i % 2 === 0 ? redCord : darkGold);
    turn.rotation.x = Math.PI / 2 + rx; turn.scale.set(0.47, 1, 1);
    turn.position.set(0, y, sz); turn.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.14;
    g.add(turn);
  }
  // Decorative sageo bow knot and twin hanging tassels on the side of the scabbard.
  const knot = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0028, 8, 14), redCord);
  knot.rotation.y = Math.PI / 2; knot.position.set(0.0125, 0.002, z0 + 0.095); g.add(knot);
  for (const [dz, dy, rot] of [[0.018, -0.016, 0.28], [0.034, -0.014, 0.42]]) {
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0032, 0.038, 8), redCord);
    tail.position.set(0.012, dy, z0 + 0.095 + dz); tail.rotation.x = Math.PI / 2 - rot; g.add(tail);
    const aglet = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0026, 0.006, 8), gold);
    aglet.position.set(0.012, dy - 0.006, z0 + 0.111 + dz); aglet.rotation.x = Math.PI / 2 - rot; g.add(aglet);
  }

  // Ornate gold seme-gane (scabbard reinforcement rings) with crimson lacquer bands.
  for (const [zPos, sY] of [[z0 + 0.24, 0.0242], [z0 + 0.43, 0.0225]]) {
    const { y, rx } = sayaPose(zPos);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(sY, sY, 0.018, 20), crimsonLacquer);
    band.rotation.x = Math.PI / 2 + rx; band.scale.set(0.46, 1, 1); band.position.set(0, y, zPos); g.add(band);
    for (const dz of [-0.009, 0, 0.009]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(sY + 0.0008, sY + 0.0008, 0.0035, 20), dz === 0 ? darkGold : gold);
      ring.rotation.x = Math.PI / 2 + rx; ring.scale.set(0.47, 1, 1);
      ring.position.set(0, y - dz * Math.tan(rx), zPos + dz); g.add(ring);
    }
  }

  // Kojiri (sculpted gold chape end-cap following the curved scabbard tip).
  const kojiriZ = z1 + 0.004;
  const { y: ky, rx: krx } = sayaPose(kojiriZ);
  const kojiri = new THREE.Mesh(new THREE.CylinderGeometry(0.0195, 0.0215, 0.032, 20), gold);
  kojiri.rotation.x = Math.PI / 2 + krx; kojiri.scale.set(0.46, 1, 1); kojiri.position.set(0, ky, kojiriZ); g.add(kojiri);
  const kojiriCollar = new THREE.Mesh(new THREE.TorusGeometry(0.0216, 0.002, 8, 20), darkGold);
  kojiriCollar.rotation.x = krx; kojiriCollar.scale.set(0.46, 1, 1); kojiriCollar.position.set(0, ky - 0.001, kojiriZ - 0.015); g.add(kojiriCollar);
  const kojiriTip = new THREE.Mesh(new THREE.SphereGeometry(0.0195, 16, 12), gold);
  kojiriTip.rotation.x = krx; kojiriTip.scale.set(0.45, 0.96, 0.65); kojiriTip.position.set(0, ky + 0.0015, kojiriZ + 0.015); g.add(kojiriTip);

  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  g.userData.hilt = hilt;
  return g;
}
