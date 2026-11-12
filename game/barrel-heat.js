// game/barrel-heat.js - AG-290 (Jerry, 10 Nov; J131, J132): barrel heat.
//
// J131: "Slight smoke whisp effect from barrel of gun depending on how long you have been firing."
// J132: "For machine guns or extensive use of weapons have the barrel glow red and fade depending on it's use.
//        That would apply as well to suppressors when they are on."
//
// One heat value per gun in the hand: up with each shot (quickest on minigun, M240, and flamer; rifles need >1 mag),
// down with time; it drives:
// (1) a thin smoke wisp rising off the muzzle and drifting, stronger the longer it fired;
// (2) a blackbody heat colour ramp (dull dark red -> cherry red -> cherry-orange only when very hot), brightest at
//     the barrel/suppressor hot zone and fading along its length, and much fainter in daylight than at night;
//     with a suppressor fitted, the suppressor glows and smokes instead while the barrel stays cool.
//
// First and third person. Cheap: no new lights, shared static axial LUT textures, zero per-frame allocations.

export const HEAT_PER_SHOT = {
  minigun: 0.0110,    // quickest: ~28 rds (~1.8s at 15 rps) starts dull-red glow; ~68 rds cherry; ~104 rds hot
  m240: 0.0125,       // belt HMG: ~26 rds (~2.5s) starts dull-red glow; ~66 rds cherry; ~122 rds hot
  flamer: 0.0110,     // fuel ticks: ~29 ticks (~2.2s) starts dull-red nozzle glow
  m4: 0.0098,         // 30-rd mag reaches ~0.21 (smoke wisp only, 0 glow); ~44 rds (1.5 mags) starts dull red
  ak: 0.0110,         // 30-rd mag reaches ~0.23 (smoke wisp only, 0 glow); ~41 rds (1.4 mags) starts dull red
  uzi: 0.0080,        // 32-rd mag reaches ~0.19 (smoke wisp only, 0 glow); ~50 rds (1.6 mags) starts dull red
  aa12: 0.0160,       // 20-rd drum reaches ~0.22 (smoke wisp only, 0 glow); ~32 shells (1.6 drums) starts dull red
  pistol: 0.0190,     // 12-rd mag reaches ~0.15 (faint smoke, 0 glow); ~31 rds (2.6 mags) starts dull red
  revolver: 0.0280,   // 6-rd cylinder reaches ~0.11; ~36 rds continuous starts dull red
  shotgun: 0.0360,    // 8-rd tube reaches ~0.15 (smoke wisp); ~22 shells continuous starts dull red
  sniper: 0.0540,     // 5-rd mag reaches ~0.17 (smoke wisp); ~14 rds continuous starts dull red
  launcher: 0.0320,   // 6-rd drum reaches ~0.12; ~35 rds continuous starts dull red
  default: 0.0110
};

// Smooth exponential + linear cooling (~15-18s from red-hot back to stone cold).
export const COOLING_BASE = 0.024;
export const COOLING_EXP = 0.042;

// Heat threshold above which visible dull-red glow begins (rifles after 1 mag stay below 0.25 -> smoke only).
export const GLOW_HEAT_THRESHOLD = 0.25;

// Heat threshold above which thin smoke wisps begin rising off the muzzle.
export const SMOKE_HEAT_THRESHOLD = 0.12;

// J145: scale the whole warm-to-hot lifetime curve together.
const WISP_LIFETIME_SCALE = 0.66;

function clamp01(v) {
  return v <= 0 ? 0 : (v >= 1 ? 1 : v);
}

function smoothstep(e0, e1, x) {
  const t = clamp01((x - e0) / Math.max(1e-6, e1 - e0));
  return t * t * (3 - 2 * t);
}

/**
 * Maps heat [0, 1] and ambient daylight [0 = night, 1 = bright noon] to blackbody glow color & intensity.
 * - <= 0.25: zero glow (cold/warm dark steel; smoke wisps start above 0.12).
 * - 0.25 .. 0.55: dull dark blood red (#4c0400 -> #980b00).
 * - 0.55 .. 0.82: deep cherry red (#980b00 -> #da1e02).
 * - 0.82 .. 1.00: hot cherry-orange (#da1e02 -> #f6580c) only when very hot.
 * Daylight scales intensity down to 0.25x at Noon vs 1.00x at Night so sunlit steel never looks like flat orange paint.
 */
