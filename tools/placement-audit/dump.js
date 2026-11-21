// tools/placement-audit/dump.js — CF-19 (D-218, Claude 6): the Training Ground as the game builds it, for the placement audit.
// An async expression evaluated inside the test page (fakethree: real maths and scene graph, no GPU). It enters the
// Training Ground the way the menu does, turns the lamps on, goes first person (so the ceiling and every cutaway part
// is shown), lets the late props arrive, then stores every visible mesh (world triangles), every light and the room's
// plan on window.__CF19 for run.mjs to read in slices. Read-only: it changes nothing in the game's files.
(async () => {
  const T = window.TT;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms = 60000) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (_) {} await wait(50); } return false; };
  const notes = [];
  // 1. In.
  const nameEl = document.getElementById('playerName');
  if (nameEl && !nameEl.value.trim()) nameEl.value = 'AUDIT';
  try { T.trainingDbg.start(); } catch (e) { notes.push('start: ' + e.message); }
  if (!T.trainingDbg.state().active) { const b = document.getElementById('modeTraining'); if (b) b.click(); }
  const active = await until(() => T.trainingDbg.state().active, 90000);
  if (!active) return JSON.stringify({ error: 'Training Ground never became active' });
  await wait(+(window.__CF19_SETTLE_MS || 6000));   // the warm and the late props (story props, wear) arrive over a few frames
  const tg = T.trainingDbg.tg ? T.trainingDbg.tg() : (T.training && T.training().tg);
  try { tg.setLights && tg.setLights(true); } catch (e) { notes.push('setLights: ' + e.message); }
  try { T.setViewFirstDbg && T.setViewFirstDbg(true); } catch (_) {}
  await wait(1500);
  const THREE = T.THREE, scene = T.scene;
  scene.updateMatrixWorld(true);

  // 2. What belongs to the room: the tg group, plus anything in the scene inside its bounds (the dummy, the bed, the
  // infirmary fence, the ceiling, copies), minus the player, the camera's children and the sky.
  const O = tg.origin;
  const skip = new Set();
  const markSkip = (o) => { if (o) o.traverse((c) => skip.add(c)); };
  markSkip(T.player); markSkip(T.camera);
  try { markSkip(T.marine); } catch (_) {}
  const visibleUp = (o) => { for (let n = o; n; n = n.parent) if (n.visible === false) return false; return true; };
  const label = (o) => {
    const parts = [];
    for (let n = o; n && n !== scene; n = n.parent) {
      const i = n.parent ? n.parent.children.indexOf(n) : 0;
      parts.unshift(n.name ? n.name : (n.type || 'Object3D') + '[' + i + ']');
    }
    return parts.join('/');
  };
  const namedUp = (o) => { const names = []; for (let n = o; n && n !== scene; n = n.parent) if (n.name) names.push(n.name); return names; };
  const ud = (o) => { const out = {}; for (let n = o; n && n !== scene; n = n.parent) { const u = n.userData || {}; for (const k of Object.keys(u)) { const v = u[k]; if (out[k] === undefined && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) out[k] = v; } } return out; };
  // Provenance (run.mjs's hook): the stack that first added this mesh (or its nearest ancestor that has one).
  const SRC = window.__CF19SRC;
  const srcOf = (o) => {
    let st = null;
    for (let n = o; n && !st; n = n.parent) st = SRC && SRC.get(n);
    if (!st) return [];
    const out = [];
    const lines = String(st).split('\n').filter((l) => /^\s+at /.test(l)).slice(1);   // [0] is the hook itself
    for (const l of lines) {
      const m = l.match(/at (?:(.*?) \()?(?:https?:\/\/[^/]+)?\/?([^():?]+)(?:\?[^:]*)?:(\d+):\d+\)?\s*$/);
      if (!m) continue;
      let file = m[2].replace(/^tools\/tests\/test-\d+\.html$/, 'index.html');
      if (/fakethree|faketsl|placement-audit/.test(file)) continue;
      out.push((m[1] || '') + '@' + file + ':' + m[3]);
      if (out.length >= 10) break;
    }
    return out;
  };
  const matInfo = (m) => { if (!m) return null; if (Array.isArray(m)) m = m[0]; return { name: m.name || '', type: m.type || '', color: m.color && m.color.getHexString ? m.color.getHexString() : null, transparent: !!m.transparent, opacity: m.opacity, emissive: m.emissive && m.emissive.getHexString ? m.emissive.getHexString() : null }; };

  const meshes = [], lights = [];
  const v = new THREE.Vector3(), M = new THREE.Matrix4(), IM = new THREE.Matrix4();
  const LIM = 90;   // metres round the room's origin
  const near = (p) => Math.abs(p.x - O.x) < LIM && Math.abs(p.z - O.z) < LIM && Math.abs(p.y - O.y) < 60;
  const triBuf = [];
  let triTotal = 0;
  const emit = (o, mat, id, extra) => {
    const g = o.geometry; if (!g || !g.attributes || !g.attributes.position) return;
    const P = g.attributes.position, idx = g.index;
    const count = idx ? idx.count : P.count;
    if (count < 3) return;
    const arr = new Float32Array(Math.floor(count / 3) * 9);
    let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < arr.length / 3; k++) {
      const i = idx ? idx.getX(k) : k;
      v.fromBufferAttribute(P, i).applyMatrix4(mat);
      arr[k * 3] = v.x; arr[k * 3 + 1] = v.y; arr[k * 3 + 2] = v.z;
      if (v.x < mn[0]) mn[0] = v.x; if (v.y < mn[1]) mn[1] = v.y; if (v.z < mn[2]) mn[2] = v.z;
      if (v.x > mx[0]) mx[0] = v.x; if (v.y > mx[1]) mx[1] = v.y; if (v.z > mx[2]) mx[2] = v.z;
    }
    if (!near({ x: (mn[0] + mx[0]) / 2, y: (mn[1] + mx[1]) / 2, z: (mn[2] + mx[2]) / 2 })) return;
    triBuf.push(arr); triTotal += arr.length / 9;
    meshes.push(Object.assign({ id, path: label(o), names: namedUp(o), type: o.type, geo: g.type || '', mat: matInfo(o.material),
      userData: ud(o), min: mn, max: mx, tris: arr.length / 9, inTg: (() => { for (let n = o; n; n = n.parent) if (n === tg.group) return true; return false; })(),
      src: srcOf(o), castShadow: !!o.castShadow, line: !!(o.isLine || o.isLineSegments || o.isPoints || o.isSprite) }, extra || {}));
  };
  let n = 0;
  scene.traverse((o) => {
    if (skip.has(o)) return;
    if (o.isLight) {
      if (o.isAmbientLight || o.isHemisphereLight || o.isDirectionalLight && !near(o.getWorldPosition(new THREE.Vector3()))) { /* sky lights: global */ }
      const p = o.getWorldPosition(new THREE.Vector3());
      if (!near(p)) return;
      lights.push({ id: 'L' + lights.length, path: label(o), src: srcOf(o), names: namedUp(o), type: o.type, pos: [p.x, p.y, p.z], visible: visibleUp(o), intensity: o.intensity, distance: o.distance, color: o.color && o.color.getHexString ? o.color.getHexString() : null, castShadow: !!o.castShadow, userData: ud(o) });
      return;
    }
    if (!o.isMesh || !visibleUp(o)) return;
    if (o.isInstancedMesh) {
      const cnt = o.count != null ? o.count : 0;
      for (let i = 0; i < cnt; i++) { o.getMatrixAt(i, IM); M.multiplyMatrices(o.matrixWorld, IM); emit(o, M, 'M' + (n++), { instance: i }); }
      return;
    }
    emit(o, o.matrixWorld, 'M' + (n++));
  });

  // 3. The plan, for gaps and enclosures.
  const plan = { origin: { x: O.x, y: O.y, z: O.z }, floorY: tg.floorY, walk: tg.walk, zombieRect: tg.zombieRect, zombieRoom: tg.zombieRoom,
    stations: tg.stations, gate: tg.gate, spawn: tg.spawn, bed: tg.bed, solids: (tg.solids || []).length };
  try { const mod = await import(new URL('/world/training.js', location.origin).href); plan.TRAINING = JSON.parse(JSON.stringify(mod.TRAINING)); } catch (e) { notes.push('TRAINING: ' + e.message); }
  // The player: his standing height from the marine's own model.
  let player = null;
  try {
    T.player.updateMatrixWorld(true);
    const b = new THREE.Box3(), mb = new THREE.Box3(); let parts = 0;
    (T.marine || T.player).traverse((o) => { if (o.isMesh && visibleUp(o) && o.geometry) { mb.setFromObject(o); if (isFinite(mb.min.y)) { b.union(mb); parts++; } } });
    const p = T.player.position;
    player = { min: [b.min.x, b.min.y, b.min.z], max: [b.max.x, b.max.y, b.max.z], parts, at: [p.x, p.y, p.z], eyeY: 1.35 };
  } catch (e) { notes.push('player: ' + e.message); }
  // The collision solids (boxes, world) with their flags: walls, columns, the perimeter fence's runs ...
  plan.solidList = (tg.solids || []).map((s) => { const o = {}; for (const k of Object.keys(s)) { const v = s[k]; if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') o[k] = v; } return o; });

  // Triangles into one buffer, base64 in slices (run.mjs reads them).
  const all = new Float32Array(triTotal * 9); let at = 0;
  for (const a of triBuf) { all.set(a, at); at += a.length; }
  const bytes = new Uint8Array(all.buffer);
  window.__CF19 = { bytes, slice: (i, size) => { let s = ''; const end = Math.min(bytes.length, (i + 1) * size); for (let k = i * size; k < end; k += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(k, Math.min(end, k + 0x8000))); return btoa(s); } };
  return JSON.stringify({ ok: true, meshes, lights, plan, player, triTotal, bytes: bytes.length, notes, time: new Date().toISOString() });
})()
