import fs from 'node:fs';import assert from 'node:assert/strict';
const dir='review/range-polish-GP19913',source=fs.readFileSync('index.html','utf8'),patches=[
 {a:"    import { trainingFloorHit, traceTraining, createTrainingImpacts } from './world/training-ballistics.js';",b:"    import { trainingFloorHit, traceTraining, createTrainingImpacts } from './world/training-ballistics.js';\n    import { rangeGrenadeHit, bounceRangeGrenade } from './combat/training-grenades.js';"},
 {a:'    function drawGrenadeArc(grp, o) {\n      const r = flyArc({ ...o, ground: sampleHeight, dt: 1 / 30 });',b:"    function drawGrenadeArc(grp, o) {\n      const solid = training.active && training.tg ? (ax,ay,az,bx,by,bz) => rangeGrenadeHit(training.tg,{x:ax,y:ay,z:az},{x:bx,y:by,z:bz})?.t ?? null : undefined;\n      const r = flyArc({ ...o, ground: sampleHeight, dt: 1 / 30, solid });"},
 {a:'        if (g.prev) { g.prev.x = g.pos.x; g.prev.y = g.pos.y; g.prev.z = g.pos.z; }',b:'        const rangeFrom = g.handThrown && training.active && training.tg ? {x:g.pos.x,y:g.pos.y,z:g.pos.z} : null;\n        if (g.prev) { g.prev.x = g.pos.x; g.prev.y = g.pos.y; g.prev.z = g.pos.z; }'},
 {a:'        g.pos.z += g.vz * dt;\n\n        // The 40mm launcher',b:"        g.pos.z += g.vz * dt;\n        if(rangeFrom){\n          const hit=bounceRangeGrenade(g,training.tg,rangeFrom,dt);\n          if(hit&&hit.speed>1&&g.age>=(g.rangeFenceSoundAt||0)){\n            AudioSys.trainingCue('fence-bump');g.rangeFenceSoundAt=g.age+.12;\n          }\n        }\n\n        // The 40mm launcher"}
];
let candidate=source;
for(const p of patches){p.a=p.a.replaceAll('\n','\r\n');p.b=p.b.replaceAll('\n','\r\n');assert.equal(candidate.split(p.a).length,2,p.a);candidate=candidate.replace(p.a,p.b);}
fs.writeFileSync(dir+'/index.before',source);fs.writeFileSync(dir+'/patches.json',JSON.stringify(patches,null,2));fs.writeFileSync(dir+'/index.candidate',candidate);
fs.writeFileSync(dir+'/index.html',candidate.replace('<head>','<head><base href="/">').replace("'./combat/training-grenades.js'","'./review/range-polish-GP19913/training-grenades.js'"));
const cam=fs.readFileSync('tools/camera.mjs','utf8').replace("from './serve.mjs'","from '../../tools/serve.mjs'").replace("from './cdp.mjs'","from '../../tools/cdp.mjs'").replace("new URL('..', import.meta.url)","new URL('../..', import.meta.url)").replace('${this.server.origin}/index.html?', '${this.server.origin}/review/range-polish-GP19913/index.html?');
fs.writeFileSync(dir+'/camera.mjs',cam);console.log('Staged four focused index hooks; live index unchanged.');
