// studio/survivor-models.js — AI-1 (Antigravity 3, Jerry direct):
// Character kit, proportions, personal props, combat M4 mounts, tactical HQ roof posts,
// and Okafor's combat aid-pouch drop for Cpl. Dana Okafor, Sgt. Eli Brandt, and Spc. Evan Pike.
// Art family: Military (docs/art-direction.md) — olive drab, worn steel, burlap sandbags,
// canvas webbing, dielectric roughness 0.65-0.95, saturation < 45% (reserved green only for
// Okafor's ready-heal chem-light / field-dressing beacon).

import { HAND_POSES } from './marine-hand.js';
import { skinPoint, toLocal, rowAt, columnAngles, surfaceGeometry } from './marine-skull.js';

export const SURVIVOR_LOOK = {
  okafor: {
    skin: 4, hair: 'black', eyes: 'brown', cap: 'cover', eyewear: 'none',
    sleeves: 'down', gloves: true, gear: ['bareHead', 'vest'], kit: 'aidBag', rifle: true,
    stature: { x: 1.0, y: 1.01, z: 1.0 }
  },
  brandt: {
    skin: 1, hair: 'auburn', eyes: 'blue', cap: 'boonie', eyewear: 'aviators',
    sleeves: 'rolled', gloves: true, gear: ['bareHead', 'vest', 'pads'], kit: 'belt', rifle: false,
    stature: { x: 1.035, y: 1.02, z: 1.03 }
  },
  pike: {
    skin: 2, hair: 'blond', eyes: 'green', cap: 'ballcapBack', eyewear: 'none',
    sleeves: 'rolled', gloves: false, gear: ['bareHead', 'bareTorso'], kit: 'wrench', rifle: true,
    stature: { x: 0.98, y: 0.985, z: 0.985 }
  }
};

// Obstacle-verified HQ roof posts (local to house.group; HQ_HALF = 5, clear of whip antenna
// at (-4.15,4.15), dish (-3.35,3.85), exhaust stacks (-3.2,3.0)/(-2.3,3.4), HVAC air handler
// ([1.7..3.9] x [2.6..4.0]), klaxon tower ([0.7..2.5] x [-1.7..0.1]), fans, and >3 m from ladder).
export const SURVIVOR_ROOF_POSTS = {
  okafor: { x: -0.4, z: 4.1, yaw: 0 },                  // North deck — overlooks North/NW/Lake
  brandt: { x: 4.0, z: 1.2, yaw: Math.PI / 2 },         // East deck — right above Armory/CIF
  pike:   { x: 4.0, z: -4.0, yaw: Math.PI * 0.75 }      // SE corner — right above Alarm Panel
};

