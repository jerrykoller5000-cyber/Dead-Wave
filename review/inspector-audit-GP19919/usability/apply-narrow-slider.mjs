import fs from 'node:fs';
import crypto from 'node:crypto';
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
for (const [file, patches] of [
  ['studio/inspector/inspector.css', [
    ['.dwi-tab { flex: 1; }', '.dwi-tab { flex: 1 1 0; min-width: 0; padding: 4px 5px; }'],
    ['.dwi-slider { grid-template-columns: 112px 1fr 44px; }', '.dwi-slider { grid-template-columns: 112px minmax(0, 1fr) 44px; }\n.dwi-slider input { width: 100%; min-width: 0; }'],
    ['.dwi-slider { grid-template-columns: 85px 1fr 36px; }', '.dwi-slider { grid-template-columns: 85px minmax(0, 1fr) 36px; }\n  .dwi-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }']
  ]],
  ['studio/inspector/README.md', [
    ['the game moves him, the inspector puts him back on the stage. *Loop the move* replays it every few seconds.', 'the game moves him, the inspector puts him back on the stage. *Loop the move* replays it every few seconds.\n  **Stop / clear holds** cancels pending inputs, releases holds and cleans up inspector-created mounts, carried weapons,\n  replacement props, placement ghosts and the knockout/bed-exit state.'],
    ['  swing, the draw, the grenade\'s phases.', '  swing, the draw, the grenade\'s phases.\n- **Close-up views**: head, torso, hands, back and boots follow the live joints as the pose changes. **Frame (F)** fits\n  the actual posed marine from the current angle, including a dive, vault or ground pose.']
  ]]
]) {
  const before = fs.readFileSync(file, 'utf8'); let after = before;
  for (const [old, next] of patches) { if (after.split(old).length !== 2) throw new Error('Expected one: ' + old); after = after.replace(old, next); }
  if (hash(fs.readFileSync(file, 'utf8')) !== hash(before)) throw new Error('Fresh source changed: ' + file);
  fs.writeFileSync(file, after, 'utf8'); console.log(file + ' updated ' + hash(after));
}
