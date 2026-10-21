// qa/2026-10-15-AG-80/apply-upgrades.mjs
// Applies visual upgrades to the 8 buildables from Jerry's screenshot and all 24 of their variants:
// 1. Barbed wire (tiers 0..2: Barbed wire, Concertina wire, Razor wire)
// 2. Railing (tiers 0..2: Railing, Mesh railing, Armoured parapet)
// 3. Platform (tiers 0..2: Platform, Plated platform, Gun emplacement)
// 4. Structural pillar (tiers 0..2: Structural pillar, Concrete pillar, Steel column)
// 5. Stairs (tiers 0..2: Stairs, Steel stairs, Retractable stairs)
// 6. Spike trap (tiers 0..2: Spike trap, Resetting spikes, Steel spike bed)
// 7. Land mine (tiers 0..2: Land mine, Frag mine, Bounding mine)
// 8. Decoy beacon (tiers 0..2: Decoy beacon, Siren beacon, Shock beacon)
import fs from 'node:fs';
import crypto from 'node:crypto';

const INDEX_PATH = 'index.html';
const rawBefore = fs.readFileSync(INDEX_PATH);
const hashBefore = crypto.createHash('sha256').update(rawBefore).digest('hex');
let src = rawBefore.toString('utf8');

const eol = src.includes('\r\n') ? '\r\n' : '\n';
function norm(s) {
  return s.replace(/\r?\n/g, eol);
}

function replaceExact(label, targetRaw, replacementRaw) {
  const target = norm(targetRaw);
  const replacement = norm(replacementRaw);
  const idx = src.indexOf(target);
  if (idx === -1) {
    throw new Error(`Target block not found for: ${label}`);
  }
  if (src.indexOf(target, idx + target.length) !== -1) {
    throw new Error(`Target block is not unique for: ${label}`);
  }
  src = src.slice(0, idx) + replacement + src.slice(idx + target.length);
  console.log(`Replaced block: ${label}`);
}

// ---------------------------------------------------------------------------
// 1. SPIKE TRAP BASE MESH (makeSpikesMesh)
// ---------------------------------------------------------------------------
const TARGET_SPIKES = `    const SPIKE_SINK = 0.95;
    const SPIKE_DMG = 160;
    function makeSpikesMesh(matOverride = null) {
      const g = new THREE.Group();
      const dirtMat = matOverride || new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 1 });
      const frameMat = matOverride || new THREE.MeshStandardMaterial({ color: 0x3e434a, metalness: 0.5, roughness: 0.55 });
      const spikeMat = matOverride || new THREE.MeshStandardMaterial({ color: 0x9aa4ae, metalness: 0.75, roughness: 0.3 });
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 1.8), dirtMat);
      bed.position.y = 0.02;
      bed.receiveShadow = true;
      g.add(bed);
      for (const [sx, sz, w, d] of [[1, 0, 0.08, 1.9], [-1, 0, 0.08, 1.9], [0, 1, 1.9, 0.08], [0, -1, 1.9, 0.08]]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), frameMat);
        rail.position.set(sx * 0.91, 0.03, sz * 0.91);
        g.add(rail);
      }
      const spikes = new THREE.Group();
      for (let i = 0; i < 5; i++) for (let k = 0; k < 5; k++) {
        const h = 0.7 + ((i + k) % 3) * 0.14;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, h, 5), spikeMat);
        spike.position.set(-0.72 + i * 0.36, h / 2, -0.72 + k * 0.36);
        spike.rotation.set((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2);
        spike.castShadow = true;
        spikes.add(spike);
      }
      // The ghost shows what it will do; the real trap starts buried.
      if (!matOverride) { spikes.position.y = -SPIKE_SINK; spikes.visible = false; }
      g.add(spikes);
      g.userData.spikes = spikes;
      return g;
    }`;

const REPLACE_SPIKES = `    const SPIKE_SINK = 0.95;
    const SPIKE_DMG = 160;
    function makeSpikesMesh(matOverride = null) {
      const g = new THREE.Group();
      const dirtMat = matOverride || tierMats.woodDark;
      const slatMat = matOverride || tierMats.woodPost;
      const frameMat = matOverride || tierMats.steelDark;
      const spikeMat = matOverride || tierMats.steelLight;
      const holeMat = matOverride || tierMats.black;
      const rivMat = matOverride || tierMats.rivet;
      // Recessed dark earth & timber pit bed.
      const bed = _box(1.82, 0.05, 1.82, dirtMat, 0, 0.015, 0);
      bed.castShadow = false;
      g.add(bed);
      // Camouflaged slatted deck boards with gaps between them.
      for (let s = 0; s < 5; s++) {
        const z = -0.72 + s * 0.36;
        g.add(_box(1.76, 0.022, 0.26, slatMat, 0, 0.042, z));
      }
      // Heavy mitered steel perimeter frame, corner gussets, and side torsion-spring housings.
      for (const [sx, sz, w, d] of [[1, 0, 0.09, 1.94], [-1, 0, 0.09, 1.94], [0, 1, 1.94, 0.09], [0, -1, 1.94, 0.09]]) {
        g.add(_box(w, 0.08, d, frameMat, sx * 0.925, 0.04, sz * 0.925));
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        g.add(_box(0.18, 0.09, 0.18, frameMat, sx * 0.88, 0.045, sz * 0.88));
        g.add(_box(0.05, 0.03, 0.05, rivMat, sx * 0.88, 0.095, sz * 0.88));
      }
      // 5x5 murder-hole ports with glinting steel spike-tips poised at surface level (so the trap reads clearly even while armed/buried),
      // plus the full-length spring-up impaler spikes in 'spikes' (hidden until sprung).
      const spikes = new THREE.Group();
      for (let i = 0; i < 5; i++) for (let k = 0; k < 5; k++) {
        const px = -0.72 + i * 0.36, pz = -0.72 + k * 0.36;
        // Surface murder-hole collar & poised spike tip.
        g.add(_box(0.11, 0.024, 0.11, holeMat, px, 0.048, pz));
        const tip = _mesh(new THREE.ConeGeometry(0.036, 0.09, 5), spikeMat);
        tip.position.set(px, 0.075, pz);
        g.add(tip);
        // Full-height impaler spike in the animated 'spikes' group.
        const h = 0.76 + ((i + k) % 3) * 0.12;
        const spike = _mesh(new THREE.ConeGeometry(0.062, h, 5), spikeMat);
        spike.position.set(px, h / 2, pz);
        const h1 = _hash(i * 7 + k, k * 13 + i) - 0.5, h2 = _hash(k * 11 + i, i * 5 + 3) - 0.5;
        spike.rotation.set(h1 * 0.14, 0, h2 * 0.14);
        spike.castShadow = true;
        spikes.add(spike);
      }
      // The ghost shows what it will do; the real trap starts buried.
      if (!matOverride) { spikes.position.y = -SPIKE_SINK; spikes.visible = false; }
      g.add(spikes);
      g.userData.spikes = spikes;
      return g;
    }`;

replaceExact('makeSpikesMesh', TARGET_SPIKES, REPLACE_SPIKES);

