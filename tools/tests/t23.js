(async () => {
  const T = window.TT; const A = T.AudioSys; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.value = 'TestMarine';
  document.getElementById('modeHunt').click();
  let started = false;
  for (let i = 0; i < 80; i++) {
    await wait(200);
    if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
  }
  ok(started, 'match reached prep after Play');
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
  A.unlock && A.unlock();
  // spy
  const calls = []; const spy = (name) => { const f = A[name]; A[name] = function (...a) { calls.push([name, ...a]); return f.apply(this, a); }; };
  for (const n of ['reloadCue', 'turretServos', 'mineBeep', 'buildHit', 'buildBreak', 'buildSound', 'zombieVoice', 'nvgToggle', 'kioskBuy', 'kioskTab', 'doorSound', 'footstepWood', 'chainsawEngine', 'chainsawDryPull']) spy(n);
  const count = (n, f) => calls.filter(c => c[0] === n && (!f || f(c))).length;
  // every sound runs without throwing
  let errs = [];
  const tryIt = (n, ...a) => { try { A[n](...a); } catch (e) { errs.push(n + ': ' + e.message); } };
  for (const c of ['magRelease','magOut','magIn','magSlap','slideBack','slideFwd','charge','akRockOut','akRockIn','drumOut','drumIn','boltUp','boltBack','boltFwd','boltDown','boxLatch','belt','boxSeat','motorBlip','valveShut','tankOff','tankOn','valveOpen','igniter','shell','brass','bigBrass','grab']) tryIt('reloadCue', c, 1);
  for (const m of ['wood','metal','steel','sand','wire','turret']) { tryIt('buildHit', m, 1, 0); tryIt('buildBreak', m, 1, 0.3); }
  for (const k of ['wall','floor','window','door','sandbag','barricade','railing','wire','spikes','mine','barrel','lure','light','heavy','flame','mortar','shovel','stairs','pillar','platform']) tryIt('buildSound', k);
  for (const t of ['shambler','feral','leaper','spider','drowned','military','brute','spitter','screamer','bomber','demon','colossus']) for (const s of ['idle','chase','attack','leap']) tryIt('zombieVoice', t, s, 1, 0);
  tryIt('mineBeep', 1, 0); tryIt('nvgToggle', true); tryIt('nvgToggle', false); tryIt('nvgHum', true); tryIt('nvgHum', false);
  tryIt('kioskBuy'); tryIt('kioskTab'); tryIt('doorSound', true); tryIt('doorSound', false); tryIt('footstepWood', true);
  tryIt('turretServos', [{ key: 1, level: 0.5, freq: 40, pan: 0 }]); tryIt('turretServos', null); tryIt('chainsawDryPull'); tryIt('reloadStart'); tryIt('reloadDone');
  ok(errs.length === 0, 'every new sound plays without error ' + errs.join('; '));
  calls.length = 0;
  // chainsaw: equip -> engine on (pull start), idle loop; unequip -> off
  const W = T.WEAPON_ORDER || ['minigun','m4','ak','pistol','uzi','shotgun','aa12','revolver','sniper','launcher','flamer','chainsaw'];
  T.runDevCommand('bigtex shooter');
  const owned = T.getWeaponOwned(); for (const w of W) owned[w] = true;
  T.setWeapon(W.indexOf('chainsaw'));
  // Pull-start is ~0.62s before the idle loop exists; poll until running or timeout.
  let running = false;
  for (let i = 0; i < 40; i++) {
    await wait(100);
    if (A.isChainsawRunning()) { running = true; break; }
  }
  ok(T.getCurrentWeapon() === 'chainsaw' && T.getSawFuel() > 0, 'chainsaw in hand with fuel (' + T.getSawFuel() + ')');
  ok(running, 'engine idling after the pull-start');
  ok(count('chainsawEngine', c => c[1] === true) > 0, 'engine asked on every frame');
  T.setWeapon(W.indexOf('pistol')); await wait(400);
  ok(!A.isChainsawRunning(), 'put away: engine shuts off');
  // reloads: each gun's cues play in order
  const res = [];
  for (const w of ['pistol','uzi','m4','ak','aa12','sniper','minigun','flamer','shotgun','revolver','launcher']) {
    T.setWeapon(W.indexOf(w)); await wait(250);
    const am = T.getAmmo(); am[w] = 0; T.getReserve()[T.caliberOf ? T.caliberOf(w) : w] = 999;
    calls.length = 0;
    T.startReload(); const t0 = performance.now();
    while (T.isReloading() && performance.now() - t0 < 8000) await wait(50);
    const cues = calls.filter(c => c[0] === 'reloadCue').map(c => c[1]);
    res.push(w + ':' + cues.length + '[' + cues.join(',') + ']');
    if (!cues.length) out.push('  (no cues for ' + w + ', reloading ' + T.isReloading() + ')');
  }
  out.push('  ' + res.join('\n  '));
  ok(res.every(r => !/:0\[/.test(r)), 'every gun has reload sounds');
  const sg = res.find(r => r.startsWith('shotgun'));
  ok(sg && (sg.match(/shell/g) || []).length >= 2, 'shotgun: one sound per shell');
  return out.join('\n');
})()
