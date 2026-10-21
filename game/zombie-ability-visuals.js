// Props and pose overlays for the ranged zombie abilities. Attach after mesh
// compaction/skinning; the animated props must remain separate rigid objects.
// No game state, damage, lights, randomness, or scene ownership lives here.
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
    for (let i = 0; i < geo.attributes.position.count; i++) colors.push(entry.color.r, entry.color.g, entry.color.b);
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
    const rough = 1 + .09 * Math.sin(x * 17 + y * 31 + z * 23) + .045 * Math.cos(x * 37 - z * 29);
    position.setXYZ(i, x * rough, y * rough, z * rough);
  }
  rockGeo.computeVertexNormals();
  rockGeo.computeBoundingSphere();
  const rackPieces = [], strapPieces = [];
  const rod = (into, a, b, width) => {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b);
    const geo = into === strapPieces
      ? new THREE.BoxGeometry(width * 3, av.distanceTo(bv), width * .65)
      : new THREE.CylinderGeometry(width, width, av.distanceTo(bv), 5, 1);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), bv.clone().sub(av).normalize()));
    geo.translate(...av.add(bv).multiplyScalar(.5).toArray()); into.push(geo);
  };
  for (const side of [-1, 1]) {
    rod(rackPieces, [side * .48, .08, -.43], [side * .48, .88, -.43], .025);
    rod(rackPieces, [side * .48, .08, -.43], [side * .48, .08, -.81], .025);
    // Broad straps run over the shoulders, out to the pack and down its face.
    const points = [[side * .28, .30, .23], [side * .30, .55, .12], [side * .31, .63, -.30], [side * .43, .66, -.84], [side * .43, .12, -.86]];
    for (let i = 1; i < points.length; i++) rod(strapPieces, points[i - 1], points[i], .032);
  }
  for (const y of [.10, .43, .80]) rod(rackPieces, [-.48, y, -.43], [.48, y, -.43], .026);
  for (const y of [.18, .51]) rod(strapPieces, [-.44, y, -.84], [.44, y, -.84], .026);
  const flameGeo = flameGeometry(THREE);
  flameGeo.boundingSphere.radius += .85; // includes rising embers and curling tips
  const rackGeo = mergedGeometry(THREE, rackPieces), strapGeo = mergedGeometry(THREE, strapPieces);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x77756c, roughness: 1, flatShading: true });
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x302b25, roughness: .82, metalness: .5 });
  const strapMat = new THREE.MeshStandardMaterial({ color: 0x34261b, roughness: .97 });
  const stonePositions = [[-.28, .30, -.60], [0, .71, -.60], [.28, .30, -.60]];
  const entries = [{ geometry: rackGeo, color: rackMat.color }, { geometry: strapGeo, color: strapMat.color }];
  for (let i = 0; i < stonePositions.length; i++) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...stonePositions[i]),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(.3 + i * .43, i * .61, i * .35)),
      new THREE.Vector3(.29, .32, .28));
    entries.push({ geometry: rockGeo, color: rockMat.color, matrix });
  }
  const result = {
    flameGeo, flameMat, flameRest: flameGeo.attributes.position.array.slice(), flameTime: NaN,
    rockGeo, rockMat, rackGeo, strapGeo, rackMat, strapMat, stonePositions,
    idlePackGeo: coloredGeometry(THREE, entries),
    idlePackMat: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .95, metalness: .08, flatShading: true })
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

function batchPack(rig, fullStock, stage) {
  if (!rig.idlePack) return;
  const batched = fullStock && !['windup', 'release', 'recovery'].includes(stage) && !rig.heldRock.visible;
  rig.idlePack.visible = batched;
  rig.packDetails.visible = !batched;
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
    backRocks: [], stock: [], heldRock: null, lastSlot: 0, lastStage: 'idle',
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
    const pack = new THREE.Group(); pack.name = 'colossus-stone-carrier'; pack.scale.setScalar(s); torso.add(pack);
    const details = new THREE.Group(); details.name = 'colossus-carrier-moving-parts'; details.visible = false; pack.add(details);
    details.add(new THREE.Mesh(cache.rackGeo, cache.rackMat), new THREE.Mesh(cache.strapGeo, cache.strapMat));
    const idlePack = new THREE.Mesh(cache.idlePackGeo, cache.idlePackMat); idlePack.name = 'colossus-carrier-idle-batch';
    idlePack.castShadow = true; idlePack.receiveShadow = true; pack.add(idlePack);
    const positions = cache.stonePositions;
    for (let i = 0; i < positions.length; i++) {
      const rock = new THREE.Mesh(cache.rockGeo, cache.rockMat); rock.name = 'colossus-back-stone-' + i;
      rock.position.set(...positions[i]); rock.rotation.set(.3 + i * .43, i * .61, i * .35);
      rock.scale.set(.29, .32, .28); rock.castShadow = true; rock.receiveShadow = true; details.add(rock);
      rig.backRocks.push(rock); rig.stock.push({ consumedAt: -Infinity });
    }
    const held = new THREE.Mesh(cache.rockGeo, cache.rockMat); held.name = 'colossus-held-stone';
    held.scale.set(.29 * s, .32 * s, .28 * s); held.castShadow = true; held.receiveShadow = true;
    held.visible = false; torso.add(held); rig.heldRock = held;
    rig.pack = pack; rig.packDetails = details; rig.idlePack = idlePack;
  }
  g.userData.abilityVisuals = rig;
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
  for (let i = 0; i < rig.backRocks.length; i++) {
    rig.backRocks[i].visible = true; rig.backRocks[i].scale.set(.29, .32, .28);
    rig.stock[i].consumedAt = -Infinity;
  }
  if (rig.heldRock) rig.heldRock.visible = false;
  batchPack(rig, true, 'idle');
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

