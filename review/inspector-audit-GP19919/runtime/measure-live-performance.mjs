import fs from 'node:fs';
const port = Number(process.argv[2] || 32166);
const code = `
const api=window.DWInspect, ix=api._ix, before=api.session(), oldSkip=ix.skipHistory, frame=ix.frame;
const rows=[], samples=[], timings={frames:[],focus:[],measure:[]}; let subject=null, focus=null;
const measure=ix.stage.measure;
ix.frame=function(...args){const t=performance.now();try{return frame.apply(ix,args);}finally{timings.frames.push(performance.now()-t);}};
ix.stage.measure=function(...args){const t=performance.now();try{return measure.apply(ix.stage,args);}finally{timings.measure.push(performance.now()-t);}};
function stats(a){const s=a.slice().sort((a,b)=>a-b);return {count:a.length,mean:a.reduce((a,b)=>a+b,0)/Math.max(1,a.length),p95:s[Math.floor((s.length-1)*.95)]||0,max:s.at(-1)||0};}
function wrapFocus(){subject=ix.subject;focus=subject.focus;subject.focus=function(...args){const t=performance.now();try{return focus.apply(subject,args);}finally{timings.focus.push(performance.now()-t);}};}
function unwrapFocus(){if(subject&&focus)subject.focus=focus;subject=null;focus=null;}
async function sample(label){for(const a of Object.values(timings))a.length=0;const t=performance.now();await wait(5000);const seconds=(performance.now()-t)/1000;
rows.push({label,seconds,fps:timings.frames.length/seconds,inspectorCpu:stats(timings.frames),focusCpu:stats(timings.focus),measureCpu:stats(timings.measure),render:JSON.parse(JSON.stringify(T.renderer.info.render)),memory:JSON.parse(JSON.stringify(T.renderer.info.memory)),clock:api.time(),host:ix.host.state(),viewport:[innerWidth,innerHeight,devicePixelRatio],canvas:[T.renderer.domElement.width,T.renderer.domElement.height],heldCanvases:document.querySelectorAll('[data-dwi-held-frame]').length});}
try{
await api.show('marine');api.speed(1);api.play();await wait(5000);wrapFocus();
await sample('marine-running-baseline');
ix.skipHistory=true;await sample('marine-history-disabled');ix.skipHistory=oldSkip;
const current=focus.call(subject,true);subject.focus=()=>current;await sample('marine-frozen-focus');subject.focus=focus;wrapFocus();
api.pause();await sample('marine-paused');unwrapFocus();
await api.show('weapon.m4');api.play();await wait(1000);wrapFocus();await sample('m4-running');
return {rows,at:new Date().toISOString(),renderer:T.renderer.constructor.name,version:api.version};
}finally{unwrapFocus();ix.frame=frame;ix.stage.measure=measure;ix.skipHistory=oldSkip;await api.restore(before);}
`;
const response = await fetch('http://127.0.0.1:' + port + '/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cmd: 'eval', code, timeout: 90000 }), signal: AbortSignal.timeout(100000) });
const out = await response.json();
fs.writeFileSync(new URL('./performance-live.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
