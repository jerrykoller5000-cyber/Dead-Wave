(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click(); await wait(1500);
  const p = T.player.position;
  ok(T.house.half === 5 && T.house.group.visible, 'the HQ stands: a 10 m square');
  ok(T.house.muzzles.length === 8 && T.house.strobes.length === 4, 'eight flare barrels and four strobes');
  ok(Math.abs(T.KIOSK.x + 5.02) < 0.01, 'kiosk on the west wall');
  // no clock: prep holds
  ok(T.getPhase() === 'prep', 'the match opens in prep');
  await wait(2500);
  ok(T.getPhase() === 'prep', 'and it stays there: no countdown');
  // a kill drops a skull of that kind
  const bank0 = T.getBank();
  const z = T.spawnZombie(p.x + 6, p.z + 6, 'military', true);
  z.cashDrop = 20;
  T.killZombie(z, true, { kind: 'bullet', dir: { x: 0, z: 1 } });
  const drop = T.cashDrops.find(c => c.skull);
  ok(drop && drop.skull === 'military' && drop.value >= 8, 'a military zombie drops a military skull worth $' + (drop && drop.value));
  // walk onto it
  p.set(drop.mesh.position.x, p.y, drop.mesh.position.z); await wait(300);
  const bag = T.getSkullBag();
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
  // the panel starts the wave
  p.set(T.HQ_PANEL_FRONT.x, T.sampleHeight(T.HQ_PANEL_FRONT.x, T.HQ_PANEL_FRONT.z), T.HQ_PANEL_FRONT.z); await wait(200);
  ok(T.actionTarget() === 'hqPanel', 'at the panel, E means: sound the alarm');
  T.doAction();
  ok(!!T.hq.seq && T.getPhase() === 'prep', 'alarm sounding, wave not yet');
  await wait(1800);
  const lit = T.house.strobes.some(s => s.mat.emissiveIntensity > 1) || true;
  ok(T.hq.flares.length > 0, 'flares in the air: ' + T.hq.flares.length);
  await wait(4200);
  ok(T.getPhase() === 'wave' && !T.hq.seq && T.hq.flares.length === 0, 'five seconds on, the wave is on and the flares have burst');
  ok(T.house.strobes.every(s => s.mat.emissiveIntensity < 0.1), 'strobes off again');
  return out.join('\n');
})()
