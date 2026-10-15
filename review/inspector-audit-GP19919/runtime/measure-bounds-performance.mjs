import fs from 'node:fs';
const port = Number(process.argv[2] || 32166);
const code = `
const api=window.DWInspect,ix=api._ix,before=api.session(),frame=ix.frame,oldMeasure=ix.stage.measure;
let fresh=null,frames=[],measures=[],shadow=[],restoreSkin=[];const rows=[];
ix.frame=function(...a){const t=performance.now();try{return frame.apply(ix,a);}finally{frames.push(performance.now()-t);}};
function stats(a){const s=a.slice().sort((a,b)=>a-b);return {count:a.length,mean:a.reduce((a,b)=>a+b,0)/Math.max(1,a.length),p95:s[Math.floor((s.length-1)*.95)]||0,max:s.at(-1)||0};}
function use(fn){ix.stage.measure=function(...a){const t=performance.now();try{return fn.apply(ix.stage,a);}finally{measures.push(performance.now()-t);}};}
async function sample(label){frames=[];measures=[];shadow=[];const t=performance.now();await wait(5000);const seconds=(performance.now()-t)/1000;rows.push({label,seconds,fps:frames.length/seconds,inspectorCpu:stats(frames),boundsCpu:stats(measures),shadowCpu:stats(shadow),render:JSON.parse(JSON.stringify(T.renderer.info.render)),heldCanvases:document.querySelectorAll('[data-dwi-held-frame]').length});}
try{
await api.show('marine');api.speed(1);api.play();await wait(5000);
const skins=[];T.player.traverse(o=>{if(o.isSkinnedMesh){skins.push({name:o.name,vertices:o.geometry.attributes.position.count,mainCamera:o.layers.test(ix.host.camera.layers)});const fn=o.computeBoundingBox;o.computeBoundingBox=function(...a){const t=performance.now();try{return fn.apply(o,a);}finally{shadow.push(performance.now()-t);}};restoreSkin.push(()=>o.computeBoundingBox=fn);}});
use(oldMeasure);await sample('original-bounds');
const module=await import('/studio/inspector/stage.js?perf='+Date.now());fresh=module.createStage(ix);use(fresh.measure);ix.subject.focus(true);await sample('camera-layer-aware-bounds');
const bounds=fresh.measure(T.player),subjects=await import('/studio/inspector/subjects.js?perf='+Date.now());
return {rows,skins,visibleInfo:subjects.countInfo(T.player,ix.host.camera),graphInfo:subjects.countInfo(T.player),bounds,at:new Date().toISOString(),renderer:T.renderer.constructor.name};
}finally{for(const f of restoreSkin)f();ix.frame=frame;ix.stage.measure=oldMeasure;fresh?.dispose();await api.restore(before);}
`;
const r = await fetch('http://127.0.0.1:' + port + '/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cmd: 'eval', code, timeout: 60000 }), signal: AbortSignal.timeout(90000) });
const out = await r.json(); fs.writeFileSync(new URL('./performance-bounds.json', import.meta.url), JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 2));