export function getHeatGlow(heat, daylight = 0) {
  const d = clamp01(+daylight || 0);
  const daylightMul = 1.0 - 0.75 * d; // 1.00 at night -> 0.25 in bright noon sun
  if (heat <= GLOW_HEAT_THRESHOLD) {
    return { colorHex: 0x000000, r: 0, g: 0, b: 0, intensity: 0, baseIntensity: 0, daylightMul };
  }
  const h = clamp01(heat);
  let r = 0, g = 0, b = 0, baseIntensity = 0;

  if (h < 0.55) {
    const t = (h - GLOW_HEAT_THRESHOLD) / (0.55 - GLOW_HEAT_THRESHOLD);
    r = Math.round(76 + t * (152 - 76));
    g = Math.round(4 + t * (11 - 4));
    b = 0;
    baseIntensity = 0.16 + t * 0.56; // 0.16 .. 0.72
  } else if (h < 0.82) {
    const t = (h - 0.55) / (0.82 - 0.55);
    r = Math.round(152 + t * (218 - 152));
    g = Math.round(11 + t * (30 - 11));
    b = Math.round(t * 2);
    baseIntensity = 0.72 + t * 0.58; // 0.72 .. 1.30
  } else {
    const t = (h - 0.82) / (1.0 - 0.82);
    r = Math.round(218 + t * (246 - 218));
    g = Math.round(30 + t * (88 - 30));
    b = Math.round(2 + t * 10);
    baseIntensity = 1.30 + t * 0.50; // 1.30 .. 1.80
  }

  const colorHex = (r << 16) | (g << 8) | b;
  const intensity = baseIntensity * daylightMul;
  return { colorHex, r, g, b, intensity, baseIntensity, daylightMul };
}

// Shared axial emissiveMap textures per THREE instance (one for barrels, one for suppressors).
const _gradTexCache = new WeakMap();

function barrelAxialProfile(u) {
  // Cold at chamber / barrel nut (u <= 0.24), peaking at gas-block / forward throat (0.64..0.75),
  // and fading steadily down the exposed barrel toward the muzzle device (0.75..1.00 -> 0.15).
  if (u <= 0.24) return 0.0;
  if (u <= 0.66) return smoothstep(0.24, 0.66, u);
  if (u <= 0.75) return 1.0;
  return 0.15 + 0.85 * Math.pow(1.0 - smoothstep(0.75, 1.0, u), 1.18);
}

function suppressorAxialProfile(u) {
  // Cooler at rear mount collar (0..0.10), hottest across middle-forward baffles (0.40..0.70),
  // and tapering darker toward the front endcap (0.70..1.00 -> 0.14).
  if (u <= 0.10) return 0.06 + 0.20 * (u / 0.10);
  if (u <= 0.42) return 0.26 + 0.74 * smoothstep(0.10, 0.42, u);
  if (u <= 0.70) return 1.0;
  return 0.14 + 0.86 * Math.pow(1.0 - smoothstep(0.70, 1.0, u), 1.22);
}

export function getHeatGradientTexture(T, kind = 'barrel') {
  return getHeatGradientTex(T, kind);
}

function getHeatGradientTex(T, kind = 'barrel', maskRubber = false) {
  if (!T || typeof T.DataTexture !== 'function') return null;
  let entry = _gradTexCache.get(T);
  if (!entry) {
    entry = { barrel: null, suppressor: null };
    _gradTexCache.set(T, entry);
  }
  const slot = kind === 'suppressor' ? 'suppressor' : 'barrel';
  const key = maskRubber ? slot + '-masked' : slot;
  if (entry[key]) return entry[key];

  const W = 64, H = 4;
  const data = new Uint8Array(W * H * 4);
  const profFn = slot === 'suppressor' ? suppressorAxialProfile : barrelAxialProfile;
  for (let x = 0; x < W; x++) {
    const u = x / (W - 1);
    const p = clamp01(profFn(u));
    // Blackbody chromatic shift along the barrel: green/blue fall off much steeper than red,
    // so only the hottest zone stays cherry-orange while shoulders shift through cherry & dull red to cold steel.
    const rByte = Math.round(255 * Math.pow(p, 0.92));
    const gByte = Math.round(255 * Math.pow(p, 2.30));
    const bByte = Math.round(255 * Math.pow(p, 4.00));
    for (let y = 0; y < H; y++) {
      const idx = (y * W + x) * 4;
      // Packed rubber and bore inserts sample the dark row. Hot metal samples the middle rows.
      const dark = maskRubber && y === 0;
      data[idx] = dark ? 0 : rByte;
      data[idx + 1] = dark ? 0 : gByte;
      data[idx + 2] = dark ? 0 : bByte;
      data[idx + 3] = 255;
    }
  }
  const tex = T.RGBAFormat != null
    ? new T.DataTexture(data, W, H, T.RGBAFormat)
    : new T.DataTexture(data, W, H);
  tex.channel = 1; // reads uv1 so weapon camo textures on uv (channel 0) are untouched
  if (T.ClampToEdgeWrapping != null) {
    tex.wrapS = T.ClampToEdgeWrapping;
    tex.wrapT = T.ClampToEdgeWrapping;
  }
  if (T.LinearFilter != null) {
    tex.magFilter = T.LinearFilter;
    tex.minFilter = T.LinearFilter;
  }
  if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  tex.needsUpdate = true;
  entry[key] = tex;
  return tex;
}

