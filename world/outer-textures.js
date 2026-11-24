// world/outer-textures.js — AG-411: Procedural PBR textures & WebGPU TSL atmospheric depth-softening
// shaders for all outer-world models beyond the circle gate (r > LAND_MAX = 220 m).
//
// Designed so every distant prop, landmark, tree, cliff outcrop, waterfall, and mountain range looks
// genuinely grounded, richly textured, and cinematically softened by alpine air & valley mist when
// viewed from anywhere inside the playable circle — never cheap, plastic, or harsh low-poly CG:
//   - World-space triplanar material breakup (weathered concrete formwork, logging timber grain,
//     rusted industrial steel, fractured alpine granite/monolith rock, organic pine-needle foliage).
//   - Distance-driven aerial perspective, desaturation & contrast compression beyond r = 220 m.
//   - Grazing-angle Fresnel optical edge-softening ("atmospheric rim blur") that gently melts sharp
//     distant polygon silhouettes into mountain haze without blurring the playable circle.
//   - Altitude-stratified valley-floor mist wrap that softens terrain-to-structure seams.
//   - Automatic high-altitude windblown snow/frost accumulation on upward-facing crags & roofs.
//   - Animated directional rushing alpine cascade & waterfall shader with soft feathered bank edges.
//   - Cohesive Day / Overcast / Dusk alpenglow / Clear Night / Blood Moon / Fog Night atmospheric sync.
//
// Deterministic, DOM-free, zero global RNG touch, WebGPU TSL + MeshStandardMaterial/fakethree safe.

import { getRockTextureLibrary, tileNoise, tileFbm } from './rock-textures.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / ((b - a) || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

function hash2i(ix, iy, seed) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function tileRidged(u, v, px, py, seed = 1, octaves = 3) {
  let s = 0, amp = 0.5, norm = 0, fx = px, fy = py;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(tileNoise(u, v, fx, fy, seed + i * 73) * 2 - 1);
    s += n * n * amp;
    norm += amp;
    amp *= 0.5;
    fx <<= 1;
    fy <<= 1;
  }
  return norm > 0 ? s / norm : 0.5;
}