let sharedMats = null;
function getMats(THREE) {
  if (sharedMats) return sharedMats;
  const std = (opts) => new THREE.MeshStandardMaterial(opts);
  sharedMats = {
    olive:      std({ color: 0x4b5536, roughness: 0.90, metalness: 0.04 }),
    oliveDark:  std({ color: 0x353c27, roughness: 0.92, metalness: 0.05 }),
    coyote:     std({ color: 0x77684e, roughness: 0.92, metalness: 0.03 }),
    burlapA:    std({ color: 0x7c7058, roughness: 0.95, metalness: 0.02 }),
    burlapB:    std({ color: 0x6c624d, roughness: 0.95, metalness: 0.02 }),
    canvas:     std({ color: 0x575d45, roughness: 0.94, metalness: 0.02 }),
    pillow:     std({ color: 0x6e6a5d, roughness: 0.95, metalness: 0.01 }),
    white:      std({ color: 0xd9d5c8, roughness: 0.86, metalness: 0.02 }),
    medicRed:   std({ color: 0x8b2e26, roughness: 0.72, metalness: 0.04 }),
    brass:      std({ color: 0xb8923e, roughness: 0.34, metalness: 0.84 }),
    copper:     std({ color: 0xa6633b, roughness: 0.36, metalness: 0.80 }),
    link:       std({ color: 0x2a2c29, roughness: 0.48, metalness: 0.65, side: THREE.DoubleSide }),
    steel:      std({ color: 0x8e9398, roughness: 0.36, metalness: 0.86 }),
    steelDark:  std({ color: 0x3d4247, roughness: 0.56, metalness: 0.68 }),
    leather:    std({ color: 0x3d2e22, roughness: 0.82, metalness: 0.06 }),
    rubber:     std({ color: 0x242624, roughness: 0.88, metalness: 0.06 }),
    lens:       std({ color: 0x1a262d, roughness: 0.16, metalness: 0.45 }),
    tape:       std({ color: 0x8f9496, roughness: 0.62, metalness: 0.18 }),
    woodCrate:  std({ color: 0x624d34, roughness: 0.88, metalness: 0.04 }),
    woodTrim:   std({ color: 0x4b3a26, roughness: 0.90, metalness: 0.04 }),
    toolboxRed: std({ color: 0x76342a, roughness: 0.58, metalness: 0.32 }),
    paper:      std({ color: 0xcfc7b0, roughness: 0.92, metalness: 0.0 }),
    mug:        std({ color: 0x5c6468, roughness: 0.38, metalness: 0.55 }),
    lampGlass:  std({ color: 0xd8a85e, emissive: 0xffa63d, emissiveIntensity: 0.45, roughness: 0.28, metalness: 0.05 }),
    chemGreen:  std({ color: 0x6cd882, emissive: 0x36d45e, emissiveIntensity: 0.85, roughness: 0.30, metalness: 0.05 }),
    chemDim:    std({ color: 0x3a4d3c, emissive: 0x0e2412, emissiveIntensity: 0.10, roughness: 0.45, metalness: 0.05 })
  };
  return sharedMats;
}

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Lightweight rugged stubble shell for Pike so his bare face reads as lived-in, not doll-smooth.
let cachedStubbleGeo = null;
function buildPikeStubble(THREE, hairMat) {
  if (!cachedStubbleGeo && surfaceGeometry && rowAt && columnAngles) {
    try {
      const cols = columnAngles(28, 1.15);
      const lo = rowAt(0, 0.058), hi = rowAt(0, 0.145), NR = 14;
      const rows = [];
      for (let r = 0; r <= NR; r++) rows.push(lo + (hi - lo) * r / NR);
      const lift = (a, u, p) => {
        const y = p[1], x = Math.abs(p[0]), side = Math.abs(a);
        if (side > 1.85) return -0.002;
        const upper = 0.118 + 0.026 * smooth(0.55, 1.45, side);
        const lower = 0.062 + 0.020 * smooth(0.6, 1.6, side);
        const mouth = Math.exp(-(((y - 0.109) / 0.0085) ** 2)) * (1 - smooth(0.017, 0.030, x));
        const t = 0.0014 * smooth(lower, lower + 0.010, y) * (1 - smooth(upper - 0.012, upper, y)) * (1 - mouth);
        return t > 0.00025 ? t + 0.00025 * Math.sin(a * 37 + y * 420) : -0.0018;
      };
      cachedStubbleGeo = surfaceGeometry(THREE, { rows, cols, lift, weld: false, keep: (a) => Math.abs(a) < 1.9 });
    } catch (_) {
      cachedStubbleGeo = null;
    }
  }
  if (!cachedStubbleGeo) return null;
  const mat = hairMat.clone();
  mat.color.setHex(0x8c7758);
  mat.roughness = 0.94;
  mat.metalness = 0;
  const mesh = new THREE.Mesh(cachedStubbleGeo.clone(), mat);
  mesh.name = 'survivor-pike-stubble';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

// Fitted medic brassard wrapped directly around Okafor's upper left sleeve (+X = armRG in body coords).
function buildMedicArmband(THREE, armG, M, geos) {
  const g = new THREE.Group();
  g.name = 'survivor-medic-armband';
  // On D-243 playerShape, upper arm sleeve around y = -0.155 is oval (~0.052 x 0.058):
  // size cleanly proud of the cloth all 360 deg so zero camo pokes through!
  const rTop = 0.0575, rBot = 0.0545, h = 0.078;
  const sleeveGeo = new THREE.CylinderGeometry(rTop, rBot, h, 20, 1, false);
  sleeveGeo.scale(1.03, 1, 1.15);
  geos.push(sleeveGeo);
  const band = new THREE.Mesh(sleeveGeo, M.white);
  band.position.set(0, -0.154, 0.003);
  band.castShadow = true; band.receiveShadow = true;
  g.add(band);

  // Dark olive elastic borders top & bottom so the brassard reads as sewn/strapped on
  for (const dy of [-h * 0.47, h * 0.47]) {
    const trimGeo = new THREE.CylinderGeometry(rTop * 1.02, rBot * 1.02, 0.009, 20);
    trimGeo.scale(1.03, 1, 1.15);
    geos.push(trimGeo);
    const trim = new THREE.Mesh(trimGeo, M.oliveDark);
    trim.position.set(0, -0.154 + dy, 0.003);
    g.add(trim);
  }
  // Crisp muted crimson-brown medic cross on outer arm face (+X)
  for (const [ch, cd] of [[0.042, 0.013], [0.013, 0.042]]) {
    const cg = new THREE.BoxGeometry(0.008, ch, cd);
    geos.push(cg);
    const cross = new THREE.Mesh(cg, M.medicRed);
    cross.position.set(rTop * 1.02, -0.154, 0.003);
    g.add(cross);
  }
  armG.add(g);
  return g;
}

// Compact, anatomically fitted trauma IFAK tucked at Okafor's rear-right hip (clear of arm swing!).
function buildOkaforIfak(THREE, hip, M, geos, rmesh) {
  const bag = new THREE.Group();
  bag.name = 'survivor-aid-bag';
  // On D-243 playerShape, waist belt half-X is ~0.150, half-Z is ~0.125, belt at hip y = +0.10.
  // Tucked cleanly at rear-outer hip (+X, -Z) so the hanging arm passes well in front of it!
  bag.position.set(0.128, 0.058, -0.104);
  bag.rotation.set(0.04, 0.72, -0.05);
  hip.add(bag);

  const body = rmesh(0.112, 0.148, 0.068, M.olive, 0.022);
  bag.add(body); geos.push(body.geometry);

  // Top contoured storm flap + white trauma ID stripe + muted cross tab
  const flap = rmesh(0.116, 0.046, 0.072, M.oliveDark, 0.014);
  flap.position.set(0, 0.056, 0.002);
  bag.add(flap); geos.push(flap.geometry);

  const stripe = rmesh(0.088, 0.022, 0.008, M.white, 0.003);
  stripe.position.set(0, 0.012, -0.034);
  bag.add(stripe); geos.push(stripe.geometry);

  for (const [w, h] of [[0.020, 0.007], [0.007, 0.020]]) {
    const cg = new THREE.BoxGeometry(w, h, 0.005); geos.push(cg);
    const cm = new THREE.Mesh(cg, M.medicRed);
    cm.position.set(0, 0.012, -0.037);
    bag.add(cm);
  }

  // Buckle strap down the back & belt loops attaching to waist
  const strapG = new THREE.BoxGeometry(0.018, 0.085, 0.010); geos.push(strapG);
  const strap = new THREE.Mesh(strapG, M.rubber);
  strap.position.set(0, 0.015, -0.034);
  bag.add(strap);

  const buckG = new THREE.BoxGeometry(0.024, 0.018, 0.013); geos.push(buckG);
  const buck = new THREE.Mesh(buckG, M.steelDark);
  buck.position.set(0, -0.022, -0.035);
  bag.add(buck);

  // CAT Tourniquet strapped snugly underneath the pouch
  const tqGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.095, 10);
  tqGeo.rotateZ(Math.PI / 2); geos.push(tqGeo);
  const tq = new THREE.Mesh(tqGeo, M.rubber);
  tq.position.set(0, -0.082, -0.004);
  bag.add(tq);

  // Trauma shears handle tucked cleanly behind the flap top
  const shGeo = new THREE.TorusGeometry(0.013, 0.003, 6, 12); geos.push(shGeo);
  const sh = new THREE.Mesh(shGeo, M.steelDark);
  sh.position.set(0.032, 0.082, 0.014);
  bag.add(sh);

  return bag;
}

