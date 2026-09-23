# Phase 1 #2 prep: mergeParts without per-vertex Vector3 calls. Same float operations in
# the same order as Vector3.applyMatrix4 / applyMatrix3 / normalize, so output is
# bit-identical; indexed geometry is read through its index instead of toNonIndexed().
import sys
src = open(sys.argv[1], encoding='utf-8').read()
old = """      for (const p of parts) {
        const geo = p.geometry.index ? p.geometry.toNonIndexed() : p.geometry;
        total += geo.attributes.position.count;
        prepared.push({ geo, mesh: p });
      }"""
new = """      for (const p of parts) {
        // Plain float attributes are read straight from their arrays (through the index
        // if there is one); anything else goes through toNonIndexed() and the slow path.
        const g = p.geometry, pa = g.attributes.position, na = g.attributes.normal, ix = g.index;
        const plain = (a) => !a || (a.isBufferAttribute && !a.isInterleavedBufferAttribute && !a.normalized && a.itemSize === 3 && a.array instanceof Float32Array);
        const fast = plain(pa) && plain(na) && (!ix || !ix.isInterleavedBufferAttribute);
        const geo = fast || !ix ? g : g.toNonIndexed();
        const count = fast && ix ? ix.count : geo.attributes.position.count;
        total += count;
        prepared.push({ geo, mesh: p, fast, count });
      }"""
assert src.count(old) == 1; src = src.replace(old, new)
old2 = """      for (const { geo, mesh } of prepared) {
        mesh.updateMatrix();
        _mpMat.copy(mesh.matrix);
        _mpNrm.getNormalMatrix(_mpMat);
        const pos = geo.attributes.position;
        const nrm = geo.attributes.normal;
        const col = mesh.material.color;
        for (let i = 0; i < pos.count; i++) {"""
new2 = """      for (const { geo, mesh, fast, count } of prepared) {
        mesh.updateMatrix();
        _mpMat.copy(mesh.matrix);
        _mpNrm.getNormalMatrix(_mpMat);
        const pos = geo.attributes.position;
        const nrm = geo.attributes.normal;
        const col = mesh.material.color;
        if (fast) {
          const P = pos.array, N = nrm ? nrm.array : null, I = geo.index ? geo.index.array : null;
          const e = _mpMat.elements, m = _mpNrm.elements;
          const cr = col.r, cg = col.g, cb = col.b;
          for (let i = 0; i < count; i++) {
            const w = (o + i) * 3, s = (I ? I[i] : i) * 3;
            const x = P[s], y = P[s + 1], z = P[s + 2];
            const iw = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
            positions[w] = (e[0] * x + e[4] * y + e[8] * z + e[12]) * iw;
            positions[w + 1] = (e[1] * x + e[5] * y + e[9] * z + e[13]) * iw;
            positions[w + 2] = (e[2] * x + e[6] * y + e[10] * z + e[14]) * iw;
            if (N) {
              const a = N[s], b = N[s + 1], c = N[s + 2];
              const nx = m[0] * a + m[3] * b + m[6] * c, ny = m[1] * a + m[4] * b + m[7] * c, nz = m[2] * a + m[5] * b + m[8] * c;
              const k = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
              normals[w] = nx * k; normals[w + 1] = ny * k; normals[w + 2] = nz * k;
            }
            colors[w] = cr; colors[w + 1] = cg; colors[w + 2] = cb;
          }
          o += count;
          continue;
        }
        for (let i = 0; i < pos.count; i++) {"""
assert src.count(old2) == 1; src = src.replace(old2, new2)
open(sys.argv[2], 'w', encoding='utf-8').write(src); print('ok')