function makeDataTex(T, data, w, h, { name, repeat = true, linear = true } = {}) {
  if (!T || typeof T.DataTexture !== 'function') return null;
  const tex = new T.DataTexture(data, w, h, T.RGBAFormat);
  tex.name = name || 'outer-tex';
  const wrap = repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping;
  tex.wrapS = wrap;
  tex.wrapT = wrap;
  tex.magFilter = T.LinearFilter;
  tex.minFilter = repeat ? T.LinearMipmapLinearFilter : T.LinearFilter;
  tex.generateMipmaps = !!repeat;
  if ('colorSpace' in tex) {
    tex.colorSpace = linear ? (T.NoColorSpace || '') : (T.SRGBColorSpace || 'srgb');
  }
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

// =========================================================================
// 1. PROCEDURAL DATA TEXTURE PACK (cached per THREE instance via WeakMap)
// =========================================================================
const TEX_CACHE = new WeakMap();

export function getOuterTextureSet(THREE) {
  if (!THREE || typeof THREE.DataTexture !== 'function') return null;
  const cached = TEX_CACHE.get(THREE);
  if (cached) return cached;

  // A) 256x256 Packed Triplanar Surface Breakup Texture (linear, repeat):
  //    R = concrete formwork / timber grain / architectural masonry variation
  //    G = rugged alpine rock striations, glacial couloirs & fracture veins
  //    B = organic conifer needle cluster speckle & foliage density variation
  //    A = macro cloud/weathering streak & alpine snowdrift modulation
  const D = 256;
  const det = new Uint8Array(D * D * 4);
  for (let y = 0; y < D; y++) {
    const v = y / D;
    for (let x = 0; x < D; x++) {
      const u = x / D;
      // R: weathered concrete / architectural grain + subtle horizontal board/course bands + vertical rain runs
      const cBase = tileFbm(u, v, 6, 6, 4111, 3, 0.52);
      const cStreak = tileFbm(u, v, 18, 3, 4113, 2, 0.5);
      const cBoard = 0.5 + 0.5 * Math.sin(v * Math.PI * 16 + cBase * 1.4);
      const rVal = clamp(cBase * 0.52 + cStreak * 0.34 + cBoard * 0.14, 0, 1);

      // G: rugged alpine granite strata & mountain ridge fractures
      const gRidge = tileRidged(u, v, 5, 8, 4121, 4);
      const gFine = tileFbm(u, v, 16, 16, 4127, 2, 0.5);
      const gVal = clamp(gRidge * 0.68 + gFine * 0.32, 0, 1);

      // B: crisp pine-needle / bough-clump foliage breakup (kills smooth plastic cone look!)
      const bMacro = tileFbm(u, v, 8, 8, 4133, 3, 0.55);
      const bNeedle = tileNoise(u, v, 32, 24, 4139) * 0.6 + tileNoise(u, v, 64, 48, 4141) * 0.4;
      const bVal = clamp(bMacro * 0.50 + bNeedle * 0.50, 0, 1);

      // A: macro weathering / billowing mist / snow-drift mask
      const aMacro = tileFbm(u, v, 4, 4, 4153, 4, 0.52);
      const aVal = clamp(aMacro, 0, 1);

      const o = (y * D + x) * 4;
      det[o]     = Math.round(rVal * 255);
      det[o + 1] = Math.round(gVal * 255);
      det[o + 2] = Math.round(bVal * 255);
      det[o + 3] = Math.round(aVal * 255);
    }
  }
  const detailTex = makeDataTex(THREE, det, D, D, { name: 'outer-detail-pack', repeat: true, linear: true });

  // B) 256x256 Directional Rushing Alpine Cascade / Waterfall Texture (linear, repeat):
  //    R = elongated primary rushing whitewater streaks
  //    G = secondary swirling frothy foam veil
  //    B = high-frequency sparkling spray/bubble flecks
  //    A = organic bank-edge feather distortion
  const W = 256;
  const wat = new Uint8Array(W * W * 4);
  for (let y = 0; y < W; y++) {
    const v = y / W;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const streak1 = tileRidged(u, v, 16, 3, 4211, 3);
      const streak2 = tileFbm(u + 0.17, v, 24, 4, 4219, 3, 0.55);
      const foam = clamp(streak1 * 0.58 + streak2 * 0.42, 0, 1);
      const veil = clamp(tileFbm(u, v, 8, 3, 4229, 3, 0.52), 0, 1);
      const spray = clamp(tileNoise(u, v, 48, 16, 4231) * 0.65 + tileNoise(u, v, 32, 32, 4241) * 0.35, 0, 1);
      const bank = clamp(tileFbm(u, v, 4, 8, 4253, 3, 0.5), 0, 1);
      const o = (y * W + x) * 4;
      wat[o]     = Math.round(foam * 255);
      wat[o + 1] = Math.round(veil * 255);
      wat[o + 2] = Math.round(spray * 255);
      wat[o + 3] = Math.round(bank * 255);
    }
  }
  const waterTex = makeDataTex(THREE, wat, W, W, { name: 'outer-cascade-water', repeat: true, linear: true });

  // C) 256x128 Billowing Multi-Octave Alpine Valley Mist Wisp (ZERO rectangular edges!)
  const MW = 256, MH = 128;
  const mist = new Uint8Array(MW * MH * 4);
  for (let y = 0; y < MH; y++) {
    const v = y / (MH - 1);
    const dy = (v - 0.5) * 2;
    for (let x = 0; x < MW; x++) {
      const u = x / (MW - 1);
      const dx = (u - 0.5) * 2;
      // Domain-warped elliptical envelope so cloud wisps curl organically and hit 0 well before border
      const wx = (tileFbm(u, v, 3, 2, 4311, 3) - 0.5) * 0.24;
      const wy = (tileFbm(u + 0.3, v + 0.2, 3, 2, 4327, 3) - 0.5) * 0.20;
      const r2 = (dx + wx) * (dx + wx) + (dy + wy) * (dy + wy);
      const hardBorder = clamp(1 - Math.max(dx * dx, dy * dy), 0, 1);
      const env = r2 >= 1 ? 0 : Math.pow(1 - r2, 2.35) * sstep(0.0, 0.18, hardBorder);
      const billow = tileFbm(u, v, 5, 3, 4337, 4, 0.54);
      const wisp = sstep(0.18, 0.86, billow * 0.78 + 0.22);
      // Slight sunlit top-to-bottom internal cloud shading in RGB (white top, cooler underside)
      const shade = Math.round(lerp(218, 255, clamp(1 - v * 0.65 + (billow - 0.5) * 0.25, 0, 1)));
      const a = clamp(env * wisp, 0, 1);
      const o = (y * MW + x) * 4;
      mist[o]     = shade;
      mist[o + 1] = Math.min(255, shade + 2);
      mist[o + 2] = Math.min(255, shade + 5);
      mist[o + 3] = Math.round(a * 255);
    }
  }
  const mistTex = makeDataTex(THREE, mist, MW, MH, { name: 'outer-alpine-mist', repeat: false, linear: true });

  // D) Photographic Exponential Radial Light-Bloom Sprites (pinpoint core + smooth atmospheric halo)
  const makeGlow = (name, coreRGB, haloRGB) => {
    const N = 64;
    const data = new Uint8Array(N * N * 4);
    for (let y = 0; y < N; y++) {
      const dy = (y / (N - 1) - 0.5) * 2;
      for (let x = 0; x < N; x++) {
        const dx = (x / (N - 1) - 0.5) * 2;
        const r = Math.hypot(dx, dy);
        if (r >= 1) continue;
        const core = Math.exp(-r * r * 42.0);
        const halo = Math.exp(-r * r * 6.4) * Math.pow(1 - r, 1.5);
        const alpha = clamp(core * 0.96 + halo * 0.56, 0, 1);
        const t = clamp(core / Math.max(0.001, core + halo * 0.8), 0, 1);
        const o = (y * N + x) * 4;
        data[o]     = Math.round(lerp(haloRGB[0], coreRGB[0], t));
        data[o + 1] = Math.round(lerp(haloRGB[1], coreRGB[1], t));
        data[o + 2] = Math.round(lerp(haloRGB[2], coreRGB[2], t));
        data[o + 3] = Math.round(alpha * 255);
      }
    }
    return makeDataTex(THREE, data, N, N, { name, repeat: false, linear: true });
  };
  const glowRedTex = makeGlow('outer-beacon-red', [255, 224, 214], [255, 42, 26]);
  const glowAmberTex = makeGlow('outer-beacon-amber', [255, 246, 220], [255, 162, 58]);

  const pack = { detailTex, waterTex, mistTex, glowRedTex, glowAmberTex };
  TEX_CACHE.set(THREE, pack);
  return pack;
}

