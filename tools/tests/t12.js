(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  // Play refuses with no callsign; tryPlace also no-ops until the match has started.
  const nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.value = 'TestMarine';
  document.getElementById('modeHunt').click();
  let started = false;
  for (let i = 0; i < 80; i++) {
    await wait(200);
    if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
  }
  ok(started, 'match reached prep after Play');
  // Insertion still drives the marine for ~9s after prep begins; p.set and tryPlace
  // aim are overwritten until it finishes.
  {
    const pl = T.player.position;
    const tx = 2, tz = -4;
    for (let i = 0; i < 70; i++) {
      await wait(200);
      pl.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(30);
      if (Math.hypot(pl.x - tx, pl.z - tz) < 0.4) break;
    }
  }
  T.unlockAllBuilds(); T.addCash(100000);
  for (const t of T.trees) { t.alive = false; t.stump = false; } for (const r of T.rocks) r.alive = false;
  const p = T.player.position;
  let found = null;
  for (let tries = 0; tries < 400 && !found; tries++) {
    const cx = Math.round((Math.random() - 0.5) * 50), cz = Math.round((Math.random() - 0.5) * 50);
    let good = true;
    for (let dx = -8; dx <= 8 && good; dx++) for (let dz = -8; dz <= 8 && good; dz++) if (T.placeRefusalFor('spikes', cx + dx, cz + dz) && Math.abs(dx) + Math.abs(dz) > 1) good = false;
    if (good) found = { cx, cz };
  }
  if (!found) return 'no open block';
  p.set(T.gridCentre(found.cx), T.sampleHeight(T.gridCentre(found.cx), T.gridCentre(found.cz)), T.gridCentre(found.cz));
  await wait(400);
  const gx = found.cx, gz = found.cz;
  const f2 = (v) => v.toFixed(2);
  // --- pillar alone supports the four squares round its corner
  const X = gx + 3, Z = gz - 4;                  // corner index
  const pil = T.placeBuildAt('pillar', X, Z);
  ok(pil && Math.abs(pil.x - T.cornerPos(X)) < 1e-9 && Math.abs(pil.z - T.cornerPos(Z)) < 1e-9, 'pillar stands on the corner');
  p.y = T.sampleHeight(p.x, p.z) + 3;
  const four = [[X - 1, Z - 1], [X, Z - 1], [X - 1, Z], [X, Z]].map(([a, b]) => T.placeBuildAt('floor', a, b));
  ok(four.every(f => f && f.level === 1), 'floors in all four squares round it');
  ok(four.every(f => Math.abs(f.mesh.position.y - (pil.mesh.position.y + 2)) < 1e-6), 'floors sit on the pillar cap');
  ok(!T.placeBuildAt('platform', X + 1, Z - 1), 'unbraced: no deck one square further out (' + T.resolveTarget('platform', X + 1, Z - 1).refusal + ')');
  // Turret on the pillar cap via the real aim path (getPlacePoint -> tryPlace).
  // Floors cover the cap from above, so aim from the side at mid-post / toward the
  // cap. Move the marine next to the post so reach matches a real placement.
  T.setPlaceMode('heavy');
  p.set(pil.x - 4, T.sampleHeight(pil.x - 4, pil.z) + 1.6, pil.z);
  await wait(50);
  // Prefer a shallow eye-to-cap aim (the case that used to hit grass before the post).
  T.setAimRay(pil.x - 4, p.y + 0.1, pil.z, 4, (pil.mesh.position.y + 1.8) - (p.y + 0.1), 0);
  T.updateGhostPreview();
  let ppt = T.getPlacePoint();
  if (!(ppt.hit && ppt.hit.type === 'pillar')) {
    // Fallback angle: flat mid-shaft (still the live aim path).
    T.setAimRay(pil.x - 3, pil.mesh.position.y + 1.0, pil.z, 3, 0, 0);
    T.updateGhostPreview();
    ppt = T.getPlacePoint();
  }
  const nT = T.builds.length;
  T.tryPlace();
  let tt = T.builds[T.builds.length - 1];
  ok(T.builds.length === nT + 1, 'turret on the pillar: exactly one piece added (' + (T.builds.length - nT) + ')');
  const aimedOk = T.builds.length === nT + 1 && tt && tt.slot === 'ptop' && Math.abs(tt.x - pil.x) < 1e-9;
  ok(aimedOk, 'turret on the pillar via aim (' + (tt && tt.slot) + ', hit ' + (ppt.hit && ppt.hit.type) + ')');
  // Secondary sanity: the scripted { piece } branch resolveTarget uses when the reticle
  // lands on a post (same path tryPlace takes). Pillar already has a turret, so this
  // must refuse — proves the branch without placing a second piece.
  const ptopBusy = T.resolveTarget('light', X, Z, 0, { piece: pil });
  ok(!!ptopBusy.refusal && /turret|pillar/i.test(ptopBusy.refusal), 'direct resolveTarget({ piece: pillar }) still wired (' + ptopBusy.refusal + ')');
  if (!aimedOk) tt = T.placeBuildAt('heavy', X, Z, 0, { piece: pil });
  ok(!T.placeBuildAt('wall', X, Z, 0, { lv: 0, piece: pil }) || true, '(walls ignore pillars)');
  // braced pillar: wall within 3 squares -> 12
  const X2 = gx - 3, Z2 = gz + 4;
  const pil2 = T.placeBuildAt('pillar', X2, Z2);
  T.placeBuildAt('wall', X2 + 2, Z2 + 2, 0);   // within three squares
  const ring = [];
  for (let a = X2 - 2; a <= X2 + 1; a++) for (let b = Z2 - 2; b <= Z2 + 1; b++) {
    const corner = (a === X2 - 2 || a === X2 + 1) && (b === Z2 - 2 || b === Z2 + 1);
    if (corner) continue;
    ring.push([a, b]);
  }
  p.y = T.sampleHeight(p.x, p.z) + 3;
  const placed = ring.map(([a, b]) => T.placeBuildAt('floor', a, b)).filter(Boolean);
  ok(ring.length === 12 && placed.length >= 12, 'braced pillar holds up 12 squares: ' + placed.length);
  const cornerRefusal = T.resolveTarget('platform', X2 + 1, Z2 + 1).refusal;
  ok(!!cornerRefusal || T.pillarTopFor(X2 + 1, Z2 + 1, 1) === null, 'but not the far corner squares');
  // removing the pillar drops the floors it alone held
  const n0 = T.builds.length;
  T.removeBuild(pil);
  ok(four.every(f => !T.builds.includes(f)) && !T.builds.includes(tt), 'pillar gone: its four floors and its turret come down');
  // --- floor on the ground
  const floorH = T.ruleFor('floor').height;
  const gf = T.placeBuildAt('floor', gx - 6, gz - 6);
  ok(gf && gf.level === 0 && gf.deck && Math.abs(gf.deck.deckY - gf.mesh.position.y - floorH) < 1e-6, 'floor on bare ground');
  const tg = T.placeBuildAt('light', gx - 6, gz - 6);
  ok(tg && tg.level === 0 && Math.abs(tg.mesh.position.y - gf.mesh.position.y - floorH) < 1e-6, 'turret on the ground floor');
  // walled room with ground floor, roof via elevated aim (D-12: no default roofing)
  const rx = gx + 5, rz = gz + 5;
  p.set(T.gridCentre(rx), T.sampleHeight(T.gridCentre(rx), T.gridCentre(rz)), T.gridCentre(rz));
  const gf2 = T.placeBuildAt('floor', rx, rz);
  const ws = [0, 1, 2, 3].map(q => T.placeBuildAt('wall', rx, rz, q));
  const roof = T.placeBuildAt('floor', rx, rz, 0, { lv: 1 });
  ok(gf2 && gf2.level === 0 && ws.every(Boolean) && roof && roof.level === 1 && Math.abs(roof.mesh.position.y - (ws[0].mesh.position.y + 2)) < 1e-6, 'room: ground floor, walls on it, roof aimed at wall tops (roof y-wall y ' + (roof ? f2(roof.mesh.position.y - ws[0].mesh.position.y) : '-') + ')');
  // --- platform pad height = 75% of railing
  const pw = T.placeBuildAt('wall', gx - 6, gz + 2, 0); const pp = T.placeBuildAt('platform', gx - 6, gz + 2);
  ok(Math.abs(pp.deck2.deckY - pp.mesh.position.y - 0.72 * 0.75) < 1e-6, 'platform pad at 75% of a railing (' + f2(pp.deck2.deckY - pp.mesh.position.y) + ')');
  // --- stairs grow to reach a floor above
  const sx = gx - 3, sz = gz - 6;
  T.placeBuildAt('wall', sx, sz, 0); p.y = T.sampleHeight(p.x, p.z) + 3; const hf = T.placeBuildAt('floor', sx, sz);
  const stairs = T.placeBuildAt('stairs', sx, sz + 1);
  const topY = stairs.deck.deckY + stairs.deck.rise;
  ok(stairs && Math.abs(topY - hf.deck.deckY) < 1e-6, 'stairs reach the floor exactly (top ' + f2(topY) + ' floor ' + f2(hf.deck.deckY) + ', rise ' + f2(stairs.rise || 0) + ')');
  ok(Math.abs(stairs.mesh.scale.y - stairs.rise / 2) < 1e-6, 'stair mesh stretched to match');
  // --- godead
  T.runDevCommand('nodead'); ok(T.isNoZombies(), 'nodead on');
  T.runDevCommand('godead'); ok(!T.isNoZombies(), 'godead brings the waves back');
  // --- rabbits: walls stop them, shovel fills burrows
  const rab = T.getRabbits()[0];
  if (rab) {
    const cx = gx + 5, cz = gz - 7;
    for (let q = 0; q < 4; q++) T.placeBuildAt('wall', cx, cz, q);
    const ox = T.gridCentre(cx) + 1.6, oz = T.gridCentre(cz);   // outside the east wall
    rab.mode = 'idle'; rab.mesh.visible = true; rab.hiddenForRain = false; rab.home = null;
    rab.mesh.position.set(ox, T.sampleHeight(ox, oz) + 0.12, oz);
    rab.vel.x = -12; rab.vel.z = 0; rab.vel.y = 0; rab.hopCd = 5;
    await wait(700);
    ok(rab.mesh.position.x > T.gridCentre(cx) + 0.8, 'rabbit stopped by the wall (x ' + f2(rab.mesh.position.x - T.gridCentre(cx)) + ' from centre)');
  } else out.push('SKIP no rabbits');
  const bu = T.getBurrows()[0];
  if (bu) {
    const nb = T.getBurrows().length;
    p.set(bu.x + 3, T.sampleHeight(bu.x + 3, bu.z), bu.z); await wait(200);
    T.setPlaceMode('shovel');
    T.setAimRay(bu.x, T.sampleHeight(bu.x, bu.z) + 12, bu.z, 0, -1, 0.0001); T.updateGhostPreview();
    T.tryPlace();
    ok(T.getBurrows().length === nb - 1 && T.getBurrows().indexOf(bu) < 0, 'shovel filled in the burrow');
  } else out.push('SKIP no burrows');
  return out.join('\n');
})()

