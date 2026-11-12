import fs from 'node:fs';
const dir=new URL('./',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL(n,dir)));
const required=[...read('runs.json').slice(0,4),...read('probe-revolver.json')];
const summary=required.map(r=>({run:r.i,gun:r.gun,valid:!r.failure&&!r.invalid,ammo:[r.before?.ammo,r.after?.ammo],gaps:r.firstShotGaps,maxGap:Math.max(0,...(r.firstShotGaps||[]).map(g=>g.ms)),pipelinesDelta:r.after?.pipelines-r.before?.pipelines,geometryDelta:r.after?.geometries-r.before?.geometries,newPipelines:r.newPipelines,newBuffers:r.newBuffers?.length,newBufferBytes:r.newBuffers?.reduce((n,b)=>n+b.size,0),errors:r.errors}));
fs.writeFileSync(new URL('summary.json',dir),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
