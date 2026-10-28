import test from 'node:test';
import assert from 'node:assert/strict';
import {createStoryAftermath,recordingFrame} from './story-aftermath.js';

test('rewards stay locked out of playback; only actual recovery unlocks each recording',()=>{
 const m=createStoryAftermath();m.reset('one');
 assert.equal(m.canPlay('convoy-radio'),false);assert.equal(m.canPlay('hiker-camera'),false);
 assert.equal(m.observe({runId:'other',medicalTaken:true,kitRecovered:true}),false);
 assert.equal(m.observe({runId:'one',medicalTaken:'true',kitRecovered:1}),false);
 assert.equal(m.played('one','convoy-radio'),false);
 m.observe({runId:'one',medicalTaken:true});assert(m.canPlay('convoy-radio'));assert(!m.canPlay('hiker-camera'));
 m.observe({runId:'one',kitRecovered:true});assert(m.canPlay('hiker-camera'));assert(!m.canPlay('invented'));
});
test('learned notes advance by evidence without inventing a hiker fate and reset with the run',()=>{
 const m=createStoryAftermath();m.reset(1);assert(Object.values(m.read().notes).every(n=>n===null));
 m.observe({runId:1,medicalTaken:true,kitRecovered:true});assert(!m.played(0,'hiker-camera'));
 m.played(1,'convoy-radio');assert(Object.values(m.read().notes).every(n=>n==='story.pencil.radio'));
 m.played(1,'hiker-camera');assert.equal(m.read().notes['jonas-weber'],'story.pencil.camera.jonas-weber');
 m.observe({runId:1,rangerSearched:true});assert.equal(m.read().notes['ellis-byrne'],'story.pencil.search.ellis-byrne');
 m.observe({runId:1,medicalTaken:false,kitRecovered:false,rangerSearched:false});assert(m.read().medicalTaken);
 const snapshot=m.read();snapshot.notes['maya-costa']='spoiler';assert.notEqual(m.read().notes['maya-costa'],'spoiler');
 m.reset(2);assert(!m.canPlay('hiker-camera'));assert(Object.values(m.read().notes).every(n=>n===null));
});
test('the camera has eight seconds with an empty-lake beat and a final cutters frame',()=>{
 assert.equal(recordingFrame('hiker-camera',0).frame,'camp');
 assert.equal(recordingFrame('hiker-camera',3.2).frame,'lake');
 assert.equal(recordingFrame('hiker-camera',6.8).frame,'mine');
 assert.equal(recordingFrame('hiker-camera',7.999).finished,false);assert.equal(recordingFrame('hiker-camera',8).finished,true);
 assert.equal(recordingFrame('convoy-radio',8).frame,'radio3');
 assert.equal(recordingFrame('hiker-camera',NaN),null);assert.equal(recordingFrame('unknown',0),null);
});