// =========================================================================
// 2. LIVE ATMOSPHERIC UNIFORM BLOCK (shared across all outer TSL shaders)
// =========================================================================
export function createOuterAtmosphere(THREE, TSL) {
  const canTSL = !!(
    TSL &&
    typeof TSL.uniform === 'function' &&
    typeof TSL.texture === 'function' &&
    typeof THREE.MeshStandardNodeMaterial === 'function' &&
    typeof THREE.MeshBasicNodeMaterial === 'function'
  );

  if (!canTSL) {
    return {
      enabled: false,
      uniforms: null,
      sync() {},
    };
  }

  const uHazeColor   = TSL.uniform(new THREE.Color(0xd8e8ff));
  const uSkyMidColor = TSL.uniform(new THREE.Color(0x87b7ff));
  const uSunDir      = TSL.uniform(new THREE.Vector3(0.45, 0.72, 0.35).normalize());
  const uNightMix    = TSL.uniform(0.0);
  const uDusk        = TSL.uniform(0.0);
  const uStorm       = TSL.uniform(0.0);
  const uBlood       = TSL.uniform(0.0);
  const uTime        = TSL.uniform(0.0);

  const _tmpMid = new THREE.Color();

  function sync(env = {}, elapsed = 0) {
    uTime.value = elapsed;
    const nightMix = clamp(env.nightMix ?? 0, 0, 1);
    const dusk = clamp(env.dusk ?? 0, 0, 1);
    const rainK = clamp(env.rainK ?? 0, 0, 1);
    const fogNightK = clamp(env.fogNightK ?? 0, 0, 1);
    const bloodAmt = env.bloodMoon ? nightMix : 0;
    const storm = clamp(Math.max(fogNightK, rainK * 0.78), 0, 1);

    uNightMix.value = nightMix;
    uDusk.value = dusk;
    uStorm.value = storm;
    uBlood.value = bloodAmt;

    if (env.horizonColor && typeof env.horizonColor.r === 'number') {
      uHazeColor.value.copy(env.horizonColor);
    }
    if (env.skyMidColor && typeof env.skyMidColor.r === 'number') {
      uSkyMidColor.value.copy(env.skyMidColor);
    } else {
      _tmpMid.setHex(0x87b7ff)
        .lerp(new THREE.Color(0xd87b58), dusk * 0.75)
        .lerp(new THREE.Color(0x050a14), nightMix);
      if (bloodAmt > 0.01) _tmpMid.lerp(new THREE.Color(0x3a0f14), bloodAmt * 0.65);
      uSkyMidColor.value.copy(_tmpMid);
    }
    if (env.sunDir && typeof env.sunDir.x === 'number') {
      uSunDir.value.copy(env.sunDir).normalize();
    }
  }

  return {
    enabled: true,
    uniforms: { uHazeColor, uSkyMidColor, uSunDir, uNightMix, uDusk, uStorm, uBlood, uTime },
    sync,
  };
}

// =========================================================================
// 3. TSL ATMOSPHERIC DEPTH-SOFTENING & PBR MATERIAL BUILDERS
// =========================================================================
function toViewNormalNode(TSL, worldNrm) {
  if (TSL.cameraViewMatrix && typeof TSL.cameraViewMatrix.transformDirection === 'function') {
    return TSL.cameraViewMatrix.transformDirection(worldNrm).normalize();
  }
  if (typeof TSL.transformNormalToView === 'function') {
    return TSL.transformNormalToView(worldNrm).normalize();
  }
  return worldNrm;
}

function buildTriplanarSampler(TSL) {
  const { vec2, vec3, abs, pow, texture, positionWorld, normalWorld } = TSL;
  const aw = pow(abs(normalWorld).add(0.002), vec3(4.0, 4.0, 4.0));
  const ws = aw.x.add(aw.y).add(aw.z);
  return (tex, scale, offsetY = 0.0) => {
    const p = positionWorld.mul(scale);
    const a = texture(tex, vec2(p.z, p.y.add(offsetY)));
    const b = texture(tex, vec2(p.x, p.z));
    const c = texture(tex, vec2(p.x, p.y.add(offsetY)));
    return a.mul(aw.x).add(b.mul(aw.y)).add(c.mul(aw.z)).div(ws);
  };
}

