// t317 - AG-175: the trapper's fence gate stays shut until the rangers' search log combination opens it.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const stand = (x, z) => { const y = T.sampleHeight(x, z); T.player.position.set(x, (Number.isFinite(y) ? y : 0) + 0.3, z); };
  try {
    if (!T.chainDbg || !T.trapperDbg || !T.runDevCommand) { ok(false, 'the chain and trapper hooks are there'); return out.join('\n'); }
    await startMatch(T, 'TrapperFenceGate');
    T.clearZombies && T.clearZombies();
    if (T.runDevCommand) T.runDevCommand('godmode');
    const C = T.chainDbg, Tr = T.trapperDbg;
    ok(C.on() === false, 'the timer page starts with the gates off');
    ok(C.on(true) === true, 'a check can turn the gates on');
    T.runDevCommand('site trapper');
    ok(await until(() => !!C.at('trapper-fence'), 8000), 'the trapper fence gate is standing in the world');
    const gate0 = C.at('trapper-fence');
    ok(gate0 && !gate0.fenced, 'the gate stands in the yard opening without extra fence wings');
    ok(C.shut('objective:trapper-cache') === true, 'the trapper cache is shut by the gate');
    ok(Tr.reach() && Tr.reach().blockedBy === 'chain', 'the claim is blocked by chain (' + (Tr.reach() && Tr.reach().blockedBy) + ')');

    // Stand at the gate: prompt mentions the search log combination
    stand(gate0.x, gate0.z);
    await wait(100);
    const pLocked = Tr.prompt() || C.prompt() || '';
    ok(/combination|search log|gate|locked/i.test(pLocked), 'at the gate, locked prompt mentions combination/search log ("' + pLocked + '")');

    // E at the gate without knowing the combination does not open it
    ok(C.use() === false, 'E without knowing the combination does not open the gate');
    ok(C.at('trapper-fence').open === false, 'the gate remains locked');

    // Walking / stepping into the yard is blocked while the gate is shut
    const stepBlocked = Tr.stepAt(gate0.x, gate0.z - 0.5, 0.1);
    ok(stepBlocked === null, 'stepping onto the yard path is blocked while the gate is shut');

    // Learn the combination by reading the rangers' search log
    C.event('search-log-read');
    ok(await until(() => C.read().keys['trapper-combination'] === 'held', 2000), 'reading the search log learns the combination');

    // With the combination known, standing at the gate shows the unlock prompt
    stand(gate0.x, gate0.z);
    await wait(100);
    const pKnown = Tr.prompt() || C.prompt() || '';
    ok(/combination|yard gate|open|look/i.test(pKnown), 'with combination known, prompt offers to open ("' + pKnown + '")');

    // Press E at the gate to open it
    ok(C.use() === true, 'E opens the combination padlock');
    ok(await until(() => C.at('trapper-fence') && C.at('trapper-fence').open, 2000), 'the combination gate is open');
    ok(C.shut('objective:trapper-cache') === false, 'the trapper cache is no longer shut by the gate');

    // Stepping into the yard is now possible
    const stepAllowed = Tr.stepAt(gate0.x, gate0.z - 0.5, 0.1);
    ok(stepAllowed !== null, 'stepping into the yard is now possible');

    // Reset for spare key test: when lead is open and combination was never learned, spare arrives after 2 dawns
    C.reset();
    ok(C.read().gates['trapper-fence'] === 'locked' && C.read().keys['trapper-combination'] === 'unseen' && !C.at('trapper-fence'), 'reset restores initial state');
    ok(C.on(true) === true, 'gates re-enabled');
    T.runDevCommand('site trapper');
    ok(await until(() => !!C.at('trapper-fence'), 4000), 'gate stands after re-enable');
    T.runDevCommand('story open oldman');
    const opened = (C.story().leads.find((l) => l.id === 'oldman') || {}).openedDay;
    const got = C.dawn((opened == null ? 0 : opened) + 2);
    ok(got.includes('trapper-fence') && C.read().spare.includes('trapper-fence'), 'spare combination arrives on duty board after two dawns');
    const sp = C.spare();
    if (sp) {
      stand(sp.x, sp.z);
      ok(C.use() === true && C.read().keys['trapper-combination'] === 'held', 'E takes the spare combination from duty board');
    } else {
      ok(false, 'no spare on duty board');
    }

    // Clean reset at the end
    C.reset();
    ok(C.read().gates['trapper-fence'] === 'locked' && C.read().keys['trapper-combination'] === 'unseen', 'a new run locks the gate and clears knowledge');
  } catch (e) {
    ok(false, 't317 threw: ' + String((e && e.stack) || e).slice(0, 450));
  }
  return out.join('\n');
})()
