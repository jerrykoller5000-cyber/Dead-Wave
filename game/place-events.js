// GP-20011: six rare, local place cues. The clock is the sky's 0..1 day turn;
// a match holds prep at 0.68, so its dusk cue lives in that last light.
export function createPlaceEvents() {
  let run = null, day = null;
  let generatorDay = null, phoneDone = false, radioDone = false;
  let stormArmed = true, chimeMuted = false, chimeClock = 0, mistClock = 0;

  function reset(runId) {
    run = runId; day = null; generatorDay = null;
    phoneDone = false; radioDone = false; stormArmed = true;
    chimeMuted = false; chimeClock = 0; mistClock = 0;
  }

  function step(f) {
    if (f.runId !== run) reset(f.runId);
    if (f.day !== day) { day = f.day; chimeMuted = false; chimeClock = 0; }
    const events = [];
    const near = f.near || {};
    const distance = (key) => Number.isFinite(near[key]) ? near[key] : Infinity;
    const clock = Number.isFinite(f.clock) ? f.clock : -1;
    const dt = Math.max(0, Math.min(1, Number.isFinite(f.dt) ? f.dt : 0));

    // Re-arm for the next forecast only after the current shower passes or
    // the weather system has scheduled a distant next one.
    if (f.raining || f.stormIn > 120) stormArmed = true;
    if (f.alarm) chimeMuted = true;
    if (!f.active || f.combat || f.phase !== 'prep') { mistClock = 0; return events; }

    const dusk = clock >= 0.64 && clock <= 0.70;
    const daylight = clock >= 0.32 && clock <= 0.69;
    const dawn = clock >= 0.30 && clock <= 0.37;
    const runNumber = Number.isInteger(f.runId) ? f.runId : 0;

    if (dusk && distance('fuel') <= 42 && generatorDay !== f.day && (runNumber + f.day) % 2 === 0) {
      generatorDay = f.day; events.push('fuel-cough');
    }
    if (distance('mast') <= 55 && stormArmed && !f.raining &&
        Number.isFinite(f.stormIn) && f.stormIn > 0 && f.stormIn <= 75) {
      stormArmed = false; events.push('mast-wire');
    }
    if (daylight && distance('hikers') <= 30 && !phoneDone && runNumber % 2 === 0) {
      phoneDone = true; events.push('hikers-phone');
    }
    if (daylight && distance('rangers') <= 40 && !radioDone && runNumber % 3 === 1) {
      radioDone = true; events.push('rangers-radio');
    }

    if (!chimeMuted && !f.alarm && distance('trapper') <= 40) {
      chimeClock -= dt;
      if (chimeClock <= 0) { chimeClock = 7; events.push('trapper-chime'); }
    } else chimeClock = 0;

    if (dawn && distance('mine') <= 65) {
      mistClock -= dt;
      if (mistClock <= 0) { mistClock = 0.85; events.push('mine-mist'); }
    } else mistClock = 0;
    return events;
  }

  return { step, reset };
}

// Cold mine air hugs the apron, then thins. All puffs share one draw and one
// small radial texture; the event controller decides when a new puff is born.
export function createMineMist(THREE, { scene, camera, anchor }) {
  const count = 8, texSize = 32;
  const bytes = new Uint8Array(texSize * texSize * 4);
  for (let y = 0; y < texSize; y++) for (let x = 0; x < texSize; x++) {
    const r = Math.hypot((x + 0.5) * 2 / texSize - 1, (y + 0.5) * 2 / texSize - 1);
    const i = (y * texSize + x) * 4;
    bytes[i] = bytes[i + 1] = bytes[i + 2] = 255;
    bytes[i + 3] = Math.round(255 * Math.max(0, 1 - r) ** 2);
  }
  const tex = new THREE.DataTexture(bytes, texSize, texSize, THREE.RGBAFormat);
  tex.needsUpdate = true;
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xb9c6ca, transparent: true,
    opacity: 0.17, depthTest: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, count);
  mesh.name = 'old-mine-dawn-mist'; mesh.frustumCulled = false; mesh.visible = false;
  mesh.userData.noCull = true; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  const facing = new THREE.Quaternion(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const puffs = Array(count).fill(null);
  let cursor = 0, serial = 0;
  for (let i = 0; i < count; i++) mesh.setMatrixAt(i, zero);

  function spawn() {
    if (!anchor) return;
    const k = ++serial, side = Math.sin(k * 2.39) * 0.85;
    const fx = Math.sin(anchor.yaw), fz = Math.cos(anchor.yaw);
    puffs[cursor] = { x: anchor.x + fz * side, y: anchor.y + 0.25,
      z: anchor.z - fx * side, vx: fx * 0.42, vz: fz * 0.42,
      age: 0, life: 3.2 + (k % 3) * 0.35, size: 1.25 + (k % 4) * 0.12 };
    cursor = (cursor + 1) % count;
  }
  function update(dt, wind) {
    let visible = 0;
    camera.getWorldQuaternion(facing);
    for (let i = 0; i < count; i++) {
      const p = puffs[i];
      if (!p) { mesh.setMatrixAt(i, zero); continue; }
      p.age += Math.max(0, dt);
      if (p.age >= p.life) { puffs[i] = null; mesh.setMatrixAt(i, zero); continue; }
      const t = p.age / p.life;
      p.x += (p.vx + (wind?.dirX || 0) * (wind?.strength || 0) * 0.12) * dt;
      p.z += (p.vz + (wind?.dirZ || 0) * (wind?.strength || 0) * 0.12) * dt;
      p.y += 0.025 * dt;
      const envelope = Math.min(1, t / 0.17) * Math.min(1, (1 - t) / 0.38);
      position.set(p.x, p.y, p.z);
      scale.set(p.size * (1 + t * 1.9) * envelope, p.size * (0.42 + t * 0.35) * envelope, 1);
      matrix.compose(position, facing, scale); mesh.setMatrixAt(i, matrix); visible++;
    }
    mesh.visible = visible > 0;
    if (visible) mesh.instanceMatrix.needsUpdate = true;
  }
  function clear() { for (let i = 0; i < count; i++) { puffs[i] = null; mesh.setMatrixAt(i, zero); } mesh.visible = false; mesh.instanceMatrix.needsUpdate = true; }
  return { spawn, update, clear, mesh };
}
