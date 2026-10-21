// GP-153: an original military/industrial ambient score. Generated once per
// audio context: no samples, downloads or per-frame audio synthesis work.
import { createTrainingEncounters } from './training-encounter.js';
import { createTrainingDoorAudio } from './training-door-audio.js';
import { createRangeStartAudio } from './range-start-audio.js';
const scoreCache=new WeakMap();
export function buildTrainingScore(rate){
  const seconds=24,n=Math.round(seconds*rate),left=new Float32Array(n),right=new Float32Array(n),TAU=2*Math.PI;
  let seed=0x153a91,rumble=0,air=0;
  const noise=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};
  const low=1-Math.exp(-TAU*95/rate),high=1-Math.exp(-TAU*1800/rate);
  // Loop-locked oscillators: low machinery, beating metal and an uneasy minor
  // second above the drone, with no keyboard melody or major-chord cadence.
  for(let i=0;i<n;i++){
    const t=i/rate,cycle=TAU*t/seconds,r=noise();rumble+=low*(r-rumble);air+=high*(r-air);
    const breath=.70+.30*Math.sin(cycle-.8),noiseWindow=Math.sin(cycle/2)**2;
    const sub=.045*Math.sin(TAU*(881/24)*t+.32*Math.sin(cycle*2));
    const machine=.017*Math.sin(TAU*(1762/24)*t+.5*Math.sin(cycle));
    const tension=.008*Math.sin(TAU*(1854/24)*t+.7*Math.sin(cycle*3));
    const grit=(.030*rumble+.003*(r-air))*noiseWindow;
    left[i]=(sub+machine+tension)*breath+grit;
    right[i]=(sub+.017*Math.sin(TAU*(1763/24)*t+.5*Math.sin(cycle))+.008*Math.sin(TAU*(1853/24)*t+.7*Math.sin(cycle*3)))*breath+grit*.85;
  }
  // Circular writes carry metallic reverb tails across the loop boundary.
  const hit=(when,duration,volume,pan,voice,echo=false)=>{
    const start=Math.round(when*rate),count=Math.round(duration*rate),l=Math.sqrt((1-pan)/2),r=Math.sqrt((1+pan)/2);
    const echoes=echo?[[0,1],[.281,.24],[.563,.11],[.938,.055]]:[[0,1]];
    for(let j=0;j<count;j++){
      const t=j/rate,sample=volume*voice(t,noise())*Math.min(1,t/.003);
      for(const [delay,gain] of echoes){const k=(start+j+Math.round(delay*rate))%n;left[k]+=sample*gain*(delay?r:l);right[k]+=sample*gain*(delay?l:r);}
    }
  };
  const kick=t=>Math.sin(TAU*(45*t+2.5*(1-Math.exp(-t*25))))*Math.exp(-t*9)+.15*Math.sin(TAU*92*t)*Math.exp(-t*24);
  const snare=(t,r)=>(.62*r+.25*Math.sin(TAU*173*t)+.13*Math.sin(TAU*281*t))*Math.exp(-t*30);
  const metal=(t,r)=>(.50*Math.sin(TAU*317*t+2.4*Math.sin(TAU*457*t)*Math.exp(-t*5))+.15*Math.sin(TAU*839*t)+.10*r*Math.exp(-t*25))*Math.exp(-t*4.5);
  const tick=(t,r)=>(.6*r+.4*Math.sin(TAU*1261*t))*Math.exp(-t*105);
  // Eight bars at 80 BPM. Half-time weight, broken sixteenth-note details,
  // two sparse bars in the middle, and a restrained final-bar turnaround.
  const patterns=[[0,7,10],[0,6,11],[0,9],[0,3,10,14],[0],[0,11],[0,7,12],[0,6,10,15]];
  for(let bar=0;bar<8;bar++){
    const start=bar*3,sparse=bar===4||bar===5;
    for(const [j,step] of patterns[bar].entries())hit(start+step*.1875,.8,j===0?.19:.11,0,kick);
    if(!sparse)hit(start+1.5,.32,.065,bar%2?.15:-.15,snare);
    const ticks=sparse?[5,13]:[2,5,7,11,14];
    ticks.forEach((step,j)=>hit(start+step*.1875+(j%2?.017:0),.09,j%2?.021:.032,j%2?.55:-.45,tick));
    if([1,3,6,7].includes(bar))hit(start+2.4375,1.6,.041,bar%2?.65:-.65,metal,true);
    if(bar===3||bar===7)for(let j=0;j<3;j++)hit(start+2.625+j*.0625,.06,.026-j*.006,j%2?.5:-.5,tick);
  }
  // Distant resonant impacts establish the room without masking target cues.
  hit(.10,2.2,.027,-.7,metal,true);hit(12.375,2.2,.036,.65,metal,true);
  // Slow electrical swells between phrases; attack/release avoid radio clicks.
  for(const when of [5.3,11.2,20.4])hit(when,1.05,.016,-.25,(t,r)=>r*Math.sin(Math.PI*t/1.05)**2*(.5+.5*Math.sin(TAU*23*t)));
  // Gentle saturation leaves generous headroom even where wrapped tails meet.
  for(let i=0;i<n;i++){left[i]=.65*Math.tanh(left[i]/.65);right[i]=.65*Math.tanh(right[i]/.65);}
  return {seconds,channels:[left,right]};
}
function trainingScore(ctx){
  if(scoreCache.has(ctx))return scoreCache.get(ctx);
  const score=buildTrainingScore(ctx.sampleRate),buffer=ctx.createBuffer(2,score.channels[0].length,ctx.sampleRate);
  score.channels.forEach((channel,i)=>buffer.getChannelData(i).set(channel));scoreCache.set(ctx,buffer);return buffer;
}
// Music, ventilation and action cues retain their existing volume routing.
export function createTrainingAudio(ctx,musicOut,fxOut){
  const music=ctx.createGain(),fx=ctx.createGain();music.gain.value=0;fx.gain.value=1;music.connect(musicOut);fx.connect(fxOut);
  const sources=[],oneShots=new Set(),last=new Map();let disposed=false;
  const buffer=trainingScore(ctx),length=buffer.duration;
  const loop=ctx.createBufferSource();loop.buffer=buffer;loop.loop=true;const ambient=ctx.createGain();ambient.connect(music);loop.connect(ambient);loop.start();sources.push(loop);
  const intro=ctx.createGain();intro.gain.value=0;intro.connect(musicOut);
  const door=createTrainingDoorAudio(ctx,fx),rangeStart=createRangeStartAudio(ctx,fx);
  const encounters=createTrainingEncounters(ctx,intro);let encounterActive=false;
  const vent=ctx.createOscillator(),vg=ctx.createGain();vent.frequency.value=60;vg.gain.value=.012;vent.connect(vg);vg.connect(fx);vent.start();sources.push(vent);
  function tone(freq,dur,vol,delay=0,type='sine'){
    if(disposed)return;const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+delay;o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(fx);oneShots.add(o);o.onended=()=>{oneShots.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+dur+.01);
  }
  function cue(kind){
    if(disposed)return;
    if(kind.startsWith('door:')){const [,v,pan]=kind.split(':');door.play(+v,+pan);return;}
    if(kind.startsWith('encounter-prepare:')){encounters.prepare(kind.slice(18));return;}
    if(kind.startsWith('encounters:')){
      encounters.sync(kind.slice(11).split(','));
      const active=!!encounters.state().selected;
      if(active!==encounterActive){encounterActive=active;ambient.gain.setTargetAtTime(active?.12:1,ctx.currentTime,active?.2:.8);}
      return;
    }
    const t=ctx.currentTime;if(t-(last.get(kind)??-Infinity)<(kind==='step'?.1:.06))return;last.set(kind,t);
    if(kind==='range-start'){if(!rangeStart.play())tone(2350,.18,.12);}
    else if(kind==='target'){tone(1450,.18,.13);tone(2170,.11,.035);tone(170,.08,.08);}
    else if(kind==='impact'){tone(125,.075,.12,0,'triangle');tone(720,.035,.025);}
    else if(kind==='step'){tone(95,.07,.07,0,'triangle');tone(420,.03,.025);}
    else if(kind==='reset'){tone(180,.16,.045,0,'triangle');tone(660,.07,.035,.14);}
    else {const seq=kind==='spawn'?[440,440]:kind==='clear'?[660,440]:kind==='wake'?[440,550,660]:kind==='blackout'?[330,220]:kind==='open'?[550]:[440,660];seq.forEach((f,i)=>tone(f,.12,.06,i*.16));}
  }
  return{cue,update(volume,paused=false){music.gain.setTargetAtTime(volume*(paused?.16:.32),ctx.currentTime,.12);intro.gain.setTargetAtTime(volume*(paused?.5:1),ctx.currentTime,.12);},
    state:()=>({loopSeconds:length,active:!disposed,looping:loop.loop,cues:Object.fromEntries(last),musicGain:music.gain.value,introGain:intro.gain.value,door:door.state(),rangeStart:rangeStart.state(),encounters:encounters.state()}),
    dispose(){if(disposed)return;disposed=true;encounters.dispose();door.dispose();rangeStart.dispose();intro.disconnect();ambient.disconnect();for(const s of [...sources,...oneShots]){try{s.stop();s.disconnect();}catch{}}music.disconnect();fx.disconnect();}
  };
}
