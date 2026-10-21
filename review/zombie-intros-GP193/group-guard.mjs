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
edit('index.html', [["    function trainingSpawn(kind, count) {\r\n      if (!training.active || training.wake || !training.tg || !Object.hasOwn(ZOMBIE_TYPES, kind)) return 0;", "    function trainingSpawn(kind, count) {\r\n      if (!training.active || training.wake || !training.tg || trainingAlive() > 0 || !Object.hasOwn(ZOMBIE_TYPES, kind)) return 0;"]]);
edit('ui/training-panel.js', [
  ['    const queued = pending();\r\n    spawnBtn.disabled = !pick || !!queued;', "    const queued = pending(), n = alive();\r\n    spawnBtn.disabled = !pick || !!queued || n > 0;\r\n    spawnBtn.title = n > 0 ? text('training.finishGroup') : '';"],
  ['    const n = alive();\r\n', ''],
  ["say('training.alive', { count: n }, '{count} in the build room') :", "say('training.alive', { count: n }, '{count} in the build room') + ' · ' + text('training.finishGroup') :"],
  ['if (pick) onSpawn(pick, count); hide();', 'if (!pick || pending() || alive() > 0) { render(); return; } onSpawn(pick, count); hide();']
]);
edit('ui/strings.js', [[ '  "training.spawn":', '  "training.finishGroup": "Defeat or clear this group before calling another.",\r\n  "training.spawn":' ]]);
