// game/barrel-heat.js - AG-290 (Jerry, 10 Nov; J131, J132): barrel heat.
//
// J131: "Slight smoke whisp effect from barrel of gun depending on how long you have been firing."
// J132: "For machine guns or extensive use of weapons have the barrel glow red and fade depending on it's use.
//        That would apply as well to suppressors when they are on."
//
// One heat value per gun in the hand: up with each shot (more for the minigun, the M240 and the flamer), down with time;
// it drives:
// (1) a thin smoke wisp off the muzzle after sustained fire, thicker and longer the hotter, drifting and gone in a few seconds;
// (2) the barrel glowing dull red to orange from the muzzle back, fading as it cools; with a suppressor fitted, the
//     suppressor glows and smokes instead.
//
// First and third person. Cheap: no new lights, one material uniform per gun.

export const HEAT_PER_SHOT = {
  m4: 0.038,
  ak: 0.040,
  pistol: 0.045,
  uzi: 0.032,
  shotgun: 0.085,
  aa12: 0.050,
  revolver: 0.060,
  sniper: 0.100,
  launcher: 0.075,
  minigun: 0.016,     // sustained fire: ~60 rounds reaches hot glow
  m240: 0.038,        // heavy machine gun
  flamer: 0.030,      // per fuel tick
  default: 0.040
};

// Base cooling rate per second: smooth exponential + linear cooling.
// At heat = 1.0, cools ~0.11/s; at heat = 0.5, cools ~0.08/s (approx 10-14s to return to stone cold).
export const COOLING_BASE = 0.055;
export const COOLING_EXP = 0.055;

// Heat threshold above which visible red glow begins (dull red).
export const GLOW_HEAT_THRESHOLD = 0.18;

// Heat threshold above which thin smoke wisps start drifting off the muzzle.
export const SMOKE_HEAT_THRESHOLD = 0.15;

/**
 * Maps heat [0, 1] to emissive glow color (hex) and intensity.
 * Below 0.18: zero glow.
 * 0.18 - 0.50: dull dark red to deep crimson.
 * 0.50 - 0.80: cherry red to red-orange.
 * 0.80 - 1.00: bright glowing orange-red to hot incandescent orange.
 */
export function getHeatGlow(heat) {
  if (heat <= GLOW_HEAT_THRESHOLD) {
    return { colorHex: 0x000000, r: 0, g: 0, b: 0, intensity: 0 };
  }
  const h = Math.min(1.0, Math.max(0.0, heat));

  if (h < 0.50) {
    const t = (h - GLOW_HEAT_THRESHOLD) / (0.50 - GLOW_HEAT_THRESHOLD);
    // 0x330400 (51, 4, 0) -> 0x990e00 (153, 14, 0)
    const r = Math.round(51 + t * (153 - 51));
    const g = Math.round(4 + t * (14 - 4));
    const b = 0;
    const colorHex = (r << 16) | (g << 8) | b;
    const intensity = 0.15 + t * 0.85; // 0.15 .. 1.0
    return { colorHex, r, g, b, intensity };
  } else if (h < 0.80) {
    const t = (h - 0.50) / (0.80 - 0.50);
    // 0x990e00 (153, 14, 0) -> 0xee2c00 (238, 44, 0)
    const r = Math.round(153 + t * (238 - 153));
    const g = Math.round(14 + t * (44 - 14));
    const b = 0;
    const colorHex = (r << 16) | (g << 8) | b;
    const intensity = 1.0 + t * 1.1; // 1.0 .. 2.1
    return { colorHex, r, g, b, intensity };
  } else {
    const t = (h - 0.80) / (1.0 - 0.80);
    // 0xee2c00 (238, 44, 0) -> 0xff6a00 (255, 106, 0)
    const r = Math.round(238 + t * (255 - 238));
    const g = Math.round(44 + t * (106 - 44));
    const b = Math.round(t * 8);
    const colorHex = (r << 16) | (g << 8) | b;
    const intensity = 2.1 + t * 1.2; // 2.1 .. 3.3
    return { colorHex, r, g, b, intensity };
  }
}

/**
 * Finds the barrel node and suppressor node on any weapon mesh instance (world or viewmodel copy).
 * Checks userData.heatParts first (ChatGPT 2's GT-20077 named bindings), then falls back to named nodes.
 */
