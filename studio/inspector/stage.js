// studio/inspector/stage.js — the studio the subjects stand in (CL-196). Claude's (studio/*).
//
// A backdrop and a 1 m grid floor round the stage's centre, which is the middle of the Training Ground's build room
// (the room itself is hidden while the backdrop is up; its floor and walls still hold the marine and the zombies).
// The light is the game's own: its sun (with its shadows), its sky light and its fill, set each frame by the lighting
// preset just before the draw. No light is added, so nothing recompiles when the preset changes.
//
//   createStage(ix) -> { group, center, backdrop(name), light(name), overlays: { set(name, on), get(name) }, frame(dt),
//                        measure(obj) -> { center, size, min, max }, dispose() }

import { createResourceScope } from './subjects.js';

const BACKDROPS = {
  studio: { top: 0x5b6168, mid: 0x878c91, floor: 0x7a7e82, line: 0x5a5e62, minor: 0x6d7175 },
  dark:   { top: 0x0d0f11, mid: 0x1b1e21, floor: 0x1f2225, line: 0x34383c, minor: 0x272a2d },
  light:  { top: 0x9ea4aa, mid: 0xc8ccd0, floor: 0xb4b8bc, line: 0x8e9398, minor: 0xa4a8ad },
  green:  { top: 0x0f5d22, mid: 0x14872f, floor: 0x14872f, line: 0x0f6f26, minor: 0x127a2b },
  off:    null
};
// Lighting presets: the game's sun (a directional light, its shadow box centred on the stage), the hemisphere sky
// light and the ambient fill. dir is where the sun is, from the subject: x to its left, y up, z in front of it.
const LIGHTS = {
  game:      null,
  studio:    { dir: [0.55, 0.85, 0.7], sun: 2.9, sunColor: 0xfff3e2, sky: 1.5, skyColor: 0xe4ecff, ground: 0x6a6d72, fill: 0.25 },
  headlight: { follow: true, dir: [0.35, 0.65, 1], sun: 2.6, sunColor: 0xffffff, sky: 0.9, skyColor: 0xe8eeff, ground: 0x55575b, fill: 0.2 },
  top:       { dir: [0.05, 1, 0.12], sun: 2.4, sunColor: 0xfff6ea, sky: 0.9, skyColor: 0xdde8ff, ground: 0x505255, fill: 0.1 },
  rim:       { dir: [-0.4, 0.55, -1], sun: 2.8, sunColor: 0xffe7c8, sky: 0.6, skyColor: 0xbfd0ff, ground: 0x3a3c40, fill: 0.14 },
  flat:      { dir: [0.2, 1, 0.4], sun: 0.4, sunColor: 0xffffff, sky: 2.0, skyColor: 0xffffff, ground: 0xb0b0b0, fill: 0.35 },
  night:     { dir: [-0.3, 0.8, 0.5], sun: 0.35, sunColor: 0x8fa6d8, sky: 0.25, skyColor: 0x5468a0, ground: 0x15171c, fill: 0.04 },
  // CU-161: the principles pass's four lights. check --time uses these names.
  noon:      { dir: [0.12, 0.98, 0.16], sun: 3.1, sunColor: 0xfff4dc, sky: 1.25, skyColor: 0xd5e4ff, ground: 0x8d7b62, fill: 0.16 },
  overcast:  { dir: [0.25, 1, 0.35], sun: 0.65, sunColor: 0xe6e8ee, sky: 1.85, skyColor: 0xd4d7de, ground: 0x7c7e82, fill: 0.42 },
  dusk:      { dir: [0.9, 0.26, 0.12], sun: 1.55, sunColor: 0xffb07a, sky: 0.65, skyColor: 0xffc4a2, ground: 0x4a3428, fill: 0.1 }
};
export { BACKDROPS, LIGHTS };

