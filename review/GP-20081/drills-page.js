// Evaluated inside the live Training Ground. The game renders while this advances
// the actual range session and target hinges in small steps; no scoring rules are mocked.
(async () => {
const T = TT, tg = T.trainingDbg.tg(), F = T.rangeDbg.feature();
const { RANGE_DRILLS } = await import('/ui/range-drills.js');
const { targetGoal } = await import('/ui/range-guide.js');
const d = RANGE_DRILLS[window.GP20081.index];
const tick = async n => {
  for (let k = 0; k < n; k++) {
    tg.update(.25); F.tick(.25);
    if (k % 8 === 7) await new Promise(requestAnimationFrame);
  }
};
const sample = (absolute, wanted) => {
  const b = tg.targets[absolute].box;
  const x = (b.minX + b.maxX) / 2, z = (b.minZ + b.maxZ) / 2;
  for (let iy = 0; iy <= 28; iy++) {
    const y = b.minY + (b.maxY - b.minY) * iy / 28;
    for (let ix = -5; ix <= 5; ix++) {
      const p = { x: x + ix * .08, y, z };
      const s = tg.scoreHit(absolute, p);
      if (s && (!wanted || s.zone === wanted || wanted === 'ring' && s.zone === 'bull')) return p;
    }
  }
  return null;
};
F.open();
const start = F.start(d);
const log = { weapon:d.weapon, id:d.id, mode:d.mode, expected:targetGoal(d), started:start.ok, reason:start.reason || null,
  states:[], raised:0, hitAccepted:0, hitRejected:0, zoneMissing:[], firstHud:'', lastHud:'', result:null, reportText:'', recordCount:0, action:'' };
if (start.ok) {
  const loadout=F.read().loadout;
  let previous = '', lastActivation = -1, wasActive = false, actionDone = false;
  for (let step = 0; step < 1100; step++) {
    tg.update(.25); F.tick(.25);
    const s = F.read();
    if (s.state !== previous) { log.states.push(s.state); previous = s.state; }
    if (s.state === 'ACTIVE') wasActive = true;
    if (s.state === 'ACTIVE' && !log.firstHud) log.firstHud = document.getElementById('rangeDrillHud')?.innerText || '';
    if (s.state === 'ACTIVE' && d.startHolstered && !actionDone) {
      T.toggleHolster(); actionDone=true; log.action='drew after beep';
      await new Promise(requestAnimationFrame); continue;
    }
    if (s.state === 'ACTIVE' && d.requireReload && !actionDone) {
      const began=T.startReload(); actionDone=true; log.action='reload '+began;
      await new Promise(r=>setTimeout(r,2600)); continue;
    }
    if (s.state === 'ACTIVE' && s.phase === 'exposed') {
      if (s.activation !== lastActivation) { log.raised++; lastActivation = s.activation; }
      const active = [...s.targets].filter(t => !t.done).sort((a,b) => (a.index === s.plan?.priority ? -1 : b.index === s.plan?.priority ? 1 : 0));
      const bank = tg.targets.filter(t => t.solid?.rangeOwned);
      for (const target of active) {
        const absolute = tg.targets.indexOf(bank[target.index]);
        const p = sample(absolute, s.plan?.zone);
        if (!p) { log.zoneMissing.push({ wave:s.wave, lane:target.index, zone:s.plan?.zone }); continue; }
        for (let hit = target.hits; hit < d.minHits; hit++) {
          const token = F.attack(s.expectedWeapon);
          if (F.hit(absolute, p, token, 'shot')) log.hitAccepted++;
          else log.hitRejected++;
        }
      }
    }
    if (['COMPLETED','DISQUALIFIED','ABORTED'].includes(s.state)) { log.result=s.result; break; }
    if (s.state === 'IDLE' && wasActive) break; // live render loop consumed the result
    if (step % 8 === 7) await new Promise(requestAnimationFrame);
  }
  log.lastHud = document.getElementById('rangeDrillHud')?.innerText || '';
  await tick(8); // let each plate fold and allow the results pane to settle
  F.open();
  log.reportText = document.getElementById('rangeConsole')?.innerText || '';
  const saved=F.records.list(d,loadout);
  log.recordCount = saved.length;
  if (!log.result && saved.length) log.result={state:'COMPLETED',...saved[0]};
  F.exit();
}
return log;
})()
