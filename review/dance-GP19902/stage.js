// GP-19902: a small, deterministic presentation set for the live marine rig.
// Geometry and lighting are independent of the character and game state.
export function createDanceStage(THREE, scene) {
  const root = new THREE.Group();
  root.name = 'disclaimer-dance-stage';
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const ownGeometry = value => (geometries.add(value), value);
  const ownMaterial = value => (materials.add(value), value);
  const ownTexture = value => (textures.add(value), value);
  const canvas = (width, height = width) => {
    const value = document.createElement('canvas');
    value.width = width; value.height = height;
    return value;
  };
  const floorCanvas = canvas(1024), ctx = floorCanvas.getContext('2d');
  let seed = 19902;
  const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
  ctx.fillStyle = '#282c29'; ctx.fillRect(0, 0, 1024, 1024);
  // Wear is baked once, not a cloud of individual decal meshes.
  for (let i = 0; i < 3600; i++) {
    const light = random() > .5;
    ctx.fillStyle = light ? 'rgba(124,127,113,.055)' : 'rgba(0,0,0,.075)';
    const x = random() * 1024, y = random() * 1024;
    ctx.fillRect(x, y, 2 + random() * 26, .5 + random() * 2);
  }
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(6,10,9,.4)';
  for (const offset of [240, 512, 784]) {
    ctx.beginPath(); ctx.moveTo(offset, 0); ctx.lineTo(offset, 1024); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, offset); ctx.lineTo(1024, offset); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(191,146,51,.44)'; ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath(); ctx.arc(512, 512, 288, i * Math.PI / 4 + .045, (i + 1) * Math.PI / 4 - .045); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(183,144,56,.13)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(512, 512, 297, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 170; i++) {
    const angle = random() * Math.PI * 2, radius = 278 + random() * 25;
    ctx.fillStyle = 'rgba(40,44,41,.8)';
    ctx.fillRect(512 + Math.cos(angle) * radius, 512 + Math.sin(angle) * radius, 1 + random() * 6, 1 + random() * 3);
  }
  const floorMap = ownTexture(new THREE.CanvasTexture(floorCanvas));
  floorMap.colorSpace = THREE.SRGBColorSpace;
  floorMap.anisotropy = 4;
  const floorMaterial = ownMaterial(new THREE.MeshStandardMaterial({ map: floorMap, roughness: .91, metalness: .13, color: 0xc2c4bc }));
  const floor = new THREE.Mesh(ownGeometry(new THREE.CircleGeometry(4, 64)), floorMaterial);
  floor.name = 'cypher-floor'; floor.rotation.x = -Math.PI / 2; floor.position.y = -.025;
  floor.receiveShadow = true; root.add(floor);

  const steel = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x202722, roughness: .79, metalness: .48 }));
  const darkSteel = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x111918, roughness: .87, metalness: .32 }));
  const warmLens = ownMaterial(new THREE.MeshBasicMaterial({ color: 0xc3a774, toneMapped: false }));
  const coolLens = ownMaterial(new THREE.MeshBasicMaterial({ color: 0x658a91, toneMapped: false }));
  const box = (name, width, height, depth, material, x, y, z) => {
    const mesh = new THREE.Mesh(ownGeometry(new THREE.BoxGeometry(width, height, depth)), material);
    mesh.name = name; mesh.position.set(x, y, z); root.add(mesh); return mesh;
  };
  // Side architecture frames the act; the middle stays empty even during freezes.
  for (const side of [-1, 1]) {
    box('side-upright', .16, 2.6, .2, darkSteel, side * 3.15, 1.27, -2.25);
    box('side-foot', .5, .1, .58, steel, side * 3.15, .025, -2.25);
    box('low-flightcase', .76, .44, .62, steel, side * 2.75, .195, -2.8);
    box('case-edge', .79, .035, .65, darkSteel, side * 2.75, .43, -2.8);
    box('rim-lamp-housing', .105, 1.18, .13, steel, side * 2.88, .98, -2.05);
    box('rim-lamp-lens', .037, 1.04, .035, side < 0 ? warmLens : coolLens, side * 2.88, .98, -1.97);
  }

  const shadowCanvas = canvas(128), shadowCtx = shadowCanvas.getContext('2d');
  const gradient = shadowCtx.createRadialGradient(64, 64, 5, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0,0,0,.65)');
  gradient.addColorStop(.42, 'rgba(0,0,0,.32)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  shadowCtx.fillStyle = gradient; shadowCtx.fillRect(0, 0, 128, 128);
  const shadowMap = ownTexture(new THREE.CanvasTexture(shadowCanvas));
  const shadowMaterial = ownMaterial(new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, opacity: .5, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  const contact = new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(1, 1)), shadowMaterial);
  contact.name = 'dancer-contact-shadow'; contact.rotation.x = -Math.PI / 2;
  contact.position.y = -.018; contact.renderOrder = 1; root.add(contact);

  // Preserve woodland fabric values: broad neutral key, restrained colored edges.
  const fill = new THREE.HemisphereLight(0xd0d8d4, 0x1d2421, 1.4);
  const key = new THREE.DirectionalLight(0xffefd5, 2.45);
  key.position.set(-2.8, 5.2, 4.3); key.target.position.set(0, .65, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = -2.3; key.shadow.camera.right = 2.3;
  key.shadow.camera.top = 2.8; key.shadow.camera.bottom = -2;
  key.shadow.camera.near = .2; key.shadow.camera.far = 12;
  key.shadow.bias = -.0005; key.shadow.normalBias = .018; key.shadow.radius = 2;
  const warmRim = new THREE.DirectionalLight(0xffbd72, 1.05);
  warmRim.position.set(-3.5, 2.5, -2.8); warmRim.target.position.set(0, .8, 0);
  const coolRim = new THREE.DirectionalLight(0x9bbeca, 1.3);
  coolRim.position.set(3.2, 3, -2); coolRim.target.position.set(0, .8, 0);
  const lights = [fill, key, warmRim, coolRim];
  for (const light of lights) {
    scene.add(light);
    if (light.target) scene.add(light.target);
  }
  scene.add(root);
  let disposed = false;
  return {
    root, lights,
    update(time, beat = 0, hipPosition = null) {
      if (disposed) return;
      const x = Number.isFinite(hipPosition?.x) ? hipPosition.x : 0;
      const z = Number.isFinite(hipPosition?.z) ? hipPosition.z : 0;
      const height = Math.max(0, Number.isFinite(hipPosition?.y) ? hipPosition.y : .85);
      contact.position.set(x, -.018, z);
      // Groundwork broadens the silhouette; rising hops soften the contact.
      const spread = .78 + Math.min(1.3, height) * .38;
      contact.scale.set(spread, spread * .82, 1);
      shadowMaterial.opacity = Math.max(.19, .61 - height * .21);
      const phase = Number.isFinite(beat) ? beat - Math.floor(beat) : 0;
      const pulse = Math.pow(Math.max(0, 1 - phase * 4), 2);
      warmRim.intensity = 1.05 + pulse * .1;
      coolRim.intensity = 1.3 + pulse * .07;
    },
    dispose() {
      if (disposed) return;
      disposed = true; root.removeFromParent();
      for (const light of lights) {
        light.removeFromParent(); light.target?.removeFromParent(); light.dispose?.();
      }
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
    }
  };
}
