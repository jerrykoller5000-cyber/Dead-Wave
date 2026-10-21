import fs from 'node:fs';
{ // training.js: my doorSolid clashes with the security door's
  const f = 'world/training.js', before = fs.readFileSync(f); let s = before.toString('utf8');
  const lines = s.split('\n');
  for (let i = 0; i < lines.length; i++) if (/GB-161|wear\.door \? \{ lockerDoor|const syncDoor|syncDoor\(\); solids\.push\(\.\.\.wearBlock\)/.test(lines[i]) || /^\s*const doorSolid = wear\.door/.test(lines[i])) lines[i] = lines[i].replace(/\bdoorSolid\b/g, 'lockerSolid');
  s = lines.join('\n').replace('door: wear.door, doorSolid, hitDoor', 'door: wear.door, doorSolid: lockerSolid, hitDoor');
  if (!fs.readFileSync(f).equals(before)) throw new Error('changed underneath'); fs.writeFileSync(f, s, 'utf8'); console.log('fixed training.js');
}
{
  const f = 'index.html', before = fs.readFileSync(f); let s = before.toString('utf8');
  const N = (x) => x.replace(/\r?\n/g, '\r\n');
  const rep = (a, b) => { a = N(a); b = N(b); const n = s.split(a).length - 1; if (n !== 1) throw new Error('index anchor x' + n + ': ' + a.slice(0, 80)); s = s.replace(a, b); };
  rep("      if (safe?.moved) { p.x = safe.x; p.z = safe.z; velX = 0; }\n      const c = clampToRects(tg.walk, p.x, p.z);",
      "      if (safe?.moved) { p.x = safe.x; p.z = safe.z; velX = 0; }\n      const ko = tg.keepOut?.(p, PLAYER_RADIUS); if (ko?.moved) { p.x = ko.x; p.z = ko.z; }   // GB-161: the locker bank (and he bumps its door)\n      const c = clampToRects(tg.walk, p.x, p.z);");
  rep("        if (trainingHitTarget(hit.index, hit.point)) hits++;\n      return hits;",
      "        if (trainingHitTarget(hit.index, hit.point)) hits++;\n      training.tg.wear?.cutDoor?.({ x:p.x, z:p.z }, { x:fx, z:fz }, reach);   // GB-161: a blade sets the dented locker door swinging\n      return hits;");
  rep("      if (!best.securityDoor) training.impacts?.add(hit);",
      "      if (best.lockerDoor) tg.wear?.hitDoor?.({ x:hx, y:hy, z:hz }, { x:_trB.x-_trA.x, z:_trB.z-_trA.z });   // GB-161: a round swings it\n      if (!best.securityDoor) training.impacts?.add(hit);");
  if (s.charCodeAt(0) === 0xFEFF) throw new Error('bom');
  if (!fs.readFileSync(f).equals(before)) throw new Error('index.html changed underneath');
  fs.writeFileSync(f, s, 'utf8'); console.log('patched index.html');
}
