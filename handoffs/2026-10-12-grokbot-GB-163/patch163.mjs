import fs from 'node:fs';
const edit = (f, fn) => { const before = fs.readFileSync(f); const s = fn(before.toString('utf8')); if (s.charCodeAt(0) === 0xFEFF) throw new Error('bom'); if (!fs.readFileSync(f).equals(before)) throw new Error(f + ' changed underneath'); fs.writeFileSync(f, s, 'utf8'); console.log('patched', f); };
const once = (s, a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error('anchor x' + n + ': ' + a.slice(0, 90)); return s.replace(a, b); };
edit('world/training-cutaway.js', (s) => once(s,
  "      e.hidden = enabled && (e.side === 'overhead' ? inBuild || shared : e.side === 'east' ? shared : viewCrossesPlane(c, focus, ...walls[e.side]));\n",
  "      // GB-163 (Jerry: \"This range backwall sometimes switches back and forth from one texture to another\"): the camera\n" +
  "      // rides its collision against the wall it is behind; at the plane's 0.6 m margin a wall faded (so the camera ignored\n" +
  "      // it and slid back) then lit (so it collided and came forward) every few frames. A faded wall now holds until the\n" +
  "      // view is clear by a wider margin (1.6 m), and a change has to last a moment before it shows.\n" +
  "      const margin = e.hidden ? 1.6 : .6;\n" +
  "      const sharedNow = enabled && viewCrossesPlane(c, focus, ...walls.east, margin);\n" +
  "      const next = enabled && (e.side === 'overhead' ? inBuild || sharedNow : e.side === 'east' ? sharedNow : viewCrossesPlane(c, focus, ...walls[e.side], margin));\n" +
  "      if (next !== e.hidden) { e.pend = (e.pend || 0) + Math.max(0, dt); if (e.pend >= (next ? .06 : .35)) { e.hidden = next; e.pend = 0; } } else e.pend = 0;\n"));
edit('world/training.js', (s) => {
  const m = /  syncDoor\(\); solids\.push\(\.\.\.wearBlock\);[^\n]*\n/.exec(s); if (!m) throw new Error('wearBlock anchor');
  return s.replace(m[0], m[0] +
    "  // GB-163 (Jerry: \"Remove bullet decals from lockers, add sparks instead\"): the lockers and the door are steel; a round there\n" +
    "  // sparks (index.html trainingRound) and leaves no hole.\n" +
    "  { const k = wear.blockers[0]; for (const s of solids) if (!s.wall && s.minX >= O.x + k.minX - 0.05 && s.maxX <= O.x + k.maxX + 0.05 && s.minZ >= O.z + k.minZ - 0.05 && s.maxZ <= O.z + k.maxZ + 0.1) s.metal = true;\n" +
    "    for (const s of wearBlock) s.metal = true; if (lockerSolid) lockerSolid.metal = true; }\n");
});
edit('index.html', (s) => {
  const N = (x) => x.replace(/\r?\n/g, '\r\n');
  s = once(s, "trainingDbg: { start: () => startTraining(),", "trainingDbg: { round: (p) => trainingRound(p),   /* GB-163: a round by hand (shots, tests) */ start: () => startTraining(),");
  s = once(s, "      if (!best.securityDoor) training.impacts?.add(hit);", "      if (!best.securityDoor && !best.metal) training.impacts?.add(hit);   // GB-163: no holes in the steel lockers");
  s = once(s, N("      } else { spawnDust(hx, hy, hz, 2); AudioSys.trainingCue('impact'); }\n"), N("      } else if (best.metal) { spawnEmbers(hx, hy, hz, 9, .45); AudioSys.trainingCue('impact'); }   // GB-163: steel sparks\n      else { spawnDust(hx, hy, hz, 2); AudioSys.trainingCue('impact'); }\n"));
  return s;
});
