// Props and pose overlays for the ranged zombie abilities. Attach after mesh
// compaction/skinning; the animated props must remain separate rigid objects.
// No game state, damage, lights, randomness, or scene ownership lives here.
import { poseColossusPitch, swingColossusSack } from './colossus-pitch.js';
import { COLOSSUS_ROCK_RADIUS } from './zombie-abilities.js';   // D-244 (Claude 5)
const caches = new WeakMap();
const clamp = x => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const ease = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

function mergedGeometry(THREE, pieces) {
  const positions = [], normals = [];
  for (const piece of pieces) {
    const geo = piece.index ? piece.toNonIndexed() : piece;
    positions.push(...geo.attributes.position.array);
    normals.push(...geo.attributes.normal.array);
    if (geo !== piece) geo.dispose();
    piece.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.computeBoundingSphere();
  return out;
}

function coloredGeometry(THREE, entries) {
  const xyz = [], normals = [], colors = [];
  for (const entry of entries) {
    const source = entry.geometry.clone();
    if (entry.matrix) source.applyMatrix4(entry.matrix);
    const geo = source.index ? source.toNonIndexed() : source;
    xyz.push(...geo.attributes.position.array); normals.push(...geo.attributes.normal.array);
    const shade = geo.attributes.shade, tint = geo.attributes.tint;   // D-244: optional per-vertex darkening / tint (sack)
    for (let i = 0; i < geo.attributes.position.count; i++) {
      const k = shade ? shade.getX(i) : 1;
      colors.push(entry.color.r * k * (tint ? tint.getX(i) : 1), entry.color.g * k * (tint ? tint.getY(i) : 1), entry.color.b * k * (tint ? tint.getZ(i) : 1));
    }
    if (geo !== source) geo.dispose(); source.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  return geo;
}

function flameGeometry(THREE) {
  const xyz = [], colors = [], indices = [];
  // Thin, interleaved tongues leave dark gaps and readable moving tips instead
  // of merging into one solid orange cuff. All fire and embers stay in one draw.
  const tongues = [[0, 0, 1.18, .3], [-.28, .06, .86, 1.5], [.28, -.05, 1.02, 3.2], [.04, .26, .78, 4.4], [-.06, -.27, .95, 5.5], [-.19, -.18, .69, 2.2], [.20, .18, .83, 6.2]];
  const levels = [0, .24, .57, .87, 1];
  const widths = [.16, .20, .10, .028, .001];
  const sides = 4, tongueData = [], sparks = [];
  for (const [cx, cz, height, phase] of tongues) {
    const start = xyz.length / 3;
    tongueData.push({start,cx,cz,height,phase});
    for (let r = 0; r < levels.length; r++) {
      const y = levels[r];
      for (let j = 0; j < sides; j++) {
        const angle = j / sides * Math.PI * 2;
        const radius = widths[r] * (.9 + .13 * Math.sin(j * 2.3 + phase));
        xyz.push(cx + radius * Math.cos(angle), y * height - .08, cz + radius * Math.sin(angle));
        const color = new THREE.Color().setRGB(
          mix(1, .66, ease((y - .70) / .30)),
          mix(.58, .025, ease(y)),
          mix(.045, .002, ease(y))
        );
        colors.push(color.r, color.g, color.b);
        if (r < levels.length - 1) {
          const a = start + r * sides + j, b = start + r * sides + (j + 1) % sides;
          indices.push(a, b, a + sides, b, b + sides, a + sides);
        }
      }
    }
  }
  const movingVertices = xyz.length / 3;
  // Bake the hot fist core into the same draw as the translucent fire tongues.
  const core = new THREE.IcosahedronGeometry(1, 0);
  const corePositions = core.attributes.position;
  for (let i = 0; i < corePositions.count; i++) {
    indices.push(xyz.length / 3);
    xyz.push(corePositions.getX(i) * (.068 / .35), corePositions.getY(i) * (.085 / .52), corePositions.getZ(i) * (.066 / .35));
    colors.push(1, .40, .018);
  }
  core.dispose();
  // Tiny tetrahedral embers rise and shrink away; fixed slots, no particle pool,
  // extra materials or lights. Their reset is invisible at zero radius.
  const emberShape = [[1,0,-.6],[-1,0,-.6],[0,0,1],[0,1.7,0]];
  for(let i=0;i<4;i++){
    const start=xyz.length/3;sparks.push({start,phase:i*.61803398875%1,angle:i*2.399963});
    for(const[x,y,z]of emberShape){xyz.push(x*.018,y*.018,z*.018);colors.push(1,.45,.025);}
    for(const a of [0,2,1,0,1,3,1,2,3,2,0,3])indices.push(start+a);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.userData.movingVertices = movingVertices;
  geo.userData.fire = {tongues:tongueData,levels,widths,sides,sparks,emberShape};
  return geo;
}

// D-244: the colossus's rock sack, in torso units before the sculpture scale. +x is his right, -z his back.
// The sack and its tether swing from the knot fixed to the waist belt.
const SACK = Object.freeze({ center: [.315, -.115, -.310], radii: [.269, .265, .221], tilt: [-.22, .35, -.14] });
// Shared by the held and the thrown rock: unit-radius lumpy rock, scaled to radius x sculpture scale.
export const COLOSSUS_ROCK = Object.freeze({
  radius: COLOSSUS_ROCK_RADIUS, // ~.89 m across beside the live palm at ~.44 m
  palm: [0, -.65, .05]        // rock centre in the right elbow's frame, before the sculpture scale (the wrist is -.354)
});

function sackGeometry(THREE) {
  const entries = [], Vec = THREE.Vector3;
  function inside(geometry) {
    const normal = geometry.attributes.normal;
    for (let i = 0; i < normal.count; i++) {
      normal.setXYZ(i, -normal.getX(i), -normal.getY(i), -normal.getZ(i));
    }
    const index = geometry.index.array;
    for (let i = 0; i < index.length; i += 3) {
      const b = index[i + 1];
      index[i + 1] = index[i + 2];
      index[i + 2] = b;
    }
    return geometry;
  }
  const burlap = new THREE.Color(0x7d6747), burlapDark = new THREE.Color(0x5c4a32), mouth = new THREE.Color(0x231b13);
  const rope = new THREE.Color(0x8e7a55);
  const [rx, ry, rz] = SACK.radii;
  const opening = .70, lipR = COLOSSUS_ROCK_RADIUS + .029, neckBaseR = COLOSSUS_ROCK_RADIUS + .014;
  const mouthStart = Math.acos(opening);
  const beltKnot = new Vec(.215, -.012, -.125);
  const place = new THREE.Matrix4().compose(new Vec(...SACK.center),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...SACK.tilt)), new Vec(1, 1, 1));
  // Body: a sphere that sags full at the bottom, gathers to a neck at the top and bulges where rocks press out.
  const body = new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, mouthStart, Math.PI - mouthStart);
  const p = body.attributes.position, v = new Vec(), shade = [], tint = [];
  // Two sewn-on patches (grey sacking, brown hide) with a dark stitched edge; no marks or logos.
  const patches = [[new Vec(.50, -.08, -.86), .22, new THREE.Color(0x58544a), .3], [new Vec(.93, -.10, .35), .20, new THREE.Color(0x6e4b33), -.5]];
  // Toward his waist from the sack centre, in the sack's own frame.
  const toBody = new Vec(-.72, 0, .69).normalize()
    .applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...SACK.tilt)).invert());
  const lumps = [[.75, -.35, -.45], [.15, -.55, -.80], [.85, .10, .30], [-.25, -.70, -.45], [.45, .25, -.80],
    [.40, -.85, .30], [-.10, .05, -.95], [.95, -.45, -.10], [.20, -.20, .95], [.60, -.05, -.75], [-.35, -.35, -.85],
    [.70, -.70, -.20], [.05, -.95, -.25], [.90, .30, -.30]].map(d => new Vec(...d).normalize());
  const shape = (u, out) => {
    // Each rock inside pushes a rounded, slightly squared lump through the cloth; the cloth between them sinks.
    let k = .97;
    for (const d of lumps) { const t = Math.max(0, (u.dot(d) - .83) / .17); k += .20 * Math.sqrt(t) * (1 - .3 * t); }
    const y = u.y, angle = Math.atan2(u.z, u.x);
    const gather = y > 0 ? 1 - .52 * y * y * y : 1 + .16 * -y;          // neck pulled in, belly sags full
    const folds = 1 + (y > .3 ? .13 * (y - .3) * Math.sin(angle * 9 + y * 4) : .018 * Math.sin(angle * 5 + y * 7));
    out.set(u.x * rx * k * gather * folds, (y < 0 ? y * (.88 + .1 * (k - .97)) : y) * ry, u.z * rz * k * gather * folds);
    const rimBlend = Math.max(0, (y - .46) / (opening - .46));
    const d = out.dot(toBody);
    if (d > .095) out.addScaledVector(toBody, -(d - .095) * .8 * (1 - rimBlend));
    // Blend the fabric body onto the open collar at its seam.
    out.x += (Math.cos(angle) * neckBaseR - out.x) * rimBlend;
    out.z += (Math.sin(angle) * neckBaseR - out.z) * rimBlend;
    return { k, folds };
  };
  for (let i = 0; i < p.count; i++) {
    const u = new Vec().fromBufferAttribute(p, i), y = u.y;
    const { k, folds } = shape(u, v);
    p.setXYZ(i, v.x, v.y, v.z);
    // Creases between the rocks read darker and the tops of the lumps catch the light; the bottom is dirty
    // (darker, greyer) where it drags and sits in the mud.
    const dirt = y < -.05 ? Math.min(1, (-.05 - y) / .8) : 0;
    shade.push(Math.min(1.1, .58 + 2.6 * (k - .97)) * (1 - .55 * dirt) * (y > .3 ? folds : 1));
    tint.push(1 - .04 * dirt, 1 - .10 * dirt, 1 - .18 * dirt);
  }
  // Two sewn-on patches (grey sacking, brown hide) with a dark stitched edge, lying on the cloth. No marks or logos.
  for (const [dir, size, color, twist] of patches) {
    const n = dir.clone().normalize(), t1 = new Vec(0, 1, 0).cross(n).normalize(), t2 = n.clone().cross(t1);
    t1.applyAxisAngle(n, twist); t2.applyAxisAngle(n, twist);
    for (const [grow, lift, c] of [[1.16, .003, new THREE.Color(0x2e241a)], [1, .0065, color]]) {
      const G = 6, xyz = [], idx = [], q = new Vec(), w = new Vec();
      for (let i = 0; i <= G; i++) for (let j = 0; j <= G; j++) {
        const a = (i / G - .5) * 2, b = (j / G - .5) * 2;
        const ragged = 1 + .06 * Math.sin(i * 2.1 + j * 1.3 + twist * 5);   // hand-cut, uneven edges
        q.copy(n).addScaledVector(t1, a * size * grow * ragged).addScaledVector(t2, b * size * grow * .8 * ragged).normalize();
        shape(q, w); w.addScaledVector(q, lift); xyz.push(w.x, w.y, w.z);
        if (i < G && j < G) { const o = i * (G + 1) + j; idx.push(o, o + 1, o + G + 1, o + 1, o + G + 2, o + G + 1); }
      }
      const patch = new THREE.BufferGeometry(); patch.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
      patch.setIndex(idx); patch.computeVertexNormals();
      // Make sure it faces out (the grid winding depends on the tangent frame).
      const nz = patch.attributes.normal; if (nz.getX(24) * n.x + nz.getY(24) * n.y + nz.getZ(24) * n.z < 0) { patch.index.array.reverse(); patch.computeVertexNormals(); }
      entries.push({ geometry: patch, color: c, matrix: place });
    }
  }
  body.setAttribute('shade', new THREE.Float32BufferAttribute(shade, 1));
  body.setAttribute('tint', new THREE.Float32BufferAttribute(tint, 3));
  body.computeVertexNormals();
  entries.push({ geometry: body, color: burlap, matrix: place });
  const lining = inside(body.clone().scale(.976, .996, .976));
  entries.push({ geometry: lining, color: mouth, matrix: place });
  // The open collar is wide enough for the same stone the hand will carry.
  const neckY = ry * opening, lipY = ry + .035;
  const neck = new THREE.CylinderGeometry(lipR, neckBaseR, lipY - neckY, 20, 2, true), np = neck.attributes.position;
  for (let i = 0; i < np.count; i++) if (np.getY(i) > (lipY - neckY) * .4) {
    // The cloth above the cinch ends in loose, uneven flaps that fold out.
    const a = Math.atan2(np.getZ(i), np.getX(i)), j = Math.round((a + Math.PI) / (Math.PI * 2) * 20);
    const out = 1.03 + .07 * (j % 2) + .026 * Math.sin(j * 2.7);
    np.setXYZ(i, np.getX(i) * out, np.getY(i) + .018 * ((j * 7) % 3) - .01, np.getZ(i) * out);
  }
  neck.translate(0, (neckY + lipY) / 2, 0); neck.computeVertexNormals();
  entries.push({ geometry: neck, color: burlapDark, matrix: place });
  const inner = inside(neck.clone().scale(.97, 1, .97));
  entries.push({ geometry: inner, color: burlapDark, matrix: place });
  const hem = new THREE.CatmullRomCurve3(
    Array.from({ length: 20 }, (_, i) => new Vec().fromBufferAttribute(np, i)), true
  );
  entries.push({ geometry: new THREE.TubeGeometry(hem, 30, .0105, 5, true), color: burlap, matrix: place });
  // Rope cinch below the lip.
  const tie = new THREE.TorusGeometry(lipR * .86, .013, 4, 14); tie.rotateX(Math.PI / 2); tie.translate(0, neckY + .008, 0);
  entries.push({ geometry: tie, color: rope, matrix: place });
  // A short rope from the belt knot up to the cinch (it swings with the sack).
  const cinch = new Vec(-lipR * .7, neckY + .008, lipR * .5).applyMatrix4(place);
  const strap = new THREE.CatmullRomCurve3([
    beltKnot, new Vec(.235, (cinch.y - .012) * .5 + .01, (cinch.z - .125) * .5), cinch
  ]);
  entries.push({ geometry: new THREE.TubeGeometry(strap, 6, .014, 4, false), color: rope });
  const knot = new THREE.IcosahedronGeometry(.03, 0); knot.translate(...beltKnot.toArray());
  entries.push({ geometry: knot, color: rope });
  const pivot = beltKnot;
  const shift = new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z);
  // At rest the cloth above the cinch folds shut. The rock uses the full open
  // aperture in the pickup pose. The belt knot and tether stay put.
  const folded = entries.map(entry => {
    if (!entry.matrix) return entry;
    const geometry = entry.geometry.clone();
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      const fold = ease((y - neckY + .04) / (lipY - neckY + .04));
      position.setXYZ(i, position.getX(i) * (1 - .92 * fold) + .04 * fold,
        y - .09 * fold, position.getZ(i) * (1 - .45 * fold) - .055 * fold);
    }
    geometry.computeVertexNormals();
    return { ...entry, geometry };
  });
  for (const entry of new Set([...entries, ...folded])) {
    entry.matrix = shift.clone().multiply(entry.matrix || new THREE.Matrix4());
  }
  const sack = coloredGeometry(THREE, entries);
  const closed = coloredGeometry(THREE, folded);
  sack.morphAttributes.position = [closed.attributes.position];
  sack.morphAttributes.normal = [closed.attributes.normal];
  sack.computeBoundingSphere();
  closed.dispose();
  for (const entry of new Set([...entries, ...folded])) entry.geometry.dispose();
  sack.userData.pivot = pivot.toArray();
  const mouthPosition = new Vec(0, lipY + .01, 0).applyMatrix4(place).sub(pivot);
  const mouthAxis = new Vec(0, 1, 0).transformDirection(place);
  sack.userData.mouth = mouthPosition.toArray();
  sack.userData.rockEntry = mouthPosition.clone().addScaledVector(mouthAxis, -.98 * COLOSSUS_ROCK_RADIUS).toArray();
  sack.userData.rockExit = mouthPosition.clone().addScaledVector(mouthAxis, 1.13 * COLOSSUS_ROCK_RADIUS).toArray();
  // Rope belt round the waist, under the chest plate: static on the torso.
  // Its radius follows the waist (cloud ray measure every 30 deg: .227 at the sides, .148 front and back) plus the rope.
  const waist = [.227, .192, .148, .148], ring = [];
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * Math.PI * 2, q = Math.abs(Math.atan2(Math.sin(a), Math.abs(Math.cos(a)))) / (Math.PI / 6);
    const j = Math.min(2, Math.floor(q)), t = q - j, r = mix(waist[j], waist[j + 1], ease(t)) + .021;
    ring.push(new Vec(Math.cos(a) * r, -.012 + .006 * Math.sin(a * 2), Math.sin(a) * r));
  }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring, true), 40, .019, 5, true);
  const belt = coloredGeometry(THREE, [{ geometry: tube, color: rope }]); tube.dispose();
  return { sack, belt };
}

