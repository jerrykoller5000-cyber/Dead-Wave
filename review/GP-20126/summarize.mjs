import fs from 'node:fs';
const root=new URL('./',import.meta.url);
const clean=JSON.parse(fs.readFileSync(new URL('clean.json',root)));
const lines=clean.measure.gaps.map(g=>`${g.action}: ${g.ms.toFixed(2)} ms; pipelines delta ${g.after.pipelines-g.before.pipelines}; geometries delta ${g.after.geometries-g.before.geometries}; heap delta ${((g.after.heap-g.before.heap)/1e6).toFixed(2)} MB`);
fs.writeFileSync(new URL('gaps.txt',root),lines.join('\n')+'\n');
fs.writeFileSync(new URL('owner-request.txt',root),`Exclusive PC RTX5080, no screenshots:48 gun/view/pass trials (12 guns × eye/hip × first/repeat),10144 frames,16 gaps>50ms,0page errors. All gap-window pipeline/geometry count deltas0. All normal reloads settled full; saw has no magazine reload. Complete clean list follows.\n\n${lines.join('\n')}\n\nTargeted trace: first revolver draw107.9/120.3ms renderer animation-frame callback; minorGC only2.25ms there. Launcher GPU decoder command flush108.8ms; chainsaw GPU decoder flush135.8ms. CPU sample follow-up shows first-draw shader-node build/traversal in vendor/three/three.webgpu.js and a separate majorGC418.8ms on first hip pistol fire. CPU-profiler startup itself caused600.2ms: EXCLUDE that instrumentation artefact. Clean first pistol fire716.8ms did not recur in trace and remains unattributed. No new J149 part, shader compilation or geometry upload is proven as its cause. Trace/profile overhead means do not substitute their timings for clean.json. No dominant own-file path identified, so no game-code edits. Evidence review/GP-20126/{clean,trace,cpu-trace,cpu-attribution}.json and gaps.txt. Please take renderer/warmup/GC follow-up in your lane.\n`);
const q=JSON.parse(fs.readFileSync(new URL('cpu-trace.json',root))),p=q.cpu,nodes=new Map(p.nodes.map(n=>[n.id,n]));
const samples=[];let time=p.startTime;
for(let i=0;i<p.samples.length;i++){const delta=p.timeDeltas[i];samples.push({lo:time,hi:time+delta,node:p.samples[i]});time+=delta;}
const attribution=q.measure.gaps.map(g=>{
 const lo=(g.raf-g.ms+q.trace.offset)*1000,hi=(g.raf+q.trace.offset)*1000,totals=new Map();
 for(const s of samples){const overlap=Math.min(hi,s.hi)-Math.max(lo,s.lo);if(overlap<=0)continue;const f=nodes.get(s.node)?.callFrame;if(!f)continue;const key=JSON.stringify(f);totals.set(key,(totals.get(key)||0)+overlap/1000);}
 return {action:g.action,ms:g.ms,leafSamples:[...totals].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([frame,ms])=>({ms:+ms.toFixed(2),...JSON.parse(frame)}))};
});
fs.writeFileSync(new URL('cpu-attribution.json',root),JSON.stringify(attribution,null,2));
console.log(JSON.stringify(attribution,null,2));