// ---------------------------------------------------------------------------
// 2. PLATFORM & PILLAR BASE MESHES (makePlatformMesh, makePillarMesh)
// ---------------------------------------------------------------------------
const TARGET_PLATFORM_PILLAR = `    const PLATFORM_PAD = 0.88;   // half-width of the raised plate: the Watchman tripod and the mortar baseplate both sit on it, clear of the rail posts
    function makePlatformMesh(matOverride = null) {
      const g = new THREE.Group();
      const steel = matOverride || new THREE.MeshStandardMaterial({ color: 0x5b636e, metalness: 0.7, roughness: 0.4 });
      const dark = matOverride || new THREE.MeshStandardMaterial({ color: 0x3d434b, metalness: 0.65, roughness: 0.5 });
      const rimTop = BUILD_RULES.platform.edgeH, midTop = BUILD_RULES.platform.height;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(BUILD_GRID, 0.1, BUILD_GRID), steel);
      deck.position.y = rimTop - 0.05; deck.castShadow = true; deck.receiveShadow = true;
      g.add(deck);
      // Grating on the rim: slats proud of the deck so it does not read as a slab.
      for (let i = 0; i < 5; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(BUILD_GRID * 0.94, 0.03, 0.08), dark);
        bar.position.set(0, rimTop + 0.012, -0.8 + i * 0.4);
        g.add(bar);
      }
      // Edge frame all the way round, flush with the cell.
      for (const [sx, sz, w, d] of [[1, 0, 0.1, BUILD_GRID], [-1, 0, 0.1, BUILD_GRID], [0, 1, BUILD_GRID, 0.1], [0, -1, BUILD_GRID, 0.1]]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), dark);
        beam.position.set(sx * (BUILD_GRID / 2 - 0.05), rimTop - 0.1, sz * (BUILD_GRID / 2 - 0.05));
        g.add(beam);
      }
      // The raised mount: a square frustum (a four-sided cylinder turned 45 degrees),
      // sloping up from the rim to a flat plate.
      const rise = midTop - rimTop;
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(PLATFORM_PAD * Math.SQRT2, (PLATFORM_PAD - 0.08) * Math.SQRT2, rise, 4, 1), steel);
      pad.rotation.y = Math.PI / 4;
      pad.position.y = rimTop + rise / 2;
      pad.castShadow = true; pad.receiveShadow = true;
      g.add(pad);
      // Flat steel across the mount, wide enough for the Watchman's tripod and the
      // mortar's baseplate. The old plate stopped inside the pad, so the feet hung
      // on the slope and read as sunk into the mount. It stays clear of the rail posts.
      const plate = new THREE.Mesh(new THREE.BoxGeometry(PLATFORM_PAD * 2, 0.04, PLATFORM_PAD * 2), dark);
      plate.position.y = midTop + 0.02;
      g.add(plate);
      for (const [bx, bz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 6), steel);
        bolt.position.set(bx * PLATFORM_PAD * 0.7, midTop + 0.055, bz * PLATFORM_PAD * 0.7);
        g.add(bolt);
      }
      return g;
    }
    // A structural pillar: a steel post on a foot plate, with a wide cap plate on top
    // that the corners of four decks rest on (and a turret can bolt to).
    const pillarSteelMat = new THREE.MeshStandardMaterial({ color: 0x4d5560, metalness: 0.7, roughness: 0.42 });
    const pillarDarkMat = new THREE.MeshStandardMaterial({ color: 0x353b43, metalness: 0.6, roughness: 0.5 });
    function makePillarMesh(matOverride = null) {
      const g = new THREE.Group();
      const steel = matOverride || pillarSteelMat, dark = matOverride || pillarDarkMat;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, PILLAR_H + 0.5, 0.3), steel);
      post.position.y = (PILLAR_H + 0.5) / 2 - 0.5;
      post.castShadow = true;
      g.add(post);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.62), dark);
      foot.position.y = 0.05;
      g.add(foot);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), dark);
      cap.position.y = PILLAR_H - 0.05;
      cap.castShadow = true;
      g.add(cap);
      // Four gussets under the cap.
      for (let k = 0; k < 4; k++) {
        const gus = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.24), dark);
        const a = k * Math.PI / 2;
        gus.position.set(Math.sin(a) * 0.26, PILLAR_H - 0.23, Math.cos(a) * 0.26);
        gus.rotation.y = a;
        g.add(gus);
      }
      return g;
    }`;

const REPLACE_PLATFORM_PILLAR = `    const PLATFORM_PAD = 0.88;   // half-width of the raised plate: the Watchman tripod and the mortar baseplate both sit on it, clear of the rail posts
    function makePlatformMesh(matOverride = null) {
      const g = new THREE.Group(), G = BUILD_GRID;
      const steel = matOverride || tierMats.steel;
      const dark = matOverride || tierMats.steelDark;
      const light = matOverride || tierMats.steelLight;
      const riv = matOverride || tierMats.rivet;
      const brass = matOverride || tierMats.brass;
      const rimTop = BUILD_RULES.platform.edgeH, midTop = BUILD_RULES.platform.height;
      // Structural steel sub-deck and industrial grating bars across the rim.
      g.add(_box(G * 0.98, 0.1, G * 0.98, steel, 0, rimTop - 0.05, 0));
      for (let i = 0; i < 7; i++) {
        const pos = -0.84 + i * 0.28;
        g.add(_box(G * 0.94, 0.026, 0.055, dark, 0, rimTop + 0.011, pos));
        g.add(_box(0.055, 0.026, G * 0.94, dark, pos, rimTop + 0.011, 0));
      }
      // Welded C-channel edge frame all the way round, flush with the cell, with corner gusset plates and rivets.
      for (const [sx, sz, w, d] of [[1, 0, 0.1, G], [-1, 0, 0.1, G], [0, 1, G, 0.1], [0, -1, G, 0.1]]) {
        g.add(_box(w, 0.2, d, dark, sx * (G / 2 - 0.05), rimTop - 0.1, sz * (G / 2 - 0.05)));
        g.add(_box(sx ? 0.12 : G * 0.92, 0.035, sz ? 0.12 : G * 0.92, light, sx * (G / 2 - 0.05), rimTop - 0.19, sz * (G / 2 - 0.05)));
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        g.add(_box(0.18, 0.21, 0.18, dark, sx * (G / 2 - 0.08), rimTop - 0.095, sz * (G / 2 - 0.08)));
      }
      // The raised mount: a bevelled square frustum sloping up from the rim to the flat turret plate.
      const rise = midTop - rimTop;
      const pad = _mesh(new THREE.CylinderGeometry(PLATFORM_PAD * Math.SQRT2, (PLATFORM_PAD - 0.08) * Math.SQRT2, rise, 4, 1), steel);
      pad.rotation.y = Math.PI / 4;
      pad.position.y = rimTop + rise / 2;
      pad.castShadow = true; pad.receiveShadow = true;
      g.add(pad);
      // Flat armoured steel plate across the mount, with circular turret bearing ring, corner hazard markers, and 8 bolts.
      g.add(_box(PLATFORM_PAD * 2, 0.04, PLATFORM_PAD * 2, dark, 0, midTop + 0.02, 0));
      g.add(_box(PLATFORM_PAD * 1.86, 0.014, PLATFORM_PAD * 1.86, steel, 0, midTop + 0.044, 0));
      const ring = _mesh(new THREE.CylinderGeometry(0.56, 0.58, 0.018, 16), light);
      ring.position.y = midTop + 0.052;
      g.add(ring);
      const hub = _mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.022, 12), dark);
      hub.position.y = midTop + 0.054;
      g.add(hub);
      for (const [bx, bz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        g.add(_box(0.18, 0.016, 0.06, brass, bx * (PLATFORM_PAD - 0.12), midTop + 0.046, bz * (PLATFORM_PAD - 0.06)));
        g.add(_box(0.06, 0.016, 0.18, brass, bx * (PLATFORM_PAD - 0.06), midTop + 0.046, bz * (PLATFORM_PAD - 0.12)));
        const bolt = _mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 6), riv);
        bolt.position.set(bx * PLATFORM_PAD * 0.72, midTop + 0.058, bz * PLATFORM_PAD * 0.72);
        g.add(bolt);
      }
      for (const [bx, bz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        g.add(_box(0.045, 0.024, 0.045, riv, bx * PLATFORM_PAD * 0.78, midTop + 0.055, bz * PLATFORM_PAD * 0.78));
      }
      return g;
    }
    // A structural pillar: a riveted steel box/flanged post on an anchored foot plate, with a wide capital plate and gussets.
    const pillarSteelMat = new THREE.MeshStandardMaterial({ color: 0x4d5560, metalness: 0.7, roughness: 0.42 });
    const pillarDarkMat = new THREE.MeshStandardMaterial({ color: 0x353b43, metalness: 0.6, roughness: 0.5 });
    function makePillarMesh(matOverride = null) {
      const g = new THREE.Group();
      const steel = matOverride || tierMats.steel;
      const dark = matOverride || tierMats.steelDark;
      const light = matOverride || tierMats.steelLight;
      const riv = matOverride || tierMats.rivet;
      const ph = PILLAR_H + 0.5, py = ph / 2 - 0.5;
      // Core structural box-post with 4 corner angle flanges and horizontal batten collar plates.
      g.add(_box(0.26, ph, 0.26, steel, 0, py, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        g.add(_box(0.065, ph, 0.065, dark, sx * 0.125, py, sz * 0.125));
      }
      for (const cy of [0.35, 0.85, 1.35, PILLAR_H - 0.35]) {
        g.add(_box(0.33, 0.055, 0.33, dark, 0, cy, 0));
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          g.add(_box(0.036, 0.036, 0.036, riv, sx * 0.16, cy, sz * 0.16));
        }
      }
      // Stepped ground baseplate with 4 anchor bolts and 4 lower gusset fins.
      g.add(_box(0.64, 0.08, 0.64, dark, 0, 0.04, 0));
      g.add(_box(0.46, 0.06, 0.46, light, 0, 0.10, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        g.add(_box(0.05, 0.04, 0.05, riv, sx * 0.25, 0.09, sz * 0.25));
      }
      // Wide top capital plate and 4 deep under-cap gusset brackets.
      g.add(_box(0.82, 0.08, 0.82, dark, 0, PILLAR_H - 0.04, 0));
      g.add(_box(0.74, 0.03, 0.74, light, 0, PILLAR_H - 0.09, 0));
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2;
        const gus = _box(0.06, 0.28, 0.26, dark, Math.sin(a) * 0.26, PILLAR_H - 0.22, Math.cos(a) * 0.26);
        gus.rotation.y = a;
        g.add(gus);
        const footGus = _box(0.05, 0.20, 0.18, dark, Math.sin(a) * 0.21, 0.18, Math.cos(a) * 0.21);
        footGus.rotation.y = a;
        g.add(footGus);
      }
      return g;
    }`;

