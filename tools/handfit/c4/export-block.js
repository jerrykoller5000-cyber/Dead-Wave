const __exp = await (async () => {
const V = vm(); if (!V || !V.gun) return { key, err: 'no view gun' };
for (let i = 0; i < 3; i++) { T.stepFrame && T.stepFrame(0.0001); await new Promise((r) => requestAnimationFrame(r)); }
V.root.updateMatrixWorld(true);
const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
const b64 = (f32) => { const u = new Uint8Array(f32.buffer); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const parts = []; let ntri = 0;
const v = new (T.THREE || window.THREE).Vector3();
V.gun.root.traverse((m) => {
  if (!m.isMesh || !m.geometry || !m.geometry.attributes.position || !vis(m)) return;
  const pos = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : pos.count;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const j = idx ? idx.getX(i) : i; v.fromBufferAttribute(pos, j).applyMatrix4(m.matrixWorld); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
  ntri += n / 3; parts.push({ name: m.name || m.parent && m.parent.name || '?', tris: n / 3, b64: b64(out) });
});
const hands = {};
for (const sd of ['r', 'l']) {
  const A = V.arms && V.arms[sd]; if (!A) continue;
  const ms = A.meshes || {}; let mesh = null, which = null;
  for (const k of ['glove', 'bare']) if (ms[k] && vis(ms[k])) { mesh = ms[k]; which = k; break; }
  if (!mesh) { hands[sd] = { err: 'no visible hand' }; continue; }
  const pos = mesh.geometry.attributes.position, loc = new Float32Array(pos.count * 3), wor = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); loc[i * 3] = v.x; loc[i * 3 + 1] = v.y; loc[i * 3 + 2] = v.z; v.applyMatrix4(mesh.matrixWorld); wor[i * 3] = v.x; wor[i * 3 + 1] = v.y; wor[i * 3 + 2] = v.z; }
  const ix = mesh.geometry.index; hands[sd] = { which, n: pos.count, idx: ix ? b64(new Uint32Array(ix.array)) : null, mw: Array.from(mesh.matrixWorld.elements), side: A.layout.side, ox: A.layout.ox, gz: A.layout.gz, pose: A.rig && A.rig.pose ? JSON.parse(JSON.stringify(A.rig.pose)) : null, loc: b64(loc), wor: b64(wor) };
}
const __cam = (() => { let c = V.root; while (c && !c.isCamera) c = c.parent; c = c || T.camera || null; return c ? { mw: Array.from(c.matrixWorld.elements), fov: c.fov, aspect: c.aspect } : null; })(); const info = { cam: __cam, key, place: V.info.handPlace, ads: V.info.ads, raise: V.info.raise, ntri, parts: parts.length, hands: Object.fromEntries(Object.entries(hands).map(([k, h]) => [k, { which: h.which, n: h.n, err: h.err }])) };
return { ...info, __file: { [key + '.json']: { info, parts, hands } } };

})();