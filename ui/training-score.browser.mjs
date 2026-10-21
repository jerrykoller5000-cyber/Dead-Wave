// GP-153: real audio graph plus short in-game routing/lifecycle check.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';import{serve}from'../tools/serve.mjs';
const{chromium}=createRequire(import.meta.url)('playwright'),out='review/training-sound/military',srv=await serve(process.cwd(),0);let browser;
const timeout=setTimeout(()=>{console.error('Training score check timed out');process.exit(2);},115000);
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(srv.origin+'/tools/blank.html');
 const rendered=await p.evaluate(async()=>{
  const{createTrainingAudio}=await import('/ui/training-audio.js');
  const c=new OfflineAudioContext(2,24000*24,24000),silent=c.createGain();silent.gain.value=0;silent.connect(c.destination);
  // Capture the real source, not a separate approximation of the score.
  const original=c.createBufferSource.bind(c),sources=[];c.createBufferSource=()=>{const s=original();sources.push(s);return s;};
  const began=performance.now(),a=createTrainingAudio(c,c.destination,silent);a.update(1);
  const buildMs=performance.now()-began,first=sources[0].buffer;
  const b=createTrainingAudio(c,silent,silent),cached=sources[1].buffer===first;b.dispose();
  const buffer=await c.startRendering();a.dispose();
  return{channels:[Array.from(buffer.getChannelData(0)),Array.from(buffer.getChannelData(1))],buildMs,cached,disposed:!a.state().active};
 });
 assert(rendered.cached&&rendered.disposed);
 const frames=rendered.channels[0].length,wav=Buffer.alloc(44+frames*4);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(24000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
 let peak=0,energy=0;for(let i=0;i<frames;i++)for(let c=0;c<2;c++){const v=rendered.channels[c][i];assert(Number.isFinite(v)&&Math.abs(v)<1);peak=Math.max(peak,Math.abs(v));energy+=v*v;wav.writeInt16LE(Math.round(v*32767),44+(i*2+c)*2);}
 fs.writeFileSync(out+'/training-military.wav',wav);
 await p.goto(srv.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:60000});
 await p.evaluate(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Audio check';document.getElementById('modeTraining').click();});
 await p.waitForFunction(()=>TT.trainingDbg.state().active&&!document.getElementById('trainingBlackout')?.classList.contains('on'));
 const live=await p.evaluate(async()=>{
  const{AudioSys:A}=await import('/core/audio.js');
  const state=A.trainingState(),music=A.musicState(),mix=A.mixState();
  const proto=AudioContext.prototype,original=proto.createOscillator;let count=0;proto.createOscillator=function(...a){count++;return original.apply(this,a);};
  A.scream();A.thunder();A.distantGroan();A.musicCue('clear');const blocked=count;
  A.trainingCue('target');const cues=count-blocked;A.setMuted(true);A.trainingCue('spawn');const muted=count-blocked-cues;A.setMuted(false);proto.createOscillator=original;
  const volume=A.getVolumes().music;A.setMusicVolume(0);A.updateMusic(.016,{paused:false});
  await new Promise(r=>setTimeout(r,850));const zeroMusicGain=A.trainingState().musicGain;
  A.setMusicVolume(volume);A.updateMusic(.016,{paused:false});await new Promise(r=>setTimeout(r,500));const restoredMusicGain=A.trainingState().musicGain;
  TT.trainingDbg.leave();return{state,worldPlaying:music.playing,worldTrack:music.front,ambient:mix.amb,blocked,cues,muted,zeroMusicGain,restoredMusicGain,exit:A.trainingState()};
 });
 assert(live.state.enabled&&live.state.looping&&live.state.loopSeconds===24);assert.equal(live.worldPlaying,false);assert.equal(live.worldTrack,null);assert.equal(live.ambient,0);assert.equal(live.blocked,0);assert(live.cues>0);assert.equal(live.muted,0);assert(live.zeroMusicGain<.001);assert(live.restoredMusicGain>.01);assert.equal(live.exit.enabled,false);assert.deepEqual(errors,[]);
 const result={live,peak,rms:Math.sqrt(energy/(frames*2)),buildMs:rendered.buildMs,cached:rendered.cached,disposed:rendered.disposed,errors};fs.writeFileSync(out+'/checks.json',JSON.stringify(result,null,2));console.log('PASS training score: actual stereo WAV, cache/disposal, live routing, world isolation, target cues, mute, clean exit; zero page errors. '+JSON.stringify(result));
}finally{clearTimeout(timeout);await browser?.close();srv.close();}