function resources(THREE) {
  if (caches.has(THREE)) return caches.get(THREE);
  // Built-in material works in both the game's WebGPU renderer and its WebGL
  // fallback. A tiny shared vertex buffer animates once per frame, not per body.
  const flameMat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: .74, depthWrite: false,
    // Normal blending preserves saturated fire through bloom; additive layers
    // otherwise accumulate to a white ring and erase the flame silhouette.
    blending: THREE.NormalBlending, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false
  });
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  const position = rockGeo.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    // Coordinate-based deformation keeps shared vertices together without RNG.
    // D-244: rough and lumpy, a little flat, like a field rock (lower-frequency lumps, then a fine chip).
    const rough = 1 + .13 * Math.sin(x * 5.3 + y * 7.1 + z * 4.3) + .08 * Math.cos(x * 9.7 - z * 8.1 + y * 3) + .04 * Math.sin(x * 23 + y * 19 - z * 17);
    position.setXYZ(i, x * rough * 1.04, y * rough * .84, z * rough * .96);
  }
  rockGeo.center();
  let extent = 0;
  for (let i = 0; i < position.count; i++) extent = Math.max(extent, Math.hypot(position.getX(i), position.getY(i), position.getZ(i)));
  rockGeo.scale(1 / extent, 1 / extent, 1 / extent);
  rockGeo.computeVertexNormals();
  rockGeo.computeBoundingSphere();
  // D-244 (Jerry): the back rack and its three big stones are gone. He carries one heavy burlap sack on his right
  // hip (the throwing side; the left arm has the shield), tied to a rope belt, and pulls rocks about twice the size
  // of his fist out of it. Sack, belt and the rocks in its mouth are one static draw; the held rock is a second
  // draw only while he throws. Units are the torso's, before the sculpture scale.
  const flameGeo = flameGeometry(THREE);
  flameGeo.boundingSphere.radius += .85; // includes rising embers and curling tips
  const { sack: sackGeo, belt: beltGeo } = sackGeometry(THREE);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x77756c, roughness: 1, flatShading: true });
  const result = {
    flameGeo, flameMat, flameRest: flameGeo.attributes.position.array.slice(), flameTime: NaN,
    rockGeo, rockMat, sackGeo, beltGeo,
    sackMat: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .96, metalness: 0 })
  };
  caches.set(THREE, result);
  return result;
}

