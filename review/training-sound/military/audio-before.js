// Deliberately ordinary training-room loop: soft electric keys, a steady tick,
// and ventilation. All sources use the existing master and volume controls.
export function createTrainingAudio(ctx,musicOut,fxOut){
  const music=ctx.createGain(),fx=ctx.createGain();music.gain.value=0;fx.gain.value=1;music.connect(musicOut);fx.connect(fxOut);
  const sources=[],oneShots=new Set(),last=new Map();let disposed=false;
  const length=24,rate=ctx.sampleRate,buffer=ctx.createBuffer(1,length*rate,rate),data=buffer.getChannelData(0);
  const notes=[261.63,329.63,392,329.63,261.63,329.63,440,392,261.63,349.23,440,349.23,261.63,349.23,392,349.23];
  for(let beat=0;beat<32;beat++){
    const start=Math.floor(beat*.75*rate),f=notes[Math.floor(beat/2)%notes.length];
    for(let j=0;j<Math.min(rate*.65,data.length-start);j++){const t=j/rate,e=Math.min(1,t/.008)*Math.exp(-t*7);
      data[start+j]+=.095*e*(Math.sin(2*Math.PI*f*t)+.16*Math.sin(4*Math.PI*f*t));
      if(beat%4===0)data[start+j]+=.06*Math.sin(2*Math.PI*(beat<16?130.815:174.615)*t)*Math.min(1,t/.015)*Math.exp(-t*5);
      if(t<.035)data[start+j]+=.012*Math.sin(2*Math.PI*1350*t)*Math.exp(-t*120);
    }
  }
  const loop=ctx.createBufferSource();loop.buffer=buffer;loop.loop=true;loop.connect(music);loop.start();sources.push(loop);
  const vent=ctx.createOscillator(),vg=ctx.createGain();vent.frequency.value=60;vg.gain.value=.012;vent.connect(vg);vg.connect(fx);vent.start();sources.push(vent);
  function tone(freq,dur,vol,delay=0,type='sine'){
    if(disposed)return;const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+delay;o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(fx);oneShots.add(o);o.onended=()=>{oneShots.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+dur+.01);
  }
  function cue(kind){
    if(disposed)return;const t=ctx.currentTime;if(t-(last.get(kind)??-Infinity)<(kind==='step'?.1:.06))return;last.set(kind,t);
    if(kind==='target'){tone(1450,.18,.13);tone(2170,.11,.035);tone(170,.08,.08);}
    else if(kind==='impact'){tone(125,.075,.12,0,'triangle');tone(720,.035,.025);}
    else if(kind==='step'){tone(95,.07,.07,0,'triangle');tone(420,.03,.025);}
    else if(kind==='reset'){tone(180,.16,.045,0,'triangle');tone(660,.07,.035,.14);}
    else {const seq=kind==='spawn'?[440,440]:kind==='clear'?[660,440]:kind==='wake'?[440,550,660]:kind==='blackout'?[330,220]:kind==='open'?[550]:[440,660];seq.forEach((f,i)=>tone(f,.12,.06,i*.16));}
  }
  return{cue,update(volume,paused=false){music.gain.setTargetAtTime(volume*(paused?.16:.32),ctx.currentTime,.12);},
    state:()=>({loopSeconds:length,active:!disposed,looping:loop.loop,cues:Object.fromEntries(last),musicGain:music.gain.value}),
    dispose(){if(disposed)return;disposed=true;for(const s of [...sources,...oneShots]){try{s.stop();s.disconnect();}catch{}}music.disconnect();fx.disconnect();}
  };
}
