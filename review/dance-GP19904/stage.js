// GP-19903: graphic silhouette pass. The GP-19902 set remains intact for comparison.
// This presentation owns its material clones and lights; it never alters game materials.
export function createDanceStage(THREE, scene, overrides = {}) {
  const tuning = {
    actorColor: 0x30383f,
    ambient: .20,
    front: 1.20,
    coolRim: 12,
    amberRim: 9,
    pulse: .055,
    floorOpacity: 1,
    ...overrides
  };
  const root = new THREE.Group();
  root.name = 'disclaimer-silhouette-stage';
  const materials = new Set(), textures = new Set(), geometries = new Set();
  const actorMaterials = new Map(), actorMeshes = new Map(), actorLights = new Map();
  const material = value => (materials.add(value), value);
  const texture = value => (textures.add(value), value);
  const geometry = value => (geometries.add(value), value);
  const makeCanvas = size => {
    const value = document.createElement('canvas'); value.width = value.height = size;
    return value;
  };
  // One very faint pool defines ground without exposing a tiled room or clothing.
  const floorCanvas = makeCanvas(512), ctx = floorCanvas.getContext('2d');
  const pool = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  pool.addColorStop(0, '#182129');
  pool.addColorStop(.48, '#101820');
  pool.addColorStop(.82, '#070c12');
  pool.addColorStop(1, '#020406');
  ctx.fillStyle = pool; ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(102,81,48,.13)'; ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath(); ctx.arc(256, 256, 145, i * Math.PI / 4 + .1, (i + 1) * Math.PI / 4 - .1); ctx.stroke();
  }
  const floorTexture = texture(new THREE.CanvasTexture(floorCanvas));
  floorTexture.colorSpace = THREE.SRGBColorSpace;
  const floorMaterial = material(new THREE.MeshBasicMaterial({
    map: floorTexture, toneMapped: false, transparent: true, opacity: tuning.floorOpacity
  }));
  const floor = new THREE.Mesh(geometry(new THREE.CircleGeometry(4, 64)), floorMaterial);
  floor.name = 'silhouette-floor-pool'; floor.rotation.x = -Math.PI / 2; floor.position.y = -.025;
  root.add(floor);

  const shadowCanvas = makeCanvas(128), shadowCtx = shadowCanvas.getContext('2d');
  const shadowGradient = shadowCtx.createRadialGradient(64, 64, 4, 64, 64, 64);
  shadowGradient.addColorStop(0, 'rgba(0,0,0,.95)');
  shadowGradient.addColorStop(.42, 'rgba(0,0,0,.55)');
  shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
  shadowCtx.fillStyle = shadowGradient; shadowCtx.fillRect(0, 0, 128, 128);
  const shadowMaterial = material(new THREE.MeshBasicMaterial({
    map: texture(new THREE.CanvasTexture(shadowCanvas)), transparent: true,
    opacity: .65, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
  }));
  const contact = new THREE.Mesh(geometry(new THREE.PlaneGeometry(1, 1)), shadowMaterial);
  contact.name = 'silhouette-contact'; contact.rotation.x = -Math.PI / 2;
  contact.position.y = -.018; contact.renderOrder = 1; root.add(contact);

  const ambient = new THREE.HemisphereLight(0x71879a, 0x020304, tuning.ambient);
  const front = new THREE.DirectionalLight(0x71879a, tuning.front);
  front.position.set(-1, 3.6, 4); front.target.position.set(0, .8, 0);
  const cool = new THREE.DirectionalLight(0x6ac9ed, tuning.coolRim);
  cool.position.set(-3, 1.85, -2.6); cool.target.position.set(0, .78, 0);
  const amber = new THREE.DirectionalLight(0xffba6c, tuning.amberRim);
  amber.position.set(2.6, 2.25, -2.9); amber.target.position.set(0, .78, 0);
  const lights = [ambient, front, cool, amber];
  for (const light of lights) {
    scene.add(light); if (light.target) scene.add(light.target);
  }
  scene.add(root);
  let disposed = false;

  const cloneActorMaterial = original => {
    if (!original?.clone) return original;
    if (actorMaterials.has(original)) return actorMaterials.get(original);
    const copy = original.clone();
    copy.name = `dance-silhouette:${original.name || original.type || 'material'}`;
    copy.color?.setHex(tuning.actorColor);
    // Retain alpha masks where geometry needs them, but remove visible patterns.
    for (const key of ['map', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap',
      'emissiveMap', 'lightMap', 'aoMap', 'envMap', 'specularMap', 'specularColorMap',
      'specularIntensityMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
      'sheenColorMap', 'sheenRoughnessMap', 'iridescenceMap', 'iridescenceThicknessMap']) {
      if (key in copy) copy[key] = null;
    }
    copy.emissive?.setHex(0);
    copy.specular?.setHex(0);
    copy.specularColor?.setHex(0);
    for (const key of ['emissiveIntensity', 'metalness', 'envMapIntensity', 'clearcoat',
      'sheen', 'iridescence', 'transmission', 'reflectivity', 'specularIntensity']) {
      if (key in copy) copy[key] = 0;
    }
    if ('roughness' in copy) copy.roughness = 1;
    if ('shininess' in copy) copy.shininess = 0;
    if ('vertexColors' in copy) copy.vertexColors = false;
    copy.toneMapped = true;
    copy.needsUpdate = true;
    actorMaterials.set(original, copy); materials.add(copy);
    return copy;
  };

  function configureActor(marine) {
    if (disposed) throw new Error('Cannot configure an actor after the stage is disposed');
    if (!marine?.traverse) throw new TypeError('configureActor expects an Object3D marine');
    marine.traverse(object => {
      if (object.isLight && !actorLights.has(object)) {
        actorLights.set(object, object.intensity); object.intensity = 0;
      }
      if (!object.isMesh || !object.material || actorMeshes.has(object)) return;
      const original = object.material;
      const replacement = Array.isArray(original) ? original.map(cloneActorMaterial) : cloneActorMaterial(original);
      actorMeshes.set(object, { original, replacement }); object.material = replacement;
    });
    return { meshes: actorMeshes.size, materials: actorMaterials.size };
  }

  function setLighting(values = {}) {
    for (const key of ['ambient', 'front', 'coolRim', 'amberRim', 'pulse', 'floorOpacity']) {
      if (Number.isFinite(values[key])) tuning[key] = Math.max(0, values[key]);
    }
    if (Number.isInteger(values.actorColor)) {
      tuning.actorColor = values.actorColor;
      for (const copy of actorMaterials.values()) copy.color?.setHex(tuning.actorColor);
    }
    ambient.intensity = tuning.ambient; front.intensity = tuning.front;
    cool.intensity = tuning.coolRim; amber.intensity = tuning.amberRim;
    floorMaterial.opacity = Math.min(1, tuning.floorOpacity);
  }

  return {
    root, lights, tuning, configureActor, setLighting,
    update(time, beat = 0, hipPosition = null) {
      if (disposed) return;
      const x = Number.isFinite(hipPosition?.x) ? hipPosition.x : 0;
      const z = Number.isFinite(hipPosition?.z) ? hipPosition.z : 0;
      const height = Math.max(0, Number.isFinite(hipPosition?.y) ? hipPosition.y : .85);
      contact.position.set(x, -.018, z);
      const spread = .78 + Math.min(1.3, height) * .38;
      contact.scale.set(spread, spread * .82, 1);
      shadowMaterial.opacity = Math.max(.28, .74 - height * .21);
      const phase = Number.isFinite(beat) ? beat - Math.floor(beat) : 0;
      const accent = Math.pow(Math.max(0, 1 - phase * 3), 2) * tuning.pulse;
      cool.intensity = tuning.coolRim * (1 + accent);
      amber.intensity = tuning.amberRim * (1 + accent * .7);
    },
    dispose() {
      if (disposed) return;
      disposed = true; root.removeFromParent();
      for (const [mesh, { original, replacement }] of actorMeshes) {
        if (mesh.material === replacement) mesh.material = original;
      }
      for (const [light, intensity] of actorLights) light.intensity = intensity;
      for (const light of lights) {
        light.removeFromParent(); light.target?.removeFromParent(); light.dispose?.();
      }
      for (const value of geometries) value.dispose();
      for (const value of materials) value.dispose();
      for (const value of textures) value.dispose();
      actorMeshes.clear(); actorMaterials.clear(); actorLights.clear();
    }
  };
}
