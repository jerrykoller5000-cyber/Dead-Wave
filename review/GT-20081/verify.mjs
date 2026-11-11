// Independently compare the GPU instance matrices to the logical pose in world space.
export function verifyArtworkInstances(T, root) {
  root.updateWorldMatrix(true, true);
  const result = {};
  root.traverse(draw => {
    const slots = draw.userData.artworkSlots;
    if (!draw.isInstancedMesh || !slots) return;
    const inverse = draw.parent.matrixWorld.clone().invert();
    let count = 0;
    for (const slot of slots) {
      const marker = draw.parent.getObjectByName(slot.name);
      if (!marker) throw Error('Missing logical artwork ' + slot.name);
      let ancestor = marker;
      while (ancestor && ancestor !== draw.parent && ancestor.visible) ancestor = ancestor.parent;
      if (ancestor !== draw.parent) continue;
      const expected = new T.Matrix4().multiplyMatrices(inverse, marker.matrixWorld);
      expected.multiply(new T.Matrix4().fromArray(slot.local));
      const actual = new T.Matrix4();
      draw.getMatrixAt(count, actual);
      const difference = Math.max(...actual.elements.map((v, i) => Math.abs(v - expected.elements[i])));
      if (difference > .00003) throw Error(draw.name + ' instance ' + count + ' transform differs by ' + difference);
      count++;
    }
    if (draw.count !== count || draw.visible !== (count > 0)) {
      throw Error(draw.name + ' should draw ' + count + ', got ' + draw.count + ', visible ' + draw.visible);
    }
    if (draw.instanceMatrix.array.length !== slots.length * 16) throw Error('Short instance buffer on ' + draw.name);
    result[draw.name] = count;
  });
  return result;
}

// Same-pose reference draw in the disposable game camera. The regular meshes follow
// the original animation nodes directly, independently of the instance-matrix updater.
const individualCopies = new WeakMap();
export function renderIndividualReference(T, root, enabled) {
  const draws=[];
  root.traverse(o=>{if(o.isInstancedMesh && o.userData.artworkSlots)draws.push(o)});
  for(const draw of draws){
    let copies=individualCopies.get(draw);
    if(!copies && enabled){
      copies=draw.userData.artworkSlots.map(slot=>{
        const node=draw.parent.getObjectByName(slot.name);
        const mesh=new T.Mesh(draw.geometry,draw.material);
        mesh.frustumCulled=false;mesh.renderOrder=draw.renderOrder;
        new T.Matrix4().fromArray(slot.local).decompose(mesh.position,mesh.quaternion,mesh.scale);
        node.add(mesh);return mesh;
      });
      individualCopies.set(draw,copies);
    }
    if(copies)for(const mesh of copies)mesh.visible=enabled;
    if(enabled)draw.visible=false;
  }
}