// Brandt's contoured 7.62mm NATO ammo bandolier hugging the D-243 chest rig (ZERO floating gap!)
// + field binoculars slung at lower chest.
function buildBrandtGunnerKit(THREE, torso, hip, M, geos, addCast, rmesh) {
  const belt = new THREE.Group();
  belt.name = 'survivor-ammo-belt';
  torso.add(belt);

  // D-243 squashed plate carrier envelope in torso space (y = 0 at TORSO_Y = 0.865):
  // Front plate z ~ 0.146, front pouches z ~ 0.178, shoulder strap y ~ 0.345 x ~ -0.105,
  // right side rib x ~ +0.156, back pack/plate z ~ -0.145 (runs under pack sides cleanly).
  const pts = [
    [-0.102, 0.340, 0.115],   // over left shoulder strap (viewer left / -X)
    [-0.052, 0.264, 0.158],   // upper chest plate
    [ 0.008, 0.184, 0.175],   // mid chest over pouches
    [ 0.068, 0.100, 0.172],   // lower chest pouches (pulled snug against carrier)
    [ 0.122, 0.042, 0.118],   // right front rib
    [ 0.144, 0.028, 0.005],   // right side waist
    [ 0.130, 0.042,-0.120],   // rear right under pack
    [ 0.008, 0.185,-0.150],   // behind back plate (tucked close inside pack contact)
    [-0.102, 0.336,-0.110],   // rear left shoulder
    [-0.105, 0.360, 0.008]    // crown of left shoulder
  ].map((p) => new THREE.Vector3(...p));

  const path = new THREE.CatmullRomCurve3(pts, true);
  // Build flat contoured backing webbing ribbon oriented to surface normal (no twisted flat ribbon!)
  const segs = 56;
  const verts = [], uvs = [], idx = [];
  const upV = new THREE.Vector3(0, 1, 0), tan = new THREE.Vector3(), rad = new THREE.Vector3(), side = new THREE.Vector3();
  for (let j = 0; j <= segs; j++) {
    const u = j / segs;
    const p = path.getPointAt(u);
    path.getTangentAt(u, tan).normalize();
    rad.set(p.x, 0, p.z);
    if (rad.lengthSq() < 1e-4) rad.set(0, 0, 1); else rad.normalize();
    side.crossVectors(tan, rad).normalize();
    if (side.lengthSq() < 1e-4) side.copy(upV);
    const halfW = 0.022;
    for (const s of [-1, 1]) {
      verts.push(p.x + side.x * s * halfW, p.y + side.y * s * halfW, p.z + side.z * s * halfW);
      uvs.push((s + 1) * 0.5, u * 6);
    }
  }
  for (let j = 0; j < segs; j++) {
    const a = j * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const webGeo = new THREE.BufferGeometry();
  webGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  webGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  webGeo.setIndex(idx);
  webGeo.computeVertexNormals();
  geos.push(webGeo);
  belt.add(addCast(new THREE.Mesh(webGeo, M.link)));

  // 15 sculpted 7.62 NATO cartridges (brass casing + copper ogive bullet + steel M13 link)
  // seated directly ON the front run of the curve (u in [0.02 .. 0.43])!
  const caseGeo = new THREE.CylinderGeometry(0.0062, 0.0068, 0.044, 8);
  const tipGeo = new THREE.ConeGeometry(0.0056, 0.022, 8);
  const linkGeo = new THREE.BoxGeometry(0.015, 0.024, 0.015);
  geos.push(caseGeo, tipGeo, linkGeo);

  const nRounds = 15;
  const q = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < nRounds; i++) {
    const u = 0.025 + (i / (nRounds - 1)) * 0.39;
    const p = path.getPointAt(u);
    path.getTangentAt(u, tan).normalize();
    rad.set(p.x, 0.15, p.z).normalize();
    side.crossVectors(tan, rad).normalize(); // cartridge axis across the belt!
    q.setFromUnitVectors(yAxis, side);

    const rndG = new THREE.Group();
    rndG.position.copy(p).addScaledVector(rad, 0.008);
    rndG.quaternion.copy(q);

    const casing = addCast(new THREE.Mesh(caseGeo, M.brass));
    casing.position.y = -0.006;
    const bullet = addCast(new THREE.Mesh(tipGeo, M.copper));
    bullet.position.y = 0.027;
    const lnk = addCast(new THREE.Mesh(linkGeo, M.link));
    lnk.position.y = -0.004;

    rndG.add(casing, bullet, lnk);
    belt.add(rndG);
  }

  // Brandt's canonical field binoculars ("Brandt's pair comes home with him", docs/specs/story-track-s.md)
  // resting compactly at his lower-left chest rig clear of both the bandolier and waist belt pouches.
  const bino = new THREE.Group();
  bino.name = 'survivor-binoculars';
  bino.position.set(-0.072, 0.122, 0.172);
  bino.rotation.set(0.24, 0.10, -0.14);
  torso.add(bino);
  for (const sx of [-0.024, 0.024]) {
    const tubeG = new THREE.CylinderGeometry(0.013, 0.017, 0.088, 10); geos.push(tubeG);
    const tube = addCast(new THREE.Mesh(tubeG, M.rubber));
    tube.position.set(sx, 0, 0);
    bino.add(tube);
    const lensG = new THREE.CylinderGeometry(0.015, 0.015, 0.006, 10); geos.push(lensG);
    const lens = new THREE.Mesh(lensG, M.lens);
    lens.position.set(sx, -0.044, 0);
    bino.add(lens);
  }
  const bridgeG = new THREE.BoxGeometry(0.036, 0.022, 0.016); geos.push(bridgeG);
  bino.add(new THREE.Mesh(bridgeG, M.steelDark));

  // Extra 7.62 utility pouch on Brandt's rear-left hip
  if (hip) {
    const pouch = rmesh(0.115, 0.115, 0.056, M.oliveDark, 0.014);
    pouch.position.set(-0.115, 0.062, -0.108);
    pouch.rotation.y = -0.58;
    hip.add(pouch); geos.push(pouch.geometry);
  }

  return belt;
}