replaceExact('makePlatformMesh and makePillarMesh', TARGET_PLATFORM_PILLAR, REPLACE_PLATFORM_PILLAR);

// ---------------------------------------------------------------------------
// 3. STAIRS, WIRE, RAILING, MINE, LURE BASE MESHES
// ---------------------------------------------------------------------------
const TARGET_STAIRS_TO_LURE = `    // Ramps one storey across the cell. The treads are cosmetic; what the player and
    // the horde actually walk on is the sloped deck registered in \`platforms\`.
    function makeStairsMesh(matOverride = null) {
      const g = new THREE.Group();
      const wood = matOverride || new THREE.MeshStandardMaterial({ color: 0x6f5334, roughness: 0.88 });
      const metal = matOverride || new THREE.MeshStandardMaterial({ color: 0x555b63, metalness: 0.55, roughness: 0.5 });
      const N = 7, run = BUILD_GRID / N, rise = LEVEL_H / N;
      for (let i = 0; i < N; i++) {
        const tread = new THREE.Mesh(new THREE.BoxGeometry(BUILD_GRID * 0.86, rise * 0.9, run * 1.02), wood);
        tread.position.set(0, rise * (i + 0.5), -BUILD_GRID / 2 + run * (i + 0.5));
        tread.castShadow = true; tread.receiveShadow = true;
        g.add(tread);
      }
      for (const sx of [-1, 1]) {
        const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, Math.hypot(BUILD_GRID, LEVEL_H)), metal);
        stringer.position.set(sx * (BUILD_GRID * 0.45), LEVEL_H / 2, 0);
        stringer.rotation.x = -Math.atan2(LEVEL_H, BUILD_GRID);
        g.add(stringer);
      }
      return g;
    }
    // Half height and mostly air: you shoot over it, it shreds whatever pushes through.
    // Posts at both ends and the middle of its edge, three barbed strands between.
    const wireSteelMat = new THREE.MeshStandardMaterial({ color: 0x8b8f96, metalness: 0.75, roughness: 0.45 });
    function makeWireMesh(matOverride = null) {
      const { outer, inner } = edgeGroups(EDGE_SPEC.wire.edge);
      const steel = matOverride || wireSteelMat, S = BUILD_GRID;
      for (const sx of [-1, 0, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), steel);
        post.position.set(sx * (S / 2 - 0.05), 0.5, 0);
        post.castShadow = true;
        inner.add(post);
      }
      for (const y of [0.35, 0.65, 0.92]) {
        const strand = new THREE.Mesh(new THREE.BoxGeometry(S, 0.035, 0.035), steel);
        strand.position.set(0, y, 0);
        inner.add(strand);
        for (let i = 0; i < 8; i++) {
          const barb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.13, 0.02), steel);
          barb.position.set(-S / 2 + S / 8 * (i + 0.5), y, 0);
          barb.rotation.z = (i % 2 ? 1 : -1) * 0.7;
          barb.rotation.x = 0.5;
          inner.add(barb);
        }
      }
      return outer;
    }
    // Sits on the deck EDGE its rotation faces, not across the middle of the deck —
    // a rail down the centre of a platform is just a thing to trip over, and it split
    // the one cell you had to stand on in half. R picks the edge.
    function makeRailingMesh(matOverride = null) {
      const { outer, inner: g } = edgeGroups(EDGE_SPEC.railing.edge);
      const steel = matOverride || new THREE.MeshStandardMaterial({ color: 0x6a7280, metalness: 0.7, roughness: 0.4 });
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, RAIL_H, 0.1), steel);
        post.position.set(sx * (BUILD_GRID / 2 - 0.05), RAIL_H / 2, 0);
        post.castShadow = true;
        g.add(post);
      }
      for (const y of [RAIL_H * 0.5, RAIL_H - 0.045]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(BUILD_GRID, 0.09, 0.09), steel);
        rail.position.set(0, y, 0);
        rail.castShadow = true;
        g.add(rail);
      }
      for (let i = 1; i < 4; i++) {
        const baluster = new THREE.Mesh(new THREE.BoxGeometry(0.06, RAIL_H - 0.05, 0.06), steel);
        baluster.position.set(-BUILD_GRID / 2 + BUILD_GRID / 4 * i, (RAIL_H - 0.05) / 2, 0);
        g.add(baluster);
      }
      return outer;
    }

    function makeMineMesh(matOverride = null) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.12, 14), matOverride || new THREE.MeshStandardMaterial({ color: 0x3f4a3a, metalness: 0.5, roughness: 0.55 }));
      body.position.y = 0.06; g.add(body);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), matOverride || new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 1.2 }));
      led.position.set(0, 0.135, 0); g.add(led);
      g.userData.led = led.material;
      return g;
    }
    function makeLureMesh(matOverride = null) {
      const g = new THREE.Group();
      const steel = matOverride || new THREE.MeshStandardMaterial({ color: 0x4a5560, metalness: 0.7, roughness: 0.45 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 8), steel);
      pole.position.y = 0.75; g.add(pole);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.08, 10), steel);
      foot.position.y = 0.04; g.add(foot);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 10, 1, true), steel);
      horn.rotation.x = Math.PI / 2; horn.position.set(0, 1.3, 0.12); g.add(horn);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), matOverride || new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5500, emissiveIntensity: 1.5 }));
      lamp.position.y = 1.62; g.add(lamp);
      g.userData.lamp = lamp.material;
      // No light on the beacon itself either (see the effect-light pool): placing or
      // losing one would otherwise recompile the scene mid-wave.

      return g;
    }`;

