// game/vm-viewfill.js - CI-2 (D-218 pass 5, colour; CD-19 finding 2b/3): the first-person view fill.
//
// The view gun and the gloves read near-black in every light: the scene has no environment map, so a metal part
// (metalness near 1, almost no diffuse) only shows where the sun's highlight happens to land, and the dark paints get
// nothing but a faint hemisphere wash. A real gun at arm's length reflects the sky, the room, and the patch of ground
// the flashlight lights in front of it.
//
// This adds that reflection to the VIEW COPY's materials only (game/viewmodel.js makeVmMat), inside the shader they
// already have: an analytic environment built from the world's own hemisphere light (sky above, ground below, so the
// room's lamps indoors and the dim sky at night), plus, while the flashlight is on, the lit patch of ground ahead and
// below. Split-sum style: the environment's radiance in the blurred reflection direction times a fitted EnvBRDF
// (F0 from the material's own metalness and colour, its own roughness), plus a small diffuse fill of the same light.
// It goes into the emissive slot after the material's own emissive, so the lighting model and every light are
// untouched.
//
// Cost (D-218 pass 3 speed gate): no texture, no draw, no pass, no light. A few ALU ops per view-gun pixel and four
// uniforms set once a frame. The world's materials and lights are not touched, so their shaders don't change.
//
// makeViewFill(T, TSL) -> { apply(mat), update(scene, camera), U, info } or null when the TSL nodes are missing
// (the view then looks as it did).

export const VIEW_FILL = Object.freeze({
  spec: 1.6,          // reflection gain over the hemisphere's own radiance (its irradiance / pi)
  diffuse: 0.35,      // extra diffuse fill, as a share of the hemisphere (the "soft view fill")
  torchSpec: 1.0,     // the flashlight's lit ground patch, reflected
  torchDiffuse: 0.6,  // and as a fill from below/ahead
  torchPatch: 0.0088, // radiance of the lit patch per unit of the spot's intensity (about 3 m, ground albedo 0.25)
});

