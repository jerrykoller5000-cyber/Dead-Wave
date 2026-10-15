import fs from 'node:fs';
import crypto from 'node:crypto';
const file = 'studio/inspector/README.md'; const before = fs.readFileSync(file, 'utf8'); const hash = s => crypto.createHash('sha256').update(s).digest('hex'); let after = before;
for (const [old, next] of [
  ['  game moves him, the inspector puts him back on the stage. *Loop the move* replays it every few seconds.', '  game moves him, the inspector puts him back on the stage. *Loop the move* replays it every few seconds.\n  **Stop / clear holds** cancels pending inputs, releases holds and cleans up inspector-created mounts, carried weapons,\n  replacement props, placement ghosts and the knockout/bed-exit state.'],
  ["  swing, the draw, the grenade's phases.", "  swing, the draw, the grenade's phases.\n- **Close-up views**: head, torso, hands, back and boots follow the live joints as the pose changes. **Frame (F)** fits\n  the actual posed marine from the current angle, including a dive, vault or ground pose."]
]) { if (after.split(old).length !== 2) throw new Error('Expected one: ' + old); after = after.replace(old, next); }
if (hash(fs.readFileSync(file, 'utf8')) !== hash(before)) throw new Error('Fresh README changed');
fs.writeFileSync(file, after, 'utf8'); console.log(file + ' updated ' + hash(after));
