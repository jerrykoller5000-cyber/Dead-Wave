// GB-185 proposal for tools/tests/fakethree.mjs (Cursor's file; not applied by Grokbot).
// Today Raycaster.intersectObject(s) return [] and Mesh.raycast is empty, so since GP-19885 (rounds and the cursor
// use the posed body surface, game/zombie-headshots.js zombieSurface) no round can hit a zombie in the suite.
// A real ray-vs-triangle test over each mesh's position attribute (indexed or not), in world space:
//
// export class Raycaster { ...
//   intersectObject(o, recursive = true, out = []) { rcVisit(this, o, recursive, out); out.sort((a, b) => a.distance - b.distance); return out; }
//   intersectObjects(list, recursive = true, out = []) { for (const o of list) rcVisit(this, o, recursive, out); out.sort((a, b) => a.distance - b.distance); return out; }
// }
// function rcVisit(rc, o, rec, out) { if (o.layers?.test && rc.layers && !o.layers.test(rc.layers)) return; if (o.raycast) o.raycast(rc, out); if (rec) for (const c of o.children) rcVisit(rc, c, rec, out); }
//
// Mesh.raycast(rc, out) {
//   const P = this.geometry?.attributes?.position; if (!P || !P.count) return;
//   const I = this.geometry.index, n = I ? I.count : P.count, m = this.matrixWorld, o = rc.ray.origin, d = rc.ray.direction;
//   const a = new Vector3(), b = new Vector3(), c = new Vector3(), e1 = new Vector3(), e2 = new Vector3(), p = new Vector3(), q = new Vector3(), s = new Vector3();
//   const at = (v, k) => { const i = I ? I.getX(k) : k; v.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(m); };
//   for (let k = 0; k + 2 < n; k += 3) {
//     at(a, k); at(b, k + 1); at(c, k + 2);
//     e1.subVectors(b, a); e2.subVectors(c, a); p.crossVectors(d, e2); const det = e1.dot(p); if (Math.abs(det) < 1e-12) continue;
//     const inv = 1 / det; s.subVectors(o, a); const u = s.dot(p) * inv; if (u < 0 || u > 1) continue;
//     q.crossVectors(s, e1); const v = d.dot(q) * inv; if (v < 0 || u + v > 1) continue;
//     const t = e2.dot(q) * inv; if (t < rc.near || t > rc.far) continue;
//     out.push({ distance: t, point: o.clone().addScaledVector(d, t), object: this, faceIndex: k / 3 });
//   }
// }
// Notes: keep SkinnedMesh/InstancedMesh as they are (zombieSurface skips them). Geometries without a position
// attribute in the fake (if any of the body part primitives build none) would still be missed: check
// DWInspect-free with a shambler that zombieSurface returns non-null in a headless page.
