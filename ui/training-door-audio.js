// Short copy of Jerry's selected hangar mechanism, shared by open and close.
const cache=new WeakMap();
export function createTrainingDoorAudio(ctx,output){
  let buffer=null,disposed=false,plays=0;const voices=new Set();
  if(!cache.has(ctx))cache.set(ctx,fetch(new URL('./audio/training-door.ogg',import.meta.url)).then(r=>{
    if(!r.ok)throw Error('Training door HTTP '+r.status);return r.arrayBuffer();
  }).then(b=>ctx.decodeAudioData(b)));
  const ready=cache.get(ctx).then(b=>{buffer=b;}).catch(e=>console.warn('Training door unavailable',e));
  return {
    play(volume=1,pan=0){
      if(disposed||!buffer)return;
      const source=ctx.createBufferSource(),gain=ctx.createGain(),panner=ctx.createStereoPanner();
      source.buffer=buffer;gain.gain.value=.8*Math.max(0,Math.min(1.5,volume));panner.pan.value=Math.max(-1,Math.min(1,pan));
      source.connect(gain);gain.connect(panner);panner.connect(output);voices.add(source);
      source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();panner.disconnect();};
      source.start();source.stop(ctx.currentTime+.6);plays++;
    },
    ready,state:()=>({ready:!!buffer,seconds:buffer?.duration||0,plays,active:voices.size}),
    dispose(){disposed=true;for(const source of voices)source.stop();}
  };
}