export function findGunHeatParts(gunMesh, weaponKey = '') {
  if (!gunMesh) return { barrel: null, suppressor: null };
  let barrel = null;
  let suppressor = null;

  // 1. Direct userData.heatParts binding (GT-20077 / ChatGPT 2)
  if (gunMesh.userData && gunMesh.userData.heatParts) {
    const hp = gunMesh.userData.heatParts;
    if (hp.barrel) {
      const bName = typeof hp.barrel === 'string' ? hp.barrel : hp.barrel.name;
      if (bName) barrel = gunMesh.getObjectByName(bName);
    }
    if (hp.suppressor) {
      const sName = typeof hp.suppressor === 'string' ? hp.suppressor : hp.suppressor.name;
      if (sName) suppressor = gunMesh.getObjectByName(sName);
    }
  }

  // 2. Suppressor fallback
  if (!suppressor) {
    if (gunMesh.userData && gunMesh.userData.suppressor) {
      suppressor = gunMesh.userData.suppressor;
    } else {
      suppressor = gunMesh.getObjectByName('suppressor');
    }
  }

  // 3. Barrel fallback
  if (!barrel) {
    if (gunMesh.userData && gunMesh.userData.barrelAssembly) {
      barrel = gunMesh.userData.barrelAssembly;
    } else {
      const candidates = [
        'heatParts-barrel',
        'barrel',
        'barrelAssembly',
        'barrelMagazineClamp',
        'barrelPanel',
        'laserBarrel',
        'flamerNozzle',
        'bore'
      ];
      for (const name of candidates) {
        const found = gunMesh.getObjectByName(name);
        if (found) { barrel = found; break; }
      }
    }
  }

  // 4. Subtree search fallback: find mesh containing 'barrel' in name
  if (!barrel) {
    gunMesh.traverse((child) => {
      if (barrel) return;
      if (child.name && /barrel/i.test(child.name)) {
        barrel = child;
      }
    });
  }

  return { barrel, suppressor };
}

/**
 * Applies emissive glow to the target node hierarchy without creating materials per frame.
 * Clones the material once per mesh on first glow so other gun parts sharing standard mats are unaffected.
 */
export function applyGlowToNode(T, targetNode, glow, clearOtherNode = null) {
  if (clearOtherNode) {
    applyGlowToNode(T, clearOtherNode, { colorHex: 0x000000, intensity: 0 }, null);
  }
  if (!targetNode) return;

  targetNode.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (let i = 0; i < mats.length; i++) {
      let m = mats[i];
      if (!m) continue;

      // Clone once to isolate emissive uniform to this barrel/suppressor artwork only
      if (!m.userData || !m.userData._barrelHeatIsolated) {
        if (glow.intensity > 0) {
          m = m.clone();
          m.userData = m.userData ? { ...m.userData } : {};
          m.userData._barrelHeatIsolated = true;
          if (Array.isArray(obj.material)) obj.material[i] = m;
          else obj.material = m;
        }
      }

      if (m.emissive) {
        if (glow.intensity > 0) {
          m.emissive.setHex(glow.colorHex);
          m.emissiveIntensity = glow.intensity;
        } else {
          m.emissive.setHex(0x000000);
          m.emissiveIntensity = 0;
        }
      }
    }
  });
}

/**
 * Creates the complete barrel heat system.
 */
