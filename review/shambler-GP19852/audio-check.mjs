import fs from 'node:fs';import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'900x650'}),proof={};
try{
  await E.open();
  proof.synth=await E.ev(`const results=[];const originalAC=window.AudioContext,originalTimer=window.setTimeout;const kinds=['shambler','feral','leaper','brute','military','drowned','spitter','bomber','screamer','spider','colossus','demon','guardian','caveguard'];
    try{for(const kind of kinds){
      const off=new OfflineAudioContext(2,4*24000,24000);window.AudioContext=function(){return off;};window.setTimeout=()=>0;
      const {AudioSys:A}=await import('/core/audio.js?deathGP19852='+kind);A.zombieDeath(1,0,false,kind,{});
      window.setTimeout=originalTimer;const buffer=await off.startRendering(),d=buffer.getChannelData(0);
      let early=0,late=0;for(let i=0;i<d.length;i++){if(i<2*24000)early=Math.max(early,Math.abs(d[i]));if(i>2.12*24000)late=Math.max(late,Math.abs(d[i]));}
      if(!(early>.00001&&late<.000001))throw Error(kind+' bad death envelope '+early+' / '+late);
      results.push({kind,early,late});
    }}finally{window.AudioContext=originalAC;window.setTimeout=originalTimer;}return results;`,60000);
  proof.takes=await E.ev(`const {createTakeBank}=await import('/core/takes.js');const results=[];
    for(const [id,duration,rate] of [['zombies/shambler/death',5,.75],['zombies/guardian/death',5,1.3],['zombies/feral/death',.65,.8],['zombies/shambler/hurt',3,1],['impacts/body-fall',3,1]]){
      const c=new OfflineAudioContext(1,5*24000,24000),b=c.createBuffer(1,duration*24000,24000);b.getChannelData(0).fill(.2);const sources=[];
      const make=c.createBufferSource.bind(c);c.createBufferSource=()=>{const s=make();sources.push(s);return s;};
      const bank=createTakeBank({getCtx:()=>c,connect:g=>g.connect(c.destination),fetchJson:async url=>{if(url==='__zsounds')return {files:[id+'/a.wav']};throw Error('no levels');},fetchBytes:async()=>new ArrayBuffer(0)});
      c.decodeAudioData=(bytes,cb)=>{cb(b);return Promise.resolve(b);};await bank.init();await bank.load(id);bank.setUse(id,true);bank.play(id,1,0,.2,null,0,rate);
      const decoded=await c.startRendering(),d=decoded.getChannelData(0);let early=0,late=0;for(let i=0;i<d.length;i++){if(i>.25*24000&&i<.4*24000)early=Math.max(early,Math.abs(d[i]));if(i>2.25*24000)late=Math.max(late,Math.abs(d[i]));}
      const death=id.endsWith('/death');if(!(early>.01&&(death?late<1e-6:late>.01)))throw Error(id+' recorded cutoff '+early+'/'+late);
      results.push({id,duration,pitchedSeconds:duration/sources[0].playbackRate.value,early,late});
    }return results;`,30000);
  proof.errors=E.page.errors;console.log(JSON.stringify(proof));
}finally{fs.writeFileSync('review/shambler-GP19852/audio-proof.json',JSON.stringify(proof,null,2));await E.close();}
process.exit(0);