function handsAt(rig, center, weight) {
  const target = rig.v[5];
  for (let i = 0; i < 2; i++) {
    target.copy(center); target.x += (i ? 1 : -1) * .23 * rig.scale;
    armTo(rig, i, target, weight);
  }
  rig.g.updateMatrixWorld(true);
  // The carried stone follows the real palms, not a guessed independent path.
  const middle = rig.v[6].set(0, 0, 0), palm = rig.v[7]; let count = 0;
  for (const elbow of rig.elbows) {
    if (!elbow) continue;
    palm.set(0, -.354 * rig.scale, .02 * rig.scale); elbow.localToWorld(palm); middle.add(palm); count++;
  }
  if (count) { middle.multiplyScalar(1 / count); rig.torso.worldToLocal(middle); rig.heldRock.position.copy(middle); }
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
    const slot = Number.isInteger(state.slot) ? ((state.slot % 3) + 3) % 3 : rig.lastSlot;
    if (!alive) { rig.heldRock.visible = false; return; }
    let fullStock = true;
    for (let i = 0; i < rig.backRocks.length; i++) {
      const fill = rig.stock[i].consumedAt === -Infinity ? 1 : ease((now - rig.stock[i].consumedAt - 6) / 2);
      const rock = rig.backRocks[i]; rock.visible = fill > .001;
      rock.scale.set(.29 * fill, .32 * fill, .28 * fill);
      if (fill < 1) fullStock = false;
    }
    if (state.kind === 'stone' && stage === 'windup') {
      rig.lastSlot = slot;
      const back = rig.backRocks[slot].position, center = rig.v[8];
      const grab = ease(progress / .30);
      if (progress < .30) center.set(back.x, back.y, back.z).multiplyScalar(rig.scale);
      else if (progress < .72) {
        const t = ease((progress - .30) / .42);
        center.set(mix(back.x, 0, t), mix(back.y, 1.08, t), mix(back.z, -.08, t)).multiplyScalar(rig.scale);
      } else {
        const t = ease((progress - .72) / .28);
        center.set(0, mix(1.08, .99, t), mix(-.08, .43, t)).multiplyScalar(rig.scale);
      }
      handsAt(rig, center, grab);
      rig.heldRock.rotation.set(-.2 + progress * .7, slot * .61, slot * .35);
      const carrying = progress >= .30;
      rig.heldRock.visible = carrying;
      if (carrying) { rig.stock[slot].consumedAt = now; rig.backRocks[slot].visible = false; fullStock = false; }
    } else if (state.kind === 'stone' && ['release', 'recovery'].includes(stage)) {
      const p = clamp(state.progress);
      const follow = ease(p / .28), settle = 1 - ease((p - .28) / .72);
      const center = rig.v[8].set(0, mix(.99, .63, follow), mix(.43, .76, follow)).multiplyScalar(rig.scale);
      handsAt(rig, center, settle);
      rig.heldRock.visible = false;
      if (state.release || rig.lastStage === 'windup' || stage === 'release') { rig.stock[slot].consumedAt = now; fullStock = false; }
    } else rig.heldRock.visible = false;
    batchPack(rig, fullStock, stage);
  }
  rig.lastStage = stage;
}

/** Write an actual animated world-space launch position to the caller's vector. */
export function getZombieAbilityLaunch(z, kind, out) {
  const rig = rigOf(z); if (!rig || !out) return false;
  if (z?.alive === false) return false;
  rig.g.updateMatrixWorld(true);
  if (kind === 'stone' && rig.heldRock) { rig.heldRock.getWorldPosition(out); return true; }
  if (kind === 'fireball' && rig.flameAnchors.length) {
    // Pose and launch use the same surviving limb after dismemberment.
    const side = castArm(rig, z);
    const anchor = rig.flameAnchors.find(a => a.userData.armIndex === side);
    if (!anchor) return false;
    anchor.getWorldPosition(out); return true;
  }
  return false;
}