// Pike's combat engineer / mechanic kit: sculpted steel combination wrench in leather belt loop,
// duct tape roll, multitool pouch, and cap-mounted field headlamp!
function buildPikeMechanicKit(THREE, torso, hip, headG, M, geos, addCast, rmesh) {
  // 1. Sculpted steel combination wrench tucked cleanly in a belt holster at hip (-X)
  if (hip) {
    const w = new THREE.Group();
    w.name = 'survivor-wrench';
    // Flush against the D-243 squashed hip/belt (-X = -0.162), angled forward so steel U-jaw reads clearly!
    w.position.set(-0.164, 0.068, 0.056);
    w.rotation.set(0.14, 0.24, 0.08);
    hip.add(w);

    // Leather tool loop bolted to the belt
    const loop = rmesh(0.024, 0.062, 0.046, M.leather, 0.006);
    loop.position.set(0.008, 0.032, 0);
    w.add(loop); geos.push(loop.geometry);

    // Flat chamfered steel shank
    const shankG = new THREE.BoxGeometry(0.009, 0.215, 0.022); geos.push(shankG);
    const shank = addCast(new THREE.Mesh(shankG, M.steel));
    shank.position.set(-0.004, -0.045, 0);
    w.add(shank);

    // Sculpted open-end U-jaw at the top (recognizably a wrench, not a grey box!)
    const jawBaseG = new THREE.CylinderGeometry(0.022, 0.020, 0.011, 12);
    jawBaseG.rotateZ(Math.PI / 2); geos.push(jawBaseG);
    const jawBase = addCast(new THREE.Mesh(jawBaseG, M.steel));
    jawBase.position.set(-0.004, 0.066, 0.002);
    w.add(jawBase);
    for (const sz of [-0.015, 0.015]) {
      const prongG = new THREE.BoxGeometry(0.011, 0.026, 0.011); geos.push(prongG);
      const prong = addCast(new THREE.Mesh(prongG, M.steel));
      prong.position.set(-0.004, 0.084, sz);
      prong.rotation.x = sz > 0 ? -0.18 : 0.18;
      w.add(prong);
    }

    // Angled box-end ring at the bottom of the shank
    const ringG = new THREE.TorusGeometry(0.015, 0.0055, 7, 14);
    ringG.rotateY(Math.PI / 2); geos.push(ringG);
    const ring = addCast(new THREE.Mesh(ringG, M.steel));
    ring.position.set(-0.004, -0.158, 0.004);
    w.add(ring);

    // Rear-right belt mechanic stash: duct-tape roll on carabiner + multitool pouch
    const tapeG = new THREE.TorusGeometry(0.034, 0.015, 8, 18);
    geos.push(tapeG);
    const tape = addCast(new THREE.Mesh(tapeG, M.tape));
    tape.position.set(0.118, 0.032, -0.105);
    tape.rotation.set(0.18, 0.65, 0.12);
    hip.add(tape);

    const multi = rmesh(0.044, 0.092, 0.032, M.leather, 0.008);
    multi.position.set(0.148, 0.072, -0.025);
    hip.add(multi); geos.push(multi.geometry);
  }

  // 2. Pocket walkie-talkie & grease pencil tucked on Pike's H-harness strap
  if (torso) {
    const radio = rmesh(0.046, 0.084, 0.024, M.steelDark, 0.006);
    radio.position.set(-0.085, 0.175, 0.124);
    torso.add(radio); geos.push(radio.geometry);
    const whipG = new THREE.CylinderGeometry(0.0028, 0.0034, 0.135, 6); geos.push(whipG);
    const whip = new THREE.Mesh(whipG, M.rubber);
    whip.position.set(-0.098, 0.275, 0.124);
    whip.rotation.z = 0.22;
    torso.add(whip);
  }

  // 3. Field headlamp fitted cleanly to Pike's backwards ballcap forehead band
  if (headG) {
    const hl = new THREE.Group();
    hl.name = 'survivor-headlamp';
    // Head-local space (before HEAD_GROUP_SCALE): brow band around y = 1.505 - 1.22 = 0.285, front z = +0.164
    hl.position.set(0, 0.292, 0.166);
    headG.add(hl);
    const housing = rmesh(0.068, 0.036, 0.028, M.oliveDark, 0.008);
    hl.add(housing); geos.push(housing.geometry);
    const bezelG = new THREE.CylinderGeometry(0.013, 0.014, 0.012, 12);
    bezelG.rotateX(Math.PI / 2); geos.push(bezelG);
    const bezel = new THREE.Mesh(bezelG, M.steelDark);
    bezel.position.set(0, 0, 0.013);
    hl.add(bezel);
    const glassG = new THREE.CircleGeometry(0.010, 12); geos.push(glassG);
    const glass = new THREE.Mesh(glassG, M.lampGlass);
    glass.position.set(0, 0, 0.0195);
    hl.add(glass);
  }
}

