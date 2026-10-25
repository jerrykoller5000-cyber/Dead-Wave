// t265 - GP-19937/GP-19965: medical convoy jack, sleeper and cooler.
(async () => {
  const T = window.TT, THREE = T.THREE, out = [], ok = (v, m) => out.push((v ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const until = async (f, ms = 4000) => { const start = Date.now(); while (Date.now() - start < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));
  const press = () => { key('keydown'); key('keyup'); };
  const tap = async () => { key('keydown'); await wait(60); key('keyup'); await wait(120); };
  const errs = []; window.addEventListener('error', e => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'MedicalConvoy');
    T.clearZombies(); T.setHp(100); T.runDevCommand('godmode');
    const D = T.convoyDbg, S = () => D.state();
    T.runDevCommand('site convoy'); await wait(180);
    const coolerBefore = T.getObjectiveProps()?.props?.['objective:medical-convoy']?.group?.position?.clone();
    ok(!!D.jack(), 'site convoy jumps to the jack');
    ok(D.reach()?.blockedBy === 'locked', 'the medical cache stays locked before jacking');
    ok(S().phase === 'idle' && S().pumps === 0, 'fresh mission has no pumps');
    ok(/jack/i.test(T.actionTarget?.() || '') || /jack/i.test(D.prompt() || ''), 'jack interaction is available');
    ok(D.kill().length === 0 && S().sleeperAlive, 'sleeper cannot die behind the closed door');
    await tap();
    ok(S().phase === 'pumping', 'E starts the jack');
    D.step(2.4);
    ok(S().phase === 'pumping' && S().misses === 0 && S().pumps === 0, 'watching several cues without pressing E does not slip the jack');
    D.step(S().untilBeat); press();
    ok(S().pumps === 1 && S().misses === 0, 'E key press on the cue pumps once');
    D.step(S().untilBeat); press();
    ok(S().pumps === 2, 'second E key press advances the jack');
    press();
    ok(S().pumps === 1 && S().misses === 1, 'offbeat E slips back a notch');
    press();
    ok(S().phase === 'warning' && S().pumps === 0, 'two misses start the sleeper warning');
    ok(D.kill().length === 0, 'warning keeps the sleeper protected');
    D.step(0.49);
    ok(S().phase === 'warning', 'door remains shut during the half-second thump');
    D.step(0.02);
    ok(S().phase === 'open' && S().doorOpen, 'door opens after the warning');
    await wait(70); // the live pose update mounts and exposes the sleeper in the open cab
    T.runDevCommand('godmode off'); T.setArmor(0); T.setHp(100);
    D.step(0.3);
    ok(Math.abs(T.getHp() - 25) < 0.01, 'sleeper spit takes 75% health (' + T.getHp() + ')');
    const sleeper = D.sleeper(), box = sleeper && new THREE.Box3().setFromObject(sleeper);
    const aim = box?.getCenter(new THREE.Vector3());
    const outward = new THREE.Vector3(1, 0, 0).applyQuaternion(T.POI.wrecks[0].mesh.quaternion);
    const muzzle = aim?.clone().addScaledVector(outward, 2.4);
    ok(!!(muzzle && D.hit(muzzle, aim)), 'the exposed sleeper has a bullet surface on the open-door side');
    const fireSleeper = () => {
      const dir = aim.clone().sub(muzzle).normalize();
      T.fireRoundDbg(muzzle.x, muzzle.y, muzzle.z, dir.x, dir.y, dir.z, 20, 90, 0);
      for (let i = 0; i < 20; i++) T.stepProjectilesDbg(0.016);
    };
    if (muzzle) { fireSleeper(); ok(D.hp() === 14, 'a live round hits the visible sleeper through the open door (' + D.hp() + ' HP)'); fireSleeper(); }
    else ok(false, 'the open cab mounts a sleeper to shoot');
    ok(!S().sleeperAlive, 'a second live round kills the sleeper only with the door open');
    T.runDevCommand('godmode');
    D.step(2);
    ok(S().phase === 'pumping' && !S().sleeperAlive, 'dead sleeper stays silent when door closes');
    const pensBeforeFinish = T.getMedkits();
    for (let i = 0; i < 8; i++) { D.step(S().untilBeat); press(); }
    ok(S().done && S().pumps === 8, 'eight good pumps release the cooler');
    await wait(70);
    ok(D.parts()?.vehicle?.position.y >= 1.77, 'eight pumps visibly raise the ambulance on the jack');
    const afterPumpSite = D.runtime()?.read()?.sites?.find(s => s.id === 'objective:medical-convoy');
    ok(T.getMedkits() === pensBeforeFinish && afterPumpSite?.state !== 'claimed',
      'the last pump does not also claim the cooler (' + pensBeforeFinish + ' to ' + T.getMedkits() + '; ' + afterPumpSite?.state + ')');
    const coolerMoved = await until(() => {
      const at = T.getObjectiveProps()?.props?.['objective:medical-convoy']?.group?.position;
      return !!(coolerBefore && at && at.distanceTo(coolerBefore) >= .4);
    }, 3000);
    const coolerAfter = T.getObjectiveProps()?.props?.['objective:medical-convoy']?.group?.position;
    ok(coolerMoved, 'released cooler visibly slides clear of the ambulance (' + (coolerBefore && coolerAfter ? coolerAfter.distanceTo(coolerBefore).toFixed(2) : '?') + ' m)');
    ok(D.reach()?.blockedBy !== 'locked', 'medical cache unlocks');
    const cooler = T.getObjectiveProps()?.props?.['objective:medical-convoy'];
    if (cooler?.approach) {
      const p = cooler.approach, pens = T.getMedkits();
      T.player.position.set(p.x, p.y, p.z); await wait(250);
      ok(D.reach()?.reachable, 'released cooler is reachable (' + D.reach()?.blockedBy + ')');
      key('keydown'); await until(() => T.getMedkits() >= pens + 2, 2500); key('keyup'); await wait(100);
      ok(T.getMedkits() === pens + 2, 'cooler awards exactly two medpens (' + pens + ' to ' + T.getMedkits() + '; ' + (D.runtime()?.read()?.sites?.find(s => s.id === 'objective:medical-convoy')?.state || '?') + ')');
    } else ok(false, 'medical cooler has an approach');
    const called = T.zombies.filter(z => z.convoyCalled);
    const centre = T.POI?.wrecks?.[0];
    const ds = centre && called.map(z => Math.hypot(z.x - centre.x, z.z - centre.z));
    ok(called.length > 0, 'jack noise calls the dead (' + called.length + ' spawned)');
    ok(ds?.every(d => d >= 21 && d <= 49), 'called dead spawn in the 30–40 m ring or its cave-safe 22–48 m fallback (' + (ds?.map(d => d.toFixed(1)).join(',') || 'none') + ')');
    ok(called.every(z => T.POI.caves.every(c => Math.hypot(z.x - c.x, z.z - c.z) >= 26)), 'called dead stay clear of cave mouths');
    ok(errs.length === 0, 'no uncaught errors (' + errs.join(' | ') + ')');
  } catch (e) { out.push('FAIL threw: ' + (e?.stack || e)); }
  return out.join('\n');
})()
