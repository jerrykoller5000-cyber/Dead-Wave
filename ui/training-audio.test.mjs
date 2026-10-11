import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTrainingScore} from './training-audio.js';

for(const rate of [24000,44100,48000])test(`training score: finite, unclipped stereo and quiet loop seam at ${rate} Hz`,()=>{
  const {seconds,channels}=buildTrainingScore(rate);
  assert.equal(seconds,24);assert.equal(channels.length,2);
  let peak=0,energy=0,difference=0;
  for(const c of channels){
    assert.equal(c.length,seconds*rate);
    for(const v of c){assert(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));energy+=v*v;}
    assert(Math.abs(c[0]-c.at(-1))<.005,'no large discontinuity at wrap');
  }
  for(let i=0;i<channels[0].length;i++)difference+=Math.abs(channels[0][i]-channels[1][i]);
  const rms=Math.sqrt(energy/(2*seconds*rate));
  assert(peak>.05&&peak<.5,`peak ${peak}`);assert(rms>.01&&rms<.10,`RMS ${rms}`);
  assert(difference/channels[0].length>.001,'stereo width remains present');
});
test('training score is reproducible without using world randomness',()=>{
  const original=Math.random;Math.random=()=>{throw Error('world randomness used');};
  try{assert.deepEqual(buildTrainingScore(8000),buildTrainingScore(8000));}finally{Math.random=original;}
});
