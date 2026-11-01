// tcl285c - CU-207: the whole chain. Seven leads sit in the gate set (not the truck). Each site starts
// shut, each key waits on its event, and opening the gate opens the site. A spare appears on the
// duty board two dawns after a lead opens with its key never ready. A reset puts it back.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const stand = (x, z) => { const y = T.sampleHeight(x, z); T.player.position.set(x, (Number.isFinite(y) ? y : 0) + 0.3, z); };
  const GATED = [
    { lead: 'generator', gate: 'depot-shed', key: 'price-key', event: null, site: 'objective:fuel-depot', also: null },
    { lead: 'relay', gate: 'mast-yard', key: 'sato-key', event: 'hq-power', site: 'objective:radio-repair', also: null },
    { lead: 'medical', gate: 'road-barrier', key: 'barrier-key', event: 'vault-first-lift', site: 'objective:medical-convoy', also: null },
    { lead: 'missing', gate: 'trail-chain', key: 'chain-key', event: 'ambulance-reached', site: 'objective:hikers-cache', also: null },
    { lead: 'search', gate: 'ranger-gate', key: 'ranger-gate-key', event: 'toolbox-open', site: 'objective:ranger-cache', also: null },
    { lead: 'oldman', gate: 'trapper-fence', key: 'trapper-combination', event: 'search-log-read', site: 'objective:trapper-cache', also: null },
    { lead: 'below', gate: 'mine-iron-gate', key: 'trapper-keyring', event: 'cellar-open', site: null, also: 'hush-wired' }
  ];
  try {
    if (!T.chainDbg || !T.runDevCommand) { ok(false, 'the chain hooks are there'); return out.join('\n'); }
    await startMatch(T, 'ChainWide');
    T.clearZombies && T.clearZombies();
    T.runDevCommand('godmode');
    const C = T.chainDbg;
    ok(C.on() === false, 'the timer page starts with the gates off');
    ok(C.on(true) === true, 'a check can turn the gates on');
    ok(await until(() => GATED.every((g) => C.at(g.gate)), 8000), 'the seven gated leads have a gate standing');
    ok(C.at('toolbox-chain') == null, 'the truck is not in that set');
    const keys0 = C.read().keys;
    ok(keys0['price-key'] === 'ready', 'Price\'s key is ready from the start');
    ok(GATED.filter((g) => g.key !== 'price-key').every((g) => keys0[g.key] === 'unseen'), 'no other gated key is ready yet (' + GATED.filter((g) => g.key !== 'price-key').map((g) => g.key + ':' + keys0[g.key]).join(' ') + ')');
    ok(GATED.filter((g) => g.site).every((g) => C.shut(g.site) === true), 'every gated site is shut');
    ok(C.mineShut() === true, 'the iron mine is shut');
    T.runDevCommand('story open relay');
    const opened = (C.story().leads.find((l) => l.id === 'relay') || {}).openedDay;
    const got = C.dawn((opened == null ? 0 : opened) + 2);
    ok(got.includes('mast-yard') && C.spare(), 'two dawns with Sato\'s key never ready puts a spare on the duty board');
    const sp = C.spare();
    if (sp) { stand(sp.x, sp.z); ok(C.use() === true && C.read().keys['sato-key'] === 'held', 'E takes the spare'); }
    else ok(false, 'no spare to take');
    C.reset();
    ok(C.on(true) === true, 'the gates come back on after a reset');
    ok(await until(() => GATED.every((g) => C.at(g.gate)), 8000), 'the seven gates stand again');
    const keys1 = C.read().keys;
    ok(keys1['price-key'] === 'ready' && keys1['sato-key'] === 'unseen' && C.read().gates['depot-shed'] === 'locked', 'a reset locks the shed and puts the spare away');
    for (const g of GATED) {
      if (g.event) {
        ok(C.read().keys[g.key] === 'unseen', g.lead + ': the key waits on ' + g.event);
        C.event(g.event);
        const ready = g.key === 'trapper-combination' ? 'held' : 'ready';
        ok(await until(() => { const s = C.read().keys[g.key]; return s === ready || s === 'held'; }, 2000), g.lead + ': the event readies ' + g.key + ' (' + C.read().keys[g.key] + ')');
      }
      if (C.read().keys[g.key] === 'ready') {
        ok(await until(() => { const k = C.keyAt(g.key); return k && k.visible; }, 3000), g.lead + ': the key is showing');
        const k = C.keyAt(g.key);
        ok(!!k, g.lead + ': the key is in the world');
        if (k) { stand(k.x, k.z); ok(C.use() === true && C.read().keys[g.key] === 'held', 'E takes ' + g.key); }
      } else ok(C.read().keys[g.key] === 'held', g.lead + ': ' + g.key + ' is held (' + C.read().keys[g.key] + ')');
      const gate = C.at(g.gate);
      ok(!!gate, g.lead + ': the gate is standing');
      if (g.also) {
        stand(gate.x, gate.z);
        ok(C.use() === false && !C.at(g.gate).open, g.lead + ': the key alone does not open it');
        C.event(g.also);
      }
      if (gate) stand(gate.x, gate.z);
      ok(C.use() === true && C.at(g.gate).open, 'E opens ' + g.gate);
      if (g.site) ok(C.shut(g.site) === false, g.lead + ': the site is open');
      else ok(C.mineShut() === false, 'the iron mine is open');
    }
  } catch (e) {
    ok(false, 'tcl285c threw: ' + String((e && e.stack) || e).slice(0, 500));
  }
  return out.join('\n');
})()