// A folded draw keeps each original surface's roughness and metalness in foldRM.
const pairedFinishes = new Set(['pistol', 'uzi', 'revolver']);
const packedHeatSurfaces = new WeakMap();
function isPackedMetal(rm, i) {
  return rm.getX(i) < 0.84999 || rm.getY(i) > 0.05001;
}
function hasPackedMetal(rm) {
  const cached = packedHeatSurfaces.get(rm);
  if (cached && cached.version === rm.version) return cached.hot;
  let hot = false;
  for (let i = 0; i < rm.count && !hot; i++) hot = isPackedMetal(rm, i);
  packedHeatSurfaces.set(rm, {version: rm.version, hot});
  return hot;
}

function shouldMeshGlow(obj, mat, hasNonVC, usePackedFinish) {
  if (!obj || !obj.isMesh || !mat || !mat.emissive) return false;
  if (obj.name === 'bore') return false;
  const rm = usePackedFinish && obj.geometry?.attributes?.foldRM;
  if (rm) return hasPackedMetal(rm);
  // Exclude dark rubber / matte bore-hole discs (e.g. suppressor front bore insert, roughness >= 0.85, metalness <= 0.05)
  if (typeof mat.roughness === 'number' && typeof mat.metalness === 'number' && mat.roughness >= 0.85 && mat.metalness <= 0.05) {
    return false;
  }
  // On multi-mesh rotary assemblies (minigun), gunBodyVC (vertexColors: true) holds the retaining clamp collars,
  // central spindle, and dark muzzle tips, while gunAccent (!vertexColors) holds the 6 rotary barrel tubes.
  if (hasNonVC && mat.vertexColors) return false;
  return true;
}

function ensureAxialUv1OnTarget(T, targetNode, usePackedFinish) {
  if (!T || !targetNode || typeof T.Matrix4 !== 'function' || typeof T.Vector3 !== 'function' || typeof T.BufferAttribute !== 'function') return;
  let hasNonVC = false;
  targetNode.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) {
      if (m && m.emissive && !m.vertexColors && !(m.roughness >= 0.85 && m.metalness <= 0.05)) hasNonVC = true;
    }
  });

  // Check if every eligible mesh already has uv1 prepared
  let allReady = true;
  targetNode.traverse((o) => {
    if (!allReady || !o.isMesh || !o.geometry || !o.material) return;
    const m0 = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!shouldMeshGlow(o, m0, hasNonVC, usePackedFinish)) return;
    if (!o.geometry.attributes || !o.geometry.attributes.uv1) allReady = false;
  });
  if (allReady) return;

  const relMat = new T.Matrix4();
  const v = new T.Vector3();
  const meshEntries = [];
  let zMin = Infinity, zMax = -Infinity;

  targetNode.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position || !o.material) return;
    const m0 = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!shouldMeshGlow(o, m0, hasNonVC, usePackedFinish)) return;

    relMat.identity();
    let p = o;
    while (p && p !== targetNode) {
      if (typeof p.updateMatrix === 'function') p.updateMatrix();
      if (p.matrix) relMat.premultiply(p.matrix);
      p = p.parent;
    }
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(relMat);
      if (v.z < zMin) zMin = v.z;
      if (v.z > zMax) zMax = v.z;
    }
    meshEntries.push({ mesh: o, mat: relMat.clone() });
  });

  if (!meshEntries.length || !isFinite(zMin) || !isFinite(zMax)) return;
  const span = Math.max(1e-4, zMax - zMin);

  for (let k = 0; k < meshEntries.length; k++) {
    const { mesh, mat } = meshEntries[k];
    const srcGeo = mesh.geometry;
    if (srcGeo.attributes && srcGeo.attributes.uv1) continue;
    const baseGeo = (srcGeo.userData && srcGeo.userData.vmFlipOf) || srcGeo;
    let uvAttr = baseGeo.attributes && baseGeo.attributes.uv1;
    if (!uvAttr) {
      const pos = baseGeo.attributes.position;
      const uv1 = new Float32Array(pos.count * 2);
      const rm = usePackedFinish && baseGeo.attributes.foldRM;
      for (let i = 0; i < pos.count; i++) {
        v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mat);
        uv1[i * 2] = clamp01((v.z - zMin) / span);
        uv1[i * 2 + 1] = rm && !isPackedMetal(rm, i) ? 0 : 0.5;
      }
      uvAttr = new T.BufferAttribute(uv1, 2);
      if (typeof baseGeo.clone === 'function' && !(srcGeo.userData && srcGeo.userData.vmFlipOf)) {
        const clonedGeo = baseGeo.clone();
        clonedGeo.setAttribute('uv1', uvAttr);
        mesh.geometry = clonedGeo;
        continue;
      }
      baseGeo.setAttribute('uv1', uvAttr);
    }
    if (mesh.geometry !== baseGeo && mesh.geometry.setAttribute) {
      mesh.geometry.setAttribute('uv1', uvAttr);
    }
  }
}

