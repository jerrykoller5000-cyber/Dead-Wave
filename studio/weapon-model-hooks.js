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
