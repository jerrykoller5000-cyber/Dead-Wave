// t186 - GB-128 (Jerry): the new key layout.
//  - 1 night vision, 2 flashlight, 3 laser, 4 holster/draw, X fire selector (SEMI / AUTO). One toggle per press:
//    a held key's auto-repeat (e.repeat) does nothing. The old N, L, Z, K and U are free and do nothing.
//  - While B is held (build wheel up) the digits still turn the wheel's pages and toggle nothing.
//  - A focused text field keeps the toggles off its keys.
//  - X never sells outside build mode (there it is the fire selector); in build mode X still scraps what it
//    points at (hold, release), and does not touch the fire mode.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = (code, opts = {}, target = window) => target.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ code, key: code, bubbles: true }, opts)));
  const keyUp = (code, target = window) => target.dispatchEvent(new KeyboardEvent('keyup', { code, key: code, bubbles: true }));
  const tac = () => ((document.getElementById('tacticalLine') || {}).textContent || '');
  const hud = () => ((document.getElementById('ammoDetail') || {}).textContent || '').trim();
  const light = () => /Light ON/.test(tac());
  const laser = () => /Laser ON/.test(tac());
  const nvg = () => /NVG (ON|down)/.test(tac());
  const take = async (w) => {
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
    await new Promise((r) => { const t0 = Date.now(); const f = () => (T.getCurrentWeapon() === w && T.getSwapDbg().swapT <= 0) || Date.now() - t0 > 3000 ? r() : setTimeout(f, 50); f(); });
    await wait(250);
    return T.getCurrentWeapon() === w;
  };
  const wallAt = (gx, gz, lv = 0) => {
    for (const s of ['edge0', 'edge1', 'edge2', 'edge3']) { const w = T.cellOccupant(gx, gz, lv, s); if (w && w.type === 'wall') return w; }
    return null;
  };
  try {
    await startMatch(T, 'Keys');
    // The insertion owns the keyboard for a few seconds; wait until a held B's wheel takes the digits.
    let paged = false;
    for (let i = 0; i < 60 && !paged; i++) {
      await wait(200);
      if (T.openWheel('build')) {
        const l0 = light();
        key('Digit2');
        paged = T.getWheelState().page === 1;
        if (paged) {
          ok(light() === l0, 'B held: 2 turns the build wheel to page 2 and leaves the flashlight alone');
          key('Digit3');
          ok(T.getWheelState().page === 2, 'B held: 3 turns to page 3 (Turrets)');
          key('Digit1');
          ok(T.getWheelState().page === 0 && !nvg(), 'B held: 1 turns back to page 1, no night vision');
          key('Digit4');
          ok(!T.isUnarmed(), 'B held: 4 does not holster');
        }
        T.closeWheelDbg();
      }
    }
    ok(paged, 'digits page the build wheel while B is held');
    await wait(200);

    // Gear on 1 / 2 / 3.
    T.setGearDbg('helmet'); T.setGearDbg('nvg'); T.setGearDbg('laser');
    ok(!light() && !laser() && !nvg(), 'all gear starts off (' + tac() + ')');
    key('Digit2'); ok(light(), '2 turns the flashlight on (' + tac() + ')');
    key('Digit2', { repeat: true }); ok(light(), 'a held 2 (auto-repeat) does not flicker it off');
    key('Digit2'); ok(!light(), '2 again turns it off');
    key('Digit3'); ok(laser(), '3 turns the laser on (' + tac() + ')');
    key('Digit3', { repeat: true }); ok(laser(), 'a held 3 does not flicker it');
    key('Digit3'); ok(!laser(), '3 again turns it off');
    key('Digit1'); ok(nvg(), '1 drops the night vision (' + tac() + ')');
    key('Digit1', { repeat: true }); ok(nvg(), 'a held 1 does not flicker it');
    key('Digit1'); ok(!nvg(), '1 again lifts it');
    const t0 = tac();
    key('KeyN'); key('KeyL'); key('KeyZ');
    ok(tac() === t0, 'the old N, L and Z do nothing now (' + tac() + ')');

    // Holster on 4.
    T.grantAllWeapons();
    ok(await take('m4'), 'M4 in hand');
    key('Digit4'); ok(T.isUnarmed(), '4 holsters the gun');
    key('Digit4', { repeat: true }); ok(T.isUnarmed(), 'a held 4 does not draw it again');
    key('KeyU'); ok(T.isUnarmed(), 'the old U does nothing now');
    key('Digit4'); await wait(100); ok(!T.isUnarmed(), '4 again draws it');
    ok(await take('m4'), 'M4 back in hand');

    // Fire selector on X.
    ok(/AUTO/.test(hud()), 'the M4 is on AUTO (' + hud() + ')');
    key('KeyX'); keyUp('KeyX'); ok(/SEMI/.test(hud()), 'X switches it to SEMI (' + hud() + ')');
    key('KeyX', { repeat: true }); ok(/SEMI/.test(hud()), 'a held X does not switch it back');
    key('KeyK'); ok(/SEMI/.test(hud()), 'the old K does nothing now');
    key('KeyX'); keyUp('KeyX'); ok(/AUTO/.test(hud()), 'X again: AUTO');

    // A focused text field keeps the toggles off its keys.
    const inp = document.createElement('input'); inp.type = 'text'; document.body.appendChild(inp); inp.focus();
    key('Digit2', {}, inp); key('KeyX', {}, inp); keyUp('KeyX', inp);
    ok(!light() && /AUTO/.test(hud()), 'typing 2 and X in a text field toggles nothing (' + tac() + ' / ' + hud() + ')');
    inp.remove();

    // X outside build mode never sells; in build mode it still scraps what it points at.
    T.unlockAllBuilds(); T.addCash(100000);
    const p = T.player.position;
    { const tx = 24, tz = 20; for (let i = 0; i < 80; i++) { await wait(200); p.set(tx, T.sampleHeight(tx, tz), tz); await wait(40); if (Math.hypot(p.x - tx, p.z - tz) < 0.4) break; } }
    for (const t of T.trees) { t.alive = false; t.stump = false; t.falling = false; }
    for (const r of T.rocks) r.alive = false;
    const pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
    T.levelGroundRect(T.gridCentre(pgx - 4), T.gridCentre(pgz - 4), T.gridCentre(pgx + 4), T.gridCentre(pgz + 4), T.sampleHeight(p.x, p.z), 8);
    p.set(T.gridCentre(pgx), T.sampleHeight(T.gridCentre(pgx), T.gridCentre(pgz)), T.gridCentre(pgz));
    await wait(200);
    T.placeBuildAt('wall', pgx + 1, pgz + 1);
    const wall = wallAt(pgx + 1, pgz + 1);
    ok(!!wall, 'a wall right beside him');
    const n0 = T.builds.length, bank0 = T.getBank(), mode0 = hud();
    key('KeyX'); keyUp('KeyX');
    ok(T.builds.length === n0 && T.getBank() === bank0 && wallAt(pgx + 1, pgz + 1) === wall, 'outside build mode X sells nothing (' + T.builds.length + ' builds)');
    ok(hud() !== mode0, 'outside build mode X is the fire selector (' + mode0 + ' -> ' + hud() + ')');
    key('KeyX'); keyUp('KeyX');
    // Build mode: point at the wall, hold X, let go.
    T.setPlaceMode('barricade');
    const c = T.camera.position, tx = T.gridCentre(pgx + 1), tz = T.gridCentre(pgz + 1), ty = wall.mesh.position.y + 1.0;
    T.setAimRay(c.x, c.y, c.z, tx - c.x, ty - c.y, tz - c.z); T.updateGhostPreview();
    const mode1 = hud(), exp = T.scrapRefund(wall);
    key('KeyX');
    T.setAimRay(c.x, c.y, c.z, tx - c.x, ty - c.y, tz - c.z); T.updateGhostPreview();
    keyUp('KeyX');
    ok(!wallAt(pgx + 1, pgz + 1) && T.getBank() - bank0 === exp, 'in build mode X still scraps the wall it points at (+' + (T.getBank() - bank0) + ', expected +' + exp + ')');
    ok(hud() === mode1, 'in build mode X leaves the fire mode alone (' + hud() + ')');
    key('Escape');
    await wait(100);
    key('KeyX'); keyUp('KeyX');
    ok(hud() !== mode1, 'out of build mode again, X is the fire selector (' + hud() + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
