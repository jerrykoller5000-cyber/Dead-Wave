import fs from 'node:fs';
function edit(file, edits) {
  const original = fs.readFileSync(file, 'utf8'); let text = original;
  for (const [before, after] of edits) {
    if (!text.includes(before) || text.indexOf(before) !== text.lastIndexOf(before)) throw Error('Nonunique anchor: ' + before);
    text = text.replace(before, after);
  }
  if (fs.readFileSync(file, 'utf8') !== original) throw Error('File changed: ' + file);
  fs.writeFileSync(file, text);
}
edit('ui/training-audio.js', [
  ['const scoreCache=new WeakMap();', "import { createTrainingEncounter } from './training-encounter.js';\r\nconst scoreCache=new WeakMap();"],
  ['loop.connect(music);loop.start();sources.push(loop);', 'const ambient=ctx.createGain();ambient.connect(music);loop.connect(ambient);loop.start();sources.push(loop);\r\n  const encounter=createTrainingEncounter(ctx,music);let demonActive=false;'],
  ["    if(disposed)return;const t=ctx.currentTime;if(t-(last.get(kind)", "    if(disposed)return;\r\n    if(kind==='demon-active'||kind==='demon-inactive'){\r\n      const active=kind==='demon-active';encounter.setActive(active);\r\n      if(active!==demonActive){demonActive=active;ambient.gain.setTargetAtTime(active?.12:1,ctx.currentTime,active?.2:.8);}\r\n      return;\r\n    }\r\n    const t=ctx.currentTime;if(t-(last.get(kind)"],
  ['musicGain:music.gain.value})', 'musicGain:music.gain.value,demon:encounter.state()})'],
  ['dispose(){if(disposed)return;disposed=true;', 'dispose(){if(disposed)return;disposed=true;encounter.dispose();ambient.disconnect();']
]);
edit('index.html', [
  ['      training.security?.tick(dt);', "      training.security?.tick(dt);\r\n      // GP-192: keep desired music state current, including after mute, deaths and room clears.\r\n      AudioSys.trainingCue(zombies.some(z => z.trainingZ && z.alive && z.typeKey === 'demon') ? 'demon-active' : 'demon-inactive');"]
]);