// Fitted back-slung M4 (muzzle-up, z < -0.2 for survivor-fit.browser.mjs, ZERO floating gap!)
// PLUS a separate combat hand-held M4 mount (hidden at rest, active during roof combat alert!).
function buildSurvivorRifles(THREE, m, torso, M, geos, ctx) {
  const { carryGunCopy, webMat } = ctx;
  if (!torso || !carryGunCopy) return;
  const copy = carryGunCopy('m4');
  if (!copy) return;

  const torsoPivotY = m.userData.torsoPivotY || 0.865;

  // 1. Slung M4 seated snugly beside the D-243 pack's +X side (pack outer X ~ 0.126, back Z ~ -0.256)
  // Keeping z = -0.218 (< -0.2) and upright muzzle-up orientation (axis[1] > 0.97) for ui/survivor-fit.browser.mjs!
  const r = new THREE.Group();
  r.name = 'survivor-rifle';
  r.position.set(0.165, 1.045 - torsoPivotY, -0.218);
  r.rotation.set(-Math.PI / 2, 0, -0.07, 'ZXY');
  r.scale.setScalar(0.84);
  r.add(copy);
  torso.add(r);

  // Taut sling webbing hugging receiver & connecting straight to the pack edge (zero floating bars!)
  const box = (parent, w, h, d, mat, x, y, z) => {
    const g = new THREE.BoxGeometry(w, h, d); geos.push(g);
    const o = new THREE.Mesh(g, mat); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o;
  };
  const slingM = webMat || M.oliveDark;
  box(r, 0.022, 0.010, 0.64, slingM, -0.012, 0.048, 0);
  box(r, 0.036, 0.072, 0.024, slingM, -0.008, 0.024, -0.25);
  box(r, 0.036, 0.072, 0.024, slingM, -0.008, 0.024, 0.25);
  r.updateMatrix();
  for (const [z, y] of [[-0.25, 0.87], [0.25, 1.13]]) {
    const a = new THREE.Vector3(0.098, y - torsoPivotY, -0.206);
    const b = new THREE.Vector3(-0.008, 0.024, z).applyMatrix4(r.matrix);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = Math.max(0.01, a.distanceTo(b));
    const strap = box(torso, 0.022, len, 0.010, slingM, mid.x, mid.y, mid.z);
    strap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  }

  // 2. Combat hand-held M4 (hidden at rest, shown during roof combat alert while slung rifle hides!)
  // Mounted in torso space on a dedicated aim pivot at the right shoulder pocket (+X = right side).
  // Marked noRigSkin so recoil/flashes never trigger a SkinnedMesh rebake in studio/marine-skin.js.
  const heldCopy = carryGunCopy('m4');
  if (heldCopy) {
    const aimRig = new THREE.Group();
    aimRig.name = 'survivor-held-rifle';
    aimRig.visible = false;
    // Pivot sits right in the front shoulder pocket (D-243 chest front z ~ +0.15, shoulder x ~ +0.13)
    aimRig.position.set(0.135, 1.135 - torsoPivotY, 0.145);
    heldCopy.scale.setScalar(0.86);
    // carryGunCopy is centered on its bounding box (~0.85 m * 0.86 = 0.73 m):
    // shift forward +0.34 m so the buttstock seats flush in the shoulder pocket and barrel extends ahead!
    heldCopy.position.set(0, -0.015, 0.34);
    aimRig.add(heldCopy);

    // Muzzle flash cone at barrel tip (0.34 + 0.365 = 0.705 m forward of shoulder pivot)
    const flashGeo = new THREE.ConeGeometry(0.052, 0.24, 8);
    flashGeo.rotateX(Math.PI / 2);
    flashGeo.translate(0, 0, 0.12);
    geos.push(flashGeo);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffd27a, transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.name = 'survivor-m4-flash';
    flash.position.set(0, 0.012, 0.72);
    flash.visible = false;
    aimRig.add(flash);

    aimRig.traverse((o) => { o.userData.noRigSkin = true; });
    aimRig.userData.flash = flash;
    aimRig.userData.muzzleLocal = new THREE.Vector3(0, 0.012, 0.73);
    aimRig.userData.ejectLocal = new THREE.Vector3(0.045, 0.018, 0.38);
    torso.add(aimRig);
    m.userData.survivorHeldRifle = aimRig;
    m.userData.survivorSlungRifle = r;
  }
}