/**
 * Finds the real barrel node and suppressor node on any weapon mesh instance (world or viewmodel copy).
 * Checks userData.heatParts first (ChatGPT 2's GT-20077 named bindings), then userData.barrel / barrelAssembly,
 * then exact named nodes and lean-viewmodel correspondence. Never touches laser beams, muzzle flashes, or sights.
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
      else if (hp.barrel.isObject3D && gunMesh === (srcGun || gunMesh)) barrel = hp.barrel;
    }
    if (hp.suppressor) {
      const sName = typeof hp.suppressor === 'string' ? hp.suppressor : hp.suppressor.name;
      if (sName) suppressor = gunMesh.getObjectByName(sName);
      else if (hp.suppressor.isObject3D && gunMesh === (srcGun || gunMesh)) suppressor = hp.suppressor;
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

  // 3. Barrel fallback (including userData.barrel on M240 and userData.barrelAssembly on Minigun)
  if (!barrel) {
    if (gunMesh.userData && gunMesh.userData.barrel) {
      barrel = gunMesh.userData.barrel;
    } else if (gunMesh.userData && gunMesh.userData.barrelAssembly) {
      barrel = gunMesh.userData.barrelAssembly;
    } else {
      const candidates = [
        'heatParts-barrel',
        'barrel',
        'barrelAssembly',
        'flamerNozzle',
        'laserBarrel'
      ];
      for (const name of candidates) {
        const found = gunMesh.getObjectByName(name);
        if (found) { barrel = found; break; }
      }
    }
  }

  // 4. Subtree search fallback: match barrel mesh/group, excluding handles, clamps, lasers, or sights
  if (!barrel) {
    gunMesh.traverse((child) => {
      if (barrel) return;
      if (child.name && /barrel/i.test(child.name) && !/handle|clamp|screw|sight|laser/i.test(child.name)) {
        barrel = child;
      }
    });
  }

  // 5. Lean viewmodel clone correspondence (e.g. minigun unnamed barrelAssembly Group or M240 barrel)
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
 * Applies blackbody emissive glow + axial heat gradient to the target node hierarchy without allocating materials per frame.
 * Clones each glowing mesh's material once on first glow so other gun parts sharing standard materials stay unaffected.
 */
export function applyGlowToNode(T, targetNode, glow, clearOtherNode = null, opts = null) {
  let clonedCount = 0;
  if (clearOtherNode) {
    const clearKind = opts && opts.kind === 'suppressor' ? 'barrel' : 'suppressor';
    const sub = applyGlowToNode(T, clearOtherNode, { colorHex: 0x000000, intensity: 0 }, null, { ...(opts || {}), kind: clearKind });
    clonedCount += sub.clonedCount;
  }
  if (!targetNode) return { clonedCount };

  const isVmCopy = !!(opts && opts.isVmCopy);
  const worldClonedThisFrame = !!(opts && opts.worldClonedThisFrame);
  const kind = (opts && opts.kind) || (targetNode.name && /suppressor/i.test(targetNode.name) ? 'suppressor' : 'barrel');

  let hasNonVC = false;
  targetNode.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) {
      if (m && m.emissive && !m.vertexColors && !(m.roughness >= 0.85 && m.metalness <= 0.05)) hasNonVC = true;
    }
  });

  if (glow.intensity > 0) {
    ensureAxialUv1OnTarget(T, targetNode, opts?.usePackedFinish);
  }

  targetNode.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (let i = 0; i < mats.length; i++) {
      let m = mats[i];
      if (!m || !m.emissive) continue;

      if (!shouldMeshGlow(obj, m, hasNonVC, opts?.usePackedFinish)) {
        // Ensure excluded parts (bore disc, rotary clamp collars) stay dark if ever touched
        if (m.userData && m.userData._barrelHeatIsolated && m.emissiveIntensity !== 0) {
          m.emissive.setHex(0x000000);
          m.emissiveIntensity = 0;
        }
        continue;
      }

      // Clone once to isolate emissive uniform & axial emissiveMap to this barrel/suppressor artwork only.
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

      if (glow.intensity > 0) {
        if (m.emissiveNode) {
          m.userData = m.userData || {};
          m.userData._savedEmissiveNode = m.emissiveNode;
          m.emissiveNode = null;
          m.needsUpdate = true;
        }
        const gradTex = getHeatGradientTex(T, kind, !!(opts?.usePackedFinish && obj.geometry?.attributes.foldRM));
        if (gradTex && obj.geometry?.attributes?.uv1 && m.emissiveMap !== gradTex) {
          m.emissiveMap = gradTex;
          m.needsUpdate = true;
        }
        m.emissive.setHex(glow.colorHex);
        m.emissiveIntensity = glow.intensity;
      } else if (m.userData && m.userData._barrelHeatIsolated) {
        if (m.userData._savedEmissiveNode && !m.emissiveNode) {
          m.emissiveNode = m.userData._savedEmissiveNode;
          delete m.userData._savedEmissiveNode;
          m.needsUpdate = true;
        }
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
      }
    }
  });

  return { clonedCount };
}

