import fs from 'node:fs';
import crypto from 'node:crypto';
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
for (const [file, patches] of [
  ['studio/inspector/marine.js', [
    ["holdKey('KeyW', true); key('keydown', 'Space'); await wait(0.15); key('keyup', 'Space'); holdKey('KeyW', false);", "holdKey('KeyW', true); holdKey('Space', true); await wait(0.15); holdKey('Space', false); holdKey('KeyW', false);"],
    ["blade: s && T.isKatanaOwned && T.isKatanaOwned() ? 'katana' : 'knife or machete'", "blade: T.isKatanaOwned && T.isKatanaOwned() ? 'katana' : T.isMacheteOwned && T.isMacheteOwned() ? 'machete' : 'knife'"]
  ]],
  ['studio/inspector/ui.js', [["'aria-expanded': !!open", "'aria-expanded': String(!!open)"]]]
]) {
  const before = fs.readFileSync(file, 'utf8'); let after = before;
  for (const [old, next] of patches) { if (after.split(old).length !== 2) throw new Error('Expected one: ' + old); after = after.replace(old, next); }
  if (hash(fs.readFileSync(file, 'utf8')) !== hash(before)) throw new Error('Fresh source changed: ' + file);
  fs.writeFileSync(file, after, 'utf8'); console.log(file + ' updated ' + hash(after));
}
