// game/barrel-heat.js - AG-290 (Jerry, 10 Nov; J131, J132): barrel heat.
//
// J131: "Slight smoke whisp effect from barrel of gun depending on how long you have been firing."
// J132: "For machine guns or extensive use of weapons have the barrel glow red and fade depending on it's use.
//        That would apply as well to suppressors when they are on."
//
// Calibration (Jerry, 10 Nov; Director review 11 Nov):
// - Machine guns and extensive use: a rifle does NOT glow after one magazine (30 rounds).
// - Minigun is quickest to glow (~1.1 s of continuous spinning fire; 55 rounds).
// - Heat colour ramp: dull deep crimson -> cherry red -> incandescent red-orange only when very hot.
// - Daylight attenuation: glow is significantly fainter under daylight than at night.
// - Gradient falloff: barrel is brightest at the hottest core and fades along the length.
// - Visible muzzle smoke plume: soft drifting slate-smoke wisps rising off the muzzle/can.
// - Suppressor isolation: when a suppressor is fitted, only the can glows and smokes; barrel behind stays cold.

export const GLOW_HEAT_THRESHOLD = 0.18;
export const SMOKE_HEAT_THRESHOLD = 0.10;

// Heat per shot calibrated so:
// - A 30-round rifle magazine (M4/AK) generates ~0.114-0.120 heat (starts smoke wisps, NO barrel glow).
// - Steady fire of 45-50 rounds (1.5 - 1.7 mags) reaches 0.180 (begins dull red glow).
// - Minigun fires at 50 rounds/s; reaches 0.18 glow threshold after 55 rounds (~1.1 s of continuous fire).
export const HEAT_PER_SHOT = {
  m4: 0.0038,        // 30 rounds (1 mag) = 0.114 (smoke, no glow); 48 rounds = 0.182 (starts dull red glow)
  ak: 0.0040,        // 30 rounds = 0.120 (no glow); 45 rounds = 0.180 (starts dull red glow)
  pistol: 0.0052,    // 17 rounds (1 mag) = 0.088; 35 rounds (2+ mags) = 0.182
  uzi: 0.0035,       // 32 rounds (1 mag) = 0.112; 52 rounds = 0.182
  shotgun: 0.0140,   // 8 rounds (1 tube) = 0.112; 13 rounds = 0.182
  aa12: 0.0055,      // 20 rounds (1 drum) = 0.110; 33 rounds = 0.1815
  revolver: 0.0085,  // 6 rounds (1 cylinder) = 0.051; 22 rounds = 0.187
  sniper: 0.0220,    // 5 rounds = 0.110; 9 rounds = 0.198
  launcher: 0.0320,  // heavy round; 6 rounds = 0.192
  minigun: 0.0033,   // 50 rounds/s: 55 rounds (1.1 s continuous) = 0.1815 (quickest to glow!)
  m240: 0.0040,      // 45 rounds (~3.6 s burst) = 0.180
  flamer: 0.0400,    // per second of continuous fuel burn; 4.5 s = 0.180
  default: 0.0040
};

// Base cooling rate per second: smooth exponential + linear cooling.
// At heat = 1.0, cools ~0.08/s; at heat = 0.5, cools ~0.06/s (approx 12-16s to return to stone cold).
export const COOLING_BASE = 0.040;
export const COOLING_EXP = 0.040;

/**
 * Maps heat [0, 1] to emissive glow color (hex) and intensity, attenuated by daylight.
 * Below 0.18: zero glow.
 * 0.18 - 0.50: dull dark red to deep crimson.
 * 0.50 - 0.82: rich cherry red to crimson.
 * 0.82 - 1.00: glowing red-orange to incandescent orange only when very hot.
 * daylightFactor [0, 1]: 0 at night (full intensity), 1 at noon (subtle deep heat tint, ~28% intensity).
 */