const REPLACE_STAIRS_TO_LURE = `    // Ramps one storey across the cell. The treads are cosmetic; what the player and
    // the horde actually walk on is the sloped deck registered in \`platforms\`.
    function makeStairsMesh(matOverride = null) {
      const g = new THREE.Group(), S = BUILD_GRID;
      const planks = matOverride ? [matOverride] : tierMats.woodPlanks;
      const post = matOverride || tierMats.woodPost;
      const cap = matOverride || tierMats.woodCap;
      const dark = matOverride || tierMats.woodDark;
      const metal = matOverride || tierMats.steelDark;
      const riv = matOverride || tierMats.rivet;
      const N = 7, run = S / N, rise = LEVEL_H / N;
      for (let i = 0; i < N; i++) {
        const yTop = rise * (i + 0.92), zMid = -S / 2 + run * (i + 0.5);
        const pm = planks[i % planks.length];
        // Thick timber tread plank + bullnose front edge + recessed dark riser board + iron side cleats.
        g.add(_box(S * 0.86, rise * 0.32, run * 1.04, pm, 0, yTop - rise * 0.12, zMid));
        g.add(_box(S * 0.87, rise * 0.16, 0.04, cap, 0, yTop - rise * 0.04, zMid - run * 0.48));
        g.add(_box(S * 0.84, rise * 0.68, run * 0.82, dark, 0, rise * (i + 0.42), zMid + run * 0.06));
        for (const sx of [-1, 1]) {
          g.add(_box(0.03, rise * 0.24, run * 0.7, metal, sx * (S * 0.43), yTop - rise * 0.16, zMid));
          g.add(_box(0.025, 0.015, 0.025, riv, sx * (S * 0.38), yTop - rise * 0.03, zMid - run * 0.25));
          g.add(_box(0.025, 0.015, 0.025, riv, sx * (S * 0.38), yTop - rise * 0.03, zMid + run * 0.25));
        }
      }
      // Twin side stringer beams with outer iron flitch plates, central spine beam, and foot/header shoe plates.
      const len = Math.hypot(S, LEVEL_H), ang = -Math.atan2(LEVEL_H, S);
      for (const sx of [-1, 1]) {
        const str = _box(0.09, 0.20, len, post, sx * (S * 0.45), LEVEL_H / 2, 0);
        str.rotation.x = ang;
        g.add(str);
        const flitch = _box(0.025, 0.16, len * 0.96, metal, sx * (S * 0.495), LEVEL_H / 2, 0);
        flitch.rotation.x = ang;
        g.add(flitch);
        g.add(_box(0.14, 0.06, 0.22, metal, sx * (S * 0.45), 0.03, -S / 2 + 0.12));
        g.add(_box(0.14, 0.18, 0.08, metal, sx * (S * 0.45), LEVEL_H - 0.10, S / 2 - 0.04));
      }
      const spine = _box(0.10, 0.14, len * 0.95, dark, 0, LEVEL_H / 2 - 0.08, 0.04);
      spine.rotation.x = ang;
      g.add(spine);
      return g;
    }
    // Half height and mostly air: you shoot over it, it shreds whatever pushes through.
    // Posts at both ends and the middle of its edge, four barbed strands + diagonal X-wires between.
    const wireSteelMat = new THREE.MeshStandardMaterial({ color: 0x8b8f96, metalness: 0.75, roughness: 0.45 });
    function makeWireMesh(matOverride = null) {
      const { outer, inner } = edgeGroups(EDGE_SPEC.wire.edge);
      const steel = matOverride || tierMats.steel;
      const dark = matOverride || tierMats.steelDark;
      const light = matOverride || tierMats.steelLight;
      const riv = matOverride || tierMats.rivet;
      const S = BUILD_GRID;
      // Three military angle-iron / T-section fence pickets with baseplates, buried stakes, and guy-struts on the ends.
      for (const sx of [-1, 0, 1]) {
        const px = sx * (S / 2 - 0.05);
        inner.add(_box(0.075, 1.18, 0.035, dark, px, 0.46, -0.015));
        inner.add(_box(0.035, 1.18, 0.085, steel, px, 0.46, 0.01));
        inner.add(_box(0.14, 0.04, 0.16, dark, px, 0.02, 0));
        inner.add(_box(0.09, 0.035, 0.09, riv, px, 1.05, 0));
        if (sx !== 0) {
          const brace = _box(0.04, 0.55, 0.04, dark, px - sx * 0.14, 0.24, 0);
          brace.rotation.z = sx * 0.52;
          inner.add(brace);
        }
      }
      // Four taut horizontal barbed wire strands with U-bolt post clips and 4-point star barb clusters.
      for (const y of [0.24, 0.48, 0.72, 0.96]) {
        inner.add(_box(S, 0.026, 0.026, steel, 0, y, 0));
        for (const sx of [-1, 0, 1]) {
          inner.add(_box(0.045, 0.045, 0.055, riv, sx * (S / 2 - 0.05), y, 0.015));
        }
        for (let i = 0; i < 8; i++) {
          const bx = -S / 2 + S / 8 * (i + 0.5);
          for (const sgn of [1, -1]) {
            const barb = _box(0.018, 0.13, 0.018, light, bx, y, 0);
            barb.rotation.set(sgn * 0.55, (i % 2 ? 0.4 : -0.4), sgn * 0.68);
            inner.add(barb);
          }
        }
      }
      // Diagonal cross-tension wires across both bays.
      const bayW = S / 2 - 0.06, bayH = 0.68, diag = Math.hypot(bayW, bayH), ang = Math.atan2(bayH, bayW);
      for (const cx of [-S / 4, S / 4]) for (const sgn of [1, -1]) {
        const xw = _box(diag, 0.016, 0.016, steel, cx, 0.60, 0);
        xw.rotation.z = sgn * ang;
        inner.add(xw);
      }
      return outer;
    }
    // Sits on the deck EDGE its rotation faces, not across the middle of the deck —
    // a rail down the centre of a platform is just a thing to trip over, and it split
    // the one cell you had to stand on in half. R picks the edge.
    function makeRailingMesh(matOverride = null) {
      const { outer, inner: g } = edgeGroups(EDGE_SPEC.railing.edge);
      const steel = matOverride || tierMats.steel;
      const dark = matOverride || tierMats.steelDark;
      const light = matOverride || tierMats.steelLight;
      const riv = matOverride || tierMats.rivet;
      const S = BUILD_GRID;
      // End and centre stanchion posts with 4-bolt deck mounting flanges and top saddle caps.
      for (const sx of [-1, 0, 1]) {
        const px = sx * (S / 2 - 0.05), w = sx === 0 ? 0.075 : 0.095;
        g.add(_box(w, RAIL_H, w, dark, px, RAIL_H / 2, 0));
        g.add(_box(w + 0.06, 0.04, w + 0.06, dark, px, 0.02, 0));
        g.add(_box(w + 0.025, 0.04, w + 0.025, riv, px, RAIL_H + 0.01, 0));
      }
      // Ergonomic top handrail, mid safety rail, and bottom toe-kick board.
      g.add(_box(S, 0.075, 0.095, light, 0, RAIL_H - 0.038, 0));
      g.add(_box(S, 0.055, 0.065, steel, 0, RAIL_H * 0.52, 0));
      g.add(_box(S - 0.08, 0.11, 0.04, dark, 0, 0.075, 0));
      // Six vertical square balusters with top/bottom collar rings.
      for (const bx of [-0.75, -0.50, -0.25, 0.25, 0.50, 0.75]) {
        g.add(_box(0.042, RAIL_H - 0.12, 0.042, steel, bx, (RAIL_H - 0.04) / 2, 0));
        g.add(_box(0.058, 0.03, 0.058, riv, bx, RAIL_H * 0.52, 0));
      }
      return outer;
    }

    function makeMineMesh(matOverride = null) {
      const g = new THREE.Group();
      const olive = matOverride || tierMats.olive;
      const dark = matOverride || tierMats.steelDark;
      const black = matOverride || tierMats.black;
      const brass = matOverride || tierMats.brass;
      const riv = matOverride || tierMats.rivet;
      // Stepped olive-drab steel casing with bevelled upper rim and 8 radial reinforcing ribs.
      const baseRing = _mesh(new THREE.CylinderGeometry(0.39, 0.41, 0.045, 16), dark);
      baseRing.position.y = 0.022; g.add(baseRing);
      const body = _mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.11, 16), olive);
      body.position.y = 0.065; body.castShadow = true; body.receiveShadow = true; g.add(body);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rib = _box(0.045, 0.09, 0.12, dark, Math.cos(a) * 0.33, 0.062, Math.sin(a) * 0.33);
        rib.rotation.y = -a;
        g.add(rib);
      }
      // Raised central pressure spider plate with 4 radial sensor prongs and brass arming plug.
      const spider = _mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.035, 12), black);
      spider.position.y = 0.128; g.add(spider);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        const prong = _box(0.04, 0.022, 0.42, riv, 0, 0.142, 0);
        prong.rotation.y = a;
        g.add(prong);
      }
      const plug = _mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 8), brass);
      plug.position.set(0.26, 0.118, 0); g.add(plug);
      const bezel = _mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.025, 10), dark);
      bezel.position.y = 0.148; g.add(bezel);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), matOverride || new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 1.2 }));
      led.position.set(0, 0.162, 0); g.add(led);
      g.userData.led = led.material;
      return g;
    }
    function makeLureMesh(matOverride = null) {
      const g = new THREE.Group();
      const steel = matOverride || tierMats.steel;
      const dark = matOverride || tierMats.steelDark;
      const light = matOverride || tierMats.steelLight;
      const olive = matOverride || tierMats.olive;
      const brass = matOverride || tierMats.brass;
      const riv = matOverride || tierMats.rivet;
      // Heavy circular baseplate with 3 splayed folding stabilizer tripod legs and foot pads.
      const foot = _mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.07, 12), dark);
      foot.position.y = 0.035; g.add(foot);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
        const leg = _box(0.055, 0.38, 0.055, dark, Math.cos(a) * 0.22, 0.18, Math.sin(a) * 0.22);
        leg.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
        g.add(leg);
        const pad = _mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.03, 8), steel);
        pad.position.set(Math.cos(a) * 0.34, 0.015, Math.sin(a) * 0.34);
        g.add(pad);
      }
      // Stepped telescoping steel mast with locking collars and olive-drab field battery box at the base.
      const poleLow = _mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.85, 10), dark);
      poleLow.position.y = 0.45; g.add(poleLow);
      const poleUp = _mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.75, 10), steel);
      poleUp.position.y = 1.18; g.add(poleUp);
      for (const cy of [0.86, 1.28, 1.52]) {
        const col = _mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.045, 10), riv);
        col.position.y = cy; g.add(col);
      }
      // Field battery & frequency generator pack clamped to the lower mast.
      g.add(_box(0.22, 0.26, 0.16, olive, 0, 0.36, -0.11));
      g.add(_box(0.23, 0.04, 0.17, dark, 0, 0.48, -0.11));
      for (const sx of [-0.06, 0.06]) g.add(_box(0.03, 0.04, 0.03, brass, sx, 0.51, -0.11));
      // Acoustic klaxon horn with driver housing and brass throat cone.
      g.add(_box(0.11, 0.11, 0.14, dark, 0, 1.30, 0.04));
      const horn = _mesh(new THREE.ConeGeometry(0.21, 0.36, 12, 1, true), light);
      horn.rotation.x = Math.PI / 2; horn.position.set(0, 1.30, 0.18); g.add(horn);
      const throat = _mesh(new THREE.ConeGeometry(0.07, 0.16, 8), brass);
      throat.rotation.x = -Math.PI / 2; throat.position.set(0, 1.30, 0.22); g.add(throat);
      // High-intensity xenon strobe globe housed inside a 4-bar protective steel roll cage.
      const lampBase = _mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.06, 10), dark);
      lampBase.position.y = 1.54; g.add(lampBase);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), matOverride || new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5500, emissiveIntensity: 1.5 }));
      lamp.position.y = 1.64; g.add(lamp);
      const lampCap = _mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.04, 10), dark);
      lampCap.position.y = 1.77; g.add(lampCap);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        g.add(_box(0.02, 0.24, 0.02, riv, Math.cos(a) * 0.125, 1.65, Math.sin(a) * 0.125));
      }
      g.userData.lamp = lamp.material;
      // No light on the beacon itself either (see the effect-light pool): placing or
      // losing one would otherwise recompile the scene mid-wave.

      return g;
    }`;

