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
