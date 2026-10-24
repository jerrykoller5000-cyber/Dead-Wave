// CL-196 (Claude): the inspector (studio/inspector/) attaches to a running game through TT.inspectHost(), every subject
// in its catalog builds, its clock holds and steps the game, the rewind gives frames back, and the marine's moves are
// the game's own (a reload reloads, V slows time). Under the suite's stand-in renderer nothing is drawn, so an empty
// picture is not a failure here; a builder that throws or is missing is (the real-renderer check is
// `node tools/camera.mjs check`).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (f()) return true; } catch (_) {} await wait(40); } return false; };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    ok(typeof T.inspectHost === 'function', 'TT.inspectHost is there');
    const host = T.inspectHost();
    const missing = Object.entries(host.builders).filter(([, f]) => f == null).map(([k]) => k);
    ok(!missing.length, 'every builder the inspector needs is in the game' + (missing.length ? ': missing ' + missing.join(', ') : ''));
    const m = await import('/studio/inspector/inspector.js');
    const api = await m.boot(host, { mute: true });
    ok(api && api.ready, 'the inspector starts on a debug game (' + api.list().length + ' subjects)');
    ok(T.trainingDbg.state().active, 'it stands in the Training Ground');
    const res = await api.check({ frames: 1 });
    const broken = res.filter((r) => !r.ok && !/^nothing/.test(r.error || ''));
    ok(res.length > 100 && !broken.length, 'every subject builds (' + res.length + ')' + (broken.length ? ': ' + broken.slice(0, 6).map((r) => r.id + ' ' + r.error).join(' | ') : ''));
    for (const g of ['Marine', 'Zombies', 'Weapons', 'Animals & people', 'Props & vehicles']) ok(api.list().some((e) => e.group === g), 'the list has ' + g);
    // the clock is the game's
    await api.show('marine');
    api.pause(); await wait(120);
    const s0 = T.getSimTime(); await wait(400);
    ok(T.getSimTime() === s0, 'paused, the game stands still (' + (T.getSimTime() - s0).toFixed(3) + ' s)');
    api.step(6); await until(() => !api.time().step, 3000);
    const s1 = T.getSimTime();
    ok(Math.abs(s1 - s0 - 0.1) < 0.02, 'six steps run it 0.1 s (' + (s1 - s0).toFixed(3) + ')');
    api.speed(0.25); api.play();
    const a = T.getSimTime(), w0 = performance.now(); await wait(800);
    const k = (T.getSimTime() - a) / ((performance.now() - w0) / 1000);
    ok(k > 0.05 && k < 0.45, 'at 0.25x the game runs at about a quarter speed (' + k.toFixed(2) + ')');
    api.speed(1);
    // the marine's moves go through the game
    await api.marine.play('reload-m4');
    ok(await until(() => T.isReloading(), 2000) && T.getCurrentWeapon() === 'm4', 'a reload move reloads the M4');
    await api.marine.play('slow-time');   // CL-252: the dive went in D-87 (CL-248); V slows time
    ok(await until(() => T.diveDbg().slowing, 3000) && T.diveDbg().phase === 'idle', 'the slow-time move slows time, on his feet (' + T.diveDbg().slowing + ', ' + T.diveDbg().phase + ')');
    await api.marine.play('walk');
    await wait(500);
    const P = T.player.position, c = api._ix.stage.center;
    ok(Math.hypot(P.x - c.x, P.z - c.z) < 0.01 && Math.hypot(T.smoothDbg.vel().x, T.smoothDbg.vel().z) > 0.5, 'walking on the treadmill: he moves, and stays on the stage');
    api.marine.stop();
    // the rewind
    await api.marine.play('stand-armed'); await wait(600);
    api.pause();
    const f = api.time().rewind.frames;
    ok(f > 5, 'the rewind holds frames (' + f + ')');
    api.scrub(Math.min(5, f - 1)); ok(api.time().scrubbing, 'scrubbing back shows a past frame');
    api.play(); ok(!api.time().scrubbing, 'play goes back to the present');
    // a zombie, live and as a statue
    await api.show('zombie.shambler');
    ok(T.zombies.some((z) => z.alive && z.trainingZ && z.typeKey === 'shambler'), 'a live shambler, the Training Ground\'s own');
    await api.show('zombie.shambler', { mode: 'statue' });
    ok(!T.zombies.some((z) => z.alive), 'a statue is not in the game\'s list');
    await api.show('marine');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