function makeWispTexture(T) {
  if (!T) return null;
  // Thin vertical curling smoke filament texture so overlapping billboards form a delicate rising wisp
  if (typeof document !== 'undefined' && typeof document.createElement === 'function' && typeof T.CanvasTexture === 'function') {
    const W = 64, H = 128;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx2d = cv.getContext && cv.getContext('2d');
    if (ctx2d && typeof ctx2d.createImageData === 'function') {
      const img = ctx2d.createImageData(W, H);
      const d = img.data;
      for (let y = 0; y < H; y++) {
        const v = y / (H - 1); // 0 = top, 1 = bottom
        const envY = Math.pow(Math.sin(v * Math.PI), 1.15);
        const cx = W * 0.5 + Math.sin(v * Math.PI * 2.0) * 4.2;
        const hw = 6.2 + (1.0 - v) * 7.8;
        for (let x = 0; x < W; x++) {
          const dx = (x - cx) / hw;
          const a = envY * Math.exp(-dx * dx * 2.35);
          const idx = (y * W + x) * 4;
          d[idx] = 236;
          d[idx + 1] = 241;
          d[idx + 2] = 248;
          d[idx + 3] = Math.round(clamp01(a) * 235);
        }
      }
      ctx2d.putImageData(img, 0, 0);
      const ctex = new T.CanvasTexture(cv);
      if (T.SRGBColorSpace) ctex.colorSpace = T.SRGBColorSpace;
      ctex.needsUpdate = true;
      return ctex;
    }
  }
  if (typeof T.DataTexture !== 'function' || T.RGBAFormat == null) return null;
  const W = 32, H = 64;
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    const envY = Math.pow(Math.sin(v * Math.PI), 1.15);
    const cx = W * 0.5 + Math.sin(v * Math.PI * 2.0) * 2.1;
    const hw = 3.2 + (1.0 - v) * 3.9;
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) / hw;
      const a = envY * Math.exp(-dx * dx * 2.35);
      const idx = (y * W + x) * 4;
      data[idx] = 236;
      data[idx + 1] = 241;
      data[idx + 2] = 248;
      data[idx + 3] = Math.round(clamp01(a) * 235);
    }
  }
  const tex = new T.DataTexture(data, W, H, T.RGBAFormat);
  if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Measures [0 = night, 1 = bright noon] daylight factor from scene directional/hemisphere/ambient lights.
 */
function measureSceneDaylight(scene, cachedLights) {
  if (!scene || !scene.children) return 0;
  if (!cachedLights.ready) {
    cachedLights.dirs.length = 0;
    cachedLights.hemis.length = 0;
    cachedLights.ambs.length = 0;
    for (let i = 0; i < scene.children.length; i++) {
      const c = scene.children[i];
      if (!c || !c.isLight) continue;
      if (c.isDirectionalLight) cachedLights.dirs.push(c);
      else if (c.isHemisphereLight) cachedLights.hemis.push(c);
      else if (c.isAmbientLight) cachedLights.ambs.push(c);
    }
    if (cachedLights.dirs.length || cachedLights.hemis.length) cachedLights.ready = true;
  }
  if (!cachedLights.ready) return 0;
  let maxDir = 0, hemiSum = 0, ambSum = 0;
  for (let i = 0; i < cachedLights.dirs.length; i++) {
    const l = cachedLights.dirs[i];
    if (l.visible !== false && l.intensity > maxDir) maxDir = l.intensity;
  }
  for (let i = 0; i < cachedLights.hemis.length; i++) {
    const l = cachedLights.hemis[i];
    if (l.visible !== false) hemiSum += l.intensity || 0;
  }
  for (let i = 0; i < cachedLights.ambs.length; i++) {
    const l = cachedLights.ambs[i];
    if (l.visible !== false) ambSum += l.intensity || 0;
  }
  const lum = maxDir + 0.85 * hemiSum + ambSum;
  // Night ~0.65 -> 0.00; Dusk ~2.20 -> 0.44; Overcast ~2.64 -> 0.57; Noon ~4.32 -> 1.00
  return clamp01((lum - 0.80) / 3.40);
}

