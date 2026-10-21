// CL-116 (Jerry, 2026-10-02: "abhorrent fps" in the Training Ground, and the main game not much better). The cost
// was the lights. Every PointLight in the scene goes into every lit material's shader and is worked out for every
// pixel, lit or not: the game had thirteen of them (campfires, the tower's lantern, the mast's beacon, the HQ lamp, the
// supply terminal's glow, the laser and muzzle flashes, four fire lights), nearly always at intensity 0, all of them
// paid for on every pixel of every frame. Measured on the software renderer, putting the dark ones out more than
// doubled the frame rate in the Training Ground.
//
// So the scene keeps a small fixed set of real point lights (the pool), and every other point light becomes a
// stand-in: it stays where it is and keeps being driven exactly as before (position, colour, intensity), but it is
// moved to a layer the camera never renders, and each frame the brightest stand-ins near the marine are copied onto
// the pool's lights. The set of real lights never changes, so nothing recompiles when a light comes on or goes off.
// Spot and directional lights are left alone.
//
//   createLightPool(THREE, scene, { size = 4, layer = 31, reach = 26 }) -> {
//     lights,              the pool's real PointLights (in the scene from the start)
//     adopt(root),         make every PointLight under root (that isn't the pool's) a stand-in; returns how many
//     update(focus),       copy the brightest stand-ins that reach near focus ({x,y,z}) onto the pool
//     standIns(),          the stand-ins (for the tests)
//   }
// pickLights(cands, size) -> the chosen ones, brightest first ({ light, score }); pure, for the tests.

export function scoreLight({ intensity, distance, d }, reach = 26) {
  if (!(intensity > 0.001)) return 0;
  // Out of its own range of the marine (plus what the camera sees around him): it lights nothing on screen.
  const over = distance > 0 ? d - distance : 0;
  if (over > reach) return 0;
  const fade = over > 0 ? 1 - over / reach : 1;
  return intensity * fade / (1 + d * 0.04);
}

export function pickLights(cands, size) {
  return cands.filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, size);
}

export function createLightPool(THREE, scene, { size = 4, layer = 31, reach = 26 } = {}) {
  const lights = [];
  for (let i = 0; i < size; i++) {
    const L = new THREE.PointLight(0xffffff, 0, 1, 2);
    L.name = 'light-pool-' + i;
    L.userData.poolReal = true;
    scene.add(L);
    lights.push(L);
  }
  const stand = new Set();
  const _p = new THREE.Vector3();
  const live = (o) => {   // shown, and still hanging in the scene
    let n = o;
    for (; n; n = n.parent) { if (n.visible === false) return false; if (n === scene) return true; }
    return false;
  };
  function adopt(root) {
    let n = 0;
    (root || scene).traverse((o) => {
      if (!o.isPointLight || o.userData.poolReal || stand.has(o)) return;
      o.layers.set(layer);   // never drawn, never in a shader: the pool stands in for it
      stand.add(o); n++;
    });
    return n;
  }
  const cands = [];
  function update(focus) {
    cands.length = 0;
    for (const L of stand) {
      if (!(L.intensity > 0.001) || !live(L)) continue;
      L.updateWorldMatrix(true, false);
      _p.setFromMatrixPosition(L.matrixWorld);
      const d = focus ? Math.hypot(_p.x - focus.x, _p.y - focus.y, _p.z - focus.z) : 0;
      const score = scoreLight({ intensity: L.intensity, distance: L.distance, d }, reach);
      if (score > 0) cands.push({ light: L, score, x: _p.x, y: _p.y, z: _p.z });
    }
    const chosen = pickLights(cands, size);
    for (let i = 0; i < size; i++) {
      const R = lights[i], c = chosen[i];
      if (!c) { if (R.intensity !== 0) R.intensity = 0; continue; }
      R.position.set(c.x, c.y, c.z);
      R.color.copy(c.light.color);
      R.intensity = c.light.intensity;
      R.distance = c.light.distance;
      R.decay = c.light.decay;
    }
    return chosen.length;
  }
  return { lights, adopt, update, standIns: () => [...stand] };
}
