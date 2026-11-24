// GP-19938 / AH-15: the first medical wreck's overturned PGB ambulance & hydraulic recovery jack.
// Visual only; the landmark's existing solids and the objective cooler keep their own owners.
// AH-15 upgrades: weathered procedural PBR canvas skins (roof MED-04 stencil + vents, flank PGB MEDICAL
// livery + rain/mud wear, cracked windshield, rear doors + stretcher/cabinet interior), flickering damaged
// emergency lightbar, grounded bent chassis rocker sill over cooler, industrial 10T hydraulic bottle jack
// with pressure dial & caged beat beacon, Hale's roadside clipboard + bandages, and animated cab rattle/lunge.

function makeCanvasTex(THREE, w, h, draw) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function seededRand(seed) {
  let s = seed | 0 || 13;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function paintGrime(ctx, w, h, seed, mudBottom = true) {
  const r = seededRand(seed);
  for (let i = 0; i < 420; i++) {
    const a = 0.03 + r() * 0.06;
    ctx.fillStyle = r() > 0.5 ? `rgba(42,38,30,${a})` : `rgba(240,236,220,${a * 0.7})`;
    ctx.fillRect(r() * w, r() * h, 2 + r() * 9, 1 + r() * 4);
  }
  // Rain streaks down the panels
  for (let i = 0; i < 18; i++) {
    const x = r() * w, len = h * (0.25 + r() * 0.6), wd = 1.5 + r() * 4;
    const gr = ctx.createLinearGradient(0, 0, 0, len);
    gr.addColorStop(0, 'rgba(48,44,36,0.34)');
    gr.addColorStop(1, 'rgba(48,44,36,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(x, 0, wd, len);
  }
  if (mudBottom) {
    const mud = ctx.createLinearGradient(0, h * 0.68, 0, h);
    mud.addColorStop(0, 'rgba(66,50,34,0)');
    mud.addColorStop(0.55, 'rgba(62,46,30,0.45)');
    mud.addColorStop(1, 'rgba(48,35,23,0.85)');
    ctx.fillStyle = mud;
    ctx.fillRect(0, h * 0.68, w, h * 0.32);
    for (let i = 0; i < 65; i++) {
      ctx.fillStyle = `rgba(56,42,27,${0.25 + r() * 0.45})`;
      ctx.beginPath();
      ctx.ellipse(r() * w, h * (0.72 + r() * 0.28), 3 + r() * 14, 1.5 + r() * 5, (r() - 0.5) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function buildAmbulanceTextures(THREE) {
  const roof = makeCanvasTex(THREE, 512, 256, (c, w, h) => {
    c.fillStyle = '#a8a89c'; c.fillRect(0, 0, w, h);
    // Ribbed roof panel seams & rivets
    for (let x = 32; x < w; x += 64) {
      c.fillStyle = 'rgba(35,38,34,0.22)'; c.fillRect(x, 0, 3, h);
      c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(x + 3, 0, 2, h);
      for (let y = 16; y < h; y += 28) {
        c.fillStyle = 'rgba(45,42,36,0.45)'; c.beginPath(); c.arc(x - 6, y, 2, 0, Math.PI * 2); c.fill();
      }
    }
    // Red roof cross & stencilled aerial ID (faces the player directly on the rolled flank!)
    c.fillStyle = 'rgba(155,44,40,0.82)';
    const cx = w * 0.34, cy = h * 0.5;
    c.fillRect(cx - 46, cy - 16, 92, 32);
    c.fillRect(cx - 16, cy - 46, 32, 92);
    c.fillStyle = 'rgba(38,44,38,0.82)';
    c.font = '900 44px "Arial Black", Impact, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('MED-04', w * 0.72, h * 0.40);
    c.font = '700 20px "Courier New", monospace';
    c.fillStyle = 'rgba(54,60,50,0.78)';
    c.fillText('PGB · FOB THRESHOLD', w * 0.72, h * 0.66);
    // Scratches across the aluminum skin from rolling over on gravel
    const r = seededRand(41);
    c.strokeStyle = 'rgba(235,235,226,0.42)'; c.lineWidth = 1.6;
    for (let i = 0; i < 24; i++) {
      const sx = r() * w, sy = r() * h;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 20 + r() * 70, sy + (r() - 0.5) * 24); c.stroke();
    }
    paintGrime(c, w, h, 42, false);
  });

  const side = makeCanvasTex(THREE, 512, 256, (c, w, h) => {
    c.fillStyle = '#c4c1b2'; c.fillRect(0, 0, w, h);
    // Red medical belt stripe + lower accent stripe
    c.fillStyle = '#99322f'; c.fillRect(0, h * 0.43, w, h * 0.13);
    c.fillStyle = '#6f322f'; c.fillRect(0, h * 0.78, w, h * 0.045);
    // Panel seam lines & compartment latches
    c.strokeStyle = 'rgba(36,40,36,0.45)'; c.lineWidth = 2.5;
    c.strokeRect(26, h * 0.58, 128, h * 0.34);
    c.strokeRect(346, h * 0.58, 134, h * 0.34);
    c.fillStyle = '#474c48';
    c.fillRect(82, h * 0.63, 18, 8); c.fillRect(404, h * 0.63, 18, 8);
    // White cross shield + PGB MEDICAL stencil
    c.fillStyle = '#e5e0cf'; c.fillRect(w * 0.42, h * 0.12, 82, 82);
    c.strokeStyle = '#7e2a27'; c.lineWidth = 3; c.strokeRect(w * 0.42, h * 0.12, 82, 82);
    c.fillStyle = '#9d2d2a';
    c.fillRect(w * 0.42 + 28, h * 0.12 + 12, 26, 58);
    c.fillRect(w * 0.42 + 12, h * 0.12 + 28, 58, 26);
    c.fillStyle = '#2d342c';
    c.font = '900 28px "Arial Black", Impact, sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText('PGB MEDICAL', 28, h * 0.25);
    c.font = '700 18px "Courier New", monospace';
    c.fillText('UNIT 04 · THRESHOLD', 28, h * 0.36);
    c.textAlign = 'right';
    c.fillText('SIGNED: 12', w - 26, h * 0.28);
    paintGrime(c, w, h, 89, true);
  });

  const windshield = makeCanvasTex(THREE, 256, 160, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1c2b30'); gr.addColorStop(1, '#2a3d42');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    // Subtle sky sheen & wiper arc
    c.strokeStyle = 'rgba(200,215,212,0.12)'; c.lineWidth = 14;
    c.beginPath(); c.arc(w * 0.32, h * 1.05, h * 0.82, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    // Radial spiderweb impact crack on passenger side
    const ix = w * 0.68, iy = h * 0.46;
    c.strokeStyle = 'rgba(220,232,235,0.68)'; c.lineWidth = 1.6;
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + 0.17;
      const len = 28 + (i % 3) * 26;
      c.beginPath(); c.moveTo(ix, iy);
      c.lineTo(ix + Math.cos(a) * len, iy + Math.sin(a) * len);
      c.stroke();
    }
    for (const r of [14, 28, 44]) {
      c.beginPath(); c.arc(ix, iy, r, 0, Math.PI * 2); c.strokeStyle = 'rgba(215,228,232,0.42)'; c.lineWidth = 1.1; c.stroke();
    }
  });

  const gaugeDial = makeCanvasTex(THREE, 128, 128, (c, w, h) => {
    c.fillStyle = '#1c211d'; c.fillRect(0, 0, w, h);
    c.beginPath(); c.arc(64, 64, 56, 0, Math.PI * 2); c.fillStyle = '#ece6d1'; c.fill();
    c.lineWidth = 6; c.strokeStyle = '#383d38'; c.stroke();
    // Green operational zone & red overload zone
    c.beginPath(); c.arc(64, 64, 44, Math.PI * 0.78, Math.PI * 1.82); c.lineWidth = 7; c.strokeStyle = '#2e7d47'; c.stroke();
    c.beginPath(); c.arc(64, 64, 44, Math.PI * 1.82, Math.PI * 2.2); c.strokeStyle = '#b43428'; c.stroke();
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (0.78 + i * 0.18);
      c.beginPath(); c.moveTo(64 + Math.cos(a) * 35, 64 + Math.sin(a) * 35);
      c.lineTo(64 + Math.cos(a) * 48, 64 + Math.sin(a) * 48);
      c.lineWidth = 2.5; c.strokeStyle = '#202220'; c.stroke();
    }
    c.fillStyle = '#222'; c.font = 'bold 14px monospace'; c.textAlign = 'center';
    c.fillText('10T PGB', 64, 96);
    c.beginPath(); c.moveTo(64, 64); c.lineTo(96, 44); c.lineWidth = 4; c.strokeStyle = '#b43428'; c.stroke();
    c.beginPath(); c.arc(64, 64, 6, 0, Math.PI * 2); c.fillStyle = '#222'; c.fill();
  });

  const clipboard = makeCanvasTex(THREE, 128, 160, (c, w, h) => {
    c.fillStyle = '#5a442d'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e7dfc6'; c.fillRect(10, 18, w - 20, h - 28);
    c.fillStyle = '#6f7572'; c.fillRect(38, 6, 52, 16);
    c.fillStyle = '#2a2820'; c.font = 'bold 11px monospace'; c.fillText('MED-04 MANIFEST', 16, 36);
    c.fillStyle = '#504b3e';
    for (let y = 48; y < 126; y += 13) c.fillRect(16, y, 72 + ((y * 7) % 24), 3);
    c.fillStyle = 'rgba(135,28,22,0.68)';
    c.beginPath(); c.ellipse(94, 118, 16, 20, 0.3, 0, Math.PI * 2); c.fill();
  });

  return { roof, side, windshield, gaugeDial, clipboard };
}

export function buildConvoyVisual(THREE, TSL, foldStatic, wreck, groundAt) {
  const C = {
    shell: 0xc2c0b2, roof: 0xa6a79b, shade: 0x6f776f, red: 0x9d3431,
    fadedRed: 0x6e3633, black: 0x202625, glass: 0x23353b, steel: 0x6d746e,
    rust: 0x744d3a, lamp: 0xd8c797, rubber: 0x1d201f, pulse: 0xffc94a,
    ready: 0x7cff9e, gauge: 0xe6be4c, olive: 0x475038, bandage: 0xe4decb
  };
  const tex = buildAmbulanceTextures(THREE);
  const mats = new Map();
  const mat = (color, more = {}) => {
    const key = `${color}/${more.metalness || 0}/${more.roughness ?? 0.84}/${more.emissive || 0}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({
      color, roughness: more.roughness ?? 0.84, metalness: more.metalness || 0,
      emissive: more.emissive || 0, emissiveIntensity: more.emissive ? 0.3 : 0
    }));
    return mats.get(key);
  };
  const add = (group, geo, color, x, y, z, rx = 0, ry = 0, rz = 0, more) => {
    const mesh = new THREE.Mesh(geo, typeof color === 'number' ? mat(color, more) : color);
    mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    return mesh;
  };
  const box = (g, w, h, d, c, x, y, z, rx, ry, rz, more) =>
    add(g, new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz, more);
  const cyl = (g, rt, rb, h, c, x, y, z, rx, ry, rz, more) =>
    add(g, new THREE.CylinderGeometry(rt, rb, h, 12), c, x, y, z, rx, ry, rz, more);
  const bar = (g, a, b, r, c) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const m = add(g, new THREE.CylinderGeometry(r, r, A.distanceTo(B), 6), c, 0, 0, 0);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
    return m;
  };

  // Roll onto the right flank. The right cab door is low, directly above the
  // objective case at (1.5, -1.2); the left wheels and roof remain conspicuous.
  const vehicle = new THREE.Group();
  vehicle.name = 'convoy-ambulance';
  vehicle.position.y = 1.58;
  vehicle.rotation.z = -0.89;
  wreck.add(vehicle);
  const still = new THREE.Group(); vehicle.add(still);

  // Ambulance box cabin, floor, roof & walls
  box(still, 2.28, .14, 3.35, C.shell, 0, -.89, 1.02);
  box(still, 2.32, .15, 3.38, C.roof, 0, .94, 1.02);
  // Textured weathered roof skin & bolted roof rails / AC vent unit
  if (tex.roof) {
    const roofMat = new THREE.MeshStandardMaterial({ map: tex.roof, roughness: 0.82, metalness: 0.14 });
    const rp = new THREE.Mesh(new THREE.PlaneGeometry(3.32, 2.24), roofMat);
    rp.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    rp.position.set(0, 1.02, 1.02);
    rp.receiveShadow = true;
    still.add(rp);
  }
  // Roof AC louver housing & grab rails (seated cleanly aft of MED-04 stencil)
  box(still, .82, .15, .74, C.shade, -.08, 1.08, 1.88);
  for (let i = -2; i <= 2; i++) box(still, .68, .024, .04, C.black, -.08, 1.16, 1.88 + i * .12);
  for (const x of [-1.04, 1.04]) {
    bar(still, [x, 1.09, -.45], [x, 1.09, 2.42], .022, C.steel);
    for (const z of [-.35, .6, 1.55, 2.35]) cyl(still, .022, .026, .10, C.black, x, 1.04, z);
  }

  for (const x of [-1.12, 1.12]) {
    box(still, .13, 1.77, 3.35, C.shell, x, .02, 1.02);
    box(still, .025, .17, 3.26, C.red, x + Math.sign(x) * .077, .12, 1.02);
    box(still, .035, .035, 3.2, C.fadedRed, x + Math.sign(x) * .09, -.56, 1.02);
    if (tex.side) {
      const sideMat = new THREE.MeshStandardMaterial({ map: tex.side, roughness: 0.84, metalness: 0.12 });
      const sp = new THREE.Mesh(new THREE.PlaneGeometry(3.28, 1.70), sideMat);
      sp.position.set(x + Math.sign(x) * .085, .02, 1.02);
      sp.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      sp.receiveShadow = true;
      still.add(sp);
    }
  }
  // Rear interior detail (visible once rear doors swing open on aftermath!):
  // Stretcher gurney rails, medical storage locker & overturned supply crate
  box(still, 2.24, .12, .14, C.shell, 0, .91, 2.71);
  box(still, 2.24, .12, .14, C.shell, 0, -.87, 2.71);
  box(still, 2.22, 1.72, .12, C.shade, 0, .01, -.66);
  // Gurney frame along left interior wall + overhead med cabinet along right wall
  box(still, .62, .08, 2.05, C.steel, -.52, -.62, 1.12, 0, 0, .08, { metalness: 0.55 });
  box(still, .56, .10, 1.92, C.olive, -.52, -.53, 1.12, 0, 0, .08);
  box(still, .42, .56, 2.25, C.shade, .78, .54, 1.08);
  box(still, .46, .42, .58, C.olive, .38, -.61, 1.55, 0, .32, 0);

  const rearDoors = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * 1.12, .02, 2.74); vehicle.add(pivot);
    const leaf = new THREE.Group(); pivot.add(leaf); const x = -side * .55;
    box(leaf, 1.08, 1.64, .10, C.shell, x, 0, 0);
    box(leaf, .94, .46, .035, C.glass, x, .42, .055); // rear door observation glass
    box(leaf, .56, .12, .026, C.red, x, -.12, .065); box(leaf, .12, .56, .026, C.red, x, -.12, .07);
    box(leaf, .12, .05, .07, C.steel, -side * .99, -.16, .09, 0, 0, 0, { metalness: 0.6 });
    foldStatic(THREE, TSL, leaf); rearDoors.push({ pivot, side });
  }

  // Front cab shell & window pillars
  box(still, 2.17, .17, 1.92, C.shell, 0, -.89, -1.6);
  box(still, 2.18, .16, 1.96, C.roof, 0, .88, -1.59);
  box(still, 2.16, 1.6, .11, C.shell, 0, -.02, -.62);
  // Cab bench & steering wheel inside cab
  box(still, 1.82, .22, .56, C.black, 0, -.68, -1.18);
  box(still, 1.82, .68, .16, C.black, 0, -.28, -.92);
  cyl(still, .22, .22, .035, C.rubber, -.56, -.12, -2.02, Math.PI * 0.35, 0, 0);

  box(still, .1, .44, 1.85, C.shell, -1.08, -.64, -1.59);
  box(still, .1, .18, 1.82, C.shell, -1.08, .71, -1.59);
  box(still, .035, .95, 1.65, C.glass, -1.14, .15, -1.58);
  box(still, .12, 1.68, .13, C.steel, -1.08, -.01, -2.48);
  box(still, .12, 1.68, .13, C.steel, 1.08, -.01, -2.48);
  box(still, 2.12, .23, .08, C.steel, 0, .72, -2.5);
  box(still, 2.1, .23, .08, C.shell, 0, -.75, -2.5);
  if (tex.windshield) {
    const wsMat = new THREE.MeshStandardMaterial({ map: tex.windshield, roughness: 0.32, metalness: 0.28 });
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.02, 1.16), wsMat);
    ws.position.set(0, .03, -2.555);
    ws.rotation.y = Math.PI;
    still.add(ws);
  } else {
    box(still, 2.01, 1.15, .028, C.glass, 0, .03, -2.54);
  }
  // Windshield wipers
  bar(still, [-.55, -.58, -2.58], [-.12, -.14, -2.58], .014, C.black);
  bar(still, [.22, -.58, -2.58], [.66, -.18, -2.58], .014, C.black);

  // Bonnet, heavy radiator grille, push-bar bumper & one flickering broken lamp
  box(still, 2.09, .47, .65, C.shell, 0, -.47, -2.81);
  box(still, 1.48, .34, .04, C.black, 0, -.48, -3.155);
  for (let i = -4; i <= 4; i++) box(still, .045, .3, .02, C.steel, i * .16, -.48, -3.18);
  box(still, 2.34, .19, .19, C.steel, .05, -.82, -3.20, 0, 0, -.08, { metalness: 0.55 });
  // Push-bar bullguard on front bumper
  for (const x of [-.52, .52]) box(still, .07, .52, .08, C.black, x, -.56, -3.28);
  bar(still, [-.52, -.34, -3.28], [.52, -.34, -3.28], .026, C.black);
  for (const x of [-.86, .86]) {
    cyl(still, .15, .15, .06, x < 0 ? C.lamp : C.rust, x, -.42, -3.17, Math.PI / 2);
  }

  // Six tyres with steel rim bolts & mudguards
  for (const x of [-1.17, 1.17]) for (const z of [-2.03, .37, 2.08]) {
    cyl(still, .44, .44, .25, C.rubber, x, -.71, z, 0, 0, Math.PI / 2);
    cyl(still, .23, .23, .262, C.rust, x + Math.sign(x) * .02, -.71, z, 0, 0, Math.PI / 2);
    cyl(still, .095, .095, .27, C.steel, x + Math.sign(x) * .025, -.71, z, 0, 0, Math.PI / 2);
  }

  // Emergency roof lightbars — real emissive lenses that intermittently flicker!
  const strobeRedMat = new THREE.MeshStandardMaterial({ color: 0xb0221e, emissive: 0xff281c, emissiveIntensity: 1.6, roughness: 0.3 });
  const strobeAmbMat = new THREE.MeshStandardMaterial({ color: 0xc88a1c, emissive: 0xffa822, emissiveIntensity: 1.2, roughness: 0.3 });
  for (const z of [-2.05, 2.28]) {
    box(still, 1.68, .06, .34, C.black, 0, .97, z);
    const redL = new THREE.Mesh(new THREE.BoxGeometry(.64, .14, .26), strobeRedMat);
    redL.position.set(-.48, 1.05, z); vehicle.add(redL);
    const ambL = new THREE.Mesh(new THREE.BoxGeometry(.64, .14, .26), strobeAmbMat);
    ambL.position.set(.48, 1.05, z); vehicle.add(ambL);
  }

  // Door hinge at the front edge; opening swings the painted panel out of the
  // player's sight line to the sleeper.
  const hinge = new THREE.Group(); hinge.position.set(1.12, 0, -2.48); vehicle.add(hinge);
  const door = new THREE.Group(); hinge.add(door);
  box(door, .095, 1.45, 1.77, C.shell, 0, -.08, .89);
  box(door, .105, .10, 1.65, C.red, .004, -.2, .89);
  box(door, .035, .67, 1.46, C.glass, .055, .33, .88);
  box(door, .055, .09, .24, C.steel, .09, -.16, 1.13);
  box(door, .027, .37, .12, C.red, .068, -.56, .88);
  box(door, .03, .12, .37, C.red, .07, -.56, .88);

  const sleeperMount = new THREE.Group();
  sleeperMount.name = 'convoy-sleeper-mount';
  const sleeperRestX = 1.55, sleeperRestY = groundAt(1.55, -1.5) + .13, sleeperRestZ = -1.5;
  sleeperMount.position.set(sleeperRestX, sleeperRestY, sleeperRestZ);
  sleeperMount.rotation.y = Math.PI / 2;
  sleeperMount.scale.setScalar(.68);
  wreck.add(sleeperMount);

  // Heavy PGB 10-Ton Hydraulic Recovery Jack (replaces flat cylinder + toy yellow donut!)
  const jack = new THREE.Group(); jack.name = 'convoy-jack'; wreck.add(jack);
  const jackX = 1.72, jackZ = -2.28;
  jack.position.set(jackX, groundAt(jackX, jackZ), jackZ);
  // Heavy riveted steel base plate + triangular reinforcement gussets
  box(jack, .84, .08, .68, C.black, 0, .04, 0, 0, 0, 0, { metalness: 0.55, roughness: 0.55 });
  box(jack, .70, .035, .56, C.olive, 0, .098, 0, 0, 0, 0, { metalness: 0.25, roughness: 0.72 });
  for (const x of [-.31, .31]) for (const z of [-.24, .24]) cyl(jack, .032, .032, .022, C.steel, x, .122, z, 0, 0, 0, { metalness: 0.7 });
  // Ribbed hydraulic cylinder housing + oil reservoir collar
  cyl(jack, .20, .23, .44, C.olive, 0, .33, 0, 0, 0, 0, { metalness: 0.32, roughness: 0.62 });
  cyl(jack, .22, .22, .05, C.black, 0, .15, 0);
  cyl(jack, .215, .215, .045, C.black, 0, .54, 0);
  // 4 vertical steel brace fins around the bottle jack housing
  for (const ang of [0.6, 2.5, 3.8, 5.7]) {
    box(jack, .045, .36, .09, C.steel, Math.cos(ang) * .21, .31, Math.sin(ang) * .21, 0, -ang, 0, { metalness: 0.65 });
  }
  // Mechanical pressure gauge dial facing the player (+x)
  cyl(jack, .095, .095, .045, C.black, .22, .41, .14, 0, 0, Math.PI / 2);
  if (tex.gaugeDial) {
    const gd = new THREE.Mesh(new THREE.CircleGeometry(.082, 16), new THREE.MeshStandardMaterial({ map: tex.gaugeDial, roughness: 0.35 }));
    gd.position.set(.245, .41, .14); gd.rotation.y = Math.PI / 2; jack.add(gd);
  }
  // 8-notch illuminated hydraulic bar facing +x
  box(jack, .045, .13, .62, C.black, .42, .20, 0);
  for (let i = 1; i < 8; i++) box(jack, .052, .024, .010, C.steel, .45, .20, -.30 + i * .075);
  const gaugeMat = new THREE.MeshStandardMaterial({ color: C.gauge, emissive: C.gauge, emissiveIntensity: .9, roughness: .42 });
  const gauge = new THREE.Mesh(new THREE.BoxGeometry(.050, .072, .59), gaugeMat);
  gauge.position.set(.45, .20, -.295); jack.add(gauge);

  const ram = new THREE.Group(); jack.add(ram);
  cyl(ram, .115, .125, 1.05, C.steel, 0, .38, 0, 0, 0, 0, { metalness: 0.82, roughness: 0.32 });
  box(ram, .50, .085, .36, C.black, -.12, .87, 0);
  // Saddle grip teeth on lifting cradle
  for (const sz of [-.12, 0, .12]) box(ram, .42, .025, .035, C.steel, -.12, .92, sz);
  bar(ram, [-.2, .86, -.12], [-.68, .9, -.12], .042, C.steel);
  bar(ram, [-.2, .86, .12], [-.68, .9, .12], .042, C.steel);

  const handle = new THREE.Group(); handle.position.set(.08, .38, .03); jack.add(handle);
  bar(handle, [0, 0, 0], [.64, .31, .12], .038, C.steel);
  box(handle, .24, .075, .095, C.rubber, .68, .33, .12);
  // Sleek industrial pulse collar & caged beat indicator lamp (replaces giant yellow donut)
  const pulseMat = new THREE.MeshStandardMaterial({ color: C.pulse, emissive: C.pulse, emissiveIntensity: .15, roughness: .45 });
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(.34, .022, 8, 28), pulseMat);
  pulse.rotation.x = Math.PI / 2; pulse.position.y = .135; jack.add(pulse);
  const cueLamp = new THREE.Mesh(new THREE.CylinderGeometry(.058, .064, .09, 12), pulseMat);
  cueLamp.position.set(.29, .62, .22); jack.add(cueLamp);
  cyl(jack, .072, .076, .03, C.black, .29, .57, .22);
  cyl(jack, .068, .068, .024, C.black, .29, .67, .22);

  // Bent steel rocker sill pinning the medical cooler (grounded cleanly, no floating brown brick!)
  const cy = groundAt(1.5, -1.2);
  const pin = new THREE.Group(); wreck.add(pin);
  box(pin, .32, .07, .82, C.steel, 1.44, cy + .34, -1.2, 0, -.09, .18, { metalness: 0.55, roughness: 0.62 });
  box(pin, .34, .03, .76, C.rust, 1.44, cy + .38, -1.2, 0, -.09, .18);
  bar(pin, [1.26, cy + .34, -1.56], [1.58, cy + .29, -.86], .026, C.steel);
  bar(pin, [1.06, cy + .33, -1.42], [1.38, cy + .32, -1.42], .028, C.black);
  bar(pin, [1.06, cy + .33, -.96], [1.38, cy + .32, -.96], .028, C.black);

  // Roadside storytelling props: Hale's blood-smudged manifest clipboard, spilled dressings, oil slick & tire chocks
  const props = new THREE.Group(); props.name = 'convoy-story-props'; wreck.add(props);
  const oilMat = new THREE.MeshStandardMaterial({ color: 0x161918, roughness: 0.22, metalness: 0.35, transparent: true, opacity: 0.85, depthWrite: false });
  const oil = new THREE.Mesh(new THREE.CircleGeometry(.95, 16), oilMat);
  oil.rotation.x = -Math.PI / 2; oil.scale.set(1.25, 0.78, 1);
  oil.position.set(.65, groundAt(.65, -2.95) + .025, -2.95);
  props.add(oil);
  // Hale's clipboard beside the medical cooler
  const cbY = groundAt(2.25, -1.05);
  if (tex.clipboard) {
    const cb = new THREE.Mesh(new THREE.BoxGeometry(.28, .022, .36), new THREE.MeshStandardMaterial({ map: tex.clipboard, roughness: 0.85 }));
    cb.position.set(2.25, cbY + .018, -1.05); cb.rotation.y = 0.52; cb.castShadow = true; cb.receiveShadow = true;
    props.add(cb);
  }
  // Spilled sterile bandage roll & gauze packet near the pinned cooler
  cyl(props, .048, .048, .12, C.bandage, 2.02, groundAt(2.02, -.72) + .048, -.72, Math.PI / 2, 0.4, 0);
  box(props, .18, .035, .14, C.bandage, 1.88, groundAt(1.88, -.54) + .02, -.54, 0, -.35, 0);
  box(props, .055, .038, .016, C.red, 1.88, groundAt(1.88, -.54) + .025, -.54, 0, -.35, 0);
  // Timber wheel chock wedged by the rear tire
  box(props, .18, .14, .28, C.rust, 1.68, groundAt(1.68, 1.75) + .07, 1.75, 0, .24, 0);

  foldStatic(THREE, TSL, still);
  foldStatic(THREE, TSL, door);
  foldStatic(THREE, TSL, jack, { skip: (o) => o === pulse || o === ram || o === handle || o === gauge || o === cueLamp || !!o.material?.map });
  foldStatic(THREE, TSL, ram);
  foldStatic(THREE, TSL, handle);
  foldStatic(THREE, TSL, pin);
  foldStatic(THREE, TSL, props, { skip: (o) => !!o.material?.map || !!o.material?.transparent });
  wreck.updateWorldMatrix(true, true);

  const jackAt = wreck.localToWorld(new THREE.Vector3(jackX + .42, groundAt(jackX, jackZ), jackZ + .15));
  let taken = false, doorTarget = 0, doorCur = 0, warningOn = false, warningClock = 0, strobeClock = 0;
  let lastProgress = 0, sleeperLunge = 0;

  const setDoorOpen = (open) => {
    const isOpen = !!(open || taken);
    doorTarget = isOpen ? 1.52 : 0;
    // Set hinge immediately so synchronous raycast/test checks (t265) see the open cab right away.
    doorCur = doorTarget;
    hinge.rotation.y = doorCur;
    if (isOpen && !taken) sleeperLunge = 1.0;
  };
  const setWarning = (on) => {
    warningOn = !!on;
    if (!warningOn && !taken && doorTarget === 0) hinge.rotation.y = 0;
  };
  const setAftermath = (value) => {
    const next = value === true; if (next === taken) return;
    taken = next; setDoorOpen(false);
    for (const { pivot, side } of rearDoors) pivot.rotation.y = taken ? side * 1.32 : 0;
  };

  // Dash transceiver receiver (exported for real E reach)
  const radio = new THREE.Group(); radio.name = 'convoy-cab-radio'; vehicle.add(radio); radio.position.set(.72, .03, -2.32);
  box(radio, .32, .15, .13, C.black, 0, 0, 0);
  box(radio, .17, .055, .012, C.glass, -.035, .025, .071);
  for (const x of [-.12, .12]) cyl(radio, .025, .025, .025, C.steel, x, -.035, .082, Math.PI / 2);
  foldStatic(THREE, TSL, radio);
  const radioAt = () => radio.getWorldPosition(new THREE.Vector3());

  const setBeatPulse = (v, ready = false) => {
    const t = Math.max(0, Math.min(1, Number(v) || 0));
    pulse.scale.setScalar(1 + t * .28);
    cueLamp.scale.setScalar(1 + t * .24);
    pulseMat.color.setHex(ready ? C.ready : C.pulse);
    pulseMat.emissive.setHex(ready ? C.ready : C.pulse);
    pulseMat.emissiveIntensity = .15 + t * 2.9;
  };
  const setJackProgress = (v) => {
    const progress = Math.max(0, Math.min(1, Number(v) || 0));
    lastProgress = progress;
    const rise = progress * .52;
    ram.position.y = rise;
    vehicle.position.y = 1.58 + rise * .68;
    vehicle.rotation.z = -.89 + progress * .16;
    pin.position.y = rise * .68;
    sleeperMount.position.y = sleeperRestY + rise * .68;
    gauge.scale.z = Math.max(.001, progress);
    gauge.position.z = -.295 + .295 * progress;
    gaugeMat.color.setHex(progress >= 0.99 ? C.ready : C.gauge);
    gaugeMat.emissive.setHex(progress >= 0.99 ? C.ready : C.gauge);
  };

  let strokeTime = 0, strokeSign = 1, coolerSlide = 0;
  const stroke = (miss = false) => { strokeTime = .28; strokeSign = miss ? -1 : 1; };
  const animate = (dt, cooler = null, released = false) => {
    const d = Math.max(0, Number.isFinite(dt) ? dt : 0);
    strokeTime = Math.max(0, strokeTime - d);
    const motion = strokeTime / .28;
    handle.rotation.z = strokeSign * motion * .42;

    // Flickering damaged emergency roof lightbar (dying ambulance battery, speeds up on warning!)
    strobeClock += d;
    const wMul = warningOn ? 4.5 : 1.0;
    const blinkA = Math.sin(strobeClock * 4.2 * wMul) > 0.35 ? 2.4 : 0.12;
    const blinkB = Math.sin(strobeClock * 4.2 * wMul + Math.PI) > 0.45 ? 1.9 : 0.08;
    // Occasional electrical stutter drop
    const sputter = Math.sin(strobeClock * 17.3) > -0.78 ? 1 : 0.15;
    strobeRedMat.emissiveIntensity = taken ? 0.15 : blinkA * sputter;
    strobeAmbMat.emissiveIntensity = taken ? 0.12 : blinkB * sputter;

    // Violent cab-door rattle during the 0.5 s sleeper warning phase
    if (warningOn && !taken) {
      warningClock += d;
      hinge.rotation.y = Math.max(0, Math.sin(warningClock * 52) * 0.14 + 0.08);
      vehicle.rotation.x = Math.sin(warningClock * 48) * 0.012;
    } else {
      warningClock = 0;
      vehicle.rotation.x = 0;
      hinge.rotation.y = doorCur;
    }

    // Sleeper slight forward lunge when cab door bursts open
    if (sleeperLunge > 0) {
      sleeperLunge = Math.max(0, sleeperLunge - d * 1.4);
      sleeperMount.position.x = sleeperRestX + Math.sin(sleeperLunge * Math.PI) * 0.18;
    } else {
      sleeperMount.position.x = sleeperRestX;
    }

    coolerSlide = released ? Math.min(1, coolerSlide + d * 1.8) : 0;
    if (cooler?.group && cooler.centre && cooler.approach) {
      const dx = cooler.approach.x - cooler.centre.x;
      const dz = cooler.approach.z - cooler.centre.z;
      const dist = Math.hypot(dx, dz) || 1;
      cooler.group.position.set(
        cooler.centre.x + dx / dist * .65 * coolerSlide,
        cooler.centre.y,
        cooler.centre.z + dz / dist * .65 * coolerSlide
      );
    }
  };
  setDoorOpen(false); setBeatPulse(0); setJackProgress(0);
  return {
    jackAt, sleeperMount, setDoorOpen, setWarning, setAftermath, radioAt, radio,
    rearDoors, setBeatPulse, setJackProgress, stroke, animate, vehicle, jack, door: hinge, gauge
  };
}
