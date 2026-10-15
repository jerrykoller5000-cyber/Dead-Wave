import fs from 'node:fs';import assert from 'node:assert/strict';
const dir='review/range-flow-waist-GP19914',source=fs.readFileSync('index.html','utf8'),patches=[
 {a:"    import { skinMergeGroup, skinUnmerge, skinSignature } from './core/skin-merge.js';",b:"    import { createMarineWaist, followMarineWaist } from './studio/marine-waist.js';\n    import { skinMergeGroup, skinUnmerge, skinSignature } from './core/skin-merge.js';"},
 {a:'      // Bake rigid parts together (see mergeRigidMeshes); the hip is animated on its own.\n      mergeRigidMeshes(g, gearParts, new Set([hip, ...patches]));',b:'      // The shirt hem rides the pelvis; its upper rows bend into the chest.\n      const waist = !legacyBody ? createMarineWaist(THREE,g,{lower:lowerBody,torso:torsoG,projectUV:boxProjectUV}) : null;\n      // Bake rigid parts together, keeping the deforming cloth mesh independent.\n      mergeRigidMeshes(g, gearParts, new Set([hip, ...patches, ...(waist?[waist.mesh]:[])]));'},
 {a:'      if (head) {\n        head.rotation.x = headPitch;\n        head.rotation.y = headYaw - POSE.holdTwist;',b:'      followMarineWaist(THREE,ud); // Follow the final pelvis translation/roll after its yaw limit.\n      if (head) {\n        head.rotation.x = headPitch;\n        head.rotation.y = headYaw - POSE.holdTwist;'}
];
let candidate=source;for(const p of patches){p.a=p.a.replaceAll('\n','\r\n');p.b=p.b.replaceAll('\n','\r\n');assert.equal(candidate.split(p.a).length,2,p.a);candidate=candidate.replace(p.a,p.b);}
fs.writeFileSync(dir+'/index.before',source);fs.writeFileSync(dir+'/waist-patches.json',JSON.stringify(patches,null,2));fs.writeFileSync(dir+'/index.candidate',candidate);
for(const [kind,body]of [['before',source],['after',candidate]]){
 fs.writeFileSync(`${dir}/index-${kind}.html`,body.replace('<head>','<head><base href="/">').replace("'./studio/marine-waist.js'","'./review/range-flow-waist-GP19914/marine-waist.js'"));
 let cam=fs.readFileSync('tools/camera.mjs','utf8').replace("from './serve.mjs'","from '../../tools/serve.mjs'").replace("from './cdp.mjs'","from '../../tools/cdp.mjs'").replace("new URL('..', import.meta.url)","new URL('../..', import.meta.url)").replace('${this.server.origin}/index.html?', '${this.server.origin}/review/range-flow-waist-GP19914/index-'+kind+'.html?');fs.writeFileSync(`${dir}/camera-${kind}.mjs`,cam);
}
console.log('Three focused waist integrations staged; marine-body and live index unchanged.');