function gridTexture(THREE, pal) {
  const px = 256, c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'), hex = (n) => '#' + n.toString(16).padStart(6, '0');
  g.fillStyle = hex(pal.floor); g.fillRect(0, 0, px, px);
  g.strokeStyle = hex(pal.minor); g.lineWidth = 1;
  for (let i = 1; i < 10; i++) { const p = Math.round(i * px / 10) + 0.5; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, px); g.moveTo(0, p); g.lineTo(px, p); g.stroke(); }
  g.strokeStyle = hex(pal.line); g.lineWidth = 3;
  g.strokeRect(0, 0, px, px);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function createStage(ix) {
  const { THREE, host } = ix;
  const scope = createResourceScope(ix);
  const R = 46;                                   // the backdrop's radius (the camera's reach in here is 150 m)
  const group = new THREE.Group(); group.name = 'inspector-stage';
  const overlay = new THREE.Group(); overlay.name = 'inspector-overlays';
  group.add(overlay);

  // The dome: a sphere seen from inside, coloured top to bottom, drawn behind everything and never fogged.
  const domeGeo = new THREE.SphereGeometry(R, 48, 24);
  const domeCol = new Float32Array(domeGeo.attributes.position.count * 3);
  domeGeo.setAttribute('color', new THREE.BufferAttribute(domeCol, 3));
  const domeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const dome = new THREE.Mesh(domeGeo, domeMat); dome.name = 'inspector-backdrop'; dome.renderOrder = -10; dome.frustumCulled = false;
  group.add(dome);
  // The floor: a disc with a 1 m grid (10 cm lines inside each metre), taking the game's shadows.
  const floorGeo = new THREE.CircleGeometry(R, 72); floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0 });
  const floor = new THREE.Mesh(floorGeo, floorMat); floor.name = 'inspector-floor'; floor.receiveShadow = true; floor.position.y = 0.002;
  group.add(floor);
  let gridTex = null, gridOn = true;

  const center = { x: 0, y: 0, z: 0 };
  function placeAt(x, y, z) { center.x = x; center.y = y; center.z = z; group.position.set(x, y, z); group.updateMatrixWorld(true); }

  let backdropKey = 'studio';
  function backdrop(name) {
    if (name == null) return backdropKey;
    if (!Object.hasOwn(BACKDROPS, name)) throw new Error('no backdrop "' + name + '" (' + Object.keys(BACKDROPS).join(', ') + ')');
    backdropKey = name;
    const pal = BACKDROPS[name];
    dome.visible = floor.visible = !!pal;
    const room = host.training().tg;
    if (room && room.group) room.group.visible = !pal;   // the Training Ground shows only with the backdrop off
    if (host.skyDome) host.skyDome.visible = !pal;
    if (!pal) return name;
    const P = domeGeo.attributes.position, top = new THREE.Color(pal.top), mid = new THREE.Color(pal.mid), low = new THREE.Color(pal.floor), c = new THREE.Color();
    for (let i = 0; i < P.count; i++) {
      const h = P.getY(i) / R;   // -1 .. 1
      if (h >= 0) c.copy(mid).lerp(top, Math.pow(h, 0.7)); else c.copy(mid).lerp(low, Math.min(1, -h * 6));
      domeCol[i * 3] = c.r; domeCol[i * 3 + 1] = c.g; domeCol[i * 3 + 2] = c.b;
    }
    P.needsUpdate = true; domeGeo.attributes.color.needsUpdate = true;
    if (gridTex) gridTex.dispose();
    gridTex = gridTexture(THREE, pal); gridTex.repeat.set(radius * 2, radius * 2);
    floorMat.map = gridOn ? gridTex : null; floorMat.color.set(gridOn ? 0xffffff : pal.floor); floorMat.needsUpdate = true;
    return name;
  }
  function grid(on) {
    if (on == null) return gridOn;
    gridOn = !!on;
    const pal = BACKDROPS[backdropKey];
    if (pal) { floorMat.map = gridOn ? gridTex : null; floorMat.color.set(gridOn ? 0xffffff : pal.floor); floorMat.needsUpdate = true; }
    return gridOn;
  }

  // --- the light: the game's, re-aimed each frame just before the draw ------------------------------------------
  let lightKey = 'studio';
  const _d = new THREE.Vector3();
  function light(name) {
    if (name == null) return lightKey;
    if (!Object.hasOwn(LIGHTS, name)) throw new Error('no lighting "' + name + '" (' + Object.keys(LIGHTS).join(', ') + ')');
    lightKey = name;
    return name;
  }
  function applyLight(focus) {
    const L = LIGHTS[lightKey];
    if (!L) return;
    const { sun, hemi, ambientFill, moon } = host;
    let yaw = focus ? focus.yaw || 0 : 0;
    if (L.follow && ix.orbit) yaw = ix.orbit.azimuth();
    _d.set(L.dir[0], L.dir[1], L.dir[2]).normalize();
    const cs = Math.cos(yaw), sn = Math.sin(yaw), x = _d.x * cs + _d.z * sn, z = -_d.x * sn + _d.z * cs;
    const at = focus ? focus.center : center;
    sun.position.set(at.x + x * 85, at.y + _d.y * 85, at.z + z * 85);
    sun.target.position.set(at.x, at.y, at.z); sun.target.updateMatrixWorld();
    sun.intensity = L.sun; sun.color.setHex(L.sunColor);
    if (hemi) { hemi.intensity = L.sky; hemi.color.setHex(L.skyColor); hemi.groundColor.setHex(L.ground); }
    if (ambientFill) ambientFill.intensity = L.fill;
    if (moon) moon.intensity = 0;
  }

  // --- overlays ---------------------------------------------------------------------------------------------------
  const lineMat = new THREE.LineBasicMaterial({ color: 0xf2c418, depthTest: false, transparent: true, opacity: 0.9, fog: false });
  const boxGeo = new THREE.BufferGeometry();
  boxGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
  const boxLines = new THREE.LineSegments(boxGeo, lineMat); boxLines.renderOrder = 999; boxLines.frustumCulled = false; boxLines.visible = false;
  overlay.add(boxLines);
  // the axes: x red (the subject's left), y green (up), z blue (its front), 0.6 m
  const axGeo = new THREE.BufferGeometry();
  axGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0.6]), 3));
  axGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array([1, 0.2, 0.2, 1, 0.2, 0.2, 0.3, 1, 0.3, 0.3, 1, 0.3, 0.3, 0.5, 1, 0.3, 0.5, 1]), 3));
  const axes = new THREE.LineSegments(axGeo, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, fog: false }));
  axes.renderOrder = 999; axes.visible = false; axes.frustumCulled = false;
  overlay.add(axes);
  // A 1.8 m measuring stick (the marine's height, a tick every 10 cm, a long one every 50) beside the subject.
  const stick = new THREE.Group(); stick.visible = false;
  {
    const yellow = new THREE.MeshBasicMaterial({ color: 0xf2c418, fog: false }), dark = new THREE.MeshBasicMaterial({ color: 0x1b1d20, fog: false });
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.8, 0.025), yellow); pole.position.y = 0.9; stick.add(pole);
    for (let i = 0; i <= 18; i++) {
      const long = i % 5 === 0, t = new THREE.Mesh(new THREE.BoxGeometry(long ? 0.12 : 0.06, 0.008, 0.03), i % 10 === 0 ? dark : yellow);
      t.position.set(long ? 0.06 : 0.03, i * 0.1, 0); stick.add(t);
    }
  }
  overlay.add(stick);
  const jointMat = new THREE.MeshBasicMaterial({ color: 0x4fe0ff, depthTest: false, transparent: true, opacity: 0.95, fog: false });
  const jointGeo = new THREE.SphereGeometry(0.018, 8, 6);
  const jointDots = [];
  const flags = { bounds: false, axes: false, stick: false, joints: false, wire: false, grid: true, labels: true };
  const wired = new Map();   // material -> its own wireframe flag, while the wireframe is on
  function setWire(root, on) {
    if (!on) { for (const [m, was] of wired) { m.wireframe = was; m.needsUpdate = true; } wired.clear(); return; }
    if (!root) return;
    root.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && !wired.has(m) && 'wireframe' in m) { wired.set(m, m.wireframe); m.wireframe = true; m.needsUpdate = true; }
    });
  }
  const overlays = {
    get: (k) => { if (!Object.hasOwn(flags, k)) throw new Error('no overlay "' + k + '"'); return flags[k]; },
    set(k, on) {
      if (!Object.hasOwn(flags, k)) throw new Error('no overlay "' + k + '" (' + Object.keys(flags).join(', ') + ')');
      flags[k] = !!on;
      if (k === 'grid') grid(on);
      if (k === 'wire') { setWire(null, false); if (on && ix.subject) setWire(ix.subject.rig(), true); }
      return flags[k];
    },
    all: () => ({ ...flags })
  };

  // Bounds of what is shown: visible meshes only (a gun in its holster, the hidden kit and a skinned body's bind
  // pose would otherwise widen it). Skinned meshes are measured as skinned (three's computeBoundingBox), at most
  // ten times a second.
  const _b = new THREE.Box3(), _m = new THREE.Box3(), _v = new THREE.Vector3(), _q = new THREE.Quaternion();
  const boundsVersion = new WeakMap();
  function shown(o, stop) { for (let n = o; n; n = n.parent) { if (n.visible === false) return false; if (n === stop) return true; } return true; }
  function measure(obj, { skinned = true } = {}) {
    _b.makeEmpty();
    if (!obj) return null;
    // updateMatrixWorld (not updateWorldMatrix) for the subtree: a skinned mesh's own override keeps its bind
    // inverse current, without which a body not drawn yet measures in world space
    obj.updateWorldMatrix(true, false); obj.updateMatrixWorld(true);
    const camera = host.camera || ix.T.camera;
    obj.traverse((o) => {
      if (!(o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.isSprite || o.isPoints || o.isLine) || !o.geometry || !shown(o, obj)) return;
      if (o.userData && o.userData.dwiIgnore) return;
      // The marine's shadow-only skin is visible in the graph but excluded from the main camera by its layers.
      // CPU-skinning that duplicate shadow geometry cost ~24 ms per measurement and is not a visible pose bound.
      if (camera?.layers && o.layers && !o.layers.test(camera.layers)) return;
      if (o.isSkinnedMesh && skinned) { try { o.computeBoundingBox(); _m.copy(o.boundingBox).applyMatrix4(o.matrixWorld); } catch (_) { return; } }
      else {
        const g = o.geometry, version = g.attributes && g.attributes.position ? g.attributes.position.version : 0;
        if (!g.boundingBox || boundsVersion.get(g) !== version) g.computeBoundingBox();
        boundsVersion.set(g, version);
        if (o.isInstancedMesh && typeof o.computeBoundingBox === 'function') { o.computeBoundingBox(); _m.copy(o.boundingBox).applyMatrix4(o.matrixWorld); }
        else _m.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
      }
      if (!_m.isEmpty() && [_m.min.x, _m.min.y, _m.min.z, _m.max.x, _m.max.y, _m.max.z].every(Number.isFinite)) _b.union(_m);
    });
    if (_b.isEmpty()) return null;   // a hidden/invalid body is not a valid visible bound
    const c = _b.getCenter(_v);
    return { center: { x: c.x, y: c.y, z: c.z }, size: { x: _b.max.x - _b.min.x, y: _b.max.y - _b.min.y, z: _b.max.z - _b.min.z },
      min: { x: _b.min.x, y: _b.min.y, z: _b.min.z }, max: { x: _b.max.x, y: _b.max.y, z: _b.max.z } };
  }
  function drawBox(m) {
    const p = boxGeo.attributes.position.array;
    const x0 = m.min.x - center.x, x1 = m.max.x - center.x, y0 = m.min.y - center.y, y1 = m.max.y - center.y, z0 = m.min.z - center.z, z1 = m.max.z - center.z;
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    const e = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7];
    for (let i = 0; i < 24; i++) { const v = c[e[i]]; p[i * 3] = v[0]; p[i * 3 + 1] = v[1]; p[i * 3 + 2] = v[2]; }
    boxGeo.attributes.position.needsUpdate = true; boxGeo.computeBoundingSphere();
  }
  // The studio grows with what is in it: big things (the cargo plane, the colossus) and a camera stood far back stay
  // inside the dome, the grid keeps its 1 m squares, and the camera's reach follows (it is 150 m in the Training Ground).
  let radius = R;
  function fit(need) {
    const r = Math.max(R, Math.min(700, need || R));
    if (Math.abs(r - radius) < radius * 0.08 && r <= radius) return radius;
    radius = r; const k = r / R;
    dome.scale.setScalar(k); floor.scale.set(k, 1, k);
    if (gridTex) gridTex.repeat.set(r * 2, r * 2);
    const cam = host.camera, far = Math.max(150, r * 2.4);
    if (Math.abs(cam.far - far) > 1) { cam.far = far; cam.updateProjectionMatrix(); }
    return radius;
  }
  let boxT = 0, lastBox = null;
  // Called by the inspector's frame, last before the draw.
  function frame(dt, focus) {
    applyLight(focus);
    if (focus && ix.orbit && BACKDROPS[backdropKey]) {
      const o = ix.orbit.cam(), d = Math.hypot(o.x - center.x, o.y - center.y, o.z - center.z), sz = Math.max(focus.size.x, focus.size.y, focus.size.z);
      fit(Math.max(d * 1.6, sz * 3, Math.hypot(focus.center.x - center.x, focus.center.z - center.z) * 1.5 + 20));
    }
    const s = ix.subject;
    const want = (flags.bounds || flags.stick) && s;
    boxT -= dt || 1 / 60;
    if (want && (boxT <= 0 || !lastBox || s.live)) { boxT = 0.1; lastBox = s.bounds ? s.bounds() : measure(s.rig()); }
    boxLines.visible = !!(flags.bounds && lastBox);
    if (boxLines.visible) drawBox(lastBox);
    stick.visible = !!(flags.stick && lastBox);
    if (stick.visible) stick.position.set(lastBox.max.x - center.x + 0.35, lastBox.min.y - center.y, lastBox.center.z - center.z);
    axes.visible = !!(flags.axes && s);
    if (axes.visible) {
      const o = s.origin ? s.origin() : null;
      if (o) { o.getWorldPosition(_v); o.getWorldQuaternion(_q); axes.position.set(_v.x - center.x, _v.y - center.y, _v.z - center.z); axes.quaternion.copy(_q); }
    }
    // joints: a dot on each named joint (the game's own userData names)
    const J = flags.joints && s && s.joints ? s.joints() : [];
    while (jointDots.length < J.length) { const d = new THREE.Mesh(jointGeo, jointMat); d.renderOrder = 1000; d.frustumCulled = false; overlay.add(d); jointDots.push(d); }
    for (let i = 0; i < jointDots.length; i++) {
      const d = jointDots[i], j = J[i];
      d.visible = !!j;
      if (j) { j.obj.getWorldPosition(_v); d.position.set(_v.x - center.x, _v.y - center.y, _v.z - center.z); }
    }
    if (flags.wire && s) setWire(s.rig(), true);
    if (backdropKey !== 'off' && host.skyDome) host.skyDome.visible = false;
    return { box: lastBox, joints: J };
  }
  function invalidate() { lastBox = null; boxT = 0; setWire(null, false); }

  backdrop('studio');
  return { group, overlay, center, placeAt, backdrop, light, grid, overlays, measure, frame, invalidate, fit, BACKDROPS, LIGHTS, get radius() { return radius; },
    dispose() { invalidate(); scope.release(group, [gridTex]); gridTex = null; } };
}
