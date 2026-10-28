// GP-19974: remembered evidence, separate from the mission's rewards and lead rules.
import {HIKERS} from './hikers.js';

export const RECORDING_SECONDS=8;
export const RECORDING_KINDS=Object.freeze(['convoy-radio','hiker-camera']);
export function recordingFrame(kind,seconds) {
 if(!RECORDING_KINDS.includes(kind)||!Number.isFinite(seconds))return null;
 const at=Math.max(0,Math.min(RECORDING_SECONDS,seconds));
 const frame=kind==='convoy-radio'?(at<2.6?'radio1':at<5.3?'radio2':'radio3'):
  at<3.2?'camp':at<6.8?'lake':'mine';
 return {kind,at,frame,captionKey:'story.recording.'+frame,finished:at>=RECORDING_SECONDS};
}

export function createStoryAftermath() {
 let runId=null,medicalTaken=false,kitRecovered=false,rangerSearched=false,radioHeard=false,cameraViewed=false;
 const reset=id=>{runId=id;medicalTaken=kitRecovered=rangerSearched=radioHeard=cameraViewed=false;};
 const read=()=>({runId,medicalTaken,kitRecovered,rangerSearched,radioHeard,cameraViewed,
  notes:Object.fromEntries(HIKERS.map(h=>[h.id,rangerSearched?'story.pencil.search.'+h.id:
   cameraViewed?'story.pencil.camera.'+h.id:radioHeard?'story.pencil.radio':null]))});
 const observe=facts=>{
  if(runId===null||facts?.runId!==runId)return false;
  const before=[medicalTaken,kitRecovered,rangerSearched].join();
  medicalTaken ||= facts.medicalTaken===true;kitRecovered ||= facts.kitRecovered===true;rangerSearched ||= facts.rangerSearched===true;
  return before!==[medicalTaken,kitRecovered,rangerSearched].join();
 };
 const canPlay=kind=>kind==='convoy-radio'?medicalTaken:kind==='hiker-camera'?kitRecovered:false;
 const played=(id,kind)=>{
  if(id!==runId||!canPlay(kind))return false;
  if(kind==='convoy-radio')radioHeard=true;else cameraViewed=true;return true;
 };
 return {reset,read,observe,canPlay,played};
}