export function makeViewFill(T, TSL, opts = {}) {
  const need = ['uniform', 'Fn', 'vec3', 'vec2', 'float', 'mix', 'smoothstep', 'normalize', 'dot', 'reflect', 'exp2', 'min', 'max', 'clamp',
    'diffuseColor', 'specularColor', 'roughness', 'cameraPosition', 'positionWorld', 'materialEmissive'];
  if (!T || !TSL || need.some((k) => TSL[k] == null)) return null;
  const P = { ...VIEW_FILL, ...opts };
  const nrm = TSL.transformedNormalWorld || TSL.normalWorld;
  if (!nrm) return null;
  const U = {
    sky: TSL.uniform(new T.Color(0, 0, 0)),      // radiance above (linear, already / pi and x gain)
    ground: TSL.uniform(new T.Color(0, 0, 0)),   // radiance below
    torch: TSL.uniform(new T.Color(0, 0, 0)),    // the lit patch's radiance (0 when the light is off)
    low: TSL.uniform(new T.Vector3(0, -0.6, -0.8)),   // world direction from the gun to the lit patch
    k: TSL.uniform(new T.Vector4(P.spec, P.diffuse, P.torchSpec, P.torchDiffuse)),
    on: TSL.uniform(1),
  };
  const { Fn, vec3, vec2, float, mix, smoothstep, normalize, dot, reflect, exp2, min, max, clamp } = TSL;

  // The environment: a hemisphere (ground -> sky over the direction's height) and the torch's patch as a soft lobe.
  const envAt = (d, kHemi, kTorch) => {
    const w = smoothstep(-0.65, 0.65, d.y);
    const hemi = mix(U.ground, U.sky, w).mul(kHemi);
    const lobe = smoothstep(0.35, 0.92, dot(d, U.low));
    return hemi.add(U.torch.mul(lobe).mul(kTorch));
  };

  const fill = Fn(() => {
    const N = normalize(nrm);
    const V = normalize(TSL.cameraPosition.sub(TSL.positionWorld));
    const NoV = clamp(dot(N, V), 0.0001, 1);
    const r = TSL.roughness;
    // reflection direction blurred toward the normal as the surface gets rough
    const R = normalize(mix(reflect(V.negate(), N), N, r.mul(r)));
    // EnvBRDF, fitted (Karis, "Physically Based Shading on Mobile")
    const c0 = TSL.vec4(-1, -0.0275, -0.572, 0.022);
    const c1 = TSL.vec4(1, 0.0425, 1.04, -0.04);
    const q = r.mul(c0).add(c1);
    const a004 = min(q.x.mul(q.x), exp2(NoV.mul(-9.28))).mul(q.x).add(q.y);
    const AB = vec2(-1.04, 1.04).mul(a004).add(q.zw);
    const spec = TSL.specularColor.mul(AB.x).add(AB.y);
    const radiance = envAt(R, U.k.x, U.k.z);
    const irr = envAt(N, U.k.y, U.k.w);
    return radiance.mul(spec).add(TSL.diffuseColor.rgb.mul(irr)).mul(U.on);
  })();

  const info = { applied: 0, lights: null };
  function apply(m) {
    if (!m || !m.isNodeMaterial || m.userData?.vmFill || m.transparent || !('metalness' in m) || !('roughness' in m)) return false;
    const base = m.emissiveNode || TSL.materialEmissive;
    m.emissiveNode = vec3(base).add(fill);
    m.userData = { ...(m.userData || {}), vmFill: true };
    m.needsUpdate = true;
    info.applied++;
    return true;
  }

  // The world's lights, found once (index.html: hemi, ambientFill, the flashlight's SpotLight).
  let L = null;
  const _c = new T.Color(), _f = new T.Vector3();
  function findLights(scene) {
    const out = { hemi: null, amb: null, torch: null };
    for (const o of scene.children) {
      if (o.isHemisphereLight && !out.hemi) out.hemi = o;
      else if (o.isAmbientLight && !out.amb) out.amb = o;
      else if (o.isSpotLight && !out.torch && Math.abs((o.distance || 0) - 26) < 0.01 && Math.abs(o.angle - 0.42) < 0.001) out.torch = o;
    }
    if (!out.torch) scene.traverse((o) => { if (!out.torch && o.isSpotLight && Math.abs((o.distance || 0) - 26) < 0.01 && Math.abs(o.angle - 0.42) < 0.001) out.torch = o; });
    return out;
  }
  function update(scene, camera, lights) {
    if (lights) L = lights; else if (!L || (L.hemi && L.hemi.parent !== scene)) L = findLights(scene);
    info.lights = L && { hemi: !!L.hemi, amb: !!L.amb, torch: !!L.torch };
    const inv = 1 / Math.PI;
    const h = L.hemi, a = L.amb;
    if (h && h.visible !== false) {
      U.sky.value.copy(h.color).multiplyScalar(h.intensity * inv);
      U.ground.value.copy(h.groundColor).multiplyScalar(h.intensity * inv);
    } else { U.sky.value.setRGB(0, 0, 0); U.ground.value.setRGB(0, 0, 0); }
    if (a && a.visible !== false) { _c.copy(a.color).multiplyScalar(a.intensity * inv); U.sky.value.add(_c); U.ground.value.add(_c); }
    const t = L.torch;
    if (t && t.visible !== false && t.intensity > 0) U.torch.value.copy(t.color).multiplyScalar(t.intensity * P.torchPatch);
    else U.torch.value.setRGB(0, 0, 0);
    if (camera) {   // the lit patch: ahead of the eye and below it
      camera.getWorldDirection(_f); _f.y = 0;
      if (_f.lengthSq() < 1e-6) _f.set(0, 0, -1);
      _f.normalize().multiplyScalar(0.8); _f.y = -0.6; U.low.value.copy(_f).normalize();
    }
  }
  return { apply, update, U, info, P };
}
