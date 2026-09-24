(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  // Play refuses with no callsign. During menuCamera.deploying the game loop skips
  // updateCashDrops, so wait until a far teleport sticks (not the porch spawn).
  const nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.value = 'TestMarine';
  document.getElementById('modeHunt').click();
  let started = false;
  for (let i = 0; i < 80; i++) {
    await wait(200);
    if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
  }
  ok(started && T.getPhase() === 'prep', 'the match opens in prep');
  const p = T.player.position;
  {
    const tx = 18, tz = 18;
    for (let i = 0; i < 80; i++) {
      await wait(200);
      p.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(40);
      if (Math.hypot(p.x - tx, p.z - tz) < 0.4) break;
    }
  }
  ok(T.house.half === 5 && T.house.group.visible, 'the HQ stands: a 10 m square');
  ok(T.house.muzzles.length === 8 && T.house.strobes.length === 4, 'eight flare barrels and four strobes');
  ok(Math.abs(T.KIOSK.x + 5.02) < 0.01, 'kiosk on the west wall');
  // no clock: prep holds
  await wait(2500);
  ok(T.getPhase() === 'prep', 'and it stays there: no countdown');
  // a kill drops a skull of that kind
  const bank0 = T.getBank();
  const z = T.spawnZombie(p.x + 6, p.z + 6, 'military', true);
  z.cashDrop = 20;
  T.killZombie(z, true, { kind: 'bullet', dir: { x: 0, z: 1 } });
  const drop = T.cashDrops.find(c => c.skull);
  ok(drop && drop.skull === 'military' && drop.value >= 8, 'a military zombie drops a military skull worth $' + (drop && drop.value));
  // walk onto it (poll: one frame of updateCashDrops is enough once insertion ended)
  let bag = T.getSkullBag();
  for (let i = 0; i < 40 && bag.count < 1; i++) {
    p.set(drop.mesh.position.x, T.sampleHeight(drop.mesh.position.x, drop.mesh.position.z), drop.mesh.position.z);
    await wait(50);
    bag = T.getSkullBag();
  }
  ok(bag.count === 1 && T.getBank() === bank0, 'picked up: 1 skull in the bag ($' + bag.value + '), bank untouched');
  const val = bag.value;
  // to the window
  p.set(T.HQ_WINDOW_FRONT.x, T.sampleHeight(T.HQ_WINDOW_FRONT.x, T.HQ_WINDOW_FRONT.z), T.HQ_WINDOW_FRONT.z); await wait(200);
  ok(T.actionTarget() === 'hqWindow', 'at the window, E means: turn in skulls');
  T.doAction();
  ok(T.hq.dep === 'open' && T.getSkullBag().count === 0, 'the shutter opens and the bag goes');
  await wait(900);
  ok(T.hq.dep === 'throw' || T.hq.dep === 'close' || T.hq.dep === 'process', 'thrown in (' + T.hq.dep + ')');
  await wait(1200);
  ok(T.hq.dep === 'process' && T.getBank() === bank0, 'machinery running, no cash yet');
  await wait(4000);
  ok(T.hq.dep === 'green' && T.getBank() === bank0 + val, 'ding: light green, +$' + (T.getBank() - bank0));
  // GP-5: panel E opens the briefing; only explicit Sound alarm starts hqStartWave
  p.set(T.HQ_PANEL_FRONT.x, T.sampleHeight(T.HQ_PANEL_FRONT.x, T.HQ_PANEL_FRONT.z), T.HQ_PANEL_FRONT.z); await wait(200);
  ok(T.actionTarget() === 'hqPanel', 'at the panel, E means: open HQ briefing');
  T.doAction();
  await wait(100);
  const briefing = document.getElementById('hqBriefing');
  ok(!!briefing && briefing.open === true && !T.hq.seq, 'briefing open after E; alarm not started');
  const alarmBtn = briefing && [...briefing.querySelectorAll('button')].find(b => /Sound alarm/i.test(b.textContent || ''));
  ok(!!alarmBtn && !alarmBtn.disabled, 'Sound alarm button present and enabled');
  if (alarmBtn) alarmBtn.click();
  await wait(100);
  ok(!!T.hq.seq && T.getPhase() === 'prep', 'alarm sounding, wave not yet');
  await wait(1800);
  // GB-15: real strobes-on check (was const lit = ... || true never asserted).
  // updateHQSequence pulses emissiveIntensity 6 with a short duty cycle while seq.t < 5;
  // poll so a headless sample is not stuck between flashes.
  let lit = false;
  for (let i = 0; i < 40 && !lit; i++) {
    lit = T.house.strobes.some(s => s.mat.emissiveIntensity > 1);
    if (!lit) await wait(50);
  }
  ok(lit, 'strobes flash during the alarm sequence');
  ok(T.hq.flares.length > 0, 'flares in the air: ' + T.hq.flares.length);
  await wait(4200);
  ok(T.getPhase() === 'wave' && !T.hq.seq && T.hq.flares.length === 0, 'five seconds on, the wave is on and the flares have burst');
  ok(T.house.strobes.every(s => s.mat.emissiveIntensity < 0.1), 'strobes off again');
  return out.join('\n');
})()
