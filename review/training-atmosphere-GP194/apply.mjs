import fs from 'node:fs';
function edit(file, edits){const original=fs.readFileSync(file,'utf8'),nl=original.includes('\r\n')?'\r\n':'\n';let s=original.replace(/\r\n/g,'\n');
 for(const [a,b]of edits){if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error('anchor '+a);s=s.replace(a,b);}
 if(fs.readFileSync(file,'utf8')!==original)throw Error('changed '+file);
 fs.writeFileSync(file,s.replace(/\n/g,nl));}
edit('world/training.js',[
 ["  const lampMat = std({ color: 0xffffff, emissive: 0xf4fbff, emissiveIntensity: 0.8, roughness: 0.3 });","  const lampMat = std({ color: 0xffffff, emissive: 0xf4fbff, emissiveIntensity: 0.8, roughness: 0.3 });\n  const buildLampMat = std({ color: 0xffffff, emissive: 0xf4fbff, emissiveIntensity: 0.8, roughness: 0.3 });"],
 ['    const l = add(new T.PlaneGeometry(len, 0.1), lampMat,','    const roomLamp = cx + nx * .1 < B.maxX ? buildLampMat : lampMat;\n    const l = add(new T.PlaneGeometry(len, 0.1), roomLamp,'],
 ['if (h > H) { const l2 = add(new T.PlaneGeometry(len, 0.1), lampMat,','if (h > H) { const l2 = add(new T.PlaneGeometry(len, 0.1), roomLamp,'],
 ['sign, steel, steelLight, hazard, lampMat, labels: opts.labels','sign, steel, steelLight, hazard, lampMat: buildLampMat, labels: opts.labels'],
 ['new T.CircleGeometry(0.58, 16), lampMat,','new T.CircleGeometry(0.58, 16), buildLampMat,'],
 ['    pilotMat.emissiveIntensity = lit ? 0 : 1.8;','    buildLampMat.color.copy(lampMat.color);buildLampMat.emissiveIntensity=lampMat.emissiveIntensity;\n    pilotMat.emissiveIntensity = lit ? 0 : 1.8;'],
 ['group: g, origin: O, floorY: O.y, walk,','group: g, origin: O, floorY: O.y, buildLamp: buildLampMat, walk,']
]);
edit('ui/training-audio.js',[
 ["import { createTrainingEncounters } from './training-encounter.js';","import { createTrainingEncounters } from './training-encounter.js';\nimport { createTrainingDoorAudio } from './training-door-audio.js';"],
 ['const encounters=createTrainingEncounters(ctx,music);','const intro=ctx.createGain();intro.gain.value=0;intro.connect(musicOut);\n  const door=createTrainingDoorAudio(ctx,fx);\n  const encounters=createTrainingEncounters(ctx,intro);'],
 ["    if(kind.startsWith('encounter-prepare:'))", "    if(kind.startsWith('door:')){const [,v,pan]=kind.split(':');door.play(+v,+pan);return;}\n    if(kind.startsWith('encounter-prepare:'))"],
 ['music.gain.setTargetAtTime(volume*(paused?.16:.32),ctx.currentTime,.12);','music.gain.setTargetAtTime(volume*(paused?.16:.32),ctx.currentTime,.12);intro.gain.setTargetAtTime(volume*(paused?.5:1),ctx.currentTime,.12);'],
 ['musicGain:music.gain.value,encounters:', 'musicGain:music.gain.value,introGain:intro.gain.value,door:door.state(),encounters:'],
 ['disposed=true;encounters.dispose();','disposed=true;encounters.dispose();door.dispose();intro.disconnect();']
]);
edit('index.html',[
 ["    import { createTrainingRelease } from './ui/training-release.js';", "    import { createTrainingDanger } from './ui/training-danger.js';\n    import { createTrainingRelease } from './ui/training-release.js';"],
 ['      if (!training.security) {\n        const door = training.tg.securityDoor;', '      if (!training.danger) training.danger = createTrainingDanger(THREE, training.tg, training.copies.alarmBeacon);\n      training.danger.reset();\n      if (!training.security) {\n        const door = training.tg.securityDoor;'],
 ['      training.active = false;\n      training.doorQuiet', '      training.active = false;\n      training.danger?.reset();\n      training.doorQuiet'],
 ["      AudioSys.clip(state.open ? 'securityDoorOpen' : 'securityDoorClose', Math.max(0.35, sa.v), sa.pan);", "      AudioSys.trainingCue('door:' + Math.max(0.35, sa.v) + ':' + sa.pan);"],
 ["      // GP-193: preload during the alarm;", "      training.danger?.update(paused || shopOpen || cifOpen ? 0 : dt, !!training.deployment?.read() || trainingAlive() > 0);\n      // GP-193: preload during the alarm;"],
 ['      updateTacticalHud();\n    }\n\n    // CL-76', '      if (training.active) training.danger?.dim([sun, hemi, ambientFill, moon]);\n      updateTacticalHud();\n    }\n\n    // CL-76']
]);
