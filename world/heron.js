// world/heron.js — the way out, story v2 (CL-110, D-70, docs/story.md §1, §3). Claude's (world/*).
//
// Heron is the PGB's military floatplane: a high-winged, twin-engined amphibious transport in olive drab. The lake
// is cut off from every river and road, so the way out is from the air. On night 20, once he has called it (GB-85's
// 'extraction' 'called'), it comes in as the last push starts ('due'): three red flares go up from the end of the
// dock, Heron comes in low over the trees with its landing light on, sets down far out on the lake, runs in on its
// floats, swings round and lies with its left float along the end of the dock, engines idling. It waits through the
// dawn (GB-85's wait) until he boards (GB-86) or the next alarm sends it away ('gone'): then it pulls off, runs out
// across the lake and climbs away.
//
// It replaces world/boat.js (CL-73) behind the same API, so GB-85's and GB-86's flow is unchanged (GB-117):
//   createHeron({ scene, dock, deckY, waterY, requestLight, audio, groundAt }) → craft
//     dock: { x, z, yaw, len, hw, lakeEnd } as for the boat; groundAt(x, z) (optional) keeps the flight over the hills.
//   craft.arrive() / leave() / reset() / update(dt) / state() / deck() / timeline()   as the boat's
//   craft.group, craft.flares, craft.berth, craft.offshore, craft.end                     for tests and shots
//   craft.path(u, leaving)   where it is at u (0..1) along its arrival or its leaving: { x, y, z, yaw, onWater }
//
// No lights are added: the flares, the landing light and the cabin glow ask the game's effect-light pool
// (requestLight), as the boat did.
import * as THREE from 'three';

export const HERON = Object.freeze({
  ARRIVE_S: 24,        // s from the first flare to lying at the dock (t145 has it waiting by 25.5 s)
  AIR_S: 10,           // of which in the air, from the hills to the touchdown
  RUN_S: 8,            // on the water, running in
  LEAVE_S: 20,         // s from the 'gone' to out of sight (t145: gone within 21 s)
  START_OUT: 320,      // m out from the dock's end where it is first seen
  START_ALT: 62,       // m over the water there
  TOUCH_OUT: 62,       // m out from the dock's end where its floats touch
  SWING_OUT: 15,       // m out where it swings round to lay its float along the dock
  FLOAT_X: 2.4,        // m from the middle of the plane to the middle of each float
  BERTH_GAP: 1.0,      // m from the dock's end to the middle of its left float
  FLARES: 3, FLARE_GAP_S: 1.2, FLARE_UP_S: 2.2, FLARE_BURN_S: 9, FLARE_HEIGHT: 26,
  DECK_R: 2.2,
  FLOAT_TOP: 0.42,     // the float's top over its keel
  DRAFT: 0.22          // how deep the floats sit in the water
});

const clamp01 = (u) => Math.max(0, Math.min(1, u));
const ease = (u) => 1 - Math.pow(1 - clamp01(u), 3);
const smooth = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const lerp = (a, b, u) => a + (b - a) * u;
const angLerp = (a, b, u) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u;

// --------------------------------------------------------------------------------------------------------------
// The model. Nose +Z, left wing +X, up +Y; the waterline (the floats' keels) at y = 0.
function stencil(text) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 96;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, 512, 96);
  g.fillStyle = 'rgba(214, 208, 180, 0.92)';
  g.font = 'bold 64px "Arial Narrow", Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 50);
  return new THREE.CanvasTexture(cv);
}