function animateFlame(cache, time) {
  if (cache.flameTime === time) return;
  cache.flameTime = time;
  const geo=cache.flameGeo,position=geo.attributes.position,color=geo.attributes.color;
  const {tongues,levels,widths,sides,sparks,emberShape}=geo.userData.fire;
  for(const tongue of tongues){
    const {cx,cz,height,phase,start}=tongue;
    const stretch=.94+.22*Math.sin(time*7.4+phase)+.075*Math.sin(time*12.1+phase*1.7);
    for(let r=0;r<levels.length;r++){
      const u=levels[r],lift=u*u,wave=Math.sin(u*15-time*17+phase),fine=Math.sin(u*23-time*26+phase*.7);
      // Phase travels from root to tip. The base is pinned to the fist while
      // successive hot lobes climb, thin out, curl over and disappear.
      const radius=widths[r]*(1+u*(.34*wave+.12*fine));
      const x=cx+lift*(.29*Math.sin(time*6.3-u*4.5+phase)+.075*wave);
      const y=-.08+u*height*stretch+u*.055*wave;
      const z=cz+lift*(.23*Math.cos(time*5.7-u*5+phase)+.055*fine);
      const hot=(wave*.5+.5)*(1-u*.65);
      for(let j=0;j<sides;j++){
        const i=start+r*sides+j,a=j/sides*Math.PI*2;
        position.setXYZ(i,x+Math.cos(a)*radius,y,z+Math.sin(a)*radius);
        color.setXYZ(i,mix(1,.64,ease((u-.68)/.32)),Math.min(.8,mix(.53,.018,ease(u))+hot*.22),.008+hot*.045);
      }
    }
  }
  for(const spark of sparks){
    const age=((time*(1.3+.1*Math.sin(spark.angle))+spark.phase)%1+1)%1;
    const radius=.024*Math.pow(Math.max(0,Math.sin(age*Math.PI)),.65);
    const x=Math.cos(spark.angle)*(.13+age*.30)+Math.sin(time*4+spark.angle)*age*.10;
    const y=.08+age*1.5,z=Math.sin(spark.angle)*(.12+age*.27);
    for(let j=0;j<emberShape.length;j++){
      const [a,b,c]=emberShape[j],i=spark.start+j;position.setXYZ(i,x+a*radius,y+b*radius,z+c*radius);
      color.setXYZ(i,1,.55-age*.38,.022*(1-age));
    }
  }
  position.needsUpdate = true;
  color.needsUpdate = true;
}

