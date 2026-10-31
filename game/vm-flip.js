// game/vm-flip.js - CL-281 (AG-168 v2): the view gun and arms drawn the right way out under the mirror.
// game/viewmodel.js shows his left-handed hold mirrored (VM.mirror: its space has scale.x = -1). A mirror turns every
// triangle's winding over on screen. three's WebGL backend flips the front face for a mesh whose matrix is mirrored
// (its determinant < 0); r175's WebGPU backend does not (WebGPUPipelineUtils._getPrimitiveState reads material.side
// only), so on WebGPU the view gun and arms were drawn inside out: their outer faces culled, their far walls shown and
// lit from behind (AG-168 v2's dark hands, fat sleeves and the ringed disc at the cuff).
//
// The fix, for the WebGPU backend only: each mirrored mesh draws a twin of its geometry whose triangles run the other
// way. The twin shares every attribute with the original (the hand rig's and the wrist bridge's writes show in both),
// so it costs one index buffer. Normals are left as they are: the mirror's normal matrix already turns them out the
// right side, and the GPU's front face (and so the lighting's face direction) is right again once the winding is.
// computeVertexNormals on a twin runs on its original (a twin's own winding would turn the normals inward).

const TWIN = Symbol('vmFlipTwin');

// The twin of geo with its winding reversed (cached on the original; the same twin every call while the original's
// index and vertex count are unchanged). A twin passed in comes back as it is.
export function flippedTwin(T, geo) {
  if (!geo || !geo.attributes || !geo.attributes.position) return geo;
  if (geo.userData && geo.userData.vmFlipOf) return geo;
  const idx = geo.index, count = idx ? idx.count : geo.attributes.position.count;
  const stamp = (idx ? idx.uuid || idx.id || 'i' : 'n') + ':' + (idx ? idx.version : 0) + ':' + count + ':' + geo.attributes.position.count;
  const have = geo[TWIN];
  if (have && have.stamp === stamp) { syncTwin(have.twin, geo); return have.twin; }
  const tw = new T.BufferGeometry();
  tw.name = (geo.name || 'geometry') + '-vmflip';
  for (const k of Object.keys(geo.attributes)) tw.setAttribute(k, geo.attributes[k]);
  for (const k of Object.keys(geo.morphAttributes || {})) tw.morphAttributes[k] = geo.morphAttributes[k];
  tw.morphTargetsRelative = !!geo.morphTargetsRelative;
  const n = count - (count % 3), verts = geo.attributes.position.count;
  const out = verts > 65535 ? new Uint32Array(n) : new Uint16Array(n);
  const src = idx ? idx.array : null;
  for (let i = 0; i < n; i += 3) {
    const a = src ? src[i] : i, b = src ? src[i + 1] : i + 1, c = src ? src[i + 2] : i + 2;
    out[i] = a; out[i + 1] = c; out[i + 2] = b;
  }
  tw.setIndex(new T.BufferAttribute(out, 1));
  syncTwin(tw, geo);
  tw.userData.vmFlipOf = geo;
  tw.computeVertexNormals = () => { geo.computeVertexNormals(); return tw; };
  geo[TWIN] = { twin: tw, stamp };
  return tw;
}
function syncTwin(tw, geo) {
  if (tw.groups.length !== geo.groups.length || tw.groups.some((g, i) => g.start !== geo.groups[i].start || g.count !== geo.groups[i].count || g.materialIndex !== geo.groups[i].materialIndex)) {
    tw.clearGroups();
    for (const g of geo.groups) tw.addGroup(g.start, g.count, g.materialIndex);
  }
  tw.drawRange.start = geo.drawRange.start; tw.drawRange.count = geo.drawRange.count;
  if (geo.boundingSphere) tw.boundingSphere = geo.boundingSphere;
  if (geo.boundingBox) tw.boundingBox = geo.boundingBox;
}
// The original of a twin (or geo itself).
export function originalOf(geo) { return (geo && geo.userData && geo.userData.vmFlipOf) || geo; }

// Does this renderer need the twins? Only the WebGPU backend under a mirror (the WebGL backend flips the front face
// itself, so a twin there would turn the faces over twice).
export function needsFlip(renderer, mirrored) {
  return !!mirrored && !!(renderer && renderer.backend && renderer.backend.isWebGPUBackend);
}
