// world/boat.js — the way out (CL-73, P-52, D-45, docs/story.md §6). Claude's (world/*).
//
// On night 20, once he has called the boat (GB-85's 'extraction' 'called'), it comes in as the last push starts
// ('due'): three red flares go up from the end of the dock one after another, the horn sounds, and a small patrol
// boat with a lamp on its mast slides in from out on the lake and noses in to the end of the dock. It waits there through
// the dawn (GB-85's wait) with its lamp lit and the horn now and then, rocking on the water, until he boards
// (GB-86) or the next alarm sends it away ('gone'): then it backs off and heads out.
//
// No lights are added: the flares and the lamp ask the game's shared effect-light pool for a glow (requestLight),
// so the scene's light count never changes (the light-stability notes by effectLights in index.html).
//
// API:
//   createExtractionBoat({ scene, dock, deckY, waterY, requestLight, audio }) → boat
//     dock: { x, z, yaw, len, hw } — the dock's centre, facing (as POI.dock) and size; the end in deeper water is
//     `dock.lakeEnd` (+1 along the yaw, or -1), found by the caller.
//   boat.arrive()        the flares, the horn, the boat comes in (idempotent while it is here)
//   boat.leave()         it backs off and goes (idempotent)
//   boat.reset()         gone at once (a new run)
//   boat.update(dt)      every frame
//   boat.state()         'away' | 'arriving' | 'waiting' | 'leaving'
//   boat.deck()          { x, y, z, r } — the middle of its deck, in the world, and how far from it counts as
//                        aboard (GB-86's hold-E); null while it is away
//   boat.group, boat.flares   for tests and shots
import * as THREE from 'three';

export const BOAT = Object.freeze({
  START_OUT: 70,      // m out from the dock's end when it appears
  ARRIVE_S: 22,       // s to come alongside
  LEAVE_S: 20,        // s to back off and go
  NOSE_OFF: 3.9,      // m from the dock's end to the boat's middle: its bow just touches the planks
  FLARES: 3, FLARE_GAP_S: 1.2, FLARE_UP_S: 2.2, FLARE_BURN_S: 9, FLARE_HEIGHT: 26,
  HORN_AT_S: [1.0, 14.0], HORN_EVERY_S: 40,
  DECK_R: 2.2
});

const ease = (u) => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3);

function buildBoat() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.65, metalness: 0.3 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xb8b3a4, roughness: 0.7, metalness: 0.1 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xd9d4c4, roughness: 0.75, metalness: 0.05 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1c2630, emissive: 0xffd89a, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.4 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x6b5a44, roughness: 0.9 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xfff0c8, emissiveIntensity: 3.0, roughness: 0.3 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0x8a1e1a, roughness: 0.7 });
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  // The hull: long along z (bow at +z), a flat deck, a narrower bow block, a red boot line at the water.
  box(2.3, 0.9, 6.2, hullMat, 0, 0.1, -0.3);
  const bow = box(1.6, 0.9, 1.4, hullMat, 0, 0.1, 3.2); bow.scale.set(1, 1, 1);
  box(2.34, 0.14, 6.25, redMat, 0, -0.28, -0.3);
  box(2.1, 0.08, 6.0, deckMat, 0, 0.58, -0.3);
  // Gunwales.
  for (const sx of [-1, 1]) box(0.08, 0.28, 6.4, trimMat, sx * 1.15, 0.72, -0.2);
  // The wheelhouse, its windows, and the mast with the lamp.
  box(1.6, 1.1, 1.8, cabinMat, 0, 1.17, -1.2);
  box(1.64, 0.35, 0.05, glassMat, 0, 1.4, -0.28);
  for (const sx of [-1, 1]) box(0.05, 0.35, 1.2, glassMat, sx * 0.82, 1.4, -1.1);
  box(1.8, 0.1, 2.0, trimMat, 0, 1.77, -1.2);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.6, 8), trimMat);
  mast.position.set(0, 2.6, -1.4); g.add(mast);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), lampMat);
  lamp.position.set(0, 3.45, -1.4); g.add(lamp);
  // A life ring on the wheelhouse's back.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 18), redMat);
  ring.position.set(0, 1.2, -2.12); g.add(ring);
  g.userData.lamp = lamp;
  g.userData.lampMat = lampMat;
  g.userData.glassMat = glassMat;
  return g;
}

function buildFlare() {
  const mat = new THREE.MeshBasicMaterial({ color: 0xff3b24 });
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat);
  m.visible = false;
  // A soft halo so it reads as a burning flare from across the map.
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: 0.35, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), haloMat);
  m.add(halo);
  m.userData.halo = halo;
  return m;
}