function rigOf(subject) {
  const mesh = subject?.mesh || subject?.g || subject;
  return mesh?.userData?.abilityVisuals || null;
}

function usableArm(rig, subject, index) {
  const lost = subject?.partsLost || rig.g.userData.partsLost || {};
  return !lost[index ? 'armR' : 'armL'] && !!rig.arms[index] && !!rig.elbows[index]
    && rig.arms[index].visible !== false && rig.elbows[index].visible !== false;
}

function castArm(rig, subject) {
  if (usableArm(rig, subject, 1)) return 1;
  return usableArm(rig, subject, 0) ? 0 : -1;
}

/** Attach once. scale is the sculpture's existing coordinate scale, not g.scale. */
export function attachZombieAbilityVisuals(THREE, g, typeKey, scale = 1) {
  if (!g?.userData || !['demon', 'colossus'].includes(typeKey)) return null;
  if (g.userData.abilityVisuals) return g.userData.abilityVisuals;
  const torso = g.userData.torso || g.userData.torsoG;
  if (!torso) return null;
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const cache = resources(THREE);
  const arms = [g.userData.armLG, g.userData.armRG];
  const elbows = arms.map((a, i) => a?.userData?.elbowG || g.userData[i ? 'elbowRG' : 'elbowLG']);
  const rig = { THREE, g, torso, typeKey, scale: s, cache, arms, elbows, flameAnchors: [],
    heldRock: null, lastSlot: 0, lastStage: 'idle',
    v: Array.from({ length: 10 }, () => new THREE.Vector3()),
    q: Array.from({ length: 5 }, () => new THREE.Quaternion()),
    baselines: Array.from({ length: 4 }, () => new THREE.Quaternion()) };
  if (typeKey === 'demon') {
    for (let i = 0; i < 2; i++) {
      if (!elbows[i]) continue;
      const anchor = new THREE.Group(); anchor.name = 'demon-fire-fist';
      anchor.userData.armIndex = i;
      anchor.position.set(0, -.354 * s, .02 * s); elbows[i].add(anchor);
      const flame = new THREE.Object3D();
      flame.scale.set(.35 * s, .52 * s, .35 * s);
      flame.rotation.y=i?2.1:0; // shared buffers, different silhouette on each hand
      anchor.add(flame); anchor.userData.flame = flame;
      rig.flameAnchors.push(anchor);
    }
    const batch = new THREE.InstancedMesh(cache.flameGeo, cache.flameMat, 2);
    batch.name = 'demon-fire-fists'; batch.frustumCulled = false; batch.castShadow = false;
    batch.instanceMatrix.setUsage?.(THREE.DynamicDrawUsage); g.add(batch);
    rig.flameBatch = batch; rig.flameInverse = new THREE.Matrix4(); rig.flameMatrix = new THREE.Matrix4();
  } else {
    // D-244: one static sack draw on the hip; the held rock is its own small draw, shown only in the hand.
    // Sack + belt are two draws. The sack swings around its torso-fixed belt knot.
    const belt = new THREE.Mesh(cache.beltGeo, cache.sackMat); belt.name = 'colossus-rope-belt';
    belt.scale.setScalar(s); belt.castShadow = true; belt.receiveShadow = true; torso.add(belt);
    const sack = new THREE.Group(); sack.name = 'colossus-sack';
    sack.position.fromArray(cache.sackGeo.userData.pivot).multiplyScalar(s); sack.scale.setScalar(s);
    sack.userData.mouth = new THREE.Vector3().fromArray(cache.sackGeo.userData.mouth);
    sack.userData.rockEntry = new THREE.Vector3().fromArray(cache.sackGeo.userData.rockEntry);
    sack.userData.rockExit = new THREE.Vector3().fromArray(cache.sackGeo.userData.rockExit);
    const sackMesh = new THREE.Mesh(cache.sackGeo, cache.sackMat); sackMesh.name = 'colossus-rock-sack';
    sackMesh.castShadow = true; sackMesh.receiveShadow = true; sack.add(sackMesh); torso.add(sack);
    sackMesh.morphTargetInfluences[0] = 1;
    sack.userData.closure = sackMesh.morphTargetInfluences;
    const held = new THREE.Mesh(cache.rockGeo, cache.rockMat); held.name = 'colossus-held-rock';
    held.scale.setScalar(COLOSSUS_ROCK.radius * s); held.castShadow = true; held.receiveShadow = true;
    held.visible = false; torso.add(held); rig.heldRock = held; rig.sack = sack; rig.belt = belt;
    rig.rockRadius = COLOSSUS_ROCK.radius * s;                                   // torso-parent units (metres in g)
    rig.rockPalm = new THREE.Vector3(...COLOSSUS_ROCK.palm).multiplyScalar(s);  // right elbow frame
  }
  g.userData.abilityVisuals = rig;
  // The Inspector can render the build before its first animation tick. Seed
  // palm matrices now; otherwise the InstancedMesh defaults to the body's
  // origin and both flames appear at the shins on frame zero.
  if (typeKey === 'demon') updateZombieAbilityVisuals({ mesh: g, alive: true }, Number.isFinite(cache.flameTime) ? cache.flameTime : 0);
  return rig;
}