// Shared atmospheric depth softening, desaturation, valley-mist seam wrap, and
// grazing-angle optical edge softening ("rim blur") for all outer 3D geometry!
function applyOuterAtmosphereNodes(TSL, atmo, detailTex, baseAlbedo, {
  wallRadius = 220,
  hazeStrength = 0.42,
  rimSoftness = 0.28,
  valleyMistAmt = 0.30,
  desatAmt = 0.26,
  snowAmt = 0.0,
  snowLineY = 58.0,
} = {}) {
  const {
    vec2, vec3, float, mix, smoothstep, clamp, max, abs, pow, exp, dot, normalize, length,
    positionWorld, normalWorld, cameraPosition, texture,
  } = TSL;
  const { uHazeColor, uSunDir, uNightMix, uDusk, uStorm, uTime } = atmo.uniforms;

  const rXZ = length(positionWorld.xz);
  const camDist = length(positionWorld.sub(cameraPosition));
  const viewDir = normalize(cameraPosition.sub(positionWorld));
  const ndv = clamp(abs(dot(normalWorld, viewDir)), 0.0, 1.0);

  // Smooth radial depth past the circle wall (236..425 m) & camera distance (65..360 m)
  // Keeps near-wall trees/boulders rich & matched to the inner valley while softening midground & far props!
  const rDepth = smoothstep(float(wallRadius + 16.0), float(wallRadius + 205.0), rXZ);
  const cDepth = smoothstep(float(65.0), float(360.0), camDist);
  const distK = clamp(rDepth.mul(0.60).add(cDepth.mul(0.40)), 0.0, 1.0);

  // Subtle world-space moving mist noise for altitude-graded valley haze occlusion
  const mistUV = positionWorld.xz.mul(0.0055).add(vec2(uTime.mul(0.004), uTime.mul(-0.0025)));
  const mistNoise = detailTex ? texture(detailTex, mistUV).a : float(0.5);

  let col = baseAlbedo;

  // 1) Optional high-altitude snow/frost settling naturally on upward-facing outer crags & roofs
  if (snowAmt > 0.001) {
    const snowNoise = mistNoise.sub(0.5).mul(16.0);
    const altSnow = smoothstep(float(snowLineY - 10.0), float(snowLineY + 26.0), positionWorld.y.add(snowNoise));
    const upFace = smoothstep(0.36, 0.78, normalWorld.y);
    const snK = clamp(altSnow.mul(upFace).mul(float(snowAmt)), 0.0, 0.85);
    const snowTone = mix(vec3(0.72, 0.76, 0.80), vec3(0.80, 0.68, 0.60), uDusk.mul(0.55));
    col = mix(col, snowTone, snK);
  }

  // 2) Distance desaturation & contrast compression (prevents cartoonishly vivid/sharp CG outer props!)
  const lum = dot(col, vec3(0.299, 0.587, 0.114));
  const desatK = clamp(distK.mul(float(desatAmt)).add(uStorm.mul(0.22)), 0.0, 0.56);
  col = mix(col, vec3(lum, lum, lum), desatK);

  // 3) Grazing-angle optical edge softening ("atmospheric rim blur")
  // Softly wraps sharp distant silhouettes toward sky haze so polygon edges stop reading as hard CG!
  const fresnel = pow(float(1.0).sub(ndv), 2.35);
  const rimK = clamp(fresnel.mul(float(rimSoftness)).mul(distK.mul(0.78).add(0.22)), 0.0, 0.42);

  // 4) Altitude-stratified valley mist occlusion (softens distant canyon/foundation seams past r=245 m!)
  const valleyLow = exp(max(float(0.0), positionWorld.y.sub(8.0)).mul(-0.030));
  const valleyK = clamp(
    valleyLow.mul(smoothstep(float(wallRadius + 24.0), float(wallRadius + 105.0), rXZ))
      .mul(mistNoise.mul(0.55).add(0.45))
      .mul(float(valleyMistAmt).add(uStorm.mul(0.24))),
    0.0, 0.44
  );

  // 5) Forward-scattered warm/cool alpine sunlight wrap in the atmospheric veil
  const sunScatter = pow(clamp(dot(viewDir.negate(), uSunDir), 0.0, 1.0), 3.0);
  const sunTint = mix(vec3(0.82, 0.88, 0.95), vec3(0.92, 0.68, 0.48), uDusk);
  const hazeTone = mix(uHazeColor, sunTint, sunScatter.mul(0.20).mul(float(1.0).sub(uNightMix)));

  const aerialK = clamp(distK.mul(float(hazeStrength)).add(uStorm.mul(0.26)), 0.0, 0.64);
  const totalVeil = clamp(max(aerialK, max(rimK, valleyK)).add(rimK.mul(0.28)), 0.0, 0.68);

  // Calibrated atmospheric in-scattering: softens distant silhouettes & lifts harsh black CG shadows
  // without washing out near-wall foliage or concrete architectural depth!
  const dayFactor = float(1.0).sub(uNightMix.mul(0.95));
  const albedoOut = mix(col, hazeTone.mul(0.76), totalVeil.mul(0.46));
  const inScatter = hazeTone.mul(totalVeil.mul(0.16).mul(dayFactor));
  const emissiveOut = clamp(inScatter, vec3(0.0, 0.0, 0.0), vec3(0.18, 0.20, 0.23));

  return { albedoOut, emissiveOut, distK, mistNoise };
}

