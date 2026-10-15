import fs from 'node:fs';import crypto from 'node:crypto';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),changes=[];
function edit(path,patches){const original=fs.readFileSync(path,'utf8');let result=original;for(const [oldText,newText] of patches){if(result.split(oldText).length!==2)throw Error('Missing/nonunique anchor '+path+' '+oldText.slice(0,50));result=result.replace(oldText,newText);}changes.push({path,original,result});}
edit('ui/range-feature.js',[
 ["import {text} from './strings.js';","import {text} from './strings.js';\nimport {AudioSys} from '../core/audio.js';\nimport {createRangeBarrierFeedback} from './range-barrier-feedback.js';"],
 [" let lease=null,lastDrill=null,pending=null,entry=null,ui;"," const audio=env.audio||AudioSys,barrier=createRangeBarrierFeedback(tg,()=>audio.trainingCue('fence-bump'));\n let lease=null,lastDrill=null,pending=null,entry=null,ui;"],
 ["cue:kind=>{if(kind==='start')env.refill(lastDrill?.weapon);env.cue(kind);env.publish(kind,session.snapshot());}","cue:kind=>{if(kind==='start'){env.refill(lastDrill?.weapon);audio.trainingCue('range-start');}else env.cue(kind);env.publish(kind,session.snapshot());}"],
 ["tick(dt){const c=env.context();prop.update", "tick(dt){const c=env.context();barrier.tick(c);prop.update"],
 ["dispose(){session.reset();if(lease)","dispose(){barrier.reset();session.reset();if(lease)"]
]);
edit('ui/training-audio.js',[
 ["import { createTrainingDoorAudio } from './training-door-audio.js';","import { createTrainingDoorAudio } from './training-door-audio.js';\nimport { createRangeStartAudio } from './range-start-audio.js';"],
 ["const door=createTrainingDoorAudio(ctx,fx);","const door=createTrainingDoorAudio(ctx,fx),rangeStart=createRangeStartAudio(ctx,fx);"],
 ["    if(kind==='target'){", "    if(kind==='range-start'){if(!rangeStart.play())tone(2350,.18,.12);}\n    else if(kind==='target'){"],
 ["door:door.state(),encounters:encounters.state()", "door:door.state(),rangeStart:rangeStart.state(),encounters:encounters.state()"],
 ["disposed=true;encounters.dispose();door.dispose();", "disposed=true;encounters.dispose();door.dispose();rangeStart.dispose();"]
]);
edit('ui/range-targets.js',[
 ["export function createRangeProp(T,tg,labels){",`export function rangeConsolePlacement(tg){
 const O=tg.origin,s=tg.stations.lightSwitch,yaw=s.yaw,nx=Math.sin(yaw),nz=Math.cos(yaw);
 // Left when facing the switch: opposite the panel's local right axis.
 return {x:s.x-O.x+nx*.115-Math.cos(yaw)*1.35,y:1.4,z:s.z-O.z+nz*.115+Math.sin(yaw)*1.35,yaw,nx,nz};
}
export function createRangeProp(T,tg,labels){`],
 ["g.position.set(0,1.4,-11.82);", "const at=rangeConsolePlacement(tg);g.position.set(at.x,at.y,at.z);g.rotation.y=at.yaw;"],
 ["const O=tg.origin;tg.stations.rangeConsole={x:O.x,y:O.y,z:O.z-11.82,yaw:0,front:{x:O.x,y:O.y,z:O.z-10.45}};", "const O=tg.origin,x=O.x+at.x,z=O.z+at.z;tg.stations.rangeConsole={x,y:O.y,z,yaw:at.yaw,front:{x:x+at.nx*1.35,y:O.y,z:z+at.nz*1.35}};"],
 ["const solid={minX:O.x-.68,maxX:O.x+.68,minY:O.y+.8,maxY:O.y+2,minZ:O.z-11.94,maxZ:O.z-11.7,prop:true,metal:true};", "const halfX=Math.abs(Math.cos(at.yaw))*.675+Math.abs(at.nx)*.11,halfZ=Math.abs(at.nx)*.675+Math.abs(at.nz)*.11;\n const solid={minX:x-halfX,maxX:x+halfX,minY:O.y+.825,maxY:O.y+1.975,minZ:z-halfZ,maxZ:z+halfZ,prop:true,metal:true};"],
 ["let opacity=1;", "let opacity=1;const axis=Math.abs(at.nx)>.5?'x':'z',plane=axis==='x'?x:z,bounds=axis==='x'?[['z',z-.9,z+.9],['y',O.y,O.y+6]]:[['x',x-.9,x+.9],['y',O.y,O.y+6]];"],
 ["viewCrossesPlane(camera,player,'z',O.z-11.82,[['x',O.x-.9,O.x+.9],['y',O.y,O.y+6]])", "viewCrossesPlane(camera,player,axis,plane,bounds)"]
]);
for(const r of changes)if(hash(fs.readFileSync(r.path,'utf8'))!==hash(r.original))throw Error('Changed during edit '+r.path);
for(const r of changes)fs.writeFileSync(r.path,r.result,'utf8');
fs.writeFileSync('review/range-cues-GP19908/changes.json',JSON.stringify(changes.map(r=>({file:r.path,before:hash(r.original),after:hash(r.result)})),null,2));
console.log('APPLIED three UI files; world, index and core audio unchanged.');