/** Call after legacy pooling reset, which otherwise turns hidden props back on. */
export function resetZombieAbilityVisuals(g) {
  // The legacy pool reset reveals every child. Keep the source eyes hidden;
  // their merged head mesh shares the first eye material for death fades.
  for (const eye of g?.userData?.eyes || []) if (g.userData.eyeBatch) eye.visible = false;
  const rig = rigOf(g); if (!rig) return;
  for (const anchor of rig.flameAnchors) { anchor.visible = true; anchor.scale.setScalar(1); }
  if (rig.flameBatch) rig.flameBatch.visible = true;
  if (rig.sack) {
    rig.sack.visible = true;
    rig.sack.quaternion.identity();
    rig.sack.userData.closure[0] = 1;
  }
  if (rig.belt) rig.belt.visible = true;
  if (rig.heldRock) rig.heldRock.visible = false;
  if (rig.pitch) { rig.pitch.active = false; rig.pitch.lastStage = 'idle'; }   // D-244: a pooled body starts with no pitch layer on
  rig.sackSwing = null;                                                          // ...and its sack at rest
  rig.lastStage = 'idle'; rig.lastSlot = 0;
}

function armTo(rig, i, target, weight) {
  const arm = rig.arms[i], elbow = rig.elbows[i];
  if (!arm || !elbow || arm.visible === false || weight <= 0) return;
  const [direction, pole, elbowPoint, local, down] = rig.v;
  direction.copy(target).sub(arm.position);
  const rawDistance = direction.length();
  if (rawDistance < .00001) return;
  direction.multiplyScalar(1 / rawDistance);
  const upper = Math.abs(elbow.position.y * arm.scale.y);
  const lower = .354 * rig.scale * Math.abs(arm.scale.y * elbow.scale.y);
  const distance = Math.max(Math.abs(upper - lower) + .001, Math.min(rawDistance, upper + lower - .002));
  const along = (upper * upper + distance * distance - lower * lower) / (2 * distance);
  const across = Math.sqrt(Math.max(0, upper * upper - along * along));
  pole.set(i ? 1 : -1, .2, -.1).addScaledVector(direction, -pole.dot(direction)).normalize();
  elbowPoint.copy(arm.position).addScaledVector(direction, along).addScaledVector(pole, across);
  local.copy(elbowPoint).sub(arm.position).normalize(); down.set(0, -1, 0);
  rig.q[0].setFromUnitVectors(down, local);
  arm.quaternion.copy(rig.baselines[i * 2]).slerp(rig.q[0], weight);
  // Convert the desired lower-arm vector through the upper arm's actual scale.
  local.copy(target).sub(elbowPoint).applyQuaternion(rig.q[1].copy(rig.q[0]).invert());
  local.x /= arm.scale.x; local.y /= arm.scale.y; local.z /= arm.scale.z;
  rig.q[2].setFromUnitVectors(down, local.normalize());
  elbow.quaternion.copy(rig.baselines[i * 2 + 1]).slerp(rig.q[2], weight);
}