export function getHeatGlow(heat, daylightFactor = 0) {
  if (heat <= GLOW_HEAT_THRESHOLD) {
    return { colorHex: 0x000000, r: 0, g: 0, b: 0, intensity: 0 };
  }
  const h = Math.min(1.0, Math.max(0.0, heat));
  let r = 0, g = 0, b = 0, baseIntensity = 0;

  if (h < 0.50) {
    const t = (h - GLOW_HEAT_THRESHOLD) / (0.50 - GLOW_HEAT_THRESHOLD);
    // Dull dark wine red to deep crimson
    r = Math.round(55 + t * (155 - 55));
    g = Math.round(3 + t * (12 - 3));
    b = 0;
    baseIntensity = 0.20 + t * 0.75; // 0.20 .. 0.95
  } else if (h < 0.82) {
    const t = (h - 0.50) / (0.82 - 0.50);
    // Deep crimson to vibrant cherry red
    r = Math.round(155 + t * (235 - 155));
    g = Math.round(12 + t * (36 - 12));
    b = 0;
    baseIntensity = 0.95 + t * 0.90; // 0.95 .. 1.85
  } else {
    const t = (h - 0.82) / (1.00 - 0.82);
    // Cherry red transitioning to glowing red-orange only when very hot (0.82 .. 1.0)
    r = Math.round(235 + t * (255 - 235));
    g = Math.round(36 + t * (88 - 36));
    b = Math.round(t * 6);
    baseIntensity = 1.85 + t * 0.95; // 1.85 .. 2.80
  }

  // Daylight attenuation: hot incandescent steel is much fainter in bright sunlight than in the dark
  const day = Math.min(1.0, Math.max(0.0, +daylightFactor || 0.0));
  const dayAtten = 1.0 - day * 0.72; // at noon (1.0), intensity is 28% of night value
  const intensity = baseIntensity * dayAtten;
  const colorHex = (r << 16) | (g << 8) | b;

  return { colorHex, r, g, b, intensity, baseIntensity };
}

/**
 * Cached 1D heat gradient DataTexture to give spatial falloff along the barrel/can:
 * brightest where the barrel is hottest (mid-barrel/gas block), fading along the length.
 */
let _heatGradientTex = null;
export function getHeatGradientTexture(T) {
  if (_heatGradientTex) return _heatGradientTex;
  if (!T || typeof T.DataTexture !== 'function' || T.RGBAFormat == null) return null;
  const w = 64, h = 4;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1); // 0 at breech/chamber, 1 at muzzle
      // Hottest at mid-barrel core (u around 0.52), smooth falloff toward chamber and muzzle crown
      const dist = (u - 0.52) / 0.32;
      const falloff = Math.exp(-0.5 * dist * dist);
      // Brightness multiplier: ~0.18 at cooler ends, 1.0 at hottest core
      const factor = 0.18 + 0.82 * falloff;
      const idx = (y * w + x) * 4;
      data[idx] = Math.round(factor * 255);
      data[idx + 1] = Math.round(Math.pow(factor, 1.4) * 255);
      data[idx + 2] = Math.round(Math.pow(factor, 2.2) * 255);
      data[idx + 3] = 255;
    }
  }
  _heatGradientTex = new T.DataTexture(data, w, h, T.RGBAFormat);
  _heatGradientTex.needsUpdate = true;
  return _heatGradientTex;
}

/**
 * Generates Z-length UVs for meshes lacking UV coordinates so the heat gradient texture maps along the length.
 */
function ensureLengthUVs(T, geo) {
  if (!geo || !geo.attributes || !geo.attributes.position) return;
  if (geo.attributes.uv) return;
  const pos = geo.attributes.position;
  const count = pos.count;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < count; i++) {
    const z = pos.getZ(i);
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const span = Math.max(1e-4, maxZ - minZ);
  const uvs = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const z = pos.getZ(i);
    uvs[i * 2] = (z - minZ) / span;
    uvs[i * 2 + 1] = 0.5;
  }
  geo.setAttribute('uv', new T.BufferAttribute(uvs, 2));
}

/**
 * Finds the barrel node and suppressor node on any weapon mesh instance (world or viewmodel copy).
 * Checks userData.heatParts first (ChatGPT 2's GT-20077 named bindings, including on srcGun when resolving a lean viewmodel clone),
 * then falls back to named nodes and kept-child correspondence.
 */