replaceExact('makeStairsMesh through makeLureMesh', TARGET_STAIRS_TO_LURE, REPLACE_STAIRS_TO_LURE);

// ---------------------------------------------------------------------------
// 4. DECORATE PIECE FOR WIRE, RAILING, PLATFORM, PILLAR, STAIRS, SPIKES, MINE, LURE
// ---------------------------------------------------------------------------
const TARGET_DECORATE_8 = `      } else if (kind === 'wire') {
        if (tier === 1) {
          for (let i = 0; i < 5; i++) {
            const coil = _mesh(new THREE.TorusGeometry(0.34, 0.025, 4, 9), tierMats.steelLight);
            coil.position.set(-S / 2 + S * (i + 0.5) / 5, 0.55, 0);
            coil.rotation.y = Math.PI / 2; coil.rotation.x = 0.25 * (i % 2 ? 1 : -1);
            add(coil);
          }
        } else {
          hideBuilt(mesh);
          for (const sx of [-1, 0, 1]) add(_box(0.07, 1.25, 0.07, tierMats.steelDark, sx * (S / 2 - 0.05), 0.5, 0));   // pickets
          for (const y of [0.35, 0.7, 1.05]) {
            for (let i = 0; i < 9; i++) {
              const tape = add(_box(S / 9 * 0.9, 0.11, 0.02, tierMats.steelLight, -S / 2 + S * (i + 0.5) / 9, y, 0));
              tape.rotation.x = (i % 2 ? 0.7 : -0.7);
            }
          }
        }
      } else if (kind === 'railing') {
        if (tier === 1) {
          for (let i = 0; i < 11; i++) add(_box(0.022, RAIL_H - 0.12, 0.022, tierMats.steelDark, -S / 2 + S * (i + 0.5) / 11, (RAIL_H - 0.12) / 2, 0));
          for (const y of [RAIL_H * 0.3, RAIL_H * 0.62]) add(_box(S, 0.022, 0.022, tierMats.steelDark, 0, y, 0));
        } else {
          hideBuilt(mesh);
          add(_box(S, RAIL_H * 0.92, 0.1, tierMats.steel, 0, RAIL_H * 0.46, 0));                   // plate to the waist
          add(_box(S, 0.09, 0.3, tierMats.steelDark, 0, RAIL_H * 0.95, -0.1));                     // firing ledge
          for (let x = -S / 2 + 0.12; x < S / 2; x += 0.25) add(_box(0.04, 0.04, 0.04, tierMats.rivet, x, 0.12, 0.06));
          for (const sx of [-1, 1]) add(_box(0.1, RAIL_H, 0.14, tierMats.steelDark, sx * (S / 2 - 0.05), RAIL_H / 2, 0));
        }
      } else if (kind === 'platform') {
        const r = ruleFor('platform'), e = r.edgeH;
        for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) add(_box(sx ? 0.06 : S, 0.34, sz ? 0.06 : S, tierMats.steelDark, sx * (S / 2 - 0.03), e - 0.17, sz * (S / 2 - 0.03)));
        if (tier >= 2) {
          for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) add(_box(sx ? 0.36 : S * 0.86, 0.3, sz ? 0.36 : S * 0.86, sandbagMat, sx * (S / 2 - 0.2), e + 0.15, sz * (S / 2 - 0.2)));
          add(_box(0.5, 0.36, 0.34, tierMats.olive, S / 2 - 0.42, e + 0.18, -S / 2 + 0.34));       // ammo locker
          add(_box(0.52, 0.05, 0.36, tierMats.steelDark, S / 2 - 0.42, e + 0.37, -S / 2 + 0.34));
        }
      } else if (kind === 'pillar') {
        if (tier === 1) {
          add(_box(0.34, PILLAR_H - 0.1, 0.34, tierMats.stone[1], 0, (PILLAR_H - 0.1) / 2, 0));    // poured concrete
          for (const y of [0.35, PILLAR_H - 0.35]) add(_box(0.4, 0.06, 0.4, tierMats.steelDark, 0, y, 0));
        } else {
          for (const fz of [-1, 1]) add(_box(0.36, PILLAR_H - 0.1, 0.06, tierMats.steelDark, 0, (PILLAR_H - 0.1) / 2, fz * 0.14));
          add(_box(0.1, PILLAR_H - 0.1, 0.28, tierMats.steel, 0, (PILLAR_H - 0.1) / 2, 0));
          for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {                            // gussets at the cap
            const g = add(_box(0.3, 0.3, 0.04, tierMats.steelDark, sx * 0.13, PILLAR_H - 0.3, sz * 0.13));
            g.rotation.y = sx * sz > 0 ? Math.PI / 4 : -Math.PI / 4;
          }
        }
      } else if (kind === 'stairs') {
        const N = 7, run = S / N, rise = LEVEL_H / N;
        for (let i = 0; i < N; i++) add(_box(S * 0.88, rise * 0.25, run * 1.02, tierMats.steelLight, 0, rise * (i + 0.9), -S / 2 + run * (i + 0.5)));
        for (const sx of [-1, 1]) add(_box(0.07, 0.22, Math.hypot(S, LEVEL_H), tierMats.steelDark, sx * (S * 0.47), LEVEL_H / 2 + 0.1, 0)).rotation.x = -Math.atan2(LEVEL_H, S);
        if (tier >= 2) {
          for (const sx of [-1, 1]) add(_box(0.12, 0.3, 0.12, tierMats.rivet, sx * (S * 0.45), 0.15, -S / 2 + 0.1));  // the hinge it folds on
          add(_box(0.06, 0.06, 0.5, tierMats.steelDark, 0, LEVEL_H + 0.1, S / 2 - 0.3));
        }
      } else if (kind === 'spikes') {
        const spikes = u.spikes;
        const sMat = tier >= 2 ? tierMats.steelLight : tierMats.steel;
        if (spikes) {
          const n = tier >= 2 ? 5 : 4, step = 1.6 / n;
          for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
            const sp = _mesh(new THREE.ConeGeometry(tier >= 2 ? 0.1 : 0.08, tier >= 2 ? 0.95 : 0.8, 5), sMat);
            sp.position.set(-0.8 + step * (i + 0.5), (tier >= 2 ? 0.95 : 0.8) / 2, -0.8 + step * (k + 0.5));
            spikes.add(sp);
          }
        }
        for (const [sx, sz, w, d] of [[1, 0, 0.1, 1.9], [-1, 0, 0.1, 1.9], [0, 1, 1.9, 0.1], [0, -1, 1.9, 0.1]]) add(_box(w, 0.1, d, tier >= 2 ? tierMats.steelLight : tierMats.steelDark, sx * 0.9, 0.05, sz * 0.9));
      } else if (kind === 'mine') {
        if (tier === 1) {
          for (const y of [0.06, 0.12]) add(_box(0.46, 0.03, 0.46, tierMats.steelDark, 0, y, 0));   // fragmentation ribs
          for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) add(_box(0.06, 0.06, 0.06, tierMats.rivet, sx * 0.19, 0.14, sz * 0.19));
        } else {
          add(_mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.26, 10), tierMats.steelDark)).position.y = 0.13;  // launch pot
          add(_mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8), tierMats.brass)).position.y = 0.3;
          for (const a of [0, 1.05, 2.1, 3.15, 4.2, 5.25]) add(_box(0.03, 0.12, 0.03, tierMats.rivet, Math.cos(a) * 0.14, 0.36, Math.sin(a) * 0.14));
        }
      } else if (kind === 'lure') {
        if (tier === 1) {
          const horn = add(_mesh(new THREE.CylinderGeometry(0.26, 0.1, 0.34, 10), tierMats.steelLight));
          horn.position.set(0, 1.55, 0.14); horn.rotation.x = Math.PI / 2;
          add(_box(0.1, 0.5, 0.1, tierMats.steelDark, 0, 1.3, 0));
        } else {
          for (const y of [1.45, 1.62, 1.76]) { const ring = _mesh(new THREE.TorusGeometry(0.2 - (y - 1.45) * 0.4, 0.026, 4, 10), tierMats.steelLight); ring.position.set(0, y, 0); ring.rotation.x = Math.PI / 2; add(ring); }
          add(_box(0.07, 0.6, 0.07, tierMats.rivet, 0, 1.5, 0));
          const ball = add(_mesh(new THREE.SphereGeometry(0.1, 10, 8), tierMats.lensBlue)); ball.position.y = 1.9;
        }
      }`;

