// GB-249: t93's extent() reads the drawn body. Exact-text edit; refuses unless the old block is there exactly once.
// Keeps the file's line endings and adds no BOM. Saves tools/tests/t93.js as t93.before.js beside this script first.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '..', '..', 'tools', 'tests', 't93.js');
const buf = fs.readFileSync(file);
if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) throw new Error('t93.js has a BOM; stopping');
let src = buf.toString('utf8');
// The file's own line endings are kept (CRLF throughout today): the blocks are matched and written with them.
const nCrlf = src.split('\r\n').length - 1, nLf = src.split('\n').length - 1, crlf = nCrlf > 0;
if (crlf && nCrlf !== nLf) throw new Error('t93.js mixes CRLF and LF; stopping');
const eol = (t) => (crlf ? t.split('\n').join('\r\n') : t);
const oldBlock = `  // Lowest / highest vertex (world y) under a node, skipping parts hidden or shrunk away.
  const extent = (root, node, wantMax) => {
    let v = wantMax ? -1e9 : 1e9;
    root.updateWorldMatrix(true, true);
    node.traverse((o) => {
      const pa = o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position;
      if (!pa) return;
      for (let q = o; q; q = q.parent) { if (q.visible === false || (q.scale && q.scale.y < 0.01)) return; }
      const e = o.matrixWorld.elements, a = pa.array;
      for (let j = 0; j < pa.count; j++) { const y = e[1] * a[j * 3] + e[5] * a[j * 3 + 1] + e[9] * a[j * 3 + 2] + e[13]; v = wantMax ? Math.max(v, y) : Math.min(v, y); }
    });
    return v;
  };
`;
const newBlock = `  // Lowest / highest vertex (world y) under a node, skipping parts hidden or shrunk away.
  // GB-249 (Claude's ruling (a), 2026-10-29): since CL-138's skinZombieMesh the body is drawn by one SkinnedMesh on the
  // zombie's root whose bones are the joint groups, and the original meshes stay in the tree hidden (userData.skinSrc),
  // so this walked past them and found no vertex at all (its 1e9 sentinel). It now reads what is drawn: every visible
  // plain mesh under the node as before, plus the skinned body's posed vertices whose heaviest bone is the node or under
  // it (GP-19924's join blend included); a bone shrunk away (a severed limb) still drops out.
  const isUnder = (b, node) => { for (let q = b; q; q = q.parent) if (q === node) return true; return false; };
  const gone = (o, vis) => { for (let q = o; q; q = q.parent) { if ((vis && q.visible === false) || (q.scale && q.scale.y < 0.01)) return true; } return false; };
  const extent = (root, node, wantMax) => {
    let v = wantMax ? -1e9 : 1e9;
    const take = (y) => { v = wantMax ? Math.max(v, y) : Math.min(v, y); };
    root.updateWorldMatrix(true, true);
    node.traverse((o) => {
      const pa = o.isMesh && !o.isSkinnedMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position;
      if (!pa || gone(o, true)) return;
      const e = o.matrixWorld.elements, a = pa.array;
      for (let j = 0; j < pa.count; j++) take(e[1] * a[j * 3] + e[5] * a[j * 3 + 1] + e[9] * a[j * 3 + 2] + e[13]);
    });
    const p = new root.position.constructor();
    root.traverse((s) => {
      const ga = s.isSkinnedMesh && s.skeleton && s.geometry && s.geometry.attributes;
      if (!ga || !ga.position || !ga.skinIndex || !ga.skinWeight || gone(s, true)) return;
      const mine = s.skeleton.bones.map((b) => !!b && isUnder(b, node) && !gone(b, false));
      if (!mine.some(Boolean)) return;
      const si = ga.skinIndex, sw = ga.skinWeight;
      const bn = s.skeleton.bones, inv = s.skeleton.boneInverses, M = new s.matrixWorld.constructor(), b0 = p.clone(), t = p.clone();
      const posed = typeof s.getVertexPosition === 'function' ? (j) => s.getVertexPosition(j, p)
        : typeof s.boneTransform === 'function' ? (j) => s.boneTransform(j, p.fromBufferAttribute(ga.position, j))
        : (j) => {   // a three without either: the same sum by hand
          b0.fromBufferAttribute(ga.position, j).applyMatrix4(s.bindMatrix); p.set(0, 0, 0);
          for (let c = 0; c < 4; c++) { const w = sw.array[j * sw.itemSize + c]; if (!w) continue; const k = si.array[j * si.itemSize + c]; M.multiplyMatrices(bn[k].matrixWorld, inv[k]); p.addScaledVector(t.copy(b0).applyMatrix4(M), w); }
          return p.applyMatrix4(s.bindMatrixInverse);
        };
      for (let j = 0; j < ga.position.count; j++) {
        let best = -1, bw = 0;
        for (let c = 0; c < 4; c++) { const w = sw.array[j * sw.itemSize + c]; if (w > bw) { bw = w; best = si.array[j * si.itemSize + c]; } }
        if (best < 0 || !mine[best]) continue;
        posed(j); p.applyMatrix4(s.matrixWorld); take(p.y);
      }
    });
    return v;
  };
`;
const oldB = eol(oldBlock), newB = eol(newBlock);
const n = src.split(oldB).length - 1;
if (n !== 1) throw new Error('old block found ' + n + ' times; stopping');
fs.copyFileSync(file, path.join(here, 't93.before.js'));
src = src.replace(oldB, () => newB);
fs.writeFileSync(file, src, 'utf8');
console.log('t93.js edited: extent() reads the drawn body (' + src.length + ' chars, line endings kept, no BOM)');