export function findGunHeatParts(gunMesh, weaponKey = '', srcGun = null) {
  if (!gunMesh) return { barrel: null, suppressor: null };
  let barrel = null;
  let suppressor = null;

  // 1. Direct userData.heatParts binding (GT-20077 / ChatGPT 2) on gunMesh or srcGun
  const hp = (gunMesh.userData && gunMesh.userData.heatParts) || (srcGun && srcGun.userData && srcGun.userData.heatParts) || null;
  if (hp) {
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
      suppressor = gunMesh.getObjectByName('suppressor') || gunMesh.getObjectByName('heatParts-suppressor');
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
        'flamerNozzle',
        'bore'
      ];
      for (const name of candidates) {
        const found = gunMesh.getObjectByName(name);
        if (found) { barrel = found; break; }
      }
    }
  }

  // 4. Subtree search fallback: find mesh containing 'barrel' in name (strictly ignoring lasers/beams)
  if (!barrel) {
    gunMesh.traverse((child) => {
      if (barrel) return;
      if (child.name && /barrel/i.test(child.name) && !/laser|beam|light|flash/i.test(child.name)) {
        barrel = child;
      }
    });
  }

  // 5. Lean viewmodel clone correspondence (e.g. minigun unnamed barrelAssembly Group)
  if (srcGun && srcGun !== gunMesh && (!barrel || !suppressor)) {
    const srcParts = findGunHeatParts(srcGun, weaponKey, null);
    const skipLaser = srcGun.userData && srcGun.userData.laser;
    const keptChildren = srcGun.children ? srcGun.children.filter((c) => !c.isLight && !c.isCamera && c !== skipLaser) : [];
    if (!barrel && srcParts.barrel) {
      if (srcParts.barrel.name) {
        barrel = gunMesh.getObjectByName(srcParts.barrel.name);
      }
      if (!barrel && srcParts.barrel.parent === srcGun && gunMesh.children) {
        const idx = keptChildren.indexOf(srcParts.barrel);
        if (idx >= 0 && gunMesh.children[idx]) barrel = gunMesh.children[idx];
      }
    }
    if (!suppressor && srcParts.suppressor) {
      if (srcParts.suppressor.name) {
        suppressor = gunMesh.getObjectByName(srcParts.suppressor.name);
      }
      if (!suppressor && srcParts.suppressor.parent === srcGun && gunMesh.children) {
        const idx = keptChildren.indexOf(srcParts.suppressor);
        if (idx >= 0 && gunMesh.children[idx]) suppressor = gunMesh.children[idx];
      }
    }
  }

  return { barrel, suppressor };
}

/**
 * Applies emissive glow to the target node hierarchy without creating materials per frame.
 * Clones the material once per mesh on first glow so other gun parts sharing standard mats are unaffected.
 * Applies length-wise heat gradient map so the glow is brightest at the hottest core and fades along the barrel.
 */
export function applyGlowToNode(T, targetNode, glow, clearOtherNode = null, opts = null) {
  let clonedCount = 0;
  if (clearOtherNode) {
    const sub = applyGlowToNode(T, clearOtherNode, { colorHex: 0x000000, intensity: 0 }, null, opts);
    clonedCount += sub.clonedCount;
  }
  if (!targetNode) return { clonedCount };

  const isVmCopy = !!(opts && opts.isVmCopy);
  const worldClonedThisFrame = !!(opts && opts.worldClonedThisFrame);
  const gradTex = glow.intensity > 0 ? getHeatGradientTexture(T) : null;

  targetNode.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    // Strict guard: NEVER touch laser beams, flash cones, or lights
    if (obj.name && /laser|beam|flash|light/i.test(obj.name)) return;
    if (obj.userData && (obj.userData.laser || obj.userData.isLaserBeam || obj.userData.flash)) return;

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (let i = 0; i < mats.length; i++) {
      let m = mats[i];
      if (!m) continue;

      // Clone once to isolate emissive uniform to this barrel/suppressor artwork only.
      if (!m.userData || !m.userData._barrelHeatIsolated) {
        if (glow.intensity > 0) {
          if (isVmCopy && m.userData && m.userData.vm281 && !worldClonedThisFrame) {
            m.userData._barrelHeatIsolated = true;
          } else {
            m = m.clone();
            m.userData = m.userData ? { ...m.userData } : {};
            m.userData._barrelHeatIsolated = true;
            if (Array.isArray(obj.material)) obj.material[i] = m;
            else obj.material = m;
            clonedCount++;
          }
        }
      }

      if (m.emissive) {
        if (glow.intensity > 0) {
          if (m.emissiveNode) {
            m.userData = m.userData || {};
            m.userData._savedEmissiveNode = m.emissiveNode;
            m.emissiveNode = null;
            m.needsUpdate = true;
          }
          if (gradTex && T) {
            ensureLengthUVs(T, obj.geometry);
            if (m.emissiveMap !== gradTex) {
              m.emissiveMap = gradTex;
              m.needsUpdate = true;
            }
          }
          m.emissive.setHex(glow.colorHex);
          m.emissiveIntensity = glow.intensity;
        } else {
          if (m.userData && m.userData._savedEmissiveNode && !m.emissiveNode) {
            m.emissiveNode = m.userData._savedEmissiveNode;
            delete m.userData._savedEmissiveNode;
            m.needsUpdate = true;
          }
          if (m.emissiveMap) {
            m.emissiveMap = null;
            m.needsUpdate = true;
          }
          m.emissive.setHex(0x000000);
          m.emissiveIntensity = 0;
        }
      }
    }
  });

  return { clonedCount };
}