/**
 * Creates the complete barrel heat system.
 */
export function createBarrelHeat(ctx = {}) {
  const T = ctx.THREE || (typeof window !== 'undefined' ? window.THREE : null);
  const scene = ctx.scene || null;
  const weaponMeshes = ctx.weaponMeshes || null;

  const heatByWeapon = Object.create(null);
  const cachedLights = { ready: false, dirs: [], hemis: [], ambs: [] };

  // Smoke wisp pool (zero garbage per frame)
  const MAX_WISPS = 48;
  const wisps = [];
  let wispGroup = null;
  let wispGeo = null;
  let wispTex = null;
  const wispSpawnTimer = [0, 0];
  let simTime = 0;

  if (T && scene) {
    wispGroup = new T.Group();
    wispGroup.name = 'barrel-heat-wisps';
    // Prevent trainingHideWorld from hiding or freezing wispGroup inside the Training Ground
    wispGroup.userData = { effectPooled: true, pooled: true };
    scene.add(wispGroup);

    wispGeo = new T.PlaneGeometry(1, 1, 1, 1);
    wispTex = makeWispTexture(T);

    for (let i = 0; i < MAX_WISPS; i++) {
      const matOpts = {
        color: 0xeef3fa,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        fog: false
      };
      if (T.DoubleSide != null) matOpts.side = T.DoubleSide;
      if (wispTex) matOpts.map = wispTex;
      const mat = new T.MeshBasicMaterial(matOpts);
      const mesh = new T.Mesh(wispGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 2; // Over decals/char (1), strictly behind flame stream (3)
      wispGroup.add(mesh);

      wisps.push({
        mesh,
        mat,
        active: false,
        x0: 0, y0: 0, z0: 0,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        seed: i * 0.754877,
        hNorm: 0.5,
        width: 0.025,
        height: 0.065,
        growW: 0.028,
        growH: 0.045,
        age: 0,
        life: 2.0,
        maxOpacity: 0.35
      });
    }
  }

  const _scratchMuzzle = T ? new T.Vector3() : null;
  const _wispEye = T ? new T.Vector3() : null;
  const _rollQ = T ? new T.Quaternion() : null;
  const _zAxis = T ? new T.Vector3(0, 0, 1) : null;
  const _coldGlow = { colorHex: 0x000000, r: 0, g: 0, b: 0, intensity: 0 };

  function clearGunMeshGlow(gunMesh, weaponKey = '') {
    if (!T || !gunMesh) return;
    const parts = findGunHeatParts(gunMesh, weaponKey, null);
    const usePackedFinish = pairedFinishes.has(weaponKey);
    if (parts.barrel) applyGlowToNode(T, parts.barrel, _coldGlow, null, { kind: 'barrel', usePackedFinish });
    if (parts.suppressor) applyGlowToNode(T, parts.suppressor, _coldGlow, null, { kind: 'suppressor', usePackedFinish });
  }

  // Shot and magazine code use hand 0 for the main gun and 1 for the offhand.
  // Existing callers that omit the hand continue to address the main gun.
  const heatByHand = [heatByWeapon, Object.create(null)];
  const worldByHand = [weaponMeshes || Object.create(null), Object.create(null)];
  const lastView = [null, null];
  const painted = new WeakSet();

  function getHeat(weaponKey, hand = 0) {
    return heatByHand[hand === 1 ? 1 : 0][weaponKey] || 0;
  }

  function setHeat(weaponKey, val, hand = 0) {
    const side = hand === 1 ? 1 : 0;
    const clamped = clamp01(+val || 0);
    heatByHand[side][weaponKey] = clamped;
    if (clamped <= GLOW_HEAT_THRESHOLD) {
      clearGunMeshGlow(worldByHand[side][weaponKey], weaponKey);
      if (lastView[side]?.key === weaponKey) clearGunMeshGlow(lastView[side].root, weaponKey);
    }
  }

  function addShot(weaponKey = 'm4', isSuppressed = false, deltaMul = 1, hand = 0) {
    if (!weaponKey) return;
    const table = heatByHand[hand === 1 ? 1 : 0];
    const inc = (HEAT_PER_SHOT[weaponKey] || HEAT_PER_SHOT.default) * deltaMul;
    table[weaponKey] = Math.min(1, (table[weaponKey] || 0) + inc);
  }

  function paint(gun, key, source, glow, suppressed, viewCopy = false, worldCloned = false) {
    if (!T || !gun || (!glow.intensity && !painted.has(gun))) return false;
    const parts = findGunHeatParts(gun, key, source);
    const can = !!parts.suppressor && (suppressed ?? parts.suppressor.visible);
    const target = can ? parts.suppressor : parts.barrel;
    if (!target) return false;
    const result = applyGlowToNode(T, target, glow, can ? parts.barrel : parts.suppressor,
      { kind: can ? 'suppressor' : 'barrel', isVmCopy: viewCopy, worldClonedThisFrame: worldCloned,
        usePackedFinish: pairedFinishes.has(key) });
    if (glow.intensity) painted.add(gun);
    else painted.delete(gun);
    return result.clonedCount > 0;
  }

  function emit(hand, pairedSmoke, gun, vm, heat, dt, daylight) {
    wispSpawnTimer[hand] -= dt;
    if (wispSpawnTimer[hand] > 0) return;
    let point = null;
    if (vm?.info?.active && vm.muzzleWorld) {
      point = vm.muzzleWorld(_scratchMuzzle, hand + 1);
    } else if (gun) {
      gun.updateWorldMatrix?.(true, false);
      point = gun.userData?.muzzleLocal ? gun.localToWorld(_scratchMuzzle.copy(gun.userData.muzzleLocal))
        : gun.getWorldPosition?.(_scratchMuzzle);
    }
    if (!point) return;
    const strength = clamp01((heat - SMOKE_HEAT_THRESHOLD) / (1 - SMOKE_HEAT_THRESHOLD));
    wispSpawnTimer[hand] = (0.115 - strength * 0.060) * (pairedSmoke ? 2 : 1);
    spawnSmokeWisp(point, heat, daylight, hand, pairedSmoke);
  }

  function spawnSmokeWisp(pos, heat, daylight, hand, pairedSmoke) {
    if (!wisps.length || heat <= SMOKE_HEAT_THRESHOLD) return;
    let w = null;
    // Two emitting hands share the original pool evenly. A lone emitter can use all slots.
    for (let i = pairedSmoke ? hand : 0; i < wisps.length; i += pairedSmoke ? 2 : 1) {
      if (!wisps[i].active) { w = wisps[i]; break; }
    }
    if (!w) return;

    const hNorm = clamp01((heat - SMOKE_HEAT_THRESHOLD) / (1.0 - SMOKE_HEAT_THRESHOLD));
    // Slightly softer alpha at night so smoke looks like a pale misty thread rather than self-lit chalk
    const nightSoften = 0.80 + 0.20 * daylight;

    w.active = true;
    w.age = 0;
    w.hNorm = hNorm;
    w.life = (1.45 + hNorm * 1.45) * WISP_LIFETIME_SCALE;
    w.width = 0.022 + hNorm * 0.018;        // thin 2.2-4.0 cm filament at the muzzle
    w.height = 0.055 + hNorm * 0.045;       // 5.5-10 cm overlapping vertical segment
    w.growW = 0.022 + hNorm * 0.026;
    w.growH = 0.032 + hNorm * 0.042;
    w.maxOpacity = (0.20 + hNorm * 0.38) * nightSoften; // 0.16..0.20 after 1 mag -> 0.46..0.58 when hot

    w.x0 = pos.x;
    w.y0 = pos.y + 0.010;
    w.z0 = pos.z;
    w.x = w.x0;
    w.y = w.y0;
    w.z = w.z0;

    // Coherent slow air-current drift so successive segments form a connected curling thread
    w.vy = 0.11 + hNorm * 0.14;
    w.vx = Math.sin(simTime * 1.35) * 0.022 + 0.010;
    w.vz = Math.cos(simTime * 1.05) * 0.018;

    w.mesh.position.set(w.x, w.y, w.z);
    w.mesh.scale.set(w.width, w.height, 1);
    w.mat.opacity = 0.0;
    w.mesh.visible = true;
  }

  function update(dt, state = {}) {
    const stepDt = Math.max(0, +dt || 0);
    simTime += stepDt;

    const curW = state.currentWeapon || 'm4';
    const isSup = !!state.isSuppressed;
    const vm = state.viewmodel || null;
    const worldGun = state.weaponMesh || (weaponMeshes && weaponMeshes[curW]) || null;
    const cam = state.camera || ctx.camera || null;

    // Keep wispGroup visible & active even if trainingHideWorld ran after barrelHeat init
    if (wispGroup) {
      if (!wispGroup.visible) wispGroup.visible = true;
      if (Object.prototype.hasOwnProperty.call(wispGroup, 'updateMatrixWorld')) {
        delete wispGroup.updateMatrixWorld;
      }
    }

    const daylight = state.daylight != null
      ? clamp01(+state.daylight)
      : measureSceneDaylight(scene, cachedLights);

    const offhand = state.offhandMesh || null;
    if (offhand) worldByHand[1][curW] = offhand;
    for (let hand = 0; hand < 2; hand++) {
      const table = heatByHand[hand];
      for (const key in table) {
        const heat = table[key];
        if (heat <= 0) continue;
        const next = Math.max(0, heat - (COOLING_BASE + COOLING_EXP * heat) * stepDt);
        table[key] = next;
        if (key !== curW || (hand === 1 && !offhand)) {
          paint(worldByHand[hand][key], key, null, getHeatGlow(next, daylight));
        }
      }
    }

    const pairedSmoke = offhand && getHeat(curW) > SMOKE_HEAT_THRESHOLD && getHeat(curW, 1) > SMOKE_HEAT_THRESHOLD;
    for (let hand = 0; hand < (offhand ? 2 : 1); hand++) {
      const gun = hand ? offhand : worldGun;
      const heat = getHeat(curW, hand);
      const glow = heat > GLOW_HEAT_THRESHOLD ? getHeatGlow(heat, daylight) : _coldGlow;
      const suppressed = hand ? (gun.userData?.suppressed ?? isSup) : isSup;
      const cloned = paint(gun, curW, null, glow, suppressed);
      if (vm?.info?.active) {
        const copy = hand ? vm.gun2 : vm.gun;
        if (copy?.key === curW) {
          lastView[hand] = copy;
          paint(copy.root, curW, gun, glow, suppressed, true, cloned);
        } else if (!hand && !vm.gun && vm.root) {
          // Simple view hosts expose the gun holder without a runtime gun record.
          const holder = (vm.space || vm.root).getObjectByName('vm-gun');
          paint(holder?.children[0], curW, gun, glow, suppressed, true, cloned);
        }
      }
      if (wispGroup && heat > SMOKE_HEAT_THRESHOLD && !state.suppressWisp) {
        emit(hand, pairedSmoke, gun, vm, heat, stepDt, daylight);
      } else {
        wispSpawnTimer[hand] = 0;
      }
    }

    // 5. Simulate active smoke wisps along a coherent curling ribbon
    if (wisps.length > 0) {
      let eye;
      for (let i = 0; i < wisps.length; i++) {
        const w = wisps[i];
        if (!w.active) continue;

        w.age += stepDt;
        if (w.age >= w.life) {
          w.active = false;
          w.mesh.visible = false;
          continue;
        }

        const prog = w.age / w.life;
        const dy = Math.max(0, w.y - w.y0);
        const curlAmp = Math.min(1.0, dy * 4.2) * (0.032 + 0.042 * w.hNorm);
        const curlX = Math.sin(dy * 13.5 - simTime * 2.5) * curlAmp;
        const curlZ = Math.cos(dy * 10.5 - simTime * 2.0) * curlAmp * 0.85;

        // Gentle upward deceleration as warm smoke cools in range air
        const curVy = w.vy * (1.0 - 0.28 * prog);
        w.x += (w.vx + curlX) * stepDt;
        w.y += curVy * stepDt;
        w.z += (w.vz + curlZ) * stepDt;

        w.mesh.position.set(w.x, w.y, w.z);

        if (cam) {
          w.mesh.quaternion.copy(cam.quaternion);
          if (_rollQ && _zAxis) {
            const tilt = clamp01(dy * 3.0) * Math.sin(dy * 11.0 - simTime * 2.2) * 0.22;
            _rollQ.setFromAxisAngle(_zAxis, tilt);
            w.mesh.quaternion.multiply(_rollQ);
          }
        }

        const curWSize = w.width + w.growW * w.age;
        const curHSize = w.height + w.growH * w.age;
        w.mesh.scale.set(curWSize, curHSize, 1);

        let alpha = 0;
        if (prog < 0.10) {
          alpha = (prog / 0.10) * w.maxOpacity;
        } else {
          alpha = Math.pow((1.0 - prog) / 0.90, 1.45) * w.maxOpacity;
        }
        if (eye === undefined) eye = cam?.getWorldPosition ? cam.getWorldPosition(_wispEye) : (cam?.position ?? null);
        if (eye) {
          const d2 = w.mesh.position.distanceToSquared(eye);
          if (d2 < 1) {
            // Fade the billboard before it can fill the view as the eye crosses the trail.
            const near = smoothstep(0.08, 1, Math.sqrt(d2));
            alpha *= near * (2 - near);
          }
        }
        w.mat.opacity = Math.max(0.0, alpha);
      }
    }
  }

  function reset() {
    for (let hand = 0; hand < 2; hand++) {
      const table = heatByHand[hand];
      for (const key in table) delete table[key];
      for (const key in worldByHand[hand]) clearGunMeshGlow(worldByHand[hand][key], key);
      const copy = lastView[hand];
      if (copy) clearGunMeshGlow(copy.root, copy.key);
      lastView[hand] = null;
      wispSpawnTimer[hand] = 0;
    }
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
    if (wispTex) wispTex.dispose?.();
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
    _wisps: wisps,
    _wispGroup: wispGroup
  };
}