export function createBarrelHeat(ctx = {}) {
  const T = ctx.THREE || (typeof window !== 'undefined' ? window.THREE : null);
  const scene = ctx.scene || null;

  // State: heat value per weapon key [0, 1]
  const heatByWeapon = Object.create(null);

  // Smoke particles pool (zero garbage per frame)
  const MAX_WISPS = 36;
  const wisps = [];
  let wispGroup = null;
  let wispGeo = null;
  let wispSpawnTimer = 0;

  if (T && scene) {
    wispGroup = new T.Group();
    wispGroup.name = 'barrel-heat-wisps';
    scene.add(wispGroup);

    // Subtle 4-segment soft plane billboard for drifting wisps
    wispGeo = new T.PlaneGeometry(1, 1, 1, 1);

    for (let i = 0; i < MAX_WISPS; i++) {
      const mat = new T.MeshBasicMaterial({
        color: 0xd8d8d8,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      });
      const mesh = new T.Mesh(wispGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 3;
      wispGroup.add(mesh);

      wisps.push({
        mesh,
        mat,
        active: false,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        size: 0.03,
        grow: 0.06,
        age: 0,
        life: 1.8,
        maxOpacity: 0.25
      });
    }
  }

  // Scratch objects for zero allocations during updates
  const _scratchPos = T ? new T.Vector3() : null;
  const _scratchMuzzle = T ? new T.Vector3() : null;

  function getHeat(weaponKey) {
    return heatByWeapon[weaponKey] || 0.0;
  }

  function setHeat(weaponKey, val) {
    heatByWeapon[weaponKey] = Math.max(0.0, Math.min(1.0, +val || 0.0));
  }

  /**
   * Called when a weapon fires. Increments heat.
   * Special rates for minigun, m240, and flamer per Jerry's order (J131/J132).
   */
  function addShot(weaponKey = 'm4', isSuppressed = false, deltaMul = 1.0) {
    if (!weaponKey) return;
    const inc = (HEAT_PER_SHOT[weaponKey] || HEAT_PER_SHOT.default) * deltaMul;
    const cur = heatByWeapon[weaponKey] || 0.0;
    heatByWeapon[weaponKey] = Math.min(1.0, cur + inc);
  }

  /**
   * Spawns one smoke wisp from the given world muzzle position.
   */
  function spawnSmokeWisp(pos, heat) {
    if (!wisps.length || heat <= SMOKE_HEAT_THRESHOLD) return;
    let w = null;
    for (let i = 0; i < wisps.length; i++) {
      if (!wisps[i].active) { w = wisps[i]; break; }
    }
    if (!w) return; // Pool full

    const hNorm = (heat - SMOKE_HEAT_THRESHOLD) / (1.0 - SMOKE_HEAT_THRESHOLD);
    w.active = true;
    w.age = 0;
    w.life = 1.4 + hNorm * 1.4; // 1.4s .. 2.8s
    w.size = 0.018 + hNorm * 0.025; // initial size
    w.grow = 0.04 + hNorm * 0.08;   // size expansion rate
    w.maxOpacity = 0.16 + hNorm * 0.32; // peak opacity

    // Muzzle position with tiny jitter
    w.x = pos.x + (Math.random() - 0.5) * 0.008;
    w.y = pos.y + (Math.random() - 0.5) * 0.008;
    w.z = pos.z + (Math.random() - 0.5) * 0.008;

    // Upward drift + slight lazy wander
    w.vy = 0.16 + hNorm * 0.28; // drifts upward
    w.vx = (Math.random() - 0.5) * 0.04;
    w.vz = (Math.random() - 0.5) * 0.04;

    w.mesh.position.set(w.x, w.y, w.z);
    w.mesh.scale.set(w.size, w.size, 1);
    w.mat.opacity = 0.0;
    w.mesh.visible = true;
  }

  /**
   * Per-frame update: cools all weapon heats, updates smoke wisps, and updates visual glow.
   */
  function update(dt, state = {}) {
    const curW = state.currentWeapon || 'm4';
    const isSup = !!state.isSuppressed;
    const vm = state.viewmodel || null;
    const worldGun = state.weaponMesh || null;
    const cam = state.camera || null;

    // 1. Cool all weapons with time
    const keys = Object.keys(heatByWeapon);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const h = heatByWeapon[k];
      if (h > 0) {
        const decay = (COOLING_BASE + COOLING_EXP * h) * dt;
        heatByWeapon[k] = Math.max(0.0, h - decay);
      }
    }

    const curHeat = getHeat(curW);
    const glow = getHeatGlow(curHeat);

    // 2. Apply glow to first-person viewmodel gun (if active)
    if (T && vm && vm.info && vm.info.active) {
      // Find viewmodel active gun
      let vmGun = null;
      if (vm.root) {
        const space = vm.space || vm.root.getObjectByName('vm-space') || vm.root;
        const holder = space.getObjectByName('vm-gun');
        if (holder && holder.children.length > 0) vmGun = holder.children[0];
      }
      if (vmGun) {
        const parts = findGunHeatParts(vmGun, curW);
        if (isSup && parts.suppressor) {
          applyGlowToNode(T, parts.suppressor, glow, parts.barrel);
        } else if (parts.barrel) {
          applyGlowToNode(T, parts.barrel, glow, parts.suppressor);
        }
      }
    }

    // 3. Apply glow to third-person world gun
    if (T && worldGun) {
      const parts = findGunHeatParts(worldGun, curW);
      if (isSup && parts.suppressor) {
        applyGlowToNode(T, parts.suppressor, glow, parts.barrel);
      } else if (parts.barrel) {
        applyGlowToNode(T, parts.barrel, glow, parts.suppressor);
      }
    }

    // 4. Update and spawn smoke wisps
    if (T && wispGroup && curHeat > SMOKE_HEAT_THRESHOLD) {
      wispSpawnTimer -= dt;
      if (wispSpawnTimer <= 0) {
        // Spawn rate scales with heat: hotter -> more frequent wisps
        const hNorm = (curHeat - SMOKE_HEAT_THRESHOLD) / (1.0 - SMOKE_HEAT_THRESHOLD);
        wispSpawnTimer = 0.16 - hNorm * 0.11; // 0.16s down to 0.05s

        // Determine muzzle world point
        let muzzlePoint = null;
        if (vm && vm.info && vm.info.active && typeof vm.muzzleWorld === 'function') {
          muzzlePoint = vm.muzzleWorld(_scratchMuzzle);
        } else if (worldGun) {
          const ml = worldGun.userData && worldGun.userData.muzzleLocal;
          if (ml) {
            _scratchMuzzle.copy(ml);
            muzzlePoint = worldGun.localToWorld(_scratchMuzzle);
          } else if (typeof worldGun.getWorldPosition === 'function') {
            muzzlePoint = worldGun.getWorldPosition(_scratchMuzzle);
          } else {
            muzzlePoint = _scratchMuzzle.set(0, 0, 0);
          }
        }

        if (muzzlePoint) {
          spawnSmokeWisp(muzzlePoint, curHeat);
        }
      }
    }

    // 5. Simulate active smoke wisps
    if (wisps.length > 0) {
      for (let i = 0; i < wisps.length; i++) {
        const w = wisps[i];
        if (!w.active) continue;

        w.age += dt;
        if (w.age >= w.life) {
          w.active = false;
          w.mesh.visible = false;
          continue;
        }

        const prog = w.age / w.life; // 0 .. 1
        w.x += w.vx * dt;
        w.y += w.vy * dt;
        w.z += w.vz * dt;

        w.mesh.position.set(w.x, w.y, w.z);

        // Billboard orientation toward camera
        if (cam) {
          w.mesh.quaternion.copy(cam.quaternion);
        }

        // Particle growth and smooth bell-curve fade
        const s = w.size + w.grow * w.age;
        w.mesh.scale.set(s, s, 1);

        // Opacity: fade in during first 15%, fade out for remainder
        let alpha = 0;
        if (prog < 0.15) {
          alpha = (prog / 0.15) * w.maxOpacity;
        } else {
          alpha = (1.0 - (prog - 0.15) / 0.85) * w.maxOpacity;
        }
        w.mat.opacity = Math.max(0.0, alpha);
      }
    }
  }

  function reset() {
    for (const k in heatByWeapon) delete heatByWeapon[k];
    wispSpawnTimer = 0;
    for (let i = 0; i < wisps.length; i++) {
      wisps[i].active = false;
      if (wisps[i].mesh) wisps[i].mesh.visible = false;
    }
  }

  function dispose() {
    reset();
    if (wispGroup && wispGroup.parent) {
      wispGroup.parent.remove(wispGroup);
    }
    for (let i = 0; i < wisps.length; i++) {
      if (wisps[i].mat) wisps[i].mat.dispose?.();
    }
    if (wispGeo) wispGeo.dispose?.();
  }

  return {
    getHeat,
    setHeat,
    addShot,
    getHeatGlow,
    findGunHeatParts,
    update,
    reset,
    dispose,
    _heatByWeapon: heatByWeapon,
    _wisps: wisps
  };
}