export function createOuterWorldMaterials(THREE, TSL, atmo, { wallRadius = 220 } = {}) {
  const texSet = getOuterTextureSet(THREE);
  const rockLib = getRockTextureLibrary(THREE);

  // Fallback helper for Node tests / fakethree / WebGL without TSL
  const stdFallback = (opts) => new THREE.MeshStandardMaterial(opts);

  if (!atmo || !atmo.enabled || !texSet || !texSet.detailTex) {
    return {
      tslActive: false,
      texSet,
      makeConiferMat: (name) => {
        const m = stdFallback({ vertexColors: true, roughness: 0.94, metalness: 0.0, fog: true });
        m.name = name || 'outer-conifer-std';
        return m;
      },
      makeCragMat: (name, hex) => {
        const m = stdFallback({ vertexColors: true, color: hex || 0xffffff, roughness: 0.94, metalness: 0.02, fog: true });
        m.name = name || 'outer-crag-std';
        return m;
      },
      concrete: stdFallback({ vertexColors: true, roughness: 0.92, metalness: 0.04, fog: true }),
      timber:   stdFallback({ vertexColors: true, roughness: 0.95, metalness: 0.02, fog: true }),
      steel:    stdFallback({ vertexColors: true, roughness: 0.72, metalness: 0.42, fog: true }),
      monolith: stdFallback({ vertexColors: true, roughness: 0.93, metalness: 0.03, fog: true }),
      passRoad: stdFallback({
        vertexColors: true, roughness: 0.95, metalness: 0.0, fog: true,
        transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      }),
      water: stdFallback({
        vertexColors: true, roughness: 0.24, metalness: 0.08, fog: true,
        transparent: true, opacity: 0.90, depthWrite: false, side: THREE.DoubleSide,
      }),
      makeFarRangeMat: (name) => {
        const m = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xffffff, fog: false, side: THREE.DoubleSide });
        m.name = name || 'outer-range-std';
        return m;
      },
      birdMat: new THREE.MeshBasicMaterial({ color: 0x262c34, side: THREE.DoubleSide, fog: true }),
    };
  }

  const {
    attribute, vec2, vec3, vec4, float, mix, smoothstep, clamp, max, min, abs, pow, dot, normalize,
    sin, length, positionWorld, normalWorld, cameraPosition, texture, uv,
  } = TSL;
  const { detailTex, waterTex } = texSet;
  const tri = buildTriplanarSampler(TSL);

  // 1) OUTER CONIFER / LARCH FOREST MATERIAL (factory: 1 cloned/unique instance per InstancedMesh!)
  function makeConiferMat(name = 'outer-conifer-tsl') {
    try {
      const vc = attribute('color', 'vec3');
      // World-space foliage needle breakup + macro grove tinting (breaks uniform repetition!)
      const fine = tri(detailTex, 0.28);
      const macro = texture(detailTex, positionWorld.xz.mul(0.011));
      const needleBreak = fine.b.sub(0.5).mul(0.42).add(1.0);
      const groveShift = macro.a.sub(0.5).mul(0.24).add(1.0);
      const groveHue = vec3(
        groveShift.mul(macro.r.sub(0.5).mul(0.14).add(1.0)),
        groveShift,
        groveShift.mul(float(1.0).sub(macro.r.sub(0.5).mul(0.10)))
      );

      // Gentle windblown frost / snow tip dusting ONLY on upper branches near alpine timberline (y > 52 m)
      const frostAlt = smoothstep(52.0, 82.0, positionWorld.y.add(macro.a.mul(8.0)));
      const frostTip = frostAlt.mul(smoothstep(0.38, 0.82, normalWorld.y)).mul(0.34);
      const baseCol = mix(vc.mul(needleBreak).mul(groveHue), vec3(0.58, 0.64, 0.68), frostTip);

      const { albedoOut, emissiveOut } = applyOuterAtmosphereNodes(TSL, atmo, detailTex, baseCol, {
        wallRadius,
        hazeStrength: 0.24,
        rimSoftness: 0.16,
        valleyMistAmt: 0.20,
        desatAmt: 0.16,
      });

      const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.93, metalness: 0.0, fog: true });
      mat.name = name;
      mat.colorNode = vec4(albedoOut, 1.0);
      mat.emissiveNode = emissiveOut;
      // Subtle needle normal scatter so sunlit boughs catch dappled organic light instead of flat cones
      const nPert = vec3(fine.b.sub(0.5).mul(0.32), fine.g.sub(0.5).mul(0.18), fine.r.sub(0.5).mul(0.32));
      mat.normalNode = toViewNormalNode(TSL, normalize(normalWorld.add(nPert)));
      return mat;
    } catch (err) {
      console.warn('AG-411 conifer TSL fallback:', err);
      return stdFallback({ vertexColors: true, roughness: 0.94, metalness: 0.0, fog: true });
    }
  }

  // 2) OUTER ALPINE CLIFF OUTCROPS / CRAGS MATERIAL (triplanar granite/limestone + auto snow caps!)
  function makeCragMat(name = 'outer-crag-tsl', baseHex = 0x7a7d78, rockKey = 'granite') {
    try {
      const vc = attribute('color', 'vec3');
      const cTint = new THREE.Color(baseHex);
      const pbr = rockLib && rockLib[rockKey] ? rockLib[rockKey] : null;
      const gTex = pbr && pbr.colRgh ? pbr.colRgh : null;
      const nTex = pbr && pbr.nrmAoH ? pbr.nrmAoH : null;

      const rockGrain = gTex ? tri(gTex, 0.095).rgb.mul(2.0) : vec3(tri(detailTex, 0.14).g.sub(0.5).mul(0.48).add(1.0));
      const rockNrm = nTex ? tri(nTex, 0.095) : null;
      const macro = tri(detailTex, 0.026);
      const strata = sin(positionWorld.y.mul(0.55).add(macro.g.mul(5.2)).add(macro.a.mul(3.4))).mul(0.5).add(0.5);
      const strataMod = strata.sub(0.5).mul(0.26).add(1.0);
      const ao = rockNrm ? clamp(rockNrm.b.mul(1.06), 0.56, 1.04) : clamp(macro.g.mul(0.42).add(0.74), 0.62, 1.05);

      const baseCol = vc.mul(vec3(cTint.r, cTint.g, cTint.b)).mul(rockGrain).mul(strataMod).mul(ao);

      const { albedoOut, emissiveOut } = applyOuterAtmosphereNodes(TSL, atmo, detailTex, baseCol, {
        wallRadius,
        hazeStrength: 0.46,
        rimSoftness: 0.30,
        valleyMistAmt: 0.34,
        desatAmt: 0.26,
        snowAmt: 0.85,
        snowLineY: 50.0,
      });

      const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.93, metalness: 0.02, fog: true });
      mat.name = name;
      mat.colorNode = vec4(albedoOut, 1.0);
      mat.emissiveNode = emissiveOut;
      if (rockNrm) {
        const dnx = rockNrm.r.sub(0.5).mul(0.75);
        const dnz = rockNrm.g.sub(0.5).mul(0.75);
        const dny = rockNrm.a.sub(0.5).mul(0.28);
        mat.normalNode = toViewNormalNode(TSL, normalize(normalWorld.add(vec3(dnx, dny, dnz))));
      }
      return mat;
    } catch (err) {
      console.warn('AG-411 crag TSL fallback:', err);
      return stdFallback({ vertexColors: true, color: baseHex, roughness: 0.94, metalness: 0.02, fog: true });
    }
  }

  // 3) LANDMARK ARCHITECTURAL PBR MATERIALS (Concrete, Timber, Steel, Ancient Monolith)
  function makeStructureMat(kind) {
    try {
      const vc = attribute('color', 'vec3');
      const sFine = tri(detailTex, kind === 'timber' ? 0.34 : kind === 'steel' ? 0.38 : 0.22);
      const sBroad = tri(detailTex, 0.045);
      // Vertical weathering rain-streaks running down exterior concrete, timber & steel walls
      const rainRun = texture(detailTex, vec2(positionWorld.x.add(positionWorld.z).mul(0.08), positionWorld.y.mul(0.025))).r;

      let surfMod, rghVal, metVal, snowAmt = 0.0, snowY = 72.0, rimSoft = 0.30, hazeStr = 0.44;
      if (kind === 'concrete') {
        const streak = rainRun.sub(0.5).mul(0.28);
        const grit = sFine.r.sub(0.5).mul(0.32).add(sBroad.a.sub(0.5).mul(0.20));
        surfMod = clamp(float(1.0).add(grit).add(streak), 0.64, 1.24);
        rghVal = clamp(float(0.88).add(sFine.r.sub(0.5).mul(0.14)), 0.74, 0.97);
        metVal = 0.03;
        snowAmt = 0.72;
        snowY = 64.0;
        rimSoft = 0.32;
        hazeStr = 0.46;
      } else if (kind === 'timber') {
        const grain = sFine.r.sub(0.5).mul(0.36).add(rainRun.sub(0.5).mul(0.22));
        const silverTop = smoothstep(0.45, 0.9, normalWorld.y).mul(0.14);
        surfMod = clamp(float(1.0).add(grain).add(silverTop), 0.60, 1.25);
        rghVal = 0.94;
        metVal = 0.02;
        snowAmt = 0.48;
        snowY = 74.0;
        rimSoft = 0.28;
        hazeStr = 0.42;
      } else if (kind === 'steel') {
        const patina = sFine.g.sub(0.5).mul(0.30).add(sBroad.r.sub(0.5).mul(0.18));
        surfMod = clamp(float(1.0).add(patina), 0.66, 1.24);
        rghVal = clamp(float(0.66).add(sFine.r.sub(0.5).mul(0.22)), 0.46, 0.88);
        metVal = 0.46;
        snowAmt = 0.25;
        snowY = 82.0;
        rimSoft = 0.36; // stronger rim-softening dissolves thin lattice/pylon aliasing into alpine air!
        hazeStr = 0.46;
      } else {
        // Ancient monolith basalt/granite stone
        const pbr = rockLib && rockLib.monolith ? rockLib.monolith : null;
        const mSample = pbr && pbr.colRgh ? tri(pbr.colRgh, 0.14).r.mul(2.0) : sFine.g.sub(0.5).mul(0.45).add(1.0);
        surfMod = clamp(mSample.mul(sBroad.a.sub(0.5).mul(0.24).add(1.0)), 0.58, 1.28);
        rghVal = 0.92;
        metVal = 0.04;
        snowAmt = 0.62;
        snowY = 58.0;
        rimSoft = 0.34;
        hazeStr = 0.48;
      }

      const baseCol = vc.mul(surfMod);
      const { albedoOut, emissiveOut } = applyOuterAtmosphereNodes(TSL, atmo, detailTex, baseCol, {
        wallRadius,
        hazeStrength: hazeStr,
        rimSoftness: rimSoft,
        valleyMistAmt: 0.32,
        desatAmt: 0.28,
        snowAmt,
        snowLineY: snowY,
      });

      const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.90, metalness: metVal, fog: true });
      mat.name = `outer-landmark-${kind}-tsl`;
      mat.colorNode = vec4(albedoOut, 1.0);
      mat.emissiveNode = emissiveOut;
      mat.roughnessNode = typeof rghVal === 'number' ? float(rghVal) : rghVal;
      const nAmp = kind === 'steel' ? 0.22 : 0.40;
      const nPert = vec3(sFine.r.sub(0.5).mul(nAmp), sFine.g.sub(0.5).mul(nAmp * 0.6), sFine.a.sub(0.5).mul(nAmp));
      mat.normalNode = toViewNormalNode(TSL, normalize(normalWorld.add(nPert)));
      return mat;
    } catch (err) {
      console.warn('AG-411 structure TSL fallback:', kind, err);
      return stdFallback({ vertexColors: true, roughness: 0.91, metalness: kind === 'steel' ? 0.42 : 0.04, fog: true });
    }
  }

  // 4) EXTERIOR PASS ROAD MATERIAL (gravel breakup + soft ragged feathered shoulder alpha!)
  let passRoad;
  try {
    const vc = attribute('color', 'vec3');
    const roadUV = uv();
    const grit = texture(detailTex, positionWorld.xz.mul(0.18));
    const macro = texture(detailTex, positionWorld.xz.mul(0.032));
    // Wheel rut darkening + packed center gravel
    const across = abs(roadUV.x.sub(0.5).mul(2.0)); // 0 = centerline, 1 = shoulder edge
    const rut = smoothstep(0.14, 0.34, across).mul(float(1.0).sub(smoothstep(0.46, 0.66, across)));
    const roadGrain = grit.g.sub(0.5).mul(0.28).add(macro.r.sub(0.5).mul(0.16)).add(1.0);
    const col = vc.mul(roadGrain).mul(float(1.0).sub(rut.mul(0.16)));

    const { albedoOut, emissiveOut } = applyOuterAtmosphereNodes(TSL, atmo, detailTex, col, {
      wallRadius,
      hazeStrength: 0.42,
      rimSoftness: 0.12,
      valleyMistAmt: 0.36,
      desatAmt: 0.24,
      snowAmt: 0.55,
      snowLineY: 62.0,
    });

    // Ragged organic feathered shoulder alpha so the road blends into hillside scree with ZERO straight ribbon cut!
    const edgeJitter = grit.a.sub(0.5).mul(0.28);
    const edgeAlpha = float(1.0).sub(smoothstep(0.52, 0.96, across.add(edgeJitter)));
    const endFade = smoothstep(0.0, 0.04, roadUV.y).mul(float(1.0).sub(smoothstep(0.90, 1.0, roadUV.y)));

    passRoad = new THREE.MeshStandardNodeMaterial({
      roughness: 0.95, metalness: 0.0, fog: true,
      transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    passRoad.name = 'outer-pass-road-tsl';
    passRoad.colorNode = vec4(albedoOut, 1.0);
    passRoad.emissiveNode = emissiveOut;
    passRoad.opacityNode = clamp(edgeAlpha.mul(endFade), 0.0, 0.92);
  } catch (err) {
    console.warn('AG-411 passRoad TSL fallback:', err);
    passRoad = stdFallback({
      vertexColors: true, roughness: 0.95, metalness: 0.0, fog: true,
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
  }

  // 5) ANIMATED ALPINE RIVER CASCADE & GLACIAL WATERFALL SHADER (feathered banks + scrolling whitewater foam!)
  let water;
  try {
    const vc = attribute('color', 'vec3'); // r=foaminess/steepness, g=water depth tint, b=cascade weight
    const wuv = uv(); // x = 0..1 across channel, y = distance downstream (0 at source -> N at mouth)
    const { uTime } = atmo.uniforms;

    // Dual-layer scrolling whitewater foam rushing downhill (y increases toward valley!)
    const flow1 = texture(waterTex, vec2(wuv.x.mul(1.65), wuv.y.mul(0.85).sub(uTime.mul(0.42))));
    const flow2 = texture(waterTex, vec2(wuv.x.mul(2.40).add(0.37), wuv.y.mul(1.35).sub(uTime.mul(0.66))));
    const bankNoise = texture(waterTex, vec2(wuv.x.mul(1.2), wuv.y.mul(0.45))).a;

    // Deep cold glacial blue-slate water + aerated roaring white foam along drops & center currents
    const foamDrive = clamp(vc.r.mul(0.85).add(flow1.r.mul(0.55)).add(flow2.g.mul(0.32)).sub(0.32), 0.0, 1.0);
    const foamMask = smoothstep(0.24, 0.82, foamDrive);
    const sparkle = smoothstep(0.68, 0.96, flow2.b).mul(foamMask).mul(0.18);

    const deepWater = vec3(0.15, 0.27, 0.35);
    const shallowWater = vec3(0.28, 0.44, 0.52);
    const foamCol = vec3(0.76, 0.83, 0.88);
    let wCol = mix(deepWater, shallowWater, clamp(vc.g, 0.0, 1.0));
    wCol = mix(wCol, foamCol, foamMask.mul(0.84)).add(vec3(sparkle, sparkle, sparkle));

    const { albedoOut, emissiveOut } = applyOuterAtmosphereNodes(TSL, atmo, detailTex, wCol, {
      wallRadius,
      hazeStrength: 0.44,
      rimSoftness: 0.22,
      valleyMistAmt: 0.40,
      desatAmt: 0.18,
    });

    // Soft organic feathered banks + top/bottom dissolve so ZERO paper-strip edges ever show!
    const across = abs(wuv.x.sub(0.5).mul(2.0));
    const bankFeather = float(1.0).sub(smoothstep(0.46, 0.98, across.add(bankNoise.sub(0.5).mul(0.30))));
    const alpha = clamp(bankFeather.mul(mix(float(0.78), float(0.95), foamMask)), 0.0, 0.94);

    water = new THREE.MeshStandardNodeMaterial({
      roughness: 0.28, metalness: 0.08, fog: true,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    water.name = 'outer-alpine-water-tsl';
    water.colorNode = vec4(albedoOut, 1.0);
    water.emissiveNode = emissiveOut;
    water.roughnessNode = mix(float(0.20), float(0.72), foamMask);
    water.opacityNode = alpha;
  } catch (err) {
    console.warn('AG-411 water TSL fallback:', err);
    water = stdFallback({
      vertexColors: true, roughness: 0.26, metalness: 0.08, fog: true,
      transparent: true, opacity: 0.88, depthWrite: false, side: THREE.DoubleSide,
    });
  }

  // 6) FAR ALPINE MOUNTAIN RANGE TSL SHADER (craggy rock/snow micro-detail + cohesive Day/Dusk/Night!)
  function makeFarRangeMat(name = 'outer-range-tsl', { hazeBase = 0.30, isFar = false } = {}) {
    try {
      const vc = attribute('color', 'vec3');
      const hNorm = attribute('uv', 'vec2').y; // 0 = inner foot, 1 = high snow summit
      const { uHazeColor, uSkyMidColor, uSunDir, uNightMix, uDusk, uStorm, uBlood } = atmo.uniforms;

      // Multi-scale alpine crag & glacial couloir breakup in world space (eliminates smooth origami sheets!)
      const p = positionWorld.mul(isFar ? 0.0042 : 0.0068);
      const r1 = texture(detailTex, vec2(p.x.add(p.z.mul(0.7)), p.y.mul(1.8)));
      const r2 = texture(detailTex, vec2(p.z.sub(p.x.mul(0.6)), p.y.mul(0.75)));
      const cragBreak = r1.g.sub(0.5).mul(0.36).add(r2.a.sub(0.5).mul(0.24)).add(1.0);

      // Soft directional sun/moon relief across sculpted alpine facets & gullies
      const sunDot = dot(normalize(normalWorld), uSunDir);
      const wrapLight = clamp(sunDot.mul(0.45).add(0.68), 0.34, 1.16);
      const sunLit = clamp(sunDot, 0.0, 1.0);

      // Exposed steep dark rock headwalls vs snow-draped ledges
      const steepness = float(1.0).sub(clamp(normalWorld.y, 0.0, 1.0));
      const snowCatch = smoothstep(0.42, 0.84, hNorm.add(r2.a.sub(0.5).mul(0.22)).sub(steepness.mul(0.26)));
      let col = vc.mul(cragBreak).mul(wrapLight);
      const snowBright = vec3(0.79, 0.84, 0.90).mul(clamp(sunDot.mul(0.35).add(0.78), 0.52, 1.10));
      col = mix(col, snowBright, snowCatch.mul(isFar ? 0.56 : 0.44));

      // Golden-hour warm rose-amber alpenglow kissing sunlit snow peaks!
      const alpenglow = vec3(0.92, 0.56, 0.38);
      const glowK = smoothstep(0.42, 0.90, hNorm).mul(sunLit.mul(0.65).add(0.35)).mul(uDusk).mul(0.56);
      col = mix(col, alpenglow, glowK);

      // Cohesive Night & Blood Moon silhouette (linear-space calibrated!):
      // Near-100% night blend prevents linear daytime snow brightness from leaking into glowing night peaks!
      const nightBase = mix(uHazeColor.mul(0.88), uSkyMidColor.mul(1.05), smoothstep(0.18, 0.92, hNorm));
      const moonRim = vec3(0.008, 0.012, 0.020).mul(snowCatch).mul(float(1.0).sub(uBlood.mul(0.75)));
      const bloodPeak = vec3(0.045, 0.010, 0.012).mul(uBlood).mul(smoothstep(0.35, 0.95, hNorm));
      const nightCol = nightBase.add(moonRim).add(bloodPeak);
      col = mix(col, nightCol, smoothstep(0.0, 0.95, uNightMix).mul(0.992));

      // Aerial perspective haze: strongest along lower skirts (dissolves seam behind TERRAIN_RADIUS=430!)
      const skirtHaze = smoothstep(0.42, 0.0, hNorm).mul(0.45);
      const effHaze = clamp(
        float(hazeBase).add(skirtHaze).add(uStorm.mul(0.55)).mul(float(1.0).sub(hNorm.mul(0.28))),
        0.0, 0.95
      );
      const hazeTarget = mix(uHazeColor, mix(uHazeColor, uSkyMidColor, smoothstep(0.35, 0.96, hNorm).mul(0.65)), uNightMix);
      col = mix(col, hazeTarget, effHaze);
      col = clamp(col, vec3(0.0, 0.0, 0.0), vec3(0.84, 0.85, 0.87));

      const mat = new THREE.MeshBasicNodeMaterial({ fog: false, side: THREE.DoubleSide });
      mat.name = name;
      mat.colorNode = vec4(col, 1.0);
      return mat;
    } catch (err) {
      console.warn('AG-411 farRange TSL fallback:', err);
      const m = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xffffff, fog: false, side: THREE.DoubleSide });
      m.name = name;
      return m;
    }
  }

  return {
    tslActive: true,
    texSet,
    makeConiferMat,
    makeCragMat,
    concrete: makeStructureMat('concrete'),
    timber:   makeStructureMat('timber'),
    steel:    makeStructureMat('steel'),
    monolith: makeStructureMat('monolith'),
    passRoad,
    water,
    makeFarRangeMat,
    birdMat: new THREE.MeshBasicMaterial({ color: 0x2a313b, side: THREE.DoubleSide, fog: true }),
  };
}
