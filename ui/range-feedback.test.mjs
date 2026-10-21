import test from 'node:test';import assert from 'node:assert/strict';
import {createRangeStartAudio} from './range-start-audio.js';
import {createRangeBarrierFeedback} from './range-barrier-feedback.js';
import {rangeConsolePlacement} from './range-targets.js';
const tg={floorY:-200,origin:{x:0,y:-200,z:-640},stations:{lightSwitch:{x:-7.98,z:-645.95,yaw:Math.PI/2}},solids:[{firingLine:true,minX:-8,maxX:8,minZ:-639.82}]};
test('bench contact rattles once per jump, rearms on landing, and ignores normal movement and other rooms',()=>{
 let n=0;const a=createRangeBarrierFeedback(tg,()=>n++),tick=(x,y,z,extra={})=>a.tick({position:{x,y,z},...extra});
 tick(0,-200,-640.24);tick(0,-199,-641);tick(-10,-199,-640.24);assert.equal(n,0);
 for(let i=0;i<60;i++)tick(0,-199,-640.24);assert.equal(n,1);
 tick(0,-200,-640.24);tick(0,-199.8,-640.24);assert.equal(n,2);
 tick(0,-200,-640.24);tick(0,-199,-640.24,{paused:true});tick(0,-199,-640.24,{alive:false});tick(0,-199,-640.24,{inTraining:false});assert.equal(n,2);
});
test('control box sits left of the lights in the wall frame and points into the firing range',()=>{
 const a=rangeConsolePlacement(tg),s=tg.stations.lightSwitch;
 assert(Math.abs(a.z-(-4.6))<1e-9);assert(a.z>s.z-tg.origin.z);assert(a.x> -7.98&&a.x< -7.8);assert.equal(a.yaw,s.yaw);assert.equal(a.nx,1);
 // Left/right follows the wall orientation rather than a fixed world axis.
 const b=rangeConsolePlacement({...tg,stations:{lightSwitch:{x:2,z:-645,yaw:0}}});assert(Math.abs(b.x-.65)<1e-9);assert(b.z> -5);
});
function audioContext(){
 const sources=[],gains=[];let decodes=0;
 const ctx={currentTime:4,decodeAudioData:async()=>{decodes++;return {duration:.3};},createBufferSource(){const s={connect(){},disconnect(){s.disconnected=true;},start(t){s.at=t;},stop(){s.stopped=true;s.onended?.();}};sources.push(s);return s;},createGain(){const g={gain:{value:0},connect(o){g.output=o;},disconnect(){g.disconnected=true;}};gains.push(g);return g;}};
 return {ctx,sources,gains,decodes:()=>decodes};
}
test('recording decodes once, starts on the current audio clock, routes through effects, and stops on dispose',async()=>{
 const f=audioContext(),output={},loads={n:0},loadFile=async()=>{loads.n++;return new ArrayBuffer(8);};
 const a=createRangeStartAudio(f.ctx,output,{loadFile}),b=createRangeStartAudio(f.ctx,output,{loadFile});assert.equal(a.play(),false);await Promise.all([a.ready,b.ready]);
 assert.equal(loads.n,1);assert.equal(f.decodes(),1);assert.equal(a.state().seconds,.3);assert(a.play());assert.equal(f.sources[0].at,4);assert.equal(f.gains[0].output,output);
 a.dispose();assert(f.sources[0].stopped&&f.sources[0].disconnected&&f.gains[0].disconnected);assert.equal(a.play(),false);assert.equal(a.state().active,0);b.dispose();
});
test('disposing before decode cannot leave a playable recording behind',async()=>{
 let release;const f=audioContext(),a=createRangeStartAudio(f.ctx,{}, {loadFile:()=>new Promise(r=>release=r)});await Promise.resolve();a.dispose();release(new ArrayBuffer(8));await a.ready;assert.equal(a.state().ready,false);assert.equal(a.play(),false);
});