export function buildHeron() {
  const g = new THREE.Group();
  g.name = 'heron';
  const olive = new THREE.MeshStandardMaterial({ color: 0x4a5236, roughness: 0.8, metalness: 0.15 });
  const belly = new THREE.MeshStandardMaterial({ color: 0x7b8077, roughness: 0.75, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23251f, roughness: 0.6, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a232b, emissive: 0xffd89a, emissiveIntensity: 0.25, roughness: 0.15, metalness: 0.5 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff2d2, emissiveIntensity: 2.5 });
  const red = new THREE.MeshStandardMaterial({ color: 0xff2a1e, emissive: 0xff2a1e, emissiveIntensity: 2 });
  const green = new THREE.MeshStandardMaterial({ color: 0x22ff6a, emissive: 0x22ff6a, emissiveIntensity: 2 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };
  const box = (w, h, d, mat, x, y, z) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const FY = 2.35;                                         // the fuselage's middle over the water
  // Fuselage: a long box body, a rounded nose, a tail that rises and narrows.
  box(1.9, 2.0, 7.4, olive, 0, FY, 0.2);
  box(1.86, 0.5, 7.2, belly, 0, FY - 0.8, 0.2);
  add(new THREE.CylinderGeometry(0.75, 0.97, 1.6, 12), olive, 0, FY - 0.05, 4.65, Math.PI / 2, 0, 0);
  add(new THREE.SphereGeometry(0.76, 12, 8), olive, 0, FY - 0.05, 5.45);
  const tail = add(new THREE.CylinderGeometry(0.35, 0.95, 4.6, 10), olive, 0, FY + 0.35, -5.4, Math.PI / 2 + 0.12, 0, 0);
  tail.scale.set(1, 1, 1.05);
  // The cockpit's windows and the cabin's portholes.
  box(1.7, 0.5, 0.06, glass, 0, FY + 0.55, 5.0).rotation.x = -0.6;
  for (const sx of [-1, 1]) {
    box(0.06, 0.45, 0.9, glass, sx * 0.96, FY + 0.5, 4.3);
    for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 10), glass, sx * 0.96, FY + 0.35, 2.4 - k * 1.25, 0, 0, Math.PI / 2);
  }
  // The cargo doors, and the stencils.
  for (const sx of [-1, 1]) box(0.05, 1.5, 1.2, dark, sx * 0.97, FY - 0.05, -1.6);
  for (const [sx, ry] of [[1, Math.PI / 2], [-1, -Math.PI / 2]]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.6), new THREE.MeshBasicMaterial({ map: stencil('PGB · HERON'), transparent: true, depthWrite: false }));
    s.position.set(sx * 0.975, FY + 0.45, -3.6 + (sx < 0 ? 0 : 0)); s.rotation.y = ry; g.add(s);
  }
  // The high wing, its struts and the two engines with their propellers.
  const wing = box(17, 0.28, 2.1, olive, 0, FY + 1.18, 1.2);
  wing.name = 'heron-wing';
  for (const sx of [-1, 1]) {
    const strut = add(new THREE.CylinderGeometry(0.06, 0.06, 3.0, 6), dark, sx * 2.1, FY + 0.2, 1.1, 0, 0, sx * 0.72);
    strut.name = 'heron-strut';
    const nac = add(new THREE.CylinderGeometry(0.42, 0.5, 2.6, 12), olive, sx * 3.3, FY + 0.95, 2.1, Math.PI / 2, 0, 0);
    nac.name = 'heron-nacelle';
    add(new THREE.SphereGeometry(0.3, 10, 8), dark, sx * 3.3, FY + 0.95, 3.45);
    const prop = new THREE.Group();
    prop.position.set(sx * 3.3, FY + 0.95, 3.55);
    for (let k = 0; k < 3; k++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.45, 0.05), dark);
      blade.position.y = 0.72; const arm = new THREE.Group(); arm.rotation.z = (k / 3) * Math.PI * 2; arm.add(blade); prop.add(arm);
    }
    const blur = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), new THREE.MeshBasicMaterial({ color: 0x9a9a8c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    blur.name = 'heron-prop-blur';
    prop.add(blur);
    prop.name = 'heron-prop';
    g.add(prop);
    // Wing tips: the left one red, the right one green, as every aircraft carries them.
    add(new THREE.SphereGeometry(0.12, 8, 6), sx > 0 ? red : green, sx * 8.5, FY + 1.18, 1.2);
  }
  // The tail: the fin and the tailplane.
  box(0.18, 2.6, 2.0, olive, 0, FY + 1.9, -7.2).rotation.x = -0.25;
  box(5.6, 0.16, 1.5, olive, 0, FY + 1.2, -7.3);
  // The floats, on their struts: the long hulls he steps onto from the dock.
  for (const sx of [-1, 1]) {
    const fl = box(0.9, 0.62, 8.0, belly, sx * HERON.FLOAT_X, 0.3, 0.4);
    fl.name = 'heron-float';
    const tip = add(new THREE.ConeGeometry(0.45, 1.3, 10), belly, sx * HERON.FLOAT_X, 0.36, 5.0, Math.PI / 2, 0, 0);
    tip.scale.set(1, 1, 0.7);
    box(0.92, 0.05, 6.5, dark, sx * HERON.FLOAT_X, HERON.FLOAT_TOP + 0.02, 0.0);   // the walkway's black non-slip
    for (const z of [2.2, -1.2]) {
      add(new THREE.CylinderGeometry(0.06, 0.06, 1.9, 6), dark, sx * (HERON.FLOAT_X - 0.6), 1.25, z, 0, 0, -sx * 0.62);
    }
  }
  // The landing light under the nose.
  const land = add(new THREE.SphereGeometry(0.14, 10, 8), lightMat, 0, FY - 0.95, 5.1);
  land.name = 'heron-landing-light';
  g.userData = { props: g.children.filter((c) => c.name === 'heron-prop'), glass, lightMat };
  return g;
}

