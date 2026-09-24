(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
  const inp = document.getElementById('playerName');
  ok(!!inp && document.getElementById('modeSelect').classList.contains('show'), 'name box on the start screen');
  inp.focus(); inp.value = 'Jerry';
  inp.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', key: 'b', bubbles: true }));
  inp.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }));
  let started = false;
  for (let i = 0; i < 80; i++) {
    await wait(200);
    if (T.getPhase && T.getPhase() === 'prep' && T.session.name === 'Jerry') { started = true; break; }
  }
  ok(started && !document.getElementById('modeSelect').classList.contains('show'), 'Enter in the box starts the game as ' + T.session.name);

  let pats = 0, chis = 0, taps = 0; const A = T.AudioSys;
  const oP = A.gravePat, oC = A.chisel, oT = A.graveAmbience;
  A.gravePat = (...a) => { pats++; return oP(...a); };
  A.chisel = () => { chis++; return oC(); };
  A.graveAmbience = (...a) => { taps++; return oT(...a); };

  T.setGearDbg('helmet'); T.applyGearVisibility(); T.setWeapon(0);
  const p = T.player.position;
  {
    const tx = 12, tz = 12;
    for (let i = 0; i < 60; i++) {
      await wait(200);
      p.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(40);
      if (Math.hypot(p.x - tx, p.z - tz) < 0.4) break;
    }
  }
  T.spawnZombie(p.x + 20, p.z, 'shambler', true);
  T.damagePlayer(9999);
  let c = T.getCine();
  ok(!!c && c.rec.kind === 'grave' && c.rec.plot === 0 && c.rec.name === 'Jerry', 'death: burial begins (plot ' + (c && c.rec.plot) + ')');
  ok(!document.getElementById('win').classList.contains('show'), 'no game-over panel yet');

  // Wait through fade to black until cineSetup builds the grave mesh
  for (let i = 0; i < 80; i++) {
    await wait(100);
    c = T.getCine();
    if (c && c.setup && c.rec.g) break;
  }
  const fo = +document.querySelector('#cine .fade').style.opacity;
  ok(fo > 0.2 && document.body.classList.contains('cine'), 'fading to black (' + fo + ')');
  ok(c.setup && T.zombies.length === 0 && !T.marine.visible, 'behind the black: scene set, horde cleared, marine hidden');
  const g = c.rec.g.position;
  ok(Math.hypot(T.player.position.x - g.x, T.player.position.z - (g.z + 3.5)) < 0.5, 'hidden player moved to the graveyard');
  const crew = T.getCrew();
  ok(crew && crew.every(m => m.root.visible && m.shovel.visible), 'two marines with shovels');
  ok(c.diggers.every(d => d.aHit > 0.05 && d.aHit < 2.35), 'stroke solved: ' + c.diggers.map(d => d.aHit.toFixed(2)).join(', '));

  const minRel = [], lat = [];
  for (let k = 0; k < 2; k++) {
    const d = c.diggers[k];
    d.c.root.position.set(d.x, d.gy, d.z); d.c.root.rotation.set(0, d.yaw, 0);
    T.poseCrew(d.c, d.aHit, T.DIG_LEAN * d.aHit);
    const tip = T.placeShovel(d.c, new T.THREE.Vector3());
    minRel.push(tip.y - (g.y + T.moundHeight(tip.x - g.x, tip.z - g.z)));
    lat.push(Math.abs(tip.x - g.x));
  }
  ok(minRel.every(r => r > -0.08 && r < 0.08), 'blade bottoms out on the dirt: ' + minRel.map(r => r.toFixed(3)).join(', '));
  ok(lat.every(l => l < 0.45), 'on the mound, not beside it: ' + lat.map(l => l.toFixed(2)).join(', ') + ' (stand-off ' + c.diggers.map(d => Math.abs(d.x - g.x).toFixed(2)).join(', ') + ')');

  // Advance until dig pats land (cine clock ~4.5–9)
  for (let i = 0; i < 80 && pats < 4; i++) await wait(100);
  ok(pats >= 4, 'thump of the shovel: ' + pats);
  ok(taps === 1, 'eerie ambience, once');
  const camA = T.camera.position.clone();
  ok(camA.distanceTo(c.camA.pos) < 0.5, 'wide shot on the grave');

  // Walk-off and headstone camera
  for (let i = 0; i < 100; i++) {
    await wait(100);
    const walked = crew.map(m => Math.hypot(m.root.position.x - g.x, m.root.position.z - g.z));
    if (walked.every(w => w > 2)) break;
  }
  const walked = crew.map(m => Math.hypot(m.root.position.x - g.x, m.root.position.z - g.z));
  ok(walked.every(w => w > 2), 'they walk off: ' + walked.map(w => w.toFixed(1)).join(', '));

  for (let i = 0; i < 80; i++) {
    await wait(100);
    if (T.camera.position.distanceTo(c.camB.pos) < 0.3) break;
  }
  ok(T.camera.position.distanceTo(c.camB.pos) < 0.3, 'camera on the headstone');

  for (let i = 0; i < 80; i++) {
    await wait(100);
    c = T.getCine();
    if (c && c.letters === 5 && chis >= 5) break;
  }
  ok(c.letters === 5 && chis >= 5, 'name cut in, letter by letter (' + c.letters + ', ' + chis + ' chisel)');

  for (let i = 0; i < 40; i++) {
    await wait(100);
    if (document.getElementById('win').classList.contains('show')) break;
  }
  const win = document.getElementById('win');
  ok(win.classList.contains('show') && win.classList.contains('grave'), 'panel over the grave');
  ok(/Jerry/.test(document.getElementById('winTitle').textContent), 'title: ' + document.getElementById('winTitle').textContent);

  document.getElementById('again').click(); await wait(300);
  ok(!T.getCine() && T.marine.visible && !document.body.classList.contains('cine'), 'play again clears the scene');
  ok(inp.value === 'Jerry', 'name box remembers: ' + inp.value);
  inp.value = 'Jerry II';
  document.getElementById('modeHunt').click();
  for (let i = 0; i < 40; i++) { await wait(200); if (T.getPhase && T.getPhase() === 'prep') break; }
  ok(!T.zombies.some(z => z.typeKey === 'fallen') && T.session.graves[0].mound.visible, 'nothing climbs out: the grave stays filled');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
