export async function resolve(specifier,context,next){
  if(specifier==='three')return {url:new URL('../../vendor/three/three.webgpu.js',import.meta.url).href,shortCircuit:true};
  return next(specifier,context);
}
