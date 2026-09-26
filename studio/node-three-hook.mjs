// Resolves the bare 'three' import to the vendored core build (maths, scene graph, materials).
const CORE = new URL('../vendor/three/three.core.js', import.meta.url).href;
export async function resolve(spec, ctx, next) {
  if (spec === 'three') return next(CORE, ctx);
  return next(spec, ctx);
}
