// t296 - CL-261 (Jerry's N6: "Player model motions and especially arm and body movements while unarmed running look
// pretty goofy"). The unarmed run's arms against the reference (the CMU motion capture run 09_01, studio/import-cmu.py):
//  - the upper arm's arc sits behind him (its middle well back of straight down) and comes only a little in front;
//  - the elbows are bent like a runner's (80-125 degrees), more as the arm comes forward;
//  - the hands stay close beside him (no flaring out) and come in toward his middle as they come forward;
//  - the chest turns with the arms; the walk is as it was.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const G = T.gaitDbg && T.gaitDbg.GAIT;
  try {
    if (!G || !T.gaitDbg.UNARMED_RUN) { ok(false, 'the CL-261 hooks are there'); return out.join('\n'); }
    await startMatch(T, 'Unarmed run');
    T.clearZombies && T.clearZombies(); T.runDevCommand('godmode');
    if (!T.isUnarmed()) T.toggleHolster();
    ok(await until(() => T.isUnarmed() && !T.drawDbg().active, 10000), 'unarmed');
    { const s0 = T.getSimTime(); await until(() => T.getSimTime() - s0 >= 1.0, 30000); }
    const ud = T.getMarine().userData, d = (r) => (r * 180 / Math.PI).toFixed(0);
    const beat = async (u, run) => { G.holdRun = run; G.holdU = u; const s0 = T.getSimTime(); await until(() => T.getSimTime() - s0 >= 0.6, 30000);
      return { arm: ud.armLG.rotation.x, armZ: ud.armLG.rotation.z, elbow: -ud.elbowLG.rotation.x }; };
    // The run, at eight beats.
    await beat(0, true); { const s0 = T.getSimTime(); await until(() => T.getSimTime() - s0 >= 1.5, 30000); }   // up to a full run
    const R = []; for (let k = 0; k < 8; k++) R.push(await beat(k / 8, true));
    const arms = R.map((b) => b.arm), mid = (Math.max(...arms) + Math.min(...arms)) / 2;
    out.push('INFO run: arm ' + arms.map(d).join(' ') + ' deg (+ back); elbow ' + R.map((b) => d(b.elbow)).join(' '));
    ok(mid > 0.15, 'the arc sits behind him (its middle ' + d(mid) + ' deg back)');
    ok(Math.min(...arms) > -0.35, 'and comes only a little in front (' + d(-Math.min(...arms)) + ' deg at most)');
    ok(Math.max(...arms) - Math.min(...arms) > 0.6, 'a full swing (' + d(Math.max(...arms) - Math.min(...arms)) + ' deg)');
    const el = R.map((b) => b.elbow);
    ok(Math.min(...el) > 1.2 && Math.max(...el) < 2.3, 'the elbow bent like a runner\'s (' + d(Math.min(...el)) + '-' + d(Math.max(...el)) + ' deg)');
    const fwd = R.reduce((a, b) => (b.arm < a.arm ? b : a)), back = R.reduce((a, b) => (b.arm > a.arm ? b : a));
    ok(fwd.elbow > back.elbow, 'more bent forward than back (' + d(fwd.elbow) + ' against ' + d(back.elbow) + ')');
    ok(Math.max(...R.map((b) => Math.abs(b.armZ))) < 0.2, 'the arms close beside him, not flared (' + d(Math.max(...R.map((b) => Math.abs(b.armZ)))) + ' deg out at most)');
    // The walk keeps its own swing (about the vertical, softer elbows).
    await beat(0, false); { const s0 = T.getSimTime(); await until(() => T.getSimTime() - s0 >= 1.5, 30000); }   // back down to a walk
    const W = []; for (let k = 0; k < 8; k += 2) W.push(await beat(k / 8, false));
    const wa = W.map((b) => b.arm), wmid = (Math.max(...wa) + Math.min(...wa)) / 2;
    out.push('INFO walk: arm ' + wa.map(d).join(' ') + '; elbow ' + W.map((b) => d(b.elbow)).join(' '));
    ok(Math.abs(wmid) < 0.12 && Math.max(...W.map((b) => b.elbow)) < 0.8, 'the walk is as it was (its middle ' + d(wmid) + ' deg, elbows under ' + d(Math.max(...W.map((b) => b.elbow))) + ')');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  finally { if (G) { G.holdU = null; G.holdRun = false; } }
  return out.join('\n');
})()