// Main entry called by makeSurvivorFigure(who) in index.html.
export function dressSurvivorFigure(THREE, m, who, ctx) {
  const look = SURVIVOR_LOOK[who] || SURVIVOR_LOOK.okafor;
  const M = getMats(THREE);
  const { rmesh, addCast, buildSurvivorBeard, UNARMED_ARMS } = ctx;
  const geos = [];
  const hip = m.userData.hip;
  const torso = m.userData.torsoG;
  const headG = m.userData.headG;
  const armRG = m.userData.armRG;

  if (look.kit === 'aidBag') {
    if (hip) buildOkaforIfak(THREE, hip, M, geos, rmesh);
    if (armRG) buildMedicArmband(THREE, armRG, M, geos);
  } else if (look.kit === 'belt' && torso) {
    buildBrandtGunnerKit(THREE, torso, hip, M, geos, addCast, rmesh);
  } else if (look.kit === 'wrench') {
    buildPikeMechanicKit(THREE, torso, hip, headG, M, geos, addCast, rmesh);
  }

  if (look.rifle) {
    buildSurvivorRifles(THREE, m, torso, M, geos, ctx);
  }

  // Facial character details
  const d = m.userData.dress;
  if (d && headG) {
    if (m.userData.wardrobe?.mask?.meshes) {
      for (const o of m.userData.wardrobe.mask.meshes) o.visible = false;
    }
    if (m.userData.bareFaceDetails) m.userData.bareFaceDetails.visible = true;
    if (who === 'brandt' && buildSurvivorBeard) {
      const beard = buildSurvivorBeard(THREE, d.mats.hair, { lite: true });
      headG.add(beard);
      geos.push(beard.geometry);
    }
  }

  // Natural hanging fingers (GB-169/GB-170) AND inward-facing palms at rest (palms toward thighs, thumb resting along index)
  // Mark hand meshes noRigSkin so live combat grip/hang/wave finger curls deform smoothly on GPU!
  for (const [side, elbow] of [[-1, m.userData.elbowLG], [1, m.userData.elbowRG]]) {
    const wrist = elbow?.userData?.wrist;
    if (wrist) {
      wrist.rotation.set(0.05, -side * 1.15, 0);
      wrist.traverse((o) => { o.userData.noRigSkin = true; });
      const hand = wrist.userData?.hand;
      if (hand) hand.set(HAND_POSES.hang).update();
    }
  }

  // Subtle individual stature variation while preserving ground contact at y = 0
  if (look.stature) {
    m.scale.set(look.stature.x, look.stature.y, look.stature.z);
  }

  m.userData.survivorWho = who;
  m.userData.survivorGeos = geos;

  if (UNARMED_ARMS) {
    const U = UNARMED_ARMS, u = m.userData;
    u.armLG.rotation.set(U.x, U.y, -U.z);
    u.armRG.rotation.set(U.x, -U.y, U.z);
    u.elbowLG.rotation.set(U.elbow, 0, 0);
    u.elbowRG.rotation.set(U.elbow, 0, 0);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Tactical HQ Roof Post Props — Military family, zero clipping, rich visual storytelling!
// ---------------------------------------------------------------------------
function addSandbag(THREE, parent, M, geos, x, y, z, ry, alt = false) {
  const g = new THREE.SphereGeometry(1, 10, 7);
  g.scale(0.24, 0.088, 0.125);
  geos.push(g);
  const bag = new THREE.Mesh(g, alt ? M.burlapB : M.burlapA);
  bag.position.set(x, y, z);
  bag.rotation.set(0, ry, 0);
  bag.castShadow = true; bag.receiveShadow = true;
  parent.add(bag);
  return bag;
}

function addBedroll(THREE, parent, M, geos, x, z, ry = 0) {
  const grp = new THREE.Group();
  grp.name = 'roof-bedroll';
  grp.position.set(x, 0, z);
  grp.rotation.y = ry;
  parent.add(grp);

  // Foam sleep pad underneath
  const matGeo = new THREE.BoxGeometry(0.74, 0.032, 1.76); geos.push(matGeo);
  const mat = new THREE.Mesh(matGeo, M.oliveDark);
  mat.position.set(0, 0.016, 0);
  mat.receiveShadow = true; grp.add(mat);

  // Soft sleeping bag body (lofted/rounded capsule-like slab, not a sharp box!)
  const bagGeo = new THREE.BoxGeometry(0.68, 0.11, 1.62); geos.push(bagGeo);
  const bag = new THREE.Mesh(bagGeo, M.canvas);
  bag.position.set(0, 0.082, 0.04);
  bag.castShadow = true; bag.receiveShadow = true; grp.add(bag);

  // Rolled collar & folded pillow at headboard (-Z inboard)
  const rollGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.66, 10);
  rollGeo.rotateZ(Math.PI / 2); geos.push(rollGeo);
  const roll = new THREE.Mesh(rollGeo, M.olive);
  roll.position.set(0, 0.095, -0.74);
  roll.castShadow = true; grp.add(roll);

  const pilGeo = new THREE.SphereGeometry(1, 10, 7);
  pilGeo.scale(0.24, 0.072, 0.15); geos.push(pilGeo);
  const pil = new THREE.Mesh(pilGeo, M.pillow);
  pil.position.set(0, 0.145, -0.58);
  pil.castShadow = true; grp.add(pil);

  return grp;
}

function addCampLantern(THREE, parent, M, geos, x, y, z) {
  const g = new THREE.Group();
  g.name = 'roof-lantern';
  g.position.set(x, y, z);
  parent.add(g);
  const baseG = new THREE.CylinderGeometry(0.068, 0.076, 0.06, 10); geos.push(baseG);
  const base = new THREE.Mesh(baseG, M.oliveDark); base.position.y = 0.03; g.add(base);
  const glassG = new THREE.CylinderGeometry(0.052, 0.052, 0.11, 10); geos.push(glassG);
  const glassMat = M.lampGlass.clone();
  const glass = new THREE.Mesh(glassG, glassMat); glass.position.y = 0.115; g.add(glass);
  const capG = new THREE.CylinderGeometry(0.072, 0.076, 0.032, 10); geos.push(capG);
  const cap = new THREE.Mesh(capG, M.steelDark); cap.position.y = 0.185; g.add(cap);
  g.userData.lampMat = glassMat;
  return g;
}

export function buildRoofPostProps(THREE, who, root) {
  const M = getMats(THREE);
  const geos = [];
  const refs = { lanternMat: null, healChemMat: null, ammoCanBrass: null };

  // Inboard bedroll positioned cleanly clear of standing/resting feet (zero boot-in-bedroll overlap!)
  const bed = addBedroll(THREE, root, M, geos, -0.64, -1.62, 0.22);
  refs.bedroll = bed;

  // Military gear crate to the side (+X inboard)
  const crateG = new THREE.Group();
  crateG.name = 'roof-crate-' + who;
  crateG.position.set(0.84, 0, -0.58);
  crateG.rotation.y = -0.22;
  root.add(crateG);

  const cBodyG = new THREE.BoxGeometry(0.62, 0.42, 0.46); geos.push(cBodyG);
  const cBody = new THREE.Mesh(cBodyG, who === 'okafor' ? M.olive : M.woodCrate);
  cBody.position.y = 0.21; cBody.castShadow = true; cBody.receiveShadow = true;
  crateG.add(cBody);

  const cLidG = new THREE.BoxGeometry(0.65, 0.055, 0.49); geos.push(cLidG);
  const cLid = new THREE.Mesh(cLidG, who === 'okafor' ? M.oliveDark : M.woodTrim);
  cLid.position.y = 0.435; cLid.castShadow = true; cLid.receiveShadow = true;
  crateG.add(cLid);

  for (const sx of [-0.22, 0.22]) {
    const latchG = new THREE.BoxGeometry(0.04, 0.075, 0.025); geos.push(latchG);
    const latch = new THREE.Mesh(latchG, M.steelDark);
    latch.position.set(sx, 0.39, 0.238);
    crateG.add(latch);
  }

  // Forward low sandbag parapet rest (gives every survivor a believable fortified roof post!)
  const bagArc = who === 'brandt'
    ? [[-0.56, 0.40, 0.45], [-0.20, 0.62, 0.14], [0.20, 0.62, -0.14], [0.56, 0.40, -0.45]]
    : [[-0.36, 0.44, 0.22], [0.0, 0.50, 0], [0.36, 0.44, -0.22]];
  bagArc.forEach(([bx, bz, bry], idx) => {
    addSandbag(THREE, root, M, geos, bx, 0.082, bz, bry, idx % 2 === 1);
    if (who === 'brandt' || idx === 1) {
      addSandbag(THREE, root, M, geos, bx * 0.96, 0.225, bz * 0.96, bry + 0.06, idx % 2 === 0);
    }
  });

  if (who === 'okafor') {
    // White medic cross panel painted on the front & top of Okafor's triage footlocker
    const sqG = new THREE.BoxGeometry(0.20, 0.008, 0.20); geos.push(sqG);
    const sq = new THREE.Mesh(sqG, M.white); sq.position.set(0, 0.466, 0); crateG.add(sq);
    for (const [w, d] of [[0.13, 0.042], [0.042, 0.13]]) {
      const crG = new THREE.BoxGeometry(w, 0.010, d); geos.push(crG);
      const cr = new THREE.Mesh(crG, M.medicRed); cr.position.set(0, 0.468, 0); crateG.add(cr);
    }
    // Ready-heal green chem-light indicator lying on the crate lid (glows bright when heal ready!)
    const chemMat = M.chemGreen.clone();
    const chemG = new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8);
    chemG.rotateZ(Math.PI / 2); geos.push(chemG);
    const chem = new THREE.Mesh(chemG, chemMat);
    chem.position.set(-0.20, 0.476, 0.14);
    chem.rotation.y = 0.4;
    crateG.add(chem);
    refs.healChemMat = chemMat;

    // Warm camp lantern on corner of triage crate
    const lantern = addCampLantern(THREE, crateG, M, geos, 0.21, 0.463, -0.11);
    refs.lanternMat = lantern.userData.lampMat;

    // Rolled gauze & medical tin beside lantern
    const rollG = new THREE.CylinderGeometry(0.032, 0.032, 0.075, 10); geos.push(rollG);
    const roll = new THREE.Mesh(rollG, M.white); roll.position.set(-0.22, 0.50, -0.10); crateG.add(roll);
  } else if (who === 'brandt') {
    // Stacked olive 7.62 NATO ammo cans beside Brandt's M240B tripod
    for (const [ax, ay, az, ary] of [[-0.44, 0.10, 0.12, 0.35], [-0.46, 0.30, 0.10, 0.22], [-0.72, 0.10, -0.14, -0.4]]) {
      const canG = new THREE.BoxGeometry(0.155, 0.195, 0.29); geos.push(canG);
      const can = new THREE.Mesh(canG, M.oliveDark);
      can.position.set(ax, ay, az); can.rotation.y = ary;
      can.castShadow = true; can.receiveShadow = true; root.add(can);
      const handleG = new THREE.BoxGeometry(0.04, 0.014, 0.11); geos.push(handleG);
      const handle = new THREE.Mesh(handleG, M.steelDark);
      handle.position.set(ax, ay + 0.105, az); handle.rotation.y = ary; root.add(handle);
    }
    // Scattered spent 7.62 brass casings gleaming beside the tripod feet
    const brassG = new THREE.CylinderGeometry(0.007, 0.007, 0.048, 6);
    brassG.rotateZ(Math.PI / 2); geos.push(brassG);
    for (let i = 0; i < 10; i++) {
      const a = i * 1.97 + 0.3, rad = 0.22 + (i % 4) * 0.11;
      const b = new THREE.Mesh(brassG, M.brass);
      b.position.set(0.12 + Math.cos(a) * rad, 0.008, 0.28 + Math.sin(a) * rad);
      b.rotation.y = i * 1.13;
      root.add(b);
    }
    // Brandt's watchtower notebook & steel mug on his crate
    const nbG = new THREE.BoxGeometry(0.15, 0.02, 0.21); geos.push(nbG);
    const nb = new THREE.Mesh(nbG, M.paper); nb.position.set(-0.08, 0.473, 0.02); nb.rotation.y = 0.35; crateG.add(nb);
    const mugG = new THREE.CylinderGeometry(0.042, 0.038, 0.092, 10); geos.push(mugG);
    const mug = new THREE.Mesh(mugG, M.mug); mug.position.set(0.18, 0.508, 0.06); crateG.add(mug);
    const lantern = addCampLantern(THREE, crateG, M, geos, 0.18, 0.463, -0.12);
    refs.lanternMat = lantern.userData.lampMat;
  } else {
    // Pike: steel mechanic's toolbox, spare wire spool, oil can, mug & work lamp
    const tbG = new THREE.BoxGeometry(0.36, 0.16, 0.18); geos.push(tbG);
    const tb = new THREE.Mesh(tbG, M.toolboxRed);
    tb.position.set(-0.08, 0.543, -0.02); tb.rotation.y = 0.28; tb.castShadow = true; crateG.add(tb);
    const tbH = new THREE.BoxGeometry(0.18, 0.018, 0.018); geos.push(tbH);
    const tbHandle = new THREE.Mesh(tbH, M.steel);
    tbHandle.position.set(-0.08, 0.642, -0.02); tbHandle.rotation.y = 0.28; crateG.add(tbHandle);
    // Oil can & tape roll beside toolbox
    const oilG = new THREE.CylinderGeometry(0.035, 0.042, 0.11, 10); geos.push(oilG);
    const oil = new THREE.Mesh(oilG, M.brass); oil.position.set(0.19, 0.518, 0.08); crateG.add(oil);
    const lantern = addCampLantern(THREE, crateG, M, geos, 0.20, 0.463, -0.11);
    refs.lanternMat = lantern.userData.lampMat;
  }

  return { geos, refs };
}

