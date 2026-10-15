// CU-115 (Jerry): the alarm light comes out of the alarms. Each beacon keeps a
// spotlight and a short glow on its own glass; the beam sweeps around that lens.
// The old room-centre point, and the spots aimed at a wandering point in the
// middle of the floor, read as light from nowhere. Amber, not the old pure red.
// GP-196: the glow stays at a quarter strength.
const ALARM = 0xff9a32;
const ALARM_STRENGTH = .25;
const SPIN = 1.7;
export function createTrainingDanger(T, tg, alarmBeacon) {
  const root = new T.Group(); root.name = 'training-danger-lighting'; tg.group.add(root);
  const lamp = tg.buildLamp, gateLamp = tg.releaseGate.lamp;
  const normalEmissive = lamp.emissive.clone();
  const beaconDefaults = [gateLamp, alarmBeacon].filter(Boolean).map(mat => ({ mat, color: mat.color.clone(), emissive: mat.emissive.clone(), intensity: mat.emissiveIntensity }));
  const amber = new T.Color(ALARM), normal = new T.Color();
  const range = new T.SpotLight(0xf4fbff, 0, 35, .4, .35, 2); range.position.set(0, 22, 8); range.target.position.set(0, 0, 8); root.add(range, range.target);
  const beams = [];
  const origin = new T.Vector3(), tip = new T.Vector3(), out = new T.Vector3(), right = new T.Vector3();
  const q = new T.Quaternion();
  function addBeam(spec) {
    const light = new T.SpotLight(ALARM, 0, 42, .32, .65, 1.35);
    const glow = new T.PointLight(ALARM, 0, 6.5, 2);
    root.add(light, light.target, glow);
    beams.push({ ...spec, light, glow });
  }
  const gates = [];
  let cabinet = null;
  tg.group.traverse(o => {
    if (o.name === 'training-gate-beacon') gates.push(o);
    else if (!cabinet && alarmBeacon && o.isMesh && o.material === alarmBeacon) cabinet = o;
  });
  for (const mesh of gates) addBeam({ mesh, outZ: -1 });
  if (cabinet) addBeam({ mesh: cabinet, outZ: 1 });
  // The unit page has no beacon meshes. The same three seats, from the room layout:
  // gate lenses (the frame is scaled 1.4 in y) and the cabinet pilot, facing into the room.
  if (!gates.length && tg.gate && tg.origin) {
    const gx = tg.gate.x - tg.origin.x, gz = tg.gate.z - tg.origin.z + .91;
    for (const side of [-1, 1]) addBeam({ at: new T.Vector3(gx + side * 3.07, 7.04, gz), out: new T.Vector3(0, 0, -1) });
  }
  if (!cabinet && tg.stations && tg.stations.hqPanel && tg.origin) {
    const px = tg.stations.hqPanel.x - tg.origin.x, pz = tg.stations.hqPanel.z - tg.origin.z;
    addBeam({ at: new T.Vector3(px + .2, 2.85, pz), out: new T.Vector3(1, 0, 0) });
  }
  function aim(b, ang) {
    if (b.mesh) {
      b.mesh.updateWorldMatrix(true, false);
      b.mesh.getWorldPosition(origin);
      tip.set(0, 0, b.outZ);
      b.mesh.localToWorld(tip);
      out.copy(tip).sub(origin);
      if (out.lengthSq() < 1e-8) out.set(0, 0, b.outZ); else out.normalize();
      root.worldToLocal(origin);
      root.getWorldQuaternion(q).invert();
      out.applyQuaternion(q);
    } else {
      origin.copy(b.at);
      out.copy(b.out);
    }
    right.set(0, 1, 0).cross(out);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const c = Math.cos(ang), s = Math.sin(ang);
    tip.copy(out).multiplyScalar(c).addScaledVector(right, s);
    tip.y -= .32;
    tip.normalize();
    b.light.position.copy(origin).addScaledVector(out, .18);
    b.glow.position.copy(b.light.position);
    b.light.target.position.copy(b.light.position).addScaledVector(tip, 14);
  }
  let active = false, amount = 0, time = 0, pulse = 0;
  function update(dt, on) {
    active = !!on;
    if (Number.isFinite(dt) && dt > 0) { time += dt; amount += Math.sign((active ? 1 : 0) - amount) * Math.min(Math.abs((active ? 1 : 0) - amount), dt / 0.8); }
    pulse = .5 + .5 * Math.sin(time * Math.PI * 2 / .95);
    lamp.color.copy(normal.setHex(tg.lightsOn() ? 0xffffff : 0x50565b)).lerp(amber, amount);
    lamp.emissive.copy(normalEmissive).lerp(amber, amount);
    lamp.emissiveIntensity = (tg.lightsOn() ? .8 : 0) * (1 - amount) + ALARM_STRENGTH * amount * (.35 + 2.8 * pulse);
    range.intensity = amount * (tg.lightsOn() ? 650 : 0);
    const spot = ALARM_STRENGTH * amount * (200 + 140 * pulse);
    const halo = ALARM_STRENGTH * amount * (16 + 22 * pulse);
    beams.forEach((b, i) => { aim(b, time * SPIN + i * (Math.PI * 2 / 3)); b.light.intensity = spot; b.glow.intensity = halo; });
    if (amount > 0) { for (const mat of [gateLamp, alarmBeacon]) if (mat) { mat.color.copy(amber); mat.emissive.copy(amber); mat.emissiveIntensity = ALARM_STRENGTH * (.5 + amount * (1.7 + 3 * pulse)); } }
    else for (const saved of beaconDefaults) { saved.mat.color.copy(saved.color); saved.mat.emissive.copy(saved.emissive); saved.mat.emissiveIntensity = saved.intensity; }
  }
  return {
    update,
    dim(lights) { const k = 1 - .88 * amount; for (const light of lights) light.intensity *= k; },
    reset() { amount = 0; time = 0; update(0, false); },
    state: () => ({ active, amount, pulse, angle: time * SPIN, lights: beams.length, color: ALARM, red: lamp.color.getHex(), fill: beams[0] ? beams[0].glow.intensity : 0 }),
    dispose() { root.removeFromParent(); }
  };
}
