// t268 - AG-93 / AG-124 (D-82, D-88, docs/specs/day-missions.md §4): the trapper's safe path (game/trapper-path.js).
// Eight rows of two stepping stones in a leaf bed inside the trapper's fenced yard leading to his cellar hatch; a
// horseshoe on the post beside each safe stone (a new pattern each run); a wrong step or the leaves snap a bear trap
// (25 damage, held 3 s, 4-6 dead called); fence and brambles close the sides. Once crossed, the cellar hatch unlocks.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'TrapperPath');
    T.clearZombies(); T.setHp(100); T.runDevCommand('godmode');
    const D = T.trapperDbg, S = () => D.state(), R = D.trapper;
    await until(() => R.built, 4000);
    ok(R.built && !R.off && !!R.group, 'the trapper mission is built at campsites.2');
    const rows = D.TRAPPER.ROWS;
    ok(rows === 8 && R.stones.length === rows * 2 && R.posts.length === rows * 2 && R.horseshoes.length === rows,
      'eight rows of two stepping stones (' + R.stones.length + '), ' + R.posts.length + ' side posts, and ' + R.horseshoes.length + ' horseshoes');
    ok(R.colliders.length >= 20, 'fence and bramble colliders close both sides of the leaf bed (' + R.colliders.length + ')');
    const shoesMatch = () => S().safe.every((side, row) => {
      const post = R.posts.find((p) => p.row === row && p.side === side);
      const hs = R.horseshoes[row];
      return post && hs && hs.userData.side === side && Math.hypot(hs.position.x - post.lx, hs.position.z - post.lz) < 0.12;
    });
    ok(shoesMatch(), 'each row\'s horseshoe sits on the post beside that row\'s safe stone (' + S().safe.join(',') + ')');
    ok(D.locked(), 'the trapper cache is locked before crossing the safe path');

    // At the cellar hatch before crossing: locked and shows the trapped path prompt.
    T.runDevCommand('site trapper hatch'); await wait(150);
    ok(D.reach() && D.reach().blockedBy === 'locked', 'objectives cannot reach the hatch while locked (' + (D.reach() && D.reach().blockedBy) + ')');
    ok(/trapped path/i.test(D.prompt() || ''), 'at the locked hatch: "' + D.prompt() + '"');

    // Stepping on a wrong stone snaps a bear trap: 25 damage, held 3 s, 4-6 dead called.
    T.runDevCommand('godmode off'); T.setArmor(0); T.setHp(100); T.clearZombies();
    const bad0 = R.stones.find((s) => s.row === 0 && s.side !== S().safe[0]);
    const snap1 = D.stepAt(bad0.x, bad0.z, 0.016, { grounded: true, day: 1 });
    const called1 = T.zombies.filter((z) => z.trapperCalled);
    ok(snap1 && snap1.kind === 'snap' && snap1.reason === 'wrong-stone', 'wrong stone snaps a bear trap (' + (snap1 && snap1.kind) + ')');
    ok(Math.abs(T.getHp() - 75) < 0.01, 'bear trap deals 25 damage (100 -> ' + T.getHp() + ')');
    ok(Math.abs(S().holdT - 3.0) < 0.05 && !!R.holdPos, 'bear trap holds the marine for 3 s (' + S().holdT.toFixed(2) + 's)');
    ok(called1.length >= 4 && called1.length <= 6, 'bear trap calls 4-6 dead (' + called1.length + ' spawned)');
    ok(R.sprungGroup && R.sprungGroup.children.length === 1, 'sprung bear trap mesh appears at the foot (' + (R.sprungGroup && R.sprungGroup.children.length) + ')');
    ok(/bear trap/i.test(D.prompt() || ''), 'held prompt shows bear trap timer: "' + D.prompt() + '"');

    // Release the hold and verify stepping into the leaves also snaps a bear trap.
    D.stepAt(bad0.x, bad0.z, 3.1, { grounded: true, day: 1 });
    T.setHp(100); T.clearZombies();
    const good0 = R.stones.find((s) => s.row === 0 && s.side === S().safe[0]);
    const step0 = D.stepAt(good0.x, good0.z, 0.016, { grounded: true, day: 1 });
    ok(step0 && step0.kind === 'safe' && S().progress === 1, 'row 0 safe stone advances progress to 1');
    const opp1 = R.stones.find((s) => s.row === 1 && s.side !== S().safe[1]);
    const leafW = R.toWorld(opp1.lx * 1.4, (good0.lz + opp1.lz) * 0.5);
    const snap2 = D.stepAt(leafW.x, leafW.z, 0.016, { grounded: true, day: 1 });
    ok(snap2 && snap2.kind === 'snap' && snap2.reason === 'leaves' && R.sprungGroup.children.length === 2,
      'stepping off the stones into the leaves snaps a trap (' + (snap2 && snap2.reason) + ')');
    D.stepAt(leafW.x, leafW.z, 3.1, { grounded: true, day: 1 });

    // Walk all 8 safe stones in order -> unlocks the cellar hatch.
    T.runDevCommand('godmode');
    D.path.reset(); D.clearSprung(); D.syncHorseshoes();
    let lastRes = null;
    for (let r = 0; r < D.TRAPPER.ROWS; r++) {
      const st = R.stones.find((s) => s.row === r && s.side === S().safe[r]);
      lastRes = D.stepAt(st.x, st.z, 0.016, { grounded: true, day: 1 });
    }
    ok(lastRes && lastRes.kind === 'unlocked' && S().unlocked && !D.locked(), 'walking all eight safe stones unlocks the cellar hatch');

    // Now at the cellar hatch, objectiveReach is reachable and trapperPromptText yields to the cache prompt.
    T.runDevCommand('site trapper hatch'); await wait(150);
    ok(D.reach() && D.reach().reachable && !D.reach().blockedBy, 'cellar hatch is now reachable (' + (D.reach() && D.reach().blockedBy) + ')');
    ok(!D.prompt(), 'trapper lock prompt clears once unlocked');

    // Reset deals a new pattern and re-locks, and horseshoes follow the new pattern.
    const prevPattern = S().safe.join('');
    let differs = false;
    for (let i = 0; i < 8 && !differs; i++) {
      D.path.reset();
      D.syncHorseshoes();
      differs = S().safe.join('') !== prevPattern;
    }
    ok(differs && D.locked() && shoesMatch(), 'reset deals a new safe pattern and re-syncs horseshoes (' + prevPattern + ' -> ' + S().safe.join('') + ')');

    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no uncaught errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