/**
 * Run AFTER the existing living-zombie animation each frame.
 * state: {kind:'fireball'|'stone', stage:'idle'|'windup'|'release'|'recovery',
 *         progress:0..1, windupProgress?:0..1, slot?:0..2, release?:boolean}.
 * time is monotonic game time in seconds. Undefined state means idle.
 */
export function updateZombieAbilityVisuals(z, time, state = {}) {
  const rig = rigOf(z); if (!rig) return;
  state = state || {};
  const alive = z?.alive !== false;
  const now = Number.isFinite(time) ? time : 0;
  const stage = state?.stage || 'idle';
  const progress = clamp(state?.windupProgress ?? state?.progress ?? 0);
  for (let i = 0; i < 2; i++) {
    if (rig.arms[i]) rig.baselines[i * 2].copy(rig.arms[i].quaternion);
    if (rig.elbows[i]) rig.baselines[i * 2 + 1].copy(rig.elbows[i].quaternion);
  }
  if (rig.typeKey === 'demon') {
    animateFlame(rig.cache, now);
    const side = castArm(rig, z);
    if (alive && state.kind === 'fireball' && ['windup', 'release', 'recovery'].includes(stage)) {
      const p = stage === 'windup' ? ease(progress) : 1 - ease(clamp(state.progress));
      const arm = rig.arms[side], elbow = rig.elbows[side];
      if (arm) arm.rotation.x = mix(arm.rotation.x, -1.52, p);
      if (arm) arm.rotation.z = mix(arm.rotation.z, side ? .12 : -.12, p);
      if (elbow) elbow.rotation.x = mix(elbow.rotation.x, -.40, p);
    }
    rig.g.updateMatrixWorld(true);
    for (let i = 0; i < rig.flameAnchors.length; i++) {
      const anchor = rig.flameAnchors[i];
      anchor.visible = alive && usableArm(rig, z, anchor.userData.armIndex);
      // Counter-rotate only the flame around its glued palm, so fire rises up
      // while the hand and forearm can turn independently beneath it.
      anchor.parent.getWorldQuaternion(rig.q[3]); anchor.quaternion.copy(rig.q[3].invert());
      const flare = alive && state.kind === 'fireball' && stage === 'windup' ? .25 * ease(progress) : 0;
      const flicker = 1 + .06 * Math.sin(now * 13 + i * 3.7);
      anchor.scale.setScalar(flicker + flare);
    }
    rig.g.updateMatrixWorld(true);
    rig.flameInverse.copy(rig.g.matrixWorld).invert();
    let active = 0;
    for (let i = 0; i < rig.flameBatch.count; i++) {
      const anchor = rig.flameAnchors[i];
      if (anchor?.visible) {
        rig.flameMatrix.multiplyMatrices(rig.flameInverse, anchor.userData.flame.matrixWorld);
        active++;
      } else rig.flameMatrix.makeScale(0, 0, 0);
      rig.flameBatch.setMatrixAt(i, rig.flameMatrix);
    }
    rig.flameBatch.visible = active > 0;
    rig.flameBatch.instanceMatrix.needsUpdate = true;
  } else {
    if (!alive) {
      rig.heldRock.visible = false;
      rig.sack.userData.closure[0] = 1;
      if (rig.pitch) rig.pitch.active = false;
      rig.lastStage = stage;
      return;
    }
    // D-244 (Claude 5, CE-26): the whole-body baseball pitch lives in game/colossus-pitch.js (the reach into the sack,
    // the set, the knee-up tell, the stride and stomp, hips then shoulders, over the top, the follow-through and the
    // step back), a layer over the walk; the rock rides the throwing palm (rig.rockPalm) from the sack to the release.
    if (!poseColossusPitch(rig, z, state, now)) swingColossusSack(rig, z, now);
  }
  rig.lastStage = stage;
}