const REPLACE_DECORATE_8 = `      } else if (kind === 'wire') {
        if (tier === 1) {
          // Concertina wire: dense overlapping helical steel coils with top binder wire and razor-barb clusters.
          const nCoils = 9;
          for (let i = 0; i < nCoils; i++) {
            const cx = -S / 2 + S * (i + 0.5) / nCoils;
            const coil = _mesh(new THREE.TorusGeometry(0.35, 0.022, 6, 12), i % 2 ? tierMats.steelLight : tierMats.steel);
            coil.position.set(cx, 0.54, (i % 2 ? 0.03 : -0.03));
            coil.rotation.y = Math.PI / 2 + (i % 2 ? 0.22 : -0.22);
            coil.rotation.x = 0.22 * (i % 2 ? 1 : -1);
            add(coil);
            // Razor-barb clusters on the top and front crests of each coil.
            for (const [dy, dz] of [[0.35, 0], [0, 0.35], [0, -0.35]]) {
              const barb = add(_box(0.065, 0.065, 0.018, tierMats.rivet, cx, 0.54 + dy, dz));
              barb.rotation.set(0.4, 0.5, 0.78);
            }
          }
          add(_box(S, 0.028, 0.028, tierMats.steelDark, 0, 0.90, 0));
        } else {
          // Razor wire: heavy Y-arm security pickets with taut razor-blade tape courses and an upper helical razor coil.
          hideBuilt(mesh);
          for (const sx of [-1, 0, 1]) {
            const px = sx * (S / 2 - 0.05);
            add(_box(0.08, 0.95, 0.08, tierMats.steelDark, px, 0.35, 0));
            add(_box(0.18, 0.045, 0.22, tierMats.steelDark, px, 0.022, 0));
            // V/Y-shaped security outrigger arms at the top of each picket.
            for (const fz of [-1, 1]) {
              const arm = add(_box(0.055, 0.42, 0.055, tierMats.steelDark, px, 0.98, fz * 0.11));
              arm.rotation.x = fz * 0.48;
            }
            add(_box(0.11, 0.07, 0.14, tierMats.rivet, px, 0.82, 0));
          }
          // High-tensile core wires and stamped diamond-profile razor tape blades.
          const courses = [[0.28, 0], [0.54, 0], [0.80, 0], [1.06, -0.16], [1.06, 0.16]];
          for (const [y, z] of courses) {
            add(_box(S, 0.022, 0.022, tierMats.steelDark, 0, y, z));
            for (let i = 0; i < 11; i++) {
              const tx = -S / 2 + S * (i + 0.5) / 11;
              const tape = add(_box(0.11, 0.095, 0.016, tierMats.steelLight, tx, y, z));
              tape.rotation.set((i % 2 ? 0.65 : -0.65), 0, Math.PI / 4);
            }
          }
          // Upper helical razor coil cradled inside the V-arms.
          for (let i = 0; i < 7; i++) {
            const coil = _mesh(new THREE.TorusGeometry(0.22, 0.02, 5, 10), tierMats.steelLight);
            coil.position.set(-S / 2 + S * (i + 0.5) / 7, 1.04, 0);
            coil.rotation.y = Math.PI / 2 + (i % 2 ? 0.2 : -0.2);
            add(coil);
          }
        }
      } else if (kind === 'railing') {
        if (tier === 1) {
          // Mesh railing: framed welded-wire security mesh panels with diagonal flat-bar stiffeners.
          for (let i = 0; i < 13; i++) {
            add(_box(0.02, RAIL_H - 0.14, 0.02, tierMats.steelLight, -S / 2 + S * (i + 0.5) / 13, (RAIL_H - 0.04) / 2, 0));
          }
          for (const y of [RAIL_H * 0.26, RAIL_H * 0.44, RAIL_H * 0.64, RAIL_H * 0.80]) {
            add(_box(S - 0.12, 0.02, 0.02, tierMats.steelDark, 0, y, 0));
          }
          const bw = S / 2 - 0.12, bh = RAIL_H - 0.18, diag = Math.hypot(bw, bh), ang = Math.atan2(bh, bw);
          for (const cx of [-S / 4, S / 4]) for (const sgn of [1, -1]) {
            const dBar = add(_box(diag, 0.032, 0.028, tierMats.steelDark, cx, RAIL_H * 0.5, 0));
            dBar.rotation.z = sgn * ang;
          }
        } else {
          // Armoured parapet: sloped ballistic breastwork plate, corbel-supported firing ledge, and crenellated gun rest.
          hideBuilt(mesh);
          add(_box(S, RAIL_H * 0.90, 0.10, tierMats.steel, 0, RAIL_H * 0.45, 0.02));
          add(_box(S - 0.12, RAIL_H * 0.52, 0.04, tierMats.steelLight, 0, RAIL_H * 0.48, 0.075));
          // Vertical exterior armour stiffener ribs and end stanchions.
          for (const sx of [-1, 1]) add(_box(0.11, RAIL_H + 0.06, 0.16, tierMats.steelDark, sx * (S / 2 - 0.055), (RAIL_H + 0.06) / 2, 0));
          for (const rx of [-0.55, 0, 0.55]) add(_box(0.065, RAIL_H * 0.88, 0.13, tierMats.steelDark, rx, RAIL_H * 0.44, 0.02));
          // Cantilevered firing ledge with 4 under-shelf corbel brackets and upper cheek shields around a central gun rest.
          add(_box(S, 0.08, 0.32, tierMats.steelDark, 0, RAIL_H * 0.94, -0.08));
          for (const cx of [-0.75, -0.25, 0.25, 0.75]) {
            const corb = add(_box(0.05, 0.22, 0.20, tierMats.steelDark, cx, RAIL_H * 0.80, -0.09));
            corb.rotation.x = 0.45;
          }
          for (const sx of [-1, 1]) {
            add(_box(S * 0.34, 0.12, 0.06, tierMats.steelDark, sx * (S * 0.30), RAIL_H + 0.04, 0.04));
          }
          for (let x = -S / 2 + 0.14; x < S / 2; x += 0.24) {
            add(_box(0.04, 0.04, 0.035, tierMats.rivet, x, 0.14, 0.08));
            add(_box(0.04, 0.04, 0.035, tierMats.rivet, x, RAIL_H * 0.82, 0.08));
          }
        }
      } else if (kind === 'platform') {
        const r = ruleFor('platform'), e = r.edgeH;
        // Plated platform: riveted perimeter ballistic skirt plates with corner bumper angles and lower blast flanges.
        for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          add(_box(sx ? 0.07 : S, 0.36, sz ? 0.07 : S, tierMats.steelDark, sx * (S / 2 - 0.035), e - 0.18, sz * (S / 2 - 0.035)));
          add(_box(sx ? 0.09 : S * 0.88, 0.18, sz ? 0.09 : S * 0.88, tierMats.steel, sx * (S / 2 - 0.04), e - 0.16, sz * (S / 2 - 0.04)));
          for (let p = -0.72; p <= 0.72; p += 0.36) {
            add(_box(0.04, 0.04, 0.04, tierMats.rivet, sx ? sx * (S / 2 - 0.01) : p, e - 0.06, sz ? sz * (S / 2 - 0.01) : p));
          }
        }
        if (tier >= 2) {
          // Gun emplacement: 2-course multi-tone burlap sandbag parapet around the rim + detailed olive-drab ammo locker.
          for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            for (let row = 0; row < 2; row++) {
              const nBags = 4, span = S * 0.86, bw = span / nBags;
              for (let i = 0; i < nBags; i++) {
                const pos = -span / 2 + bw * (i + 0.5);
                const bm = tierMats.burlap[(i + row) % tierMats.burlap.length];
                const bx = sx ? sx * (S / 2 - 0.20) : pos, bz = sz ? sz * (S / 2 - 0.20) : pos;
                add(_rbox(sx ? 0.34 : bw * 0.94, 0.16, sz ? 0.34 : bw * 0.94, 0.045, bm, bx, e + 0.08 + row * 0.145, bz));
              }
            }
          }
          // Detailed ammo locker with hinged steel lid, brass latches, and ready-rack shell canisters.
          const lx = S / 2 - 0.42, lz = -S / 2 + 0.34;
          add(_box(0.52, 0.36, 0.34, tierMats.olive, lx, e + 0.18, lz));
          add(_box(0.55, 0.055, 0.37, tierMats.steelDark, lx, e + 0.37, lz));
          for (const dx of [-0.15, 0.15]) add(_box(0.045, 0.09, 0.03, tierMats.brass, lx + dx, e + 0.32, lz + 0.175));
          for (const dz of [-0.08, 0.08]) {
            const shell = _mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.28, 8), tierMats.brass);
            shell.position.set(lx - 0.32, e + 0.16, lz + dz);
            add(shell);
          }
        }
      } else if (kind === 'pillar') {
        if (tier === 1) {
          // Concrete pillar: chamfered poured-concrete pier with stepped plinth, formwork seams, and bolted steel collars.
          add(_box(0.54, 0.22, 0.54, tierMats.stoneDark, 0, 0.14, 0));
          add(_box(0.38, PILLAR_H - 0.12, 0.38, tierMats.stone[0], 0, (PILLAR_H - 0.1) / 2, 0));
          add(_box(0.42, PILLAR_H - 0.16, 0.30, tierMats.stone[1], 0, (PILLAR_H - 0.1) / 2, 0));
          add(_box(0.30, PILLAR_H - 0.16, 0.42, tierMats.stone[1], 0, (PILLAR_H - 0.1) / 2, 0));
          add(_box(0.56, 0.18, 0.56, tierMats.stoneDark, 0, PILLAR_H - 0.16, 0));
          for (const y of [0.38, 1.05, PILLAR_H - 0.38]) {
            add(_box(0.44, 0.065, 0.44, tierMats.steelDark, 0, y, 0));
            for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(_box(0.045, 0.045, 0.045, tierMats.rivet, sx * 0.21, y, sz * 0.21));
          }
        } else {
          // Steel column: heavy cruciform I-beam column with lattice cross-bracing, diaphragm plates, and dense rivet rows.
          const ch = PILLAR_H - 0.1, cy = ch / 2;
          for (const fz of [-1, 1]) add(_box(0.40, ch, 0.065, tierMats.steelDark, 0, cy, fz * 0.16));
          for (const fx of [-1, 1]) add(_box(0.065, ch, 0.30, tierMats.steelDark, fx * 0.16, cy, 0));
          add(_box(0.14, ch, 0.30, tierMats.steel, 0, cy, 0));
          for (const dy of [0.42, 0.88, 1.34, 1.76]) {
            add(_box(0.42, 0.045, 0.42, tierMats.steelLight, 0, dy, 0));
          }
          for (let ry = 0.22; ry < PILLAR_H - 0.2; ry += 0.24) {
            for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
              add(_box(0.04, 0.04, 0.04, tierMats.rivet, sx * 0.14, ry, sz * 0.20));
            }
          }
          for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const g = add(_box(0.34, 0.32, 0.045, tierMats.steelDark, sx * 0.15, PILLAR_H - 0.28, sz * 0.15));
            g.rotation.y = sx * sz > 0 ? Math.PI / 4 : -Math.PI / 4;
          }
        }
      } else if (kind === 'stairs') {
        const N = 7, run = S / N, rise = LEVEL_H / N;
        // Steel stairs: checker-plate steel treads with high-grip nosing, perforated risers, and C-channel steel stringers.
        for (let i = 0; i < N; i++) {
          const yTop = rise * (i + 0.94), zMid = -S / 2 + run * (i + 0.5);
          add(_box(S * 0.88, rise * 0.26, run * 1.04, tierMats.steelLight, 0, yTop, zMid));
          add(_box(S * 0.89, rise * 0.14, 0.035, tierMats.rivet, 0, yTop + 0.015, zMid - run * 0.49));
          for (let t = -3; t <= 3; t++) {
            const lug = add(_box(0.11, 0.014, 0.028, tierMats.rivet, t * 0.22, yTop + rise * 0.14, zMid));
            lug.rotation.y = (t % 2 ? 1 : -1) * 0.45;
          }
        }
        const len = Math.hypot(S, LEVEL_H), ang = -Math.atan2(LEVEL_H, S);
        for (const sx of [-1, 1]) {
          const str = add(_box(0.08, 0.24, len, tierMats.steelDark, sx * (S * 0.47), LEVEL_H / 2 + 0.08, 0));
          str.rotation.x = ang;
          const fl = add(_box(0.13, 0.045, len, tierMats.steel, sx * (S * 0.47), LEVEL_H / 2 + 0.19, 0));
          fl.rotation.x = ang;
        }
        if (tier >= 2) {
          // Retractable stairs: heavy pivot pillow-blocks at the foot, hydraulic lift cylinders, and upper hoist winch frame.
          for (const sx of [-1, 1]) {
            add(_box(0.16, 0.32, 0.18, tierMats.steelDark, sx * (S * 0.46), 0.16, -S / 2 + 0.11));
            const axle = _mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 10), tierMats.brass);
            axle.rotation.z = Math.PI / 2;
            axle.position.set(sx * (S * 0.46), 0.22, -S / 2 + 0.11);
            add(axle);
            // Hydraulic lift strut alongside each stringer.
            const ram = add(_box(0.065, 0.065, len * 0.55, tierMats.brass, sx * (S * 0.52), LEVEL_H * 0.38, -S * 0.12));
            ram.rotation.x = ang - 0.12;
          }
          add(_box(S * 0.92, 0.08, 0.08, tierMats.steelDark, 0, LEVEL_H + 0.12, S / 2 - 0.18));
          add(_box(0.42, 0.05, 0.05, tierMats.brass, 0, LEVEL_H + 0.15, S / 2 - 0.18));
        }
      } else if (kind === 'spikes') {
        const spikes = u.spikes;
        const sMat = tier >= 2 ? tierMats.steelLight : tierMats.steel;
        if (spikes) {
          const n = tier >= 2 ? 5 : 4, step = 1.6 / n;
          for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
            const sp = _mesh(new THREE.ConeGeometry(tier >= 2 ? 0.1 : 0.08, tier >= 2 ? 0.95 : 0.8, 5), sMat);
            sp.position.set(-0.8 + step * (i + 0.5), (tier >= 2 ? 0.95 : 0.8) / 2, -0.8 + step * (k + 0.5));
            spikes.add(sp);
          }
        }
        // Surface upgrades: Tier 1 adds steel cross-grid bars & side return-spring rams; Tier 2 adds a full steel murder-grate & broadhead blades.
        for (const [sx, sz, w, d] of [[1, 0, 0.11, 1.94], [-1, 0, 0.11, 1.94], [0, 1, 1.94, 0.11], [0, -1, 1.94, 0.11]]) {
          add(_box(w, 0.11, d, tier >= 2 ? tierMats.steelLight : tierMats.steelDark, sx * 0.91, 0.055, sz * 0.91));
        }
        for (let g = -0.72; g <= 0.72; g += 0.36) {
          add(_box(1.80, 0.032, 0.055, tierMats.steelDark, 0, 0.052, g));
          add(_box(0.055, 0.032, 1.80, tierMats.steelDark, g, 0.052, 0));
        }
        for (const sx of [-1, 1]) {
          // Side coiled return-spring / hydraulic reset cylinders.
          const cyl = _mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.4, 8), tier >= 2 ? tierMats.brass : tierMats.steel);
          cyl.rotation.x = Math.PI / 2;
          cyl.position.set(sx * 0.91, 0.11, 0);
          add(cyl);
        }
        if (tier >= 2) {
          // Steel spike bed: armoured checker deck plates with 25 raised broadhead steel blades protruding from reinforced collars.
          add(_box(1.80, 0.036, 1.80, tierMats.steel, 0, 0.045, 0));
          for (let i = 0; i < 5; i++) for (let k = 0; k < 5; k++) {
            const px = -0.72 + i * 0.36, pz = -0.72 + k * 0.36;
            add(_box(0.14, 0.035, 0.14, tierMats.steelDark, px, 0.062, pz));
            const blade = _mesh(new THREE.ConeGeometry(0.052, 0.14, 4), tierMats.rivet);
            blade.position.set(px, 0.11, pz);
            blade.rotation.y = Math.PI / 4;
            add(blade);
          }
        }
      } else if (kind === 'mine') {
        if (tier === 1) {
          // Frag mine: dual pre-fragmented cast-iron shrapnel rings, 4 ground-anchor claws, and optical trip studs.
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const seg = add(_box(0.09, 0.095, 0.06, i % 2 ? tierMats.steelDark : tierMats.iron, Math.cos(a) * 0.39, 0.065, Math.sin(a) * 0.39));
            seg.rotation.y = -a;
          }
          for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            add(_box(0.08, 0.05, 0.14, tierMats.steelDark, sx * 0.28, 0.025, sz * 0.28)).rotation.y = sx * sz > 0 ? -Math.PI / 4 : Math.PI / 4;
            add(_box(0.055, 0.055, 0.055, tierMats.rivet, sx * 0.18, 0.145, sz * 0.18));
          }
        } else {
          // Bounding mine ("Bouncing Betty"): ribbed steel launch mortar pot, 6 surrounding shrapnel sleeves, and 3-prong brass fuze.
          const pot = add(_mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.26, 14), tierMats.steelDark));
          pot.position.y = 0.14;
          for (const ry of [0.10, 0.18, 0.25]) {
            const band = add(_mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.024, 14), tierMats.steelLight));
            band.position.y = ry;
          }
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const can = add(_mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.20, 8), tierMats.olive));
            can.position.set(Math.cos(a) * 0.24, 0.12, Math.sin(a) * 0.24);
          }
          const fuze = add(_mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.09, 10), tierMats.brass));
          fuze.position.y = 0.30;
          const stem = add(_mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.09, 8), tierMats.brass));
          stem.position.y = 0.38;
          for (const a of [0, 2.094, 4.188]) {
            const prong = add(_box(0.022, 0.11, 0.022, tierMats.rivet, Math.cos(a) * 0.045, 0.44, Math.sin(a) * 0.045));
            prong.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
          }
        }
      } else if (kind === 'lure') {
        if (tier === 1) {
          // Siren beacon: quad-directional air-raid megaphone cluster, rotary motor housing, and auxiliary battery pack.
          add(_box(0.18, 0.32, 0.18, tierMats.steelDark, 0, 1.42, 0));
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            const hGrp = new THREE.Group();
            hGrp.position.set(0, 1.48, 0);
            hGrp.rotation.y = a;
            const horn = _mesh(new THREE.CylinderGeometry(0.22, 0.075, 0.32, 10), tierMats.steelLight);
            horn.position.set(0, 0, 0.20); horn.rotation.x = Math.PI / 2;
            const throat = _mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), tierMats.brass);
            throat.position.set(0, 0, 0.28); throat.rotation.x = Math.PI / 2;
            hGrp.add(horn, throat);
            add(hGrp);
          }
          add(_box(0.22, 0.24, 0.16, tierMats.olive, 0, 0.34, 0.12));
        } else {
          // Shock beacon: high-voltage Tesla pylon with 3 base capacitor banks, ceramic insulators, 3 toroidal induction rings & plasma sphere.
          for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2;
            const cap = add(_mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.34, 10), tierMats.steelDark));
            cap.position.set(Math.cos(a) * 0.19, 0.22, Math.sin(a) * 0.19);
            const coil = add(_mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.08, 10), tierMats.lensBlue));
            coil.position.set(Math.cos(a) * 0.19, 0.26, Math.sin(a) * 0.19);
          }
          add(_box(0.085, 0.65, 0.085, tierMats.rivet, 0, 1.52, 0));
          for (const [y, rad] of [[1.44, 0.24], [1.61, 0.18], [1.76, 0.12]]) {
            const ring = _mesh(new THREE.TorusGeometry(rad, 0.028, 6, 14), tierMats.steelLight);
            ring.position.set(0, y, 0); ring.rotation.x = Math.PI / 2;
            add(ring);
            add(_box(rad * 2, 0.022, 0.022, tierMats.brass, 0, y, 0));
            add(_box(0.022, 0.022, rad * 2, tierMats.brass, 0, y, 0));
          }
          const ball = add(_mesh(new THREE.SphereGeometry(0.115, 12, 10), tierMats.lensBlue));
          ball.position.y = 1.92;
        }
      }`;

replaceExact('decoratePiece 8 buildables', TARGET_DECORATE_8, REPLACE_DECORATE_8);

// Verify index.html has not changed on disk since we read it (Rule 4)
const rawCurrent = fs.readFileSync(INDEX_PATH);
const hashCurrent = crypto.createHash('sha256').update(rawCurrent).digest('hex');
if (hashCurrent !== hashBefore) {
  throw new Error('index.html changed on disk while preparing edit! Aborting to prevent overwrite.');
}

const outBuf = Buffer.from(src, 'utf8');
if (outBuf[0] === 0xef && outBuf[1] === 0xbb && outBuf[2] === 0xbf) {
  throw new Error('UTF-8 BOM detected!');
}
fs.writeFileSync(INDEX_PATH, outBuf);
const hashAfter = crypto.createHash('sha256').update(outBuf).digest('hex');
console.log(`Successfully updated index.html for AG-80 (SHA-256: ${hashBefore.slice(0, 12)} -> ${hashAfter.slice(0, 12)})`);
