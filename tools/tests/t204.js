// t204 - CL-127 (Jerry's playthrough 1, 2026-10-06): the radio mast. "Make it more obvious how to repair it, the repair
// bar more noticeable while repairing, and the supply pickup at the radio mast in a separate place from the repair."
// CL-183 (Jerry, 2026-10-12): the repair is a puzzle (game/relay-puzzle.js): breakers in Sato's order, the radio tuned
// to a number station that beeps out a code, the reboot, then the code at the supplies.
// CL-184 (Jerry, 2026-10-12): no tracker card for the radio; Sato's note is a scrap of paper somewhere round the site
// ("E - Read" is the only clue); the panels give nothing away (no tag, no code on the radio's display); one press of E
// starts the reboot and it counts down by itself while he fights (its dead come up on open ground, away from the
// caves); the locker is a small building (game/relay-vault.js, studio/relay-vault-model.js): the code at its keypad
// brings the day's reward up its lift, the door rolls up, and E inside takes it.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (type, code = 'KeyE', k = 'e', shiftKey = false) => document.dispatchEvent(new KeyboardEvent(type, { code, key: k, shiftKey, bubbles: true }));
  const tap = async (code = 'KeyE', k = 'e', shiftKey = false) => { key('keydown', code, k, shiftKey); await wait(60); key('keyup', code, k, shiftKey); await wait(60); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'RadioMast');
    T.clearZombies(); T.setHp(100000); T.runDevCommand('godmode');
    const R = () => T.radioCuesDbg(), D = T.relayDbg, S = () => D.state();
    await until(() => !!R().locker && !!R().runtime && !!D.note(), 4000);
    const props = T.getObjectiveProps().props, cab = props['objective:radio-repair'];
    const L = R().locker, P = T.player.position, A = cab.approach;
    const stand = (x, y, z) => { P.set(x, y, z); T.clearZombies(); };
    ok(!!L && !!L.vault && !!R().marks, 'the vault and the two markers are built');
    const apart = Math.hypot(L.spot.x - cab.centre.x, L.spot.z - cab.centre.z);
    ok(apart >= 7, 'the vault stands ' + apart.toFixed(1) + ' m from the cabinet (at least 7)');
    ok(L.phase === 'locked' && L.vault.door.visible, 'before the repair the vault is shut (' + L.phase + ')');
    // Sato's note: somewhere round the site, and only "E - Read" says so.
    const N = D.note();
    const nd = Math.hypot(N.approach.x - cab.centre.x, N.approach.z - cab.centre.z);
    ok(nd > 8 && nd < 30, "Sato's note lies " + nd.toFixed(1) + ' m from the cabinet');
    T.runDevCommand('relay note'); await wait(80);
    ok(/read/i.test(R().prompt || ''), 'by the scrap of paper: "' + R().prompt + '"');
    T.runDevCommand('relay note'); await tap(); await wait(150);
    const notePanel = document.getElementById('relayPanel');
    ok(D.relay.mode === 'note' && !!notePanel.querySelector('svg') && !/[a-z]{3}/i.test(notePanel.querySelector('.sketch').textContent), 'E reads it: a sketch of the box, no words (' + D.relay.mode + ')');
    const props2 = D.note();
    ok(!!props2.hat && !!props2.stool && !!props2.trail, 'a hat, a stool and a faint trail by it' + (props2.tree ? ', claw marks on its tree' : ''));
    await tap(); await wait(150);
    ok(!D.relay.mode, 'E puts it back');
    // The cabinet.
    stand(A.x, A.y, A.z); await wait(300);
    ok(R().marks.cabinet.visible && !R().marks.locker.visible, 'amber marker over the cabinet, none over the vault');
    ok(/breaker/i.test(R().prompt || ''), 'the main prompt: "' + R().prompt + '"');
    await tap(); await wait(150);
    const panel = document.getElementById('relayPanel');
    ok(D.relay.mode === 'breakers' && panel.classList.contains('on'), 'E at the cabinet opens the breaker panel');
    ok(!panel.querySelector('.tag') && !/02:14/.test(panel.textContent), 'no tag on the breakers');
    ok(!document.getElementById('kioskPrompt').classList.contains('on'), 'the floating prompt steps aside while the panel is up');
    await tap('Digit3', '3');
    ok(S().lockout > 0 && S().on.every((v) => !v), 'a wrong breaker trips them all');
    await until(() => S().lockout <= 0, 60000);
    for (const n of [2, 1, 4]) await tap('Digit' + n, String(n));
    ok(S().stage === 'tuning', '2, 1, 4: the relay has power, the radio is next (' + S().stage + ')');
    await until(() => D.relay.mode === 'radio', 30000);
    ok(D.relay.mode === 'radio' && !panel.querySelector('.lcd') && !panel.querySelector('.note'), 'the radio: the dial and the signal, no display, no notes');
    for (let i = 0; i < 300 && S().stage === 'tuning'; i++) {
      const d = S().freq - S().dial;
      if (Math.abs(d) < 0.1) { await wait(80); continue; }
      await tap(d > 0 ? 'KeyD' : 'KeyA', d > 0 ? 'd' : 'a', Math.abs(d) > 1.5);
    }
    ok(S().stage === 'code' || S().stage === 'boot', 'on the station it locks in (' + S().stage + ')');
    const beeped = await until(() => !!D.relay.station && D.relay.station.next > 0, 60000);
    ok(beeped && !/[1-9] [1-9] [1-9]/.test(panel.textContent) && !panel.querySelector('.lcd'), 'the station beeps; nothing on screen counts them');
    if (S().stage !== 'boot') D.puzzle.heardCode();   // one full reading takes a while on a slow box: the test skips the rest
    await tap(); await wait(150);
    ok(!D.relay.mode, 'E leaves the radio');
    ok(/reboot/i.test(R().prompt || '') && !/hold/i.test(R().prompt || ''), 'at the cabinet now: "' + R().prompt + '"');
    // One press: the reboot runs by itself, and its siren calls the dead from open ground.
    T.clearZombies();
    await tap(); await wait(400);
    ok(S().booting && S().stage === 'boot', 'one press of E starts the reboot');
    const plan = D.relay.plan;
    ok(!!plan && plan.bootS >= 20, 'the day sets it: ' + (plan && plan.bootS) + ' s, ' + (plan && plan.first) + ' called at once');
    const called = T.zombies.filter((z) => z.alive && z.relayCalled);
    ok(called.length > 0, called.length + ' of the dead called in');
    const caves = T.POI.caves || [];
    ok(called.every((z) => caves.every((c) => Math.hypot(c.x - z.mesh.position.x, c.z - z.mesh.position.z) >= 25)), 'none of them came up by a cave');
    const bar = document.getElementById('radioRepairBar');
    ok(!!bar && bar.classList.contains('on') && /s$/.test(bar.querySelector('.rrb-time').textContent.trim()), 'the bar counts it down: ' + bar.querySelector('.rrb-time').textContent);
    const left0 = D.puzzle.bootLeft();
    stand(cab.centre.x + 18, P.y, cab.centre.z); P.y = T.sampleHeight(P.x, P.z);
    await until(() => D.puzzle.bootLeft() < left0 - 0.2, 20000);
    ok(D.puzzle.bootLeft() < left0 && S().booting, 'away from the cabinet, fighting, it still counts down (' + D.puzzle.bootLeft().toFixed(1) + ' s left)');
    D.puzzle.boot(D.puzzle.bootLeft() - 0.2);   // skip most of it
    const done = await until(() => { T.clearZombies(); return R().state === 'ready-to-claim'; }, 30000);
    ok(done, 'rebooted: the radio is repaired, wherever he is (' + R().state + ')');
    await wait(300);
    ok(bar.classList.contains('restored') && /relay up/i.test(bar.querySelector('.rrb-label').textContent), 'the bar says "' + bar.querySelector('.rrb-label').textContent + '"');
    ok(getComputedStyle(document.querySelector('#objectiveHud .objective-tracker') || document.body).display === 'none' || document.querySelector('#objectiveHud .objective-tracker')?.hidden, 'no tracker card for the radio');
    const snap = R().runtime.snapshot(), site = snap && snap.sites.find((s) => s.id === 'objective:radio-repair');
    ok(site && Math.hypot(site.position.x - L.centre.x, site.position.z - L.centre.z) < 0.01, 'the tracker marks the vault, not the cabinet');
    // The vault: the keypad, the lift, the door.
    T.runDevCommand('vault'); T.clearZombies(); await wait(300);
    ok(/keypad/i.test(R().prompt || ''), 'at the vault: "' + R().prompt + '"');
    await tap(); await wait(150);
    ok(D.relay.mode === 'keypad' && !panel.querySelector('.note'), 'E opens its keypad (no hints on it)');
    const code = S().code, bad = code.map((d) => (d % 9) + 1);
    for (const d of bad) await tap('Digit' + d, String(d));
    ok(!S().unlocked && L.phase === 'locked', 'a wrong code: still locked');
    await until(() => D.relay.flash <= 0, 30000);
    // CL-185: the vault is a mystery box of what he does not have; day one is a weapon.
    const r1 = D.rewardFor(1);
    ok(r1 && r1.items.length === 1 && r1.items[0].kind === 'weapon' && ['uzi', 'shotgun', 'revolver'].includes(r1.items[0].id), 'day one sends up a gun he does not have: ' + JSON.stringify(r1 && r1.items));
    const r12 = D.rewardFor(12);
    ok(r12 && r12.items.length >= 1 && r12.items.every((it) => it.kind !== 'cash'), 'day twelve: ' + JSON.stringify(r12 && r12.items));
    D.rewardFor(20);   // the final day's, to see the katana come up
    for (const d of code) await tap('Digit' + d, String(d));
    ok(S().unlocked, 'the right code (' + code.join('') + ') opens it');
    await until(() => L.phase === 'lift', 10000);
    ok(L.phase === 'lift' && L.vault.rewards.katanaStand.visible, 'the lift brings the reward up the shaft');
    const opened = await until(() => L.phase === 'open', 120000);
    ok(opened && !L.vault.door.visible && !T.worldSolids.includes(L.doorSolid), 'then the door rolls up and the doorway is clear');
    // CL-185 (Jerry: "Player clips through floor when trying to claim reward"): walk him up the ramp and in through the
    // doorway; he stays on the ramp and then the floor all the way.
    const W2 = (lx, lz) => { const c = Math.cos(L.spot.yaw), sn = Math.sin(L.spot.yaw); return { x: L.spot.x + lx * c + lz * sn, z: L.spot.z - lx * sn + lz * c }; };
    const startW = W2(0, 1.5 + 1.6); P.set(startW.x, T.platformHeightAt(startW.x, startW.z, 99) + 0.05, startW.z); await wait(300);
    let lowest = Infinity;
    for (let i = 0; i <= 16; i++) {
      const q = W2(0, 1.5 + 1.6 - i * 0.2); P.x = q.x; P.z = q.z; T.clearZombies(); await wait(90);
      if (i > 6) lowest = Math.min(lowest, P.y - L.insideAt.y);
    }
    ok(lowest > -0.35, 'up the ramp and through the doorway he never drops below the floor (lowest ' + lowest.toFixed(2) + ' m)');
    stand(L.insideAt.x, L.insideAt.y + 0.05, L.insideAt.z); await wait(400);
    ok(L.cutaway === true && !L.vault.roof.visible, 'inside, the roof and the front are cut away');
    ok(/take/i.test(R().prompt || ''), 'inside: "' + R().prompt + '"');
    key('keydown'); await wait(200); key('keyup');
    const took = await until(() => R().state === 'claimed', 3000);
    ok(took && L.phase === 'empty' && !L.vault.rewards.katanaStand.visible, 'E takes it: ' + R().state + ', vault ' + L.phase);
    ok(T.isKatanaOwned(), 'the final day: the red katana');
    ok(Math.abs(P.y - L.insideAt.y) < 0.3, 'and he is still standing on the floor (' + (P.y - L.insideAt.y).toFixed(2) + ' m)');
    T.runDevCommand('godmode off');
    T.setKatanaOwned(false);
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