export function createExtractionBoat({ scene, dock, deckY, waterY, requestLight = () => {}, audio = {} }) {
  const fx = Math.sin(dock.yaw), fz = Math.cos(dock.yaw);        // along the dock
  const rx = Math.cos(dock.yaw), rz = -Math.sin(dock.yaw);       // across it
  const out = dock.lakeEnd || 1;                                  // +1 or -1: which way the lake is
  const half = (dock.len || 9.5) / 2;
  const end = { x: dock.x + fx * out * half, z: dock.z + fz * out * half };
  // It noses in to the end of the dock (the rowboat is tied up alongside), bow to the planks, so he boards over the
  // end of the dock.
  const berth = { x: end.x + fx * out * BOAT.NOSE_OFF, z: end.z + fz * out * BOAT.NOSE_OFF };
  const offshore = { x: berth.x + fx * out * BOAT.START_OUT, z: berth.z + fz * out * BOAT.START_OUT };
  // Bow toward the shore while it comes in; its heading is the dock's, pointing landward.
  const heading = Math.atan2(-fx * out, -fz * out);

  const group = buildBoat();
  group.visible = false;
  scene.add(group);
  const flares = [];
  for (let i = 0; i < BOAT.FLARES; i++) { const f = buildFlare(); scene.add(f); flares.push(f); }

  let state = 'away', t = 0, hornT = 0;
  const pos = { x: offshore.x, z: offshore.z };
  const play = (name) => { try { if (typeof audio[name] === 'function') audio[name](); } catch (_) { /* audio is a nicety */ } };

  function place(x, z, rock) {
    group.position.set(x, waterY - 0.05 + Math.sin(t * 1.3) * 0.06 * rock, z);
    group.rotation.set(Math.sin(t * 0.9) * 0.035 * rock, heading, Math.sin(t * 1.1 + 0.7) * 0.05 * rock);
  }
  function arrive() {
    if (state === 'arriving' || state === 'waiting') return;
    state = 'arriving'; t = 0; hornT = 0;
    pos.x = offshore.x; pos.z = offshore.z;
    group.visible = true;
    for (const f of flares) { f.visible = false; f.userData.t = null; }
  }
  function leave() {
    if (state !== 'arriving' && state !== 'waiting') return;
    state = 'leaving'; t = 0;
    for (const f of flares) f.visible = false;
  }
  function reset() {
    state = 'away'; t = 0; group.visible = false;
    for (const f of flares) { f.visible = false; f.userData.t = null; }
  }
  function updateFlares(dt) {
    for (let i = 0; i < flares.length; i++) {
      const f = flares[i];
      const launch = i * BOAT.FLARE_GAP_S;
      const ft = t - launch;
      if (state !== 'arriving' && state !== 'waiting') { f.visible = false; continue; }
      if (ft < 0 || ft > BOAT.FLARE_UP_S + BOAT.FLARE_BURN_S) { f.visible = false; continue; }
      if (f.userData.t == null) { f.userData.t = 0; play('flareWhistle'); }
      if (ft >= BOAT.FLARE_UP_S && !f.userData.burst) { f.userData.burst = true; play('flareBurst'); }
      f.visible = true;
      const up = ease(ft / BOAT.FLARE_UP_S);
      const fall = Math.max(0, ft - BOAT.FLARE_UP_S) / BOAT.FLARE_BURN_S;   // it drifts down as it burns
      const spread = (i - (flares.length - 1) / 2) * 3;
      const x = end.x + rx * spread + fx * out * (2 + 6 * up);
      const z = end.z + rz * spread + fz * out * (2 + 6 * up);
      const y = deckY + BOAT.FLARE_HEIGHT * up - 9 * fall * fall;
      f.position.set(x, y, z);
      const burn = ft < BOAT.FLARE_UP_S ? 0.5 : 1 - fall * 0.6;
      f.userData.halo.scale.setScalar(0.8 + 0.4 * Math.sin(t * 17 + i) * 0.5 + burn * 0.5);
      requestLight(x, y, z, 0xff3b24, 3.2 * burn, 34);
    }
  }
  function update(dt) {
    if (state === 'away') return;
    t += dt;
    if (state === 'arriving') {
      const u = ease(t / BOAT.ARRIVE_S);
      pos.x = offshore.x + (berth.x - offshore.x) * u;
      pos.z = offshore.z + (berth.z - offshore.z) * u;
      for (const h of BOAT.HORN_AT_S) if (t - dt < h && t >= h) play('boatHorn');
      if (t >= BOAT.ARRIVE_S) { state = 'waiting'; hornT = 0; }
    } else if (state === 'waiting') {
      pos.x = berth.x; pos.z = berth.z;
      hornT += dt;
      if (hornT >= BOAT.HORN_EVERY_S) { hornT = 0; play('boatHorn'); }
    } else if (state === 'leaving') {
      const u = ease(t / BOAT.LEAVE_S);
      pos.x = berth.x + (offshore.x - berth.x) * u;
      pos.z = berth.z + (offshore.z - berth.z) * u;
      if (t >= BOAT.LEAVE_S) { reset(); return; }
    }
    place(pos.x, pos.z, state === 'waiting' ? 1 : 0.6);
    updateFlares(dt);
    // The lamp on the mast, and a warm glow in the wheelhouse.
    const lampY = group.position.y + 3.45;
    requestLight(group.position.x, lampY, group.position.z, 0xfff0c8, state === 'leaving' ? 1.2 : 2.4, 20);
  }
  return {
    group, flares, berth, offshore, end,
    arrive, leave, reset, update,
    state: () => state,
    deck: () => (state === 'away' ? null : { x: group.position.x, y: group.position.y + 0.62, z: group.position.z, r: BOAT.DECK_R }),
    timeline: () => ({ state, t })
  };
}
