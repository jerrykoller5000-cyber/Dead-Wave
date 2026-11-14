// GP-20133: compile real cold/hot gun materials and every pooled heat-wisp material before play.
// The loader supplies the existing live-target compiler and its frame advance; no gameplay is stepped here.
const states = new WeakMap();
const skipMatrices = () => {};
export const FULL_AUTO_WARM = Object.freeze(['pistol', 'uzi', 'ak', 'm4', 'aa12', 'minigun']);
function proxyFor(T, state, source) {
  let mesh = state.proxies.get(source);
  if (!mesh) {
    mesh = source.isInstancedMesh ? new T.InstancedMesh(source.geometry, source.material, Math.max(1, source.instanceMatrix?.count || source.count)) : source.isSprite ? new T.Sprite(source.material) : new T.Mesh(source.geometry, source.material);
    state.proxies.set(source, mesh);
  }
  mesh.geometry = source.geometry; mesh.material = source.material;
  mesh.castShadow = !!source.castShadow; mesh.receiveShadow = !!source.receiveShadow;
  mesh.layers.mask = source.layers.mask; mesh.frustumCulled = false; mesh.visible = true;
  if (source.isInstancedMesh) { mesh.instanceMatrix = source.instanceMatrix; mesh.instanceColor = source.instanceColor; mesh.count = Math.max(1, source.count); }
  return mesh;
}
export async function warmWeaponFire({THREE:T, scene, heat, guns, offhand = {}, viewmodel = null, furniture = null, compile, draw, settle = async () => {}, keys = FULL_AUTO_WARM}) {
  if (!heat?.primeVisuals || typeof compile !== 'function' || typeof draw !== 'function') throw Error('Fire warm-up needs heat staging and the live renderer callbacks');
  let state = states.get(scene);
  if (!state) {
    const group = new T.Group(); group.name = 'weapon-fire-warm'; group.visible = false;
    group.userData.effectPooled = true; group.userData.pooled = true; scene.add(group);
    state = {group, proxies:new WeakMap(), update:group.updateMatrixWorld, busy:false}; states.set(scene,state);
  }
  if (state.busy) throw Error('Fire warm-up already running');
  state.busy = true;
  const group = state.group, previousVisible = group.visible, worlds = [];
  for (const key of keys) {
    if (guns?.[key]) worlds.push({key, root:guns[key], hand:0});
    if (offhand?.[key]) worlds.push({key, root:offhand[key], hand:1});
  }
  let worldStage = null, viewStage = null, vmWarm = null;
  try {
    worldStage = heat.primeVisuals(worlds);
    // Heat isolates a shared material once. Keep those exact material references in the existing
    // finish registry without re-registering (which would replace a painted gun's factory recipe).
    for (const {root} of worlds) root.traverse(o => {
      for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
        const list = furniture?.[m.userData?.gunPaintId];
        if (list && !list.includes(m)) list.push(m);
      }
    });
    if (viewmodel?.prepareWarmup) {
      vmWarm = viewmodel.prepareWarmup(keys);
      if (!Array.isArray(vmWarm?.heatEntries)) throw Error('View warm-up does not expose its cached heat records');
      await vmWarm.ready;
      viewStage = heat.primeVisuals(vmWarm.heatEntries);
    }
    group.clear(); group.visible = true; group.updateMatrixWorld = state.update;
    const seen = new Set();
    for (const source of [...worldStage.meshes, ...(viewStage?.meshes || [])]) {
      if (seen.has(source)) continue;
      seen.add(source); group.add(proxyFor(T,state,source));
    }
    group.updateMatrixWorld(true);
    await compile(group); await draw('fire-hot'); await settle();
    viewStage?.cleanup(); worldStage.cleanup();
    await compile(group); await draw('fire-cold'); await settle();
    return {weapons:worlds.map(g=>({key:g.key,hand:g.hand})), viewRecords:vmWarm?.heatEntries.length || 0, meshes:group.children.length};
  } finally {
    viewStage?.cleanup(); worldStage?.cleanup(); vmWarm?.restore?.();
    group.visible = previousVisible;
    if (!previousVisible) group.updateMatrixWorld = skipMatrices;
    state.busy = false;
  }
}

// Keep an anchor alive for a pooled effect's shared node-builder state, without walking it during play.
const effectStates = new WeakMap();
export async function warmPooledEffect({THREE:T, scene, key, create, compile, draw, settle = async () => {}}) {
  let pools = effectStates.get(scene);
  if (!pools) { pools = new Map(); effectStates.set(scene, pools); }
  let state = pools.get(key);
  if (!state) {
    const mesh = create(), group = new T.Group();
    group.name = 'fire-pool-warm:' + key; group.visible = false;
    mesh.frustumCulled = false; group.add(mesh);
    state = {group, mesh, busy:false}; pools.set(key, state);
  }
  if (state.busy) throw Error('Pooled effect warm-up already running: ' + key);
  state.busy = true;
  const {group, mesh} = state, side = mesh.material.side;
  try {
    group.visible = true; scene.add(group); group.updateMatrixWorld(true);
    // The real DoubleSide material lets the renderer prepare both front and back passes.
    await compile(group); await draw('fire-pool-' + key); await settle();
    return {meshes:1};
  } finally {
    mesh.material.side = side;
    group.visible = false; group.removeFromParent(); state.busy = false;
  }
}
