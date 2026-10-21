// Jerry's shot-timer recording, decoded once per audio context and played on the effects bus.
const cache=new WeakMap();
const load=()=>fetch(new URL('../assets/audio/training/shot-timer-start.wav',import.meta.url)).then(r=>{if(!r.ok)throw Error('Shot timer HTTP '+r.status);return r.arrayBuffer();});
export function createRangeStartAudio(ctx,output,{loadFile=load}={}){
 let buffer=null,disposed=false,plays=0;const voices=new Set();
 if(!cache.has(ctx)){
  const pending=Promise.resolve().then(loadFile).then(data=>ctx.decodeAudioData(data));
  cache.set(ctx,pending);pending.catch(()=>{if(cache.get(ctx)===pending)cache.delete(ctx);});
 }
 const ready=cache.get(ctx).then(b=>{if(!disposed)buffer=b;}).catch(e=>console.warn('Shot timer unavailable',e));
 return {
  ready,
  play(){
   if(disposed||!buffer)return false;
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=.8;
   source.connect(gain);gain.connect(output);voices.add(source);
   source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};
   source.start(ctx.currentTime);plays++;return true;
  },
  state:()=>({ready:!!buffer,seconds:buffer?.duration||0,plays,active:voices.size}),
  dispose(){disposed=true;for(const source of voices){try{source.stop();}catch{}}}
 };
}
