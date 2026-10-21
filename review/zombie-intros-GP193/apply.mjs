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
  ["import { createTrainingEncounter }", "import { createTrainingEncounters }"],
  ['const encounter=createTrainingEncounter(ctx,music);let demonActive=false;', 'const encounters=createTrainingEncounters(ctx,music);let encounterActive=false;'],
  ["    if(kind==='demon-active'||kind==='demon-inactive'){\r\n      const active=kind==='demon-active';encounter.setActive(active);\r\n      if(active!==demonActive){demonActive=active;ambient.gain.setTargetAtTime(active?.12:1,ctx.currentTime,active?.2:.8);}",
   "    if(kind.startsWith('encounter-prepare:')){encounters.prepare(kind.slice(18));return;}\r\n    if(kind.startsWith('encounters:')){\r\n      encounters.sync(kind.slice(11).split(','));\r\n      const active=!!encounters.state().selected;\r\n      if(active!==encounterActive){encounterActive=active;ambient.gain.setTargetAtTime(active?.12:1,ctx.currentTime,active?.2:.8);}"],
  ['demon:encounter.state()', 'encounters:encounters.state()'],
  ['encounter.dispose();', 'encounters.dispose();']
]);
edit('index.html', [
  ["      // GP-192: keep desired music state current, including after mute, deaths and room clears.\r\n      AudioSys.trainingCue(zombies.some(z => z.trainingZ && z.alive && z.typeKey === 'demon') ? 'demon-active' : 'demon-inactive');",
   "      // GP-193: preload during the alarm; release/deaths keep each type's music current.\r\n      const musicPending = training.deployment?.read();\r\n      if (musicPending) AudioSys.trainingCue('encounter-prepare:' + musicPending.kind);\r\n      AudioSys.trainingCue('encounters:' + zombies.filter(z => z.trainingZ && z.alive).map(z => z.typeKey).join(','));"]
]);
