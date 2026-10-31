import fs from 'node:fs';
const f = 'index.html'; const t0 = fs.readFileSync(f, 'utf8'); let t = t0;
if (t.charCodeAt(0) === 0xFEFF) throw new Error('BOM'); const crlf = t.split('\r\n').length - 1;
const reps = [
 // J17: no pen while akimbo (both hands hold a gun); and no akimbo mid-jab (the pen is in the left hand).
 [`      if (playerHp >= PLAYER_MAX_HP - 0.5) { AudioSys.invalid(); return; }\n      medkits -= 1;\n`,
  `      if (playerHp >= PLAYER_MAX_HP - 0.5) { AudioSys.invalid(); return; }\n      if (akimboOn()) { AudioSys.invalid(); showBanner(sayText('weapon.message.handsFull', {}, 'BOTH HANDS FULL'), sayText('weapon.message.freeHand', {}, 'Y goes back to one gun'), 1.2, '#ffb347'); return; }   // GB-258 (J17): no hand free for the pen\n      medkits -= 1;\n`],
 [`    function toggleDualWield() {\n      if(vault)return;\n      if (!gameStarted || gameOver || won || paused) return;\n      if (reloading) return;\n`,
  `    function toggleDualWield() {\n      if(vault)return;\n      if (!gameStarted || gameOver || won || paused) return;\n      if (reloading || medPenT > 0) return;   // GB-258 (J17): not while the pen is in his left hand\n`],
 // J51: the camp's first-aid pouch is locked until the kit in the tree is his; it said nothing there.
 [`    function hikersGrabbable() {`,
  `    // GB-258 (J51): until the kit is his, the camp's first-aid pouch (the site) is locked and said nothing, and nor did the
    // bag hanging in its tree. Short floating words (docs/specs/day-missions.md): at the pouch, where the kit is; near the
    // hanging bag, what to do. ChatGPT's keys; the fallbacks until they land.
    function hikersHintText() {
      if (!hikers || !hikersKit || storyClosedSite(HIKERS_SITE) || hikersSiteDone() || objectiveModalOpen()) return null;
      const k = hikersKit.read(), p = localPlayer.position, h = hikers.hang, a = objectiveProps?.props?.[HIKERS_SITE]?.approach;
      if (k.phase === 'hanging' && Math.abs(p.y - h.y) < 9 && hypot(p.x - h.x, p.z - h.z) <= 10) return sayText('hikers.shootRope', {}, 'Shoot the rope to drop the kit');
      if (a && Math.abs(p.y - a.y) < 1.25 && hypot(p.x - a.x, p.z - a.z) <= 1.6)
        return k.loose ? sayText('hikers.pouchDown', {}, 'Their kit is down by the tree: grab it there')
          : sayText(hikers.river ? 'hikers.pouchRiver' : 'hikers.pouchTree', {}, hikers.river ? 'Their kit hangs in a tree by the river: shoot the rope' : 'Their kit hangs in a tree: shoot the rope');
      return null;
    }
    function hikersGrabbable() {`],
 [`      if (hikersGrabbable()) return dwText('hikers.grab');   // GB-196\n`,
  `      if (hikersGrabbable()) return dwText('hikers.grab');   // GB-196\n      { const hint = hikersHintText(); if (hint) return hint; }   // GB-258 (J51)\n`]];
for (const [a, b] of reps) { const n = t.split(a).length - 1; if (n !== 1) throw new Error('match ' + n + ': ' + a.slice(0, 70)); t = t.replace(a, () => b); }
if (t.split('\r\n').length - 1 !== crlf) throw new Error('line endings changed');
if (fs.readFileSync(f, 'utf8') !== t0) throw new Error('index.html changed underneath');
fs.writeFileSync(f, t);
console.log('edited; crlf lines kept: ' + crlf);