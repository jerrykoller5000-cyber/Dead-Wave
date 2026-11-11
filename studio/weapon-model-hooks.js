// Optional accessories keep a placement group on every copy. Their geometry and
// material variants are created only when that particular copy first shows them.
import {updateLightSwitch} from './weapon-light-switch.js';

const optionalTypes = new WeakMap();
const optionalState = new WeakMap();

export function optionalArtworkGroup(ctx, gun, name, build, fallbackFor = null) {
  const T = ctx.THREE;
  let Group = optionalTypes.get(T);
  if (!Group) {
    Group = class extends T.Group {
      constructor() {
        super();
        const state = {shown:false, build:null, fallbackFor:null};
        optionalState.set(this, state);
        Object.defineProperty(this, 'visible', {
          configurable:true, enumerable:true,
          get() { this.realizeFittedArtwork(); return state.shown; },
          set(value) { state.shown = !!value; this.realizeFittedArtwork(); }
        });
      }

      realizeFittedArtwork() {
        const state = optionalState.get(this);
        if (!state?.shown || !state.build) return;
        const gun = this.parent;
        // Shader warm-up temporarily shows every group. A mounted accessory is
        // requested by the fitting operation; a detached part can be inspected alone.
        if (state.fallbackFor) {
          if (!gun?.parent || gun.children.some(child => child.name === state.fallbackFor)) return;
        } else if (gun?.parent && !gun.userData.fittedOptic &&
                   !gun.children.some(child => child.name.startsWith('fitted-optic-'))) return;
        const stage = new T.Group();
        state.build(stage);
        this.add(...stage.children.slice());
        state.build = null;
      }

      traverse(callback) {
        this.realizeFittedArtwork();
        super.traverse(callback);
      }

      copy(source, recursive = true) {
        const target = optionalState.get(this), original = optionalState.get(source);
        target.build = null;
        super.copy(source, recursive);
        target.shown = source.visible;
        target.fallbackFor = original?.fallbackFor || null;
        target.build = original?.build || null;
        return this;
      }
    };
    optionalTypes.set(T, Group);
  }
  const group = new Group();
  group.name = name;
  const state = optionalState.get(group);
  state.fallbackFor = fallbackFor;
  state.shown = !!fallbackFor;
  state.build = stage => { build(stage); ctx.finishGun(stage); };
  gun.add(group);
  return group;
}

// Render repeated props in one draw. Animation keeps its original logical nodes;
// each instance uses its own node's current transform and visibility.
const batchLists = new WeakMap();
const batchSlots = new WeakMap();

export function addArtworkInstances(T, gun, parent, name, entries, {fixedCapacity=false}={}) {
  const first = entries[0].mesh;
  const batch = new T.InstancedMesh(first.geometry, first.material, entries.length);
  batch.name = name;
  batch.castShadow = first.castShadow;
  batch.receiveShadow = first.receiveShadow;
  batch.frustumCulled = false;
  if (fixedCapacity) batch.userData.artworkCapacity = entries.length;
  batch.userData.artworkSlots = entries.map(({anchor, mesh, gate, whenVisible=true}, index) => {
    if (mesh.parent !== anchor || mesh.geometry !== first.geometry || mesh.material !== first.material) {
      throw new Error('Mixed geometry or material in artwork batch ' + name);
    }
    if (!anchor.name) anchor.name = name + '-slot-' + index;
    anchor.userData.artworkSlot = anchor.name;
    mesh.updateMatrix();
    anchor.remove(mesh);
    const slot = {name: anchor.name, local: mesh.matrix.toArray()};
    if (gate) {
      if (!gate.name || gate.parent !== anchor) throw new Error('Invalid artwork switch in ' + name);
      gate.userData.artworkSlot = gate.name;
      slot.gate = gate.name;
      slot.whenVisible = whenVisible;
    }
    return slot;
  });
  parent.add(batch);
  (gun.userData.artworkInstanceMeshes ||= []).push(batch);
  batchLists.delete(gun);
  updateArtworkInstances(T, gun);
  return batch;
}

export function updateArtworkInstances(T, root) {
  if (!root) return;
  updateLightSwitch(T,root);
  let batches = batchLists.get(root);
  if (!batches) {
    batches = [];
    root.traverse(o => { if (o.isInstancedMesh && o.userData.artworkSlots) batches.push(o); });
    batchLists.set(root, batches);
  }
  for (const batch of batches) {
    let state = batchSlots.get(batch);
    if (!state) {
      const markers = new Map();
      batch.parent.traverse(node => {
        if (node.userData.artworkSlot) markers.set(node.userData.artworkSlot, node);
      });
      const slots = batch.userData.artworkSlots.map(slot => {
        const node = markers.get(slot.name);
        if (!node) throw new Error('Missing artwork slot ' + slot.name);
        const gate = slot.gate && markers.get(slot.gate);
        if (slot.gate && !gate) throw new Error('Missing artwork switch ' + slot.gate);
        return {node, gate, whenVisible: slot.whenVisible, local: new T.Matrix4().fromArray(slot.local)};
      });
      state = {slots, matrix: new T.Matrix4(), parked: new T.Matrix4().makeScale(0,0,0)};
      batchSlots.set(batch, state);
    }
    let count = 0, changed = false;
    for (const slot of state.slots) {
      if (slot.gate && slot.gate.visible !== slot.whenVisible) continue;
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
    // r175 sizes its per-instance shader buffer from the count at compilation.
    // An initially empty alternate appearance needs enough room for every slot
    // on its first draw. Trailing slots collapse to a point and draw no pixels.
    const drawCount = batch.userData.artworkCapacity || count;
    for (let i=count; i<drawCount; i++) {
      const start=i*16;
      if (state.parked.elements.some((v,k)=>v!==batch.instanceMatrix.array[start+k])) {
        batch.setMatrixAt(i,state.parked);
        changed=true;
      }
    }
    if (changed || drawCount !== batch.count) {
      batch.count = drawCount;
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