// Physical combat med-pouch tossed down by Okafor when the player is critically injured near HQ!
export function buildMedPouchDrop(THREE) {
  const M = getMats(THREE);
  const g = new THREE.Group();
  g.name = 'okafor-med-drop';
  const geos = [];

  const bodyG = new THREE.BoxGeometry(0.24, 0.12, 0.18); geos.push(bodyG);
  const body = new THREE.Mesh(bodyG, M.olive);
  body.position.y = 0.06; body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  const sqG = new THREE.BoxGeometry(0.11, 0.008, 0.11); geos.push(sqG);
  const sq = new THREE.Mesh(sqG, M.white); sq.position.y = 0.124; g.add(sq);
  for (const [w, d] of [[0.075, 0.024], [0.024, 0.075]]) {
    const crG = new THREE.BoxGeometry(w, 0.010, d); geos.push(crG);
    const cr = new THREE.Mesh(crG, M.medicRed); cr.position.y = 0.127; g.add(cr);
  }

  // Glowing green chem-light taped on top so the player spots it immediately in the dark courtyard
  const chemG = new THREE.CylinderGeometry(0.014, 0.014, 0.15, 8);
  chemG.rotateZ(Math.PI / 2); geos.push(chemG);
  const chemMat = M.chemGreen.clone();
  const chem = new THREE.Mesh(chemG, chemMat);
  chem.position.set(0, 0.14, 0.055); chem.rotation.y = 0.25;
  g.add(chem);

  g.userData.geos = geos;
  g.userData.chemMat = chemMat;
  return g;
}