function buildFlare() {
  const mat = new THREE.MeshBasicMaterial({ color: 0xff3b24 });
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat);
  m.visible = false;
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: 0.35, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), haloMat);
  m.add(halo);
  m.userData.halo = halo;
  return m;
}

// --------------------------------------------------------------------------------------------------------------
export function createHeron({ scene, dock, deckY, waterY, requestLight = () => {}, audio = {}, groundAt = null, depthAt = null }) {
  const fx = Math.sin(dock.yaw), fz = Math.cos(dock.yaw);        // along the dock
  const rx = Math.cos(dock.yaw), rz = -Math.sin(dock.yaw);       // across it
  const out = dock.lakeEnd || 1;
  const half = (dock.len || 9.5) / 2;
  const end = { x: dock.x + fx * out * half, z: dock.z + fz * out * half };
  const along = (d, side = 0) => ({ x: end.x + fx * out * d + rx * side, z: end.z + fz * out * d + rz * side });
  // At the dock it lies across the end, its left float along the planks: the middle of the plane is out from the end
  // by the gap and the float's offset, its nose across the dock, its left side (+X) toward the planks.
  const berth = along(HERON.BERTH_GAP + HERON.FLOAT_X);
  // Which way it lies: its left float to the planks (side +1) or its right (-1), whichever keeps nose, tail and the far
  // float in the deeper water (depthAt, when given); a door on each side, so either way he steps aboard.
  const yawFor = (sd) => Math.atan2(sd * out * fz, -sd * out * fx);
  const depthScore = (sd) => {
    if (!depthAt) return sd;                                      // without the water's depths: the left, as drawn
    const y = yawFor(sd), nx = Math.sin(y), nz = Math.cos(y), ax = sd * Math.cos(y), az = -sd * Math.sin(y);
    const pts = [[6, 0], [-7, 0], [5, -2 * HERON.FLOAT_X], [-4, -2 * HERON.FLOAT_X]];
    return Math.min(...pts.map(([f, a]) => depthAt(berth.x + nx * f + ax * a, berth.z + nz * f + az * a)));
  };
  const side = depthScore(-1) > depthScore(1) + 0.05 ? -1 : 1;
  const berthYaw = yawFor(side);
  const inYaw = Math.atan2(-fx * out, -fz * out);                 // nose to the shore, coming in
  const outYaw = Math.atan2(fx * out, fz * out);                  // nose to the far shore, going
  const offshore = along(HERON.START_OUT);
  const touch = along(HERON.TOUCH_OUT), swing = along(HERON.SWING_OUT);
  const safe = (x, z, y) => (groundAt ? Math.max(y, groundAt(x, z) + 18) : y);

  // Where it is at u (0..1) along its arrival (or, leaving, along its going).
  function path(u, leaving = false) {
    if (!leaving) {
      const T = HERON.ARRIVE_S, ua = HERON.AIR_S / T, ur = (HERON.AIR_S + HERON.RUN_S) / T;
      if (u < ua) {                                                // in the air, down to the touchdown
        const s = u / ua, e = smooth(s);
        const x = lerp(offshore.x, touch.x, s), z = lerp(offshore.z, touch.z, s);
        const y = waterY + HERON.START_ALT * Math.pow(1 - e, 1.6);
        return { x, y: s < 0.85 ? safe(x, z, y) : y, z, yaw: inYaw, pitch: -0.06 * (1 - s), onWater: false };
      }
      if (u < ur) {                                                // on the floats, slowing as it runs in
        const s = ease((u - ua) / (ur - ua));
        return { x: lerp(touch.x, swing.x, s), y: waterY, z: lerp(touch.z, swing.z, s), yaw: inYaw, pitch: 0.04 * (1 - s), onWater: true };
      }
      const s = smooth((u - ur) / (1 - ur));                      // swing round and lie along the dock's end
      return { x: lerp(swing.x, berth.x, s), y: waterY, z: lerp(swing.z, berth.z, s), yaw: angLerp(inYaw, berthYaw, s), pitch: 0, onWater: true };
    }
    const far = along(95), climb = along(HERON.START_OUT + 40);
    if (u < 0.22) {                                                // pull off and swing to face the far shore
      const s = smooth(u / 0.22);
      const p = along(lerp(HERON.BERTH_GAP + HERON.FLOAT_X, 12, s));
      return { x: p.x, y: waterY, z: p.z, yaw: angLerp(berthYaw, outYaw, s), pitch: 0, onWater: true };
    }
    if (u < 0.6) {                                                 // the run, lifting off at the end of it
      const s = (u - 0.22) / 0.38, e = s * s;
      const p = along(lerp(12, 95, e));
      const lift = s > 0.8 ? (s - 0.8) / 0.2 : 0;
      return { x: p.x, y: waterY + 4 * lift * lift, z: p.z, yaw: outYaw, pitch: 0.05 + 0.08 * lift, onWater: lift === 0 };
    }
    const s = (u - 0.6) / 0.4;                                     // the climb, away over the hills
    const x = lerp(far.x, climb.x, s), z = lerp(far.z, climb.z, s);
    return { x, y: safe(x, z, waterY + 4 + (HERON.START_ALT + 30) * smooth(s)), z, yaw: outYaw, pitch: 0.12, onWater: false };
  }

  const group = buildHeron();
  group.visible = false;
  scene.add(group);
  const flares = [];
  for (let i = 0; i < HERON.FLARES; i++) { const f = buildFlare(); scene.add(f); flares.push(f); }

  let state = 'away', t = 0, propSpin = 0;
  const play = (name, ...a) => { try { if (typeof audio[name] === 'function') audio[name](...a); } catch (_) { /* audio is a nicety */ } };

  function place(p, rock) {
    const bob = p.onWater ? Math.sin(t * 1.2) * 0.05 * rock - HERON.DRAFT : 0;   // on the water its floats sit in it
    group.position.set(p.x, p.y + bob, p.z);
    group.rotation.set(-(p.pitch || 0) + (p.onWater ? Math.sin(t * 0.8) * 0.012 * rock : 0), p.yaw, p.onWater ? Math.sin(t * 1.0 + 0.6) * 0.02 * rock : 0);
  }
  function spinProps(dt, rate) {
    propSpin += dt * rate;
    for (const pr of group.userData.props) {
      pr.rotation.z = propSpin;
      const blur = pr.children.find((c) => c.name === 'heron-prop-blur');
      if (blur) blur.material.opacity = rate > 60 ? Math.min(0.3, (rate - 60) / 300) : 0;
      for (const c of pr.children) if (c !== blur) c.visible = rate < 60;
    }
  }
  function arrive() {
    if (state === 'arriving' || state === 'waiting') return;
    state = 'arriving'; t = 0;
    group.visible = true;
    for (const f of flares) { f.visible = false; f.userData.t = null; f.userData.burst = false; }
    play('planeFlyover', 12);
  }
  function leave() {
    if (state !== 'arriving' && state !== 'waiting') return;
    state = 'leaving'; t = 0;
    for (const f of flares) f.visible = false;
    play('planeFlyover', 14);
  }
  function reset() {
    state = 'away'; t = 0; group.visible = false;
    for (const f of flares) { f.visible = false; f.userData.t = null; f.userData.burst = false; }
  }
  function updateFlares() {
    for (let i = 0; i < flares.length; i++) {
      const f = flares[i];
      const ft = t - i * HERON.FLARE_GAP_S;
      if (state !== 'arriving' && state !== 'waiting') { f.visible = false; continue; }
      if (ft < 0 || ft > HERON.FLARE_UP_S + HERON.FLARE_BURN_S) { f.visible = false; continue; }
      if (f.userData.t == null) { f.userData.t = 0; play('flareWhistle'); }
      if (ft >= HERON.FLARE_UP_S && !f.userData.burst) { f.userData.burst = true; play('flareBurst'); }
      f.visible = true;
      const up = ease(ft / HERON.FLARE_UP_S);
      const fall = Math.max(0, ft - HERON.FLARE_UP_S) / HERON.FLARE_BURN_S;
      const spread = (i - (flares.length - 1) / 2) * 3;
      const x = end.x + rx * spread + fx * out * (2 + 6 * up);
      const z = end.z + rz * spread + fz * out * (2 + 6 * up);
      const y = deckY + HERON.FLARE_HEIGHT * up - 9 * fall * fall;
      f.position.set(x, y, z);
      const burn = ft < HERON.FLARE_UP_S ? 0.5 : 1 - fall * 0.6;
      f.userData.halo.scale.setScalar(0.8 + 0.2 * Math.sin(t * 17 + i) + burn * 0.5);
      requestLight(x, y, z, 0xff3b24, 3.2 * burn, 34);
    }
  }
  function update(dt) {
    if (state === 'away') return;
    t += dt;
    let p, rock = 0.6, rate = 140;
    if (state === 'arriving') {
      p = path(clamp01(t / HERON.ARRIVE_S));
      if (t >= HERON.ARRIVE_S) { state = 'waiting'; p = path(1); }
      rate = p.onWater ? 90 : 160;
    }
    if (state === 'waiting') { p = path(1); rock = 1; rate = 45; }   // idling: the blades still show
    if (state === 'leaving') {
      if (t >= HERON.LEAVE_S) { reset(); return; }
      p = path(clamp01(t / HERON.LEAVE_S), true);
      rate = 170;
    }
    place(p, rock);
    spinProps(dt, rate);
    updateFlares();
    // The landing light while it comes in and goes; a warm glow in the cockpit while it waits.
    const nose = { x: group.position.x + Math.sin(group.rotation.y) * 5.2, z: group.position.z + Math.cos(group.rotation.y) * 5.2 };
    if (state !== 'waiting') requestLight(nose.x, group.position.y + 1.4, nose.z, 0xfff2d2, 3.0, 40);
    else requestLight(nose.x, group.position.y + 2.6, nose.z, 0xffd89a, 1.4, 14);
  }
  // The middle of its left float's walkway: what he steps onto from the end of the dock.
  function deck() {
    if (state === 'away') return null;
    const yaw = group.rotation.y;
    const lx = side * Math.cos(yaw), lz = -side * Math.sin(yaw);  // its side toward the planks, in the world
    return { x: group.position.x + lx * HERON.FLOAT_X, y: group.position.y + HERON.FLOAT_TOP, z: group.position.z + lz * HERON.FLOAT_X, r: HERON.DECK_R };
  }
  return {
    group, flares, berth, offshore, end, path, side,
    arrive, leave, reset, update,
    state: () => state,
    deck,
    timeline: () => ({ state, t })
  };
}