/**
 * Creates a soft smoky wisp billboard texture (smoky gray with vertical wispy core).
 */
function makeWispTexture(T) {
  if (!T || typeof T.DataTexture !== 'function' || T.RGBAFormat == null) return null;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const half = (size - 1) * 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x - half) / half;
      const ny = (y - half) / half;
      const r2 = nx * nx * 1.8 + ny * ny * 0.8;
      const r = Math.sqrt(r2);
      let a = 0.0;
      if (r < 1.0) {
        a = Math.exp(-r2 * 2.8) * Math.pow(1.0 - r, 0.85);
      }
      const idx = (y * size + x) * 4;
      data[idx] = 160;     // Soft slate smoky gray
      data[idx + 1] = 168;
      data[idx + 2] = 180;
      data[idx + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
  }
  const tex = new T.DataTexture(data, size, size, T.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
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
  const MAX_WISPS = 48;
  const wisps = [];
  let wispGroup = null;
  let wispGeo = null;
  let wispTex = null;
  let wispSpawnTimer = 0;

  if (T && scene) {
    wispGroup = new T.Group();
    wispGroup.name = 'barrel-heat-wisps';
    wispGroup.userData = { effectPooled: true };
    scene.add(wispGroup);

    wispGeo = new T.PlaneGeometry(1, 1, 1, 1);
    wispTex = makeWispTexture(T);

    for (let i = 0; i < MAX_WISPS; i++) {
      const matOpts = {
        color: 0x98a2b0,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      };
      if (wispTex) matOpts.map = wispTex;
      const mat = new T.MeshBasicMaterial(matOpts);
      const mesh = new T.Mesh(wispGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 999; // Render in front of world & weapon geometry
      wispGroup.add(mesh);

      wisps.push({
        mesh,
        mat,
        active: false,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        phase: i * 1.618,
        size: 0.045,
        grow: 0.09,
        age: 0,
        life: 2.2,
        maxOpacity: 0.65
      });
    }
  }

  // Scratch objects for zero allocations during updates
  const _scratchMuzzle = T ? new T.Vector3() : null;

  function getHeat(weaponKey) {
    return heatByWeapon[weaponKey] || 0.0;
  }

  function setHeat(weaponKey, val) {
    heatByWeapon[weaponKey] = Math.max(0.0, Math.min(1.0, +val || 0.0));
  }

  /**
   * Called when a weapon fires. Increments heat.
   * Special calibrated rates per Jerry's order and Director review (J131/J132).
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
    w.life = 1.8 + hNorm * 1.6; // 1.8s .. 3.4s
    w.size = 0.042 + hNorm * 0.050; // initial puff diameter (4.2 cm .. 9.2 cm)
    w.grow = 0.080 + hNorm * 0.120; // expansion rate as smoke rises
    w.maxOpacity = 0.52 + hNorm * 0.38; // 0.52 .. 0.90 (clearly visible smoke)

    // Muzzle position with tiny jitter
    w.x = pos.x + (Math.random() - 0.5) * 0.008;
    w.y = pos.y + (Math.random() - 0.5) * 0.008;
    w.z = pos.z + (Math.random() - 0.5) * 0.008;

    // Upward drift + lazy sinusoidal curling
    w.vy = 0.28 + hNorm * 0.26; // 28 cm/s .. 54 cm/s rising plume
    w.vx = (Math.random() - 0.5) * 0.045;
    w.vz = (Math.random() - 0.5) * 0.045;

    w.mesh.position.set(w.x, w.y, w.z);
    w.mesh.scale.set(w.size * 0.70, w.size * 2.2, 1);
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

    // Detect first-person vs third-person viewpoint
    const isFirstPerson = (state.viewFirst !== undefined)
      ? !!state.viewFirst
      : (typeof window !== 'undefined' && window.TT && window.TT.fpDbg ? window.TT.fpDbg().first : (vm && vm.info && vm.info.active));

    // Resolve daylightFactor for natural ambient attenuation
    let daylightFactor = 0.0;
    if (state.daylightFactor !== undefined) {
      daylightFactor = state.daylightFactor;
    } else if (typeof window !== 'undefined' && window.eyeLight) {
      const el = window.eyeLight;
      daylightFactor = (el === 'noon') ? 1.0 : (el === 'overcast' ? 0.85 : (el === 'dusk' ? 0.40 : 0.0));
    } else if (state.isNight !== undefined) {
      daylightFactor = state.isNight ? 0.0 : 1.0;
    }

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
    const glow = getHeatGlow(curHeat, daylightFactor);

    // 2. Apply glow to third-person world gun first (isolates source materials once so viewmodel mirrors cleanly)
    let worldClonedThisFrame = false;
    if (T && worldGun) {
      const parts = findGunHeatParts(worldGun, curW, null);
      let res;
      if (isSup && parts.suppressor) {
        res = applyGlowToNode(T, parts.suppressor, glow, parts.barrel);
      } else if (parts.barrel) {
        res = applyGlowToNode(T, parts.barrel, glow, parts.suppressor);
      }
      if (res && res.clonedCount > 0) worldClonedThisFrame = true;
    }

    // 3. Apply glow to first-person viewmodel gun (if active)
    if (T && vm && vm.info && vm.info.active) {
      let vmGun = null;
      if (vm.root) {
        const space = vm.space || vm.root.getObjectByName('vm-space') || vm.root;
        const holder = space.getObjectByName('vm-gun');
        if (holder && holder.children.length > 0) vmGun = holder.children[0];
      }
      if (vmGun) {
        const parts = findGunHeatParts(vmGun, curW, worldGun);
        const vmOpts = { isVmCopy: true, worldClonedThisFrame };
        if (isSup && parts.suppressor) {
          applyGlowToNode(T, parts.suppressor, glow, parts.barrel, vmOpts);
        } else if (parts.barrel) {
          applyGlowToNode(T, parts.barrel, glow, parts.suppressor, vmOpts);
        }
      }
    }

    // 4. Update and spawn smoke wisps
    if (T && wispGroup && curHeat > SMOKE_HEAT_THRESHOLD) {
      wispSpawnTimer -= dt;
      if (wispSpawnTimer <= 0) {
        // Spawn rate scales with heat: hotter -> more frequent wisps (24/s up to 55/s)
        const hNorm = (curHeat - SMOKE_HEAT_THRESHOLD) / (1.0 - SMOKE_HEAT_THRESHOLD);
        wispSpawnTimer = 0.042 - hNorm * 0.024;

        // Determine muzzle world point strictly according to active viewpoint
        let muzzlePoint = null;
        if (isFirstPerson && vm && vm.info && vm.info.active && typeof vm.muzzleWorld === 'function') {
          muzzlePoint = vm.muzzleWorld(_scratchMuzzle);
        } else if (typeof state.getMuzzleWorld === 'function') {
          muzzlePoint = state.getMuzzleWorld();
        } else if (worldGun) {
          if (typeof worldGun.updateWorldMatrix === 'function') {
            worldGun.updateWorldMatrix(true, false);
          }
          const ml = (worldGun.userData && worldGun.userData.muzzleLocal) || null;
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
        const curlX = Math.sin(w.age * 2.8 + w.phase) * 0.030;
        const curlZ = Math.cos(w.age * 2.4 + w.phase) * 0.030;
        w.x += (w.vx + curlX) * dt;
        w.y += w.vy * dt;
        w.z += (w.vz + curlZ) * dt;

        w.mesh.position.set(w.x, w.y, w.z);

        // Billboard orientation toward camera
        if (cam) {
          w.mesh.quaternion.copy(cam.quaternion);
        }

        // Particle growth (thin rising ribbon) and smooth fade
        const s = w.size + w.grow * w.age;
        w.mesh.scale.set(s * 0.70, s * 2.2, 1);

        // Opacity: fade in during first 12%, gradual fade out for remainder
        let alpha = 0;
        if (prog < 0.12) {
          alpha = (prog / 0.12) * w.maxOpacity;
        } else {
          alpha = (1.0 - (prog - 0.12) / 0.88) * w.maxOpacity;
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
    const wm = ctx.weaponMeshes || (typeof window !== 'undefined' && window.TT && window.TT.weaponMeshes) || null;
    if (T && wm) {
      for (const k in wm) {
        const gun = wm[k];
        if (!gun) continue;
        const parts = findGunHeatParts(gun, k, null);
        if (parts.barrel) applyGlowToNode(T, parts.barrel, { colorHex: 0, intensity: 0 });
        if (parts.suppressor) applyGlowToNode(T, parts.suppressor, { colorHex: 0, intensity: 0 });
      }
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
    if (wispTex) wispTex.dispose?.();
  }

  return {
    getHeat,
    setHeat,
    addShot,
    getHeatGlow,
    getHeatGradientTexture,
    findGunHeatParts,
    applyGlowToNode,
    update,
    reset,
    dispose,
    _wispGroup: wispGroup,
    _heatByWeapon: heatByWeapon,
    _wisps: wisps
  };
}
