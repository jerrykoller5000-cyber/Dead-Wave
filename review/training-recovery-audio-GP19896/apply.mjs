import fs from 'node:fs';import crypto from 'node:crypto';
const dir='review/training-recovery-audio-GP19896',hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const specs=[
 {file:'index.html',hash:'289d07fea730cdc0bceffd1e64d232ac5b3138987e0e0778f4403c3c549b01b0',edits:[
  ['createTrainingInfirmaryFence(THREE, training.tg);',"createTrainingInfirmaryFence(THREE, training.tg, { onMotion: up => AudioSys.trainingCue(up ? 'fence-up' : 'fence-down') });"],
  ['if (fence?.moved) { p.x = fence.x;',"if (fence?.moved) { if (Math.hypot(p.x-playerFrameStart.x,p.z-playerFrameStart.z)>.003) AudioSys.trainingCue('fence-bump'); p.x = fence.x;"],
  ["onShot:(turret)=>{ const sa=sndAt(turret.x,turret.z,70);AudioSys.turretShot('m240',sa.v*.42,sa.pan); },","onShot:()=>AudioSys.trainingCue('containment-shot'),"],
  ['if (!training.tg || training.wake) return;\r\n      if (ensureTrainingContainment()?.start()) {', 'if (!training.tg || training.wake) return;\r\n      AudioSys.trainingAlarm(); // GP-19896: replay on death, before cleanup/recovery\r\n      if (ensureTrainingContainment()?.start()) {'],
  ['!!training.deployment?.read() || trainingAlive() > 0);','!!training.deployment?.read() || trainingAlive() > 0 || !!training.wake, !!training.wake);']
 ]},
 {file:'game/training-infirmary-fence.js',hash:'aa539303c1941b74b5d82d2743dd94ea33f0baaeF83f4b5bbd3a54f748aff190'.toLowerCase(),edits:[
  ['createTrainingInfirmaryFence(T,tg) {','createTrainingInfirmaryFence(T,tg,{onMotion=()=>{}}={}) {'],
  ['function setRaised(on) {','function setRaised(on,audible=false) {'],
  ['else if(!on&&i>=0)tg.solids.splice(i,1);}\r\n  }','else if(!on&&i>=0)tg.solids.splice(i,1);}\r\n    if(audible)onMotion(on);\r\n  }'],
  ['lowerForRecovery(){awaitExit=true;setRaised(false);','lowerForRecovery(){awaitExit=true;setRaised(false,true);'],
  ['awaitExit=false;setRaised(true);}\r\n      const want','awaitExit=false;setRaised(true,true);}\r\n      const want']
 ]},
 {file:'ui/training-danger.js',hash:'325ddff3afe60f23ab10b2e9d41e8706a13d7936bd07e0400efae5e6388fed1f',edits:[
  ['const ALARM = 0xff9a32;','const ALARM = 0xff9a32, RECOVERY_ALARM = 0xff3024;'],
  ['const amber = new T.Color(ALARM), normal = new T.Color();','const amber = new T.Color(ALARM), recoveryColor = new T.Color(RECOVERY_ALARM), normal = new T.Color();'],
  ['let active = false, amount = 0, time = 0, pulse = 0;\r\n  function update(dt, on) {\r\n    active = !!on;','let active = false, amount = 0, time = 0, pulse = 0, recovery = false;\r\n  function update(dt, on, recovering = false) {\r\n    if (recovery !== !!recovering) {\r\n      recovery = !!recovering;\r\n      for (const b of beams) { b.light.color.setHex(recovery ? RECOVERY_ALARM : ALARM); b.glow.color.copy(b.light.color); }\r\n    }\r\n    const alarm = recovery ? recoveryColor : amber;\r\n    active = !!on || recovery;'],
  ['.lerp(amber, amount);','.lerp(alarm, amount);',2],
  ['mat.color.copy(amber); mat.emissive.copy(amber);','mat.color.copy(alarm); mat.emissive.copy(alarm);'],
  ['lights: beams.length, color: ALARM,','lights: beams.length, color: recovery ? RECOVERY_ALARM : ALARM,']
 ]},
 {file:'core/audio.js',hash:'f72683e8f425fd608439059408a768a0c648d3b364be111d5cf614c01bdc6bd0',edits:[
  ["import { createTrainingAudio } from '../ui/training-audio.js';","import { createTrainingAudio } from '../ui/training-audio.js';\r\nimport { createTrainingFacilityAudio } from '../ui/training-facility-audio.js';"],
  ['let trainingMode=false,trainingSound=null;','let trainingMode=false,trainingSound=null,trainingFacility=null;'],
  ['if(trainingMode){trainingSound?.update(muted?0:userMusic,!!state.paused);return;}','if(trainingMode){trainingSound?.update(muted?0:userMusic,!!state.paused);trainingFacility?.tick(muted||!!state.paused);return;}'],
  ['trainingSound.update(userMusic);}','trainingSound.update(userMusic);\r\n        trainingFacility=createTrainingFacilityAudio({clock:()=>c.currentTime,\r\n          move:up=>trainingSound.cue(\'door:\'+(up?1:.9)+\':0\'),\r\n          bump:()=>tk(\'build-attacks/wire-hit\',.6),\r\n          shot:()=>fireWeapon(\'minigun\',{v:1}),\r\n          motor:on=>on?bed(\'training-containment\',\'weapons/rotary-gun\',1.4,{bus:weapBus,tc:.08}):stopBed(\'training-containment\',.15)});\r\n        takes.init().then(()=>takes.preload([\'build-attacks/wire-hit\',\'weapons/rotary-gun\'])).catch(()=>{});\r\n      }'],
  ['trainingSound?.dispose();trainingSound=null;','trainingFacility?.reset();trainingFacility=null;\r\n      trainingSound?.dispose();trainingSound=null;'],
  ['if(trainingMode&&!muted){if(TRAIN_TAKE[kind]','if(trainingMode&&!muted){if(trainingFacility?.cue(kind))return;if(TRAIN_TAKE[kind]'],
  ['enabled:trainingMode,...trainingSound?.state()','enabled:trainingMode,...trainingSound?.state(),facility:trainingFacility?.state()']
 ]}
];
const prepared=specs.map(s=>{const before=fs.readFileSync(s.file,'utf8');if(hash(before)!==s.hash)throw Error('Changed: '+s.file);const eol=before.includes('\r\n')?'\r\n':'\n';let after=before;for(const[rawA,rawB,count=1]of s.edits){const a=rawA.replace(/\r?\n/g,eol),b=rawB.replace(/\r?\n/g,eol);if(after.split(a).length-1!==count)throw Error('Bad anchor '+s.file+': '+a);after=after.replaceAll(a,b);}return {...s,before,after};});
for(const s of prepared){if(fs.readFileSync(s.file,'utf8')!==s.before)throw Error('Source changed');fs.writeFileSync(dir+'/'+s.file.replaceAll('/','_')+'.before.txt',s.before);fs.writeFileSync(s.file,s.after);}
fs.writeFileSync(dir+'/scope-proof.json',JSON.stringify(prepared.map(s=>({file:s.file,before:hash(s.before),after:hash(s.after),edits:s.edits})),null,2));console.log('Applied focused audio/fence/recovery lighting edits');
