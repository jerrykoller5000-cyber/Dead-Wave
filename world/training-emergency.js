// world/training-emergency.js — CH-3 #20 (D-237 item 13, Claude 8's audit; Claude 10, CJ-5): what still glows in Training
// when the wall switch puts the lights out. Jerry's audit line: "Lamps off: everything one dull grey-blue, no exit signs
// or emergency lamps to read by." A real range and hangar keep their EXIT signs lit and have battery emergency fittings
// that come on when the mains go: twin-head "bug-eye" lamps and linear strip fittings on the walls.
//
// Emissive only: no new real lights (a light costs every lit pixel; this costs nothing past its draws). Four new
// materials, shared by every fitting (the EXIT face, the lenses, a warm wash, a green wash), so the room's bake
// (bakeStatic, CL-117) merges them to four draws; the housings use the room's steelLight, so they merge into its
// existing draw. No shadows (small, high on the walls). The washes (what the lamps would light) show only in the dark.
//
//   dressEmergency(T, { R, B, D, POCKET, add, std, steelLight, root, keep?, document? }) -> { setLit(on), parts, washes, exitMat, lensMat, glowMat, exitGlowMat }
//     setLit(true)  lights on: the EXIT faces glow softly (as they always do), the emergency lenses are dark plastic
//     setLit(false) lights out: the EXIT faces brighten, the lenses and strips glow warm white
//   parts: [{ kind: 'exit'|'twin'|'strip', room: 'range'|'build', x, y, z, nx, nz }] (training-local), for the test
//
// Where (training-local coordinates, floor y 0): every fitting on a wall face, clear of the pillars (PILLAR_Z), the four
// containment guns (the middle of each hangar wall, 5.6 m / 9.65 m), the PGB RANGE stencil (x -3.7..3.7, y 3.2-4.9),
// the terminals' wall (z -11..-2) and the signs over the doorway.
import { getTrainingPBR } from './training-textures.js';
export const EMERGENCY = Object.freeze({
  exitOn: 0.55, exitOff: 1.5,      // EXIT face emissive intensity, lights on / off
  lensOff: 3.0,                    // the emergency lenses and strips with the lights off (0 on)
  glow: 0.5, exitGlow: 0.45,       // the soft additive washes round each fitting, lights off only (v2, after the first sheet)
  MOUNT_Y: 3.35,                   // fittings' centre height on the walls (above the fences' wire, under the strips)
});

