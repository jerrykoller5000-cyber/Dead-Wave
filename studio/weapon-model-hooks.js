// Render repeated props in one draw. Animation keeps its original logical nodes;
// each instance uses its own node's current transform and visibility.
const batchLists = new WeakMap();
const batchSlots = new WeakMap();

export function addArtworkInstances(T, gun, parent, name, entries) {
  const first = entries[0].mesh;
  const batch = new T.InstancedMesh(first.geometry, first.material, entries.length);
  batch.name = name;
  batch.castShadow = first.castShadow;
  batch.receiveShadow = first.receiveShadow;
  batch.frustumCulled = false;
  batch.userData.artworkSlots = entries.map(({anchor, mesh}, index) => {
    if (mesh.parent !== anchor || mesh.geometry !== first.geometry || mesh.material !== first.material) {
      throw new Error('Mixed geometry or material in artwork batch ' + name);
    }
    if (!anchor.name) anchor.name = name + '-slot-' + index;
    mesh.updateMatrix();
    anchor.remove(mesh);
    return {name: anchor.name, local: mesh.matrix.toArray()};
  });
  parent.add(batch);
  (gun.userData.artworkInstanceMeshes ||= []).push(batch);
  batchLists.delete(gun);
  updateArtworkInstances(T, gun);
  return batch;
}

export function updateArtworkInstances(T, root) {
  if (!root) return;
  let batches = batchLists.get(root);
  if (!batches) {
    batches = [];
    root.traverse(o => { if (o.isInstancedMesh && o.userData.artworkSlots) batches.push(o); });
    batchLists.set(root, batches);
  }
  for (const batch of batches) {
    let state = batchSlots.get(batch);
    if (!state) {
      const slots = batch.userData.artworkSlots.map(slot => {
        const node = batch.parent.getObjectByName(slot.name);
        if (!node) throw new Error('Missing artwork slot ' + slot.name);
        return {node, local: new T.Matrix4().fromArray(slot.local)};
      });
      state = {slots, matrix: new T.Matrix4()};
      batchSlots.set(batch, state);
    }
    let count = 0, changed = false;
    for (const slot of state.slots) {
      const matrix = state.matrix.copy(slot.local);
      let node = slot.node;
      while (node && node !== batch.parent && node.visible) {
        node.updateMatrix();
        matrix.premultiply(node.matrix);
        node = node.parent;
      }
      if (node !== batch.parent) continue;
      const start = count * 16;
      if (matrix.elements.some((v, k) => Math.fround(v) !== batch.instanceMatrix.array[start + k])) {
        batch.setMatrixAt(count, matrix);
        changed = true;
      }
      count++;
    }
    if (changed || count !== batch.count) {
      batch.count = count;
      batch.instanceMatrix.needsUpdate = true;
      batch.boundingBox = null;
      batch.boundingSphere = null;
    }
    batch.visible = count > 0;
  }
}

// Preserve a piece of artwork through the world and first-person mesh batches.
// The maps contain names so lookup always returns the current instance's node.
export function bindModelArtwork(gun, map, key, node) {
  const data = gun.userData;
  if (!node.name) node.name = map + '-' + key;
  (data[map] ||= {})[key] = node.name;
  (data.artworkNodes ||= []).push(node);
  node.userData.restPosition = node.position.toArray();
  node.userData.restQuaternion = node.quaternion.toArray();
  return node;
}

// These slab profiles start and end at their upper attachment. Use the middle
// of that edge as the animation origin in gun space. The authored surface is
// translated back by the same offset inside its new group.
export function addTriggerArtwork(gun, kit, outline, width, material, options) {
  const first = outline[0], last = outline[outline.length - 1];
  const y = (first[1] + last[1]) / 2, z = (first[0] + last[0]) / 2;
  const group = kit.group(0, y, z);
  const blade = kit.slab(outline, width, material, {...options, parent: group, y: -y, z: -z});
  gun.userData.triggerPin = group.position.toArray();
  bindModelArtwork(gun, 'controls', 'trigger', group);
  return blade;
}

// Place an art pivot at the centre of these sibling meshes without changing the
// rendered surface. Bounds are measured in their shared parent's coordinates.
export function groupArtwork(T, ...meshes) {
  const parent = meshes[0].parent;
  const group = new T.Group(), bounds = new T.Box3();
  for (const mesh of meshes) {
    if (mesh.parent !== parent) throw Error('Artwork meshes need a shared parent');
    mesh.updateMatrix();
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix));
  }
  bounds.getCenter(group.position);
  parent.add(group);
  for (const mesh of meshes) {
    mesh.position.sub(group.position);
    group.add(mesh);
  }
  return group;
}
