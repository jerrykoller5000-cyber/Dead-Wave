// t55 — CU-11: getObjectiveInteraction reach, press, and hold on one site.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const pressE = () => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));   // GB-186: on a Node (ui/prep-checklist.js reads e.target.contains)
  const upE = () => document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
  try {
    ok(typeof T.getObjectiveInteraction === 'function', 'exported');
    ok(T.getObjectiveInteraction('nope') === null, 'unknown id is null');
    const bag = T.getObjectiveProps();
    // GB-186: the radio is no hold any more (CL-183/184: its reboot runs by itself).
    // GB-212: since GB-197 the fuel depot is locked until the can is poured, and every other site has its own lock;
    // the hold is checked on the trapper's cache, unlocked with the dev command (which also stands him at it).
    const SITE = 'objective:trapper-cache';
    const prop = bag && bag.props[SITE];
    ok(!!prop, 'trapper cache prop is placed');
    if (!prop) return out.join('\n');
    const unlock = () => T.runDevCommand('site trapper unlock');
    unlock();
    T.player.position.set(prop.approach.x + 12, prop.approach.y, prop.approach.z);
    const far = T.getObjectiveInteraction(SITE);
    ok(far && far.reachable === false && (far.blockedBy === 'distance' || far.blockedBy === 'height'), 'too far: ' + (far && far.blockedBy));
    const a = prop.approach;
    T.player.position.set(a.x, a.y, a.z);
    const near = T.getObjectiveInteraction(SITE);
    ok(near.reachable === true && near.blockedBy === null, 'at the approach: ' + near.blockedBy + ' d=' + near.distance.toFixed(2));
    const other = T.getObjectiveInteraction('objective:radio-repair');
    ok(other && other.reachable === false, 'another site stays out of reach');
    if (typeof startMatch === 'function') await startMatch(T, 'T55');
    unlock();
    T.player.position.set(a.x, a.y, a.z);
    pressE();
    const held = T.getObjectiveInteraction(SITE);
    ok(held.eHeld === true && held.ePressed === true, 'E down is pressed and held ' + held.eHeld + '/' + held.ePressed);
    await (async () => { const t0 = T.getSimTime(); while (T.getSimTime() - t0 < 0.7) await wait(50); })();   // GB-186: 0.7 s of game time
    const timed = T.getObjectiveInteraction(SITE);
    const fuel = T.getObjectiveInteraction('objective:radio-repair');
    ok(timed.holdSeconds > 0.3, 'trapper cache hold ran: ' + timed.holdSeconds.toFixed(2));
    ok(fuel.holdSeconds === 0, 'radio hold stays 0: ' + fuel.holdSeconds);
    T.player.position.set(a.x + 3, a.y, a.z);
    await wait(80);
    const left = T.getObjectiveInteraction(SITE);
    ok(left.cancelled === 'left', 'walking off cancels: ' + left.cancelled);
    upE();
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.message));
  }
  return out.join('\n');
})()