export function dressEmergency(T, o) {
  const { R, B, D, POCKET, add, std, steelLight } = o;
  const root = o.root;
  const parts = [];
  const doc = o.document !== undefined ? o.document : (typeof document !== 'undefined' ? document : null);

  // the EXIT face: green field, white letters, a thin white rim (one canvas for every sign)
  let exitTex = null;
  if (doc && doc.createElement) {
    const cv = doc.createElement('canvas'); cv.width = 512; cv.height = 224;
    const c = cv.getContext && cv.getContext('2d');
    if (c) {
      // AG-405: backlit translucent green acrylic diffuser with soft inner LED core glow & recessed bezel edge
      const gr = c.createRadialGradient(256, 112, 18, 256, 112, 275);
      gr.addColorStop(0, '#189e4e'); gr.addColorStop(0.68, '#0c7838'); gr.addColorStop(1, '#074e24');
      c.fillStyle = gr; c.fillRect(0, 0, 512, 224);
      c.fillStyle = 'rgba(0,0,0,0.08)'; for (let y = 0; y < 224; y += 4) c.fillRect(0, y, 512, 1);
      c.strokeStyle = 'rgba(4,28,14,0.65)'; c.lineWidth = 14; c.strokeRect(7, 7, 498, 210);
      c.strokeStyle = '#dff5e6'; c.lineWidth = 8; c.strokeRect(18, 18, 476, 188);
      c.fillStyle = '#f5fff8'; c.textAlign = 'center'; c.textBaseline = 'middle';
      let px = 148; c.font = `bold ${px}px Impact, "Arial Black", sans-serif`;
      while (px > 20 && c.measureText && c.measureText('EXIT').width > 392) { px -= 4; c.font = `bold ${px}px Impact, "Arial Black", sans-serif`; }
      c.fillStyle = 'rgba(180,255,210,0.32)'; c.fillText('EXIT', 256, 118);
      c.fillStyle = '#f6fff9'; c.fillText('EXIT', 256, 118);
    }
    exitTex = new T.CanvasTexture(cv);
    if (T.SRGBColorSpace) exitTex.colorSpace = T.SRGBColorSpace;
    exitTex.anisotropy = 8; exitTex.generateMipmaps = true;
  }
  const pbr = getTrainingPBR(T);
  const exitMat = std({ color: 0xffffff, map: exitTex, emissive: 0xffffff, emissiveMap: exitTex, emissiveIntensity: EMERGENCY.exitOn,
    roughness: 0.30, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  if (!exitTex) { exitMat.color.setHex(0x0c7a3a); exitMat.emissive.setHex(0x2fbf6a); }
  if (exitTex && o.keep) o.keep(exitTex);
  // the emergency lenses and strip diffusers: prismatic frosted acrylic, warm white when lit
  const lensMat = std({ color: 0xe9e6dc, emissive: 0xfff0cf, emissiveIntensity: 0, roughness: 0.25,
    ...(pbr ? { map: pbr.prismaticLens.map, normalMap: pbr.prismaticLens.normalMap, normalScale: T.Vector2 ? new T.Vector2(0.85, 0.85) : undefined } : {}) });
  // v2 (CJ-5, after the first sheet: the fittings alone read as specks at 15 m): what they light, faked, shown only with
  // the lights off: additive, unlit, no depth write. Two more materials (warm, green), so two more draws once baked.
  // v3 (the Director's LOOK, 06:36Z: the v2 washes read as round glowing balls on the wall): one texture with two halves.
  // Left: a soft fan that opens DOWN the wall from just under the fitting (what a lamp aimed down throws on the wall);
  // right: the round pool on the floor in front of a twin lamp. Every edge of both halves is 0, so no seams.
  let glowTex = null;
  if (doc && doc.createElement) {
    const cv = doc.createElement('canvas'); cv.width = 256; cv.height = 128;
    const c = cv.getContext && cv.getContext('2d');
    if (c && c.createImageData && c.putImageData) {
      const img = c.createImageData(128, 128), d = img.data, AX = 64, AY = 12, HALF = 1.0;
      for (let py = 0; py < 128; py++) for (let px = 0; px < 128; px++) {
        const ex = px + 0.5 - AX, ey = py + 0.5 - AY, near = Math.hypot(ex, ey);
        let v;
        if (ey < 0) v = Math.pow(Math.max(0, 1 - near / AY), 2);                 // a little glow just above the apex
        else {
          const dx = ex / 64, dy = ey / (128 - AY), ang = Math.atan2(Math.abs(ex), ey);
          const k = Math.min(1, Math.max(0, (HALF - ang) / 0.55)), cone = k * k * (3 - 2 * k);
          const fall = Math.pow(Math.max(0, 1 - Math.hypot(dx * 0.85, dy)), 1.25);
          v = Math.min(1, cone * fall + 0.35 * Math.exp(-Math.pow(near / 10, 2)));
        }
        const i = (py * 128 + px) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(255 * v);
      }
      c.putImageData(img, 0, 0);
    }
    if (c && c.createRadialGradient) {
      const gr = c.createRadialGradient(192, 64, 0, 192, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(128, 0, 128, 128);
    }
    glowTex = new T.CanvasTexture(cv);
    if (o.keep) o.keep(glowTex);
  }
  const FAN_APEX = 12 / 128;   // the fan's apex, as a share of the plane's height down from its top
  const half = (geo, right) => {   // put a plane's UVs on one half of the wash texture
    const uv = geo.attributes && geo.attributes.uv;
    if (uv && uv.setX) { for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5 + (right ? 0.5 : 0)); uv.needsUpdate = true; }
    return geo;
  };
  const basic = (p) => { const m = new T.MeshBasicMaterial(p); if (o.keep) o.keep(m); if (o.onBasic) o.onBasic(m); return m; };
  const washProps = { map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
  const glowMat = basic({ color: 0xffd7a0, opacity: EMERGENCY.glow, ...washProps });
  const exitGlowMat = basic({ color: 0x3cff8a, opacity: EMERGENCY.exitGlow, ...washProps });
  const washes = [];   // not props: training.js keeps them out of propSolids (no solid, no surface for the line queries)
  const wash = (mat, w, h, x, y, z, parent, floor = false) => {
    const m = add(half(new T.PlaneGeometry(w, h), floor), mat, x, y, z, parent); m.castShadow = false; m.receiveShadow = false; m.renderOrder = 2; washes.push(m);
    if (floor) m.rotation.x = -Math.PI / 2;
    return m;
  };
  // a fan down the wall whose apex sits at (x, apexY) in the fitting's group
  const fan = (mat, w, h, apexY, parent) => wash(mat, w, h, 0, apexY + FAN_APEX * h - h / 2, 0.003, parent);

  const P = (w, h, d, mat, x, y, z, parent) => { const m = add(new T.BoxGeometry(w, h, d), mat, x, y, z, parent); m.castShadow = false; m.receiveShadow = false; return m; };
  // a group on a wall: its +z faces into the room along (nx, nz); x along the wall
  const onWall = (x, y, z, nx, nz) => { const gr = new T.Group(); gr.position.set(x, y, z); gr.rotation.y = Math.atan2(nx, nz); root.add(gr); return gr; };

  // EXIT: a steel box 62 x 30 x 7 cm (hangar size: read across 30 m), the lit face 56 x 24 cm, 1 mm proud of the box
  const exitSign = (room, x, y, z, nx, nz) => {
    const gr = onWall(x, y, z, nx, nz);
    P(0.62, 0.30, 0.07, steelLight, 0, 0, 0.035, gr);
    const face = add(new T.PlaneGeometry(0.56, 0.24), exitMat, 0, 0, 0.071, gr); face.castShadow = false;
    fan(exitGlowMat, 1.8, 1.4, -0.13, gr);                          // green spill down the wall under the sign
    parts.push({ kind: 'exit', room, x, y, z, nx, nz });
  };
  // twin-head battery lamp: a back box 30 x 16 x 7 cm, two round heads under it tipped 35 deg down, a lens in each
  const twin = (room, x, y, z, nx, nz) => {
    const gr = onWall(x, y, z, nx, nz);
    P(0.36, 0.18, 0.08, steelLight, 0, 0, 0.04, gr);
    for (const s of [-1, 1]) {
      const head = new T.Group(); head.position.set(s * 0.12, -0.115, 0.085); head.rotation.x = 0.61; head.rotation.y = s * 0.3; gr.add(head);
      P(0.03, 0.05, 0.05, steelLight, 0, 0.045, -0.025, head);   // the knuckle up into the box
      const shell = add(new T.CylinderGeometry(0.06, 0.066, 0.08, 16), steelLight, 0, 0, 0.0, head);
      shell.rotation.x = Math.PI / 2; shell.castShadow = false;
      const lens = add(new T.CylinderGeometry(0.055, 0.055, 0.006, 16), lensMat, 0, 0, 0.042, head);
      lens.rotation.x = Math.PI / 2; lens.castShadow = false;
    }
    fan(glowMat, 3.2, 2.9, -0.10, gr);                              // the fan it throws down the wall
    wash(glowMat, 3.6, 3.0, 0, -y + 0.006, 1.7, gr, true);          // the pool on the floor in front (its heads aim down and out)
    parts.push({ kind: 'twin', room, x, y, z, nx, nz });
  };
  // linear strip fitting: a steel body 1.0 m x 7 x 6 cm, its diffuser along the front-bottom edge
  const strip = (room, x, y, z, nx, nz, len = 1.0) => {
    const gr = onWall(x, y, z, nx, nz);
    P(len, 0.07, 0.06, steelLight, 0, 0, 0.03, gr);
    P(len - 0.04, 0.03, 0.022, lensMat, 0, -0.03, 0.05, gr);
    P(0.02, 0.075, 0.065, steelLight, -len / 2 + 0.01, 0, 0.033, gr);   // end caps, proud of the diffuser
    P(0.02, 0.075, 0.065, steelLight, len / 2 - 0.01, 0, 0.033, gr);
    fan(glowMat, len + 2.0, 2.2, -0.04, gr);                        // a wide fan down the wall under the diffuser
    parts.push({ kind: 'strip', room, x, y, z, nx, nz });
  };

  const Y = EMERGENCY.MOUNT_Y, dz = (D.minZ + D.maxZ) / 2;
  // --- over the doorway, both faces of its header pocket (the BUILD ROOM sign is 3.41-4.03 m on the range side, the
  // security label 3.48-3.84 m in the hangar): the only door in Training, so the exit sign is over it on both sides.
  exitSign('range', D.x + POCKET + 0.0005, 4.46, dz, 1, 0);
  exitSign('build', D.x - POCKET - 0.0005, 4.32, dz, -1, 0);
  // --- the range (16 x 42 m, 6 m walls)
  twin('range', 5.4, Y, R.minZ + 0.0005, 0, 1);          // back wall, right of the PGB RANGE stencil
  strip('range', -5.4, Y, R.minZ + 0.0005, 0, 1);         // back wall, left of it (over the lockers)
  twin('range', R.maxX - 0.0005, Y, 8, -1, 0);            // terminals' wall, past the firing line
  twin('range', R.minX + 0.0005, Y, 8, 1, 0);             // doorway wall, past the firing line
  strip('range', R.maxX - 0.0005, Y, 20, -1, 0);          // downrange, both side walls
  strip('range', R.minX + 0.0005, Y, 20, 1, 0);
  // --- the hangar (36 x 40 m): between the pillars (z -6, 0, 6 ... 24), off each wall's middle (its containment gun)
  twin('build', B.minX + 0.0005, Y, 15, 1, 0);            // west wall, bay 12-18
  twin('build', B.minX + 0.0005, Y, -9, 1, 0);            // west wall, bay -12..-6 (the infirmary corner)
  strip('build', B.maxX - 0.0045, Y, -3, -1, 0);          // east wall, bay -6..0, right of the doorway
  twin('build', B.maxX - 0.0045, Y, 21, -1, 0);           // east wall, bay 18-24
  twin('build', -17, Y, B.minZ + 0.0005, 0, 1);           // south wall, east of its gun (x -26)
  strip('build', -36, Y, B.minZ + 0.0005, 0, 1);          // south wall, west of it
  twin('build', -38, Y, B.maxZ - 0.0005, 0, -1);          // gate wall, clear of the gate's frame
  twin('build', -14, Y, B.maxZ - 0.0005, 0, -1);

  let lit = true;
  function setLit(on) {
    lit = !!on;
    exitMat.emissiveIntensity = lit ? EMERGENCY.exitOn : EMERGENCY.exitOff;
    lensMat.emissiveIntensity = lit ? 0 : EMERGENCY.lensOff;
    glowMat.visible = exitGlowMat.visible = !lit;
    return lit;
  }
  setLit(true);
  return { setLit, lit: () => lit, parts, washes, exitMat, lensMat, glowMat, exitGlowMat };
}
