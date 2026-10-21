import fs from 'node:fs';
const edit = (f, pairs) => {
  const before = fs.readFileSync(f); let s = before.toString('utf8');
  for (const [a, b] of pairs) { const n = s.split(a).length - 1; if (n !== 1) throw new Error(f + ' anchor x' + n + ': ' + a.slice(0, 80)); s = s.replace(a, b); }
  if (!fs.readFileSync(f).equals(before)) throw new Error(f + ' changed underneath');
  fs.writeFileSync(f, s, 'utf8'); console.log('patched', f);
};
edit('world/training.js', [
  ["  const wear = dressTrainingWear(T, { R, B, bedAt, add, box, std, lampMat,\n", "  const wear = dressTrainingWear(T, { R, B, bedAt, add, box, std, lampMat, root: g,\n"],
  ["...wear.decals, ...wear.dead, wear.flicker]);\n    for (const s of propSolids(T, g, O.y, { skip: (o) => notProps.has(o) })) solids.push(s);\n  }\n",
   "...wear.decals, ...wear.dead, wear.flicker]);\n    if (wear.door) { notProps.add(wear.door.pivot); wear.door.pivot.traverse((o) => notProps.add(o)); }   // GB-161: its own solid, it moves\n    for (const s of propSolids(T, g, O.y, { skip: (o) => notProps.has(o) })) solids.push(s);\n  }\n" +
   "  // GB-161 (Jerry: he walked through the lockers): the bank blocks him (keepOut, index.html trainingKeepPlayer), and the\n" +
   "  // dented door is a solid that follows its swing, so a round finds it (hitDoor) as a blade does (cutDoor).\n" +
   "  const wearBlock = wear.blockers.map((b) => ({ minX: b.minX + O.x, maxX: b.maxX + O.x, minY: b.minY + O.y, maxY: b.maxY + O.y, minZ: b.minZ + O.z, maxZ: b.maxZ + O.z, prop: true, block: true }));\n" +
   "  const doorSolid = wear.door ? { lockerDoor: true, prop: true } : null;\n" +
   "  const syncDoor = () => { if (!doorSolid) return; const s = wear.door.solid; doorSolid.minX = s.minX + O.x; doorSolid.maxX = s.maxX + O.x; doorSolid.minY = s.minY + O.y; doorSolid.maxY = s.maxY + O.y; doorSolid.minZ = s.minZ + O.z; doorSolid.maxZ = s.maxZ + O.z; };\n" +
   "  syncDoor(); solids.push(...wearBlock); if (doorSolid) solids.push(doorSolid);\n" +
   "  let lastKeep = null;\n" +
   "  function keepOut(p, r) {   // world point, his radius -> { x, z, moved }\n" +
   "    let x = p.x, z = p.z, moved = false;\n" +
   "    for (const b of wearBlock) {\n" +
   "      if (p.y > b.maxY || x < b.minX - r || x > b.maxX + r || z < b.minZ - r || z > b.maxZ + r) continue;\n" +
   "      const dl = x - (b.minX - r), dr = b.maxX + r - x, dn = z - (b.minZ - r), df = b.maxZ + r - z, m = Math.min(dl, dr, dn, df);\n" +
   "      if (m === dl) x = b.minX - r; else if (m === dr) x = b.maxX + r; else if (m === dn) z = b.minZ - r; else z = b.maxZ + r;\n" +
   "      moved = true;\n" +
   "    }\n" +
   "    if (wear.door) wear.bumpDoor(x - O.x, z - O.z, r, lastKeep ? x - lastKeep.x : 0, lastKeep ? z - lastKeep.z : 0);\n" +
   "    lastKeep = { x, z };\n" +
   "    return { x, z, moved };\n" +
   "  }\n" +
   "  const hitDoor = (point, dir, strength = 3.2) => (wear.door ? wear.pushDoor(point.x - O.x, point.z - O.z, dir.x, dir.z, strength) : 0);\n" +
   "  function cutDoor(from, dir, reach) {   // a blade swung from `from` along `dir` (world): true when it caught the door\n" +
   "    if (!wear.door) return false;\n" +
   "    const d = wear.door, cx = O.x + d.hx + Math.cos(d.angle) * d.w * 0.6, cz = O.z + d.hz + Math.sin(d.angle) * d.w * 0.6;\n" +
   "    const dx = cx - from.x, dz = cz - from.z, len = Math.hypot(dx, dz), dl = Math.hypot(dir.x, dir.z) || 1;\n" +
   "    if (len > reach + 0.35 || (dx * dir.x + dz * dir.z) / (len * dl || 1) < 0.3) return false;\n" +
   "    wear.pushDoor(cx - O.x, cz - O.z, dir.x, dir.z, 2.4); return true;\n" +
   "  }\n"],
  ["    wear: { parts: wear.parts, flicker: wear.flicker, dead: wear.dead },   // GB-159\n",
   "    wear: { parts: wear.parts, flicker: wear.flicker, dead: wear.dead, door: wear.door, doorSolid, hitDoor, cutDoor, kickDoor: wear.kickDoor },   // GB-159, GB-161\n    keepOut,   // GB-161\n"],
  ["    c.font = `${opts.weight || 'bold'} ${opts.size || 150}px Impact, \"Arial Black\", sans-serif`;\n    c.fillText(text, w / 2, h / 2 + (opts.dy || 0));",
   "    let px = opts.size || 150; const font = () => `${opts.weight || 'bold'} ${px}px Impact, \"Arial Black\", sans-serif`; c.font = font();\n    while (px > 10 && c.measureText && c.measureText(text).width > w * 0.9) { px -= 4; c.font = font(); }   // GB-161: every sign's words fit inside it\n    c.fillText(text, w / 2, h / 2 + (opts.dy || 0));"],
  ["update: (dt) => { update(dt); wear.update(dt, lit); },", "update: (dt) => { update(dt); wear.update(dt, lit); syncDoor(); },"]
]);
edit('world/training-cutaway.js', [
  ["    if (b.min.y > 7.5 && b.min.x >= -44.7", "    if (b.max.z < -10.5 && b.min.x >= -8.3 && b.max.x <= 8.3 && b.max.y <= 6.2) return 'rangeSouth';   // GB-161: the range's back wall and what hangs on it\n    if (b.min.y > 7.5 && b.min.x >= -44.7"],
  ["/^training-(gate-frame|gate-leaf-|security-shutter)/", "/^training-(gate-frame|gate-leaf-|security-shutter|wear-locker-door)/"],
  ["    north: ['z', 28, [['x', -44, -8], ['y', 0, 24]]]\n", "    north: ['z', 28, [['x', -44, -8], ['y', 0, 24]]],\n    rangeSouth: ['z', -12, [['x', -8, 8], ['y', 0, 6]]]   // GB-161\n"]
]);
const f = 'index.html';
const before = fs.readFileSync(f); let s = before.toString('utf8');
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error('index anchor x' + n + ': ' + a.slice(0, 80)); s = s.replace(a, b); };
rep("      if (safe?.moved) { p.x = safe.x; p.z = safe.z; velX = 0; }\n      const c = clampToRects(tg.walk, p.x, p.z);",
    "      if (safe?.moved) { p.x = safe.x; p.z = safe.z; velX = 0; }\n      const ko = tg.keepOut?.(p, PLAYER_RADIUS); if (ko?.moved) { p.x = ko.x; p.z = ko.z; }   // GB-161: the locker bank (and he bumps its door)\n      const c = clampToRects(tg.walk, p.x, p.z);");
rep("        if (trainingHitTarget(hit.index, hit.point)) hits++;\n      return hits;",
    "        if (trainingHitTarget(hit.index, hit.point)) hits++;\n      training.tg.wear?.cutDoor?.({ x:p.x, z:p.z }, { x:fx, z:fz }, reach);   // GB-161: a blade sets the dented locker door swinging\n      return hits;");
rep("      if (!best.securityDoor) training.impacts?.add(hit);",
    "      if (best.lockerDoor) tg.wear?.hitDoor?.({ x:hx, y:hy, z:hz }, { x:_trB.x-_trA.x, z:_trB.z-_trA.z });   // GB-161: a round swings it\n      if (!best.securityDoor) training.impacts?.add(hit);");
if (s.charCodeAt(0) === 0xFEFF) throw new Error('bom');
if (!fs.readFileSync(f).equals(before)) throw new Error('index.html changed underneath');
fs.writeFileSync(f, s, 'utf8'); console.log('patched index.html');