/** D-244: the one rock shape, for the thrown stone (runtime) to match the held one. Unit radius: scale it. */
export function getZombieAbilityRock(THREE) {
  const cache = resources(THREE);
  return { geometry: cache.rockGeo, material: cache.rockMat };
}

/** D-244: the held/thrown rock's radius in the body's parent units (metres at mesh scale 1), or 0. */
export function getZombieAbilityRockRadius(z) {
  const rig = rigOf(z);
  return rig?.typeKey === 'colossus' ? rig.rockRadius : 0;
}

/** Write an actual animated world-space launch position to the caller's vector. */
export function getZombieAbilityLaunch(z, kind, out, rotation) {
  const rig = rigOf(z); if (!rig || !out) return false;
  if (z?.alive === false) return false;
  rig.g.updateMatrixWorld(true);
  if (kind === 'stone' && rig.heldRock) {
    rig.heldRock.getWorldPosition(out);
    if (rotation) rig.heldRock.getWorldQuaternion(rotation);
    return true;
  }
  if (kind === 'fireball' && rig.flameAnchors.length) {
    // Pose and launch use the same surviving limb after dismemberment.
    const side = castArm(rig, z);
    const anchor = rig.flameAnchors.find(a => a.userData.armIndex === side);
    if (!anchor) return false;
    anchor.getWorldPosition(out); return true;
  }
  return false;
}
