// t55 — CU-11: getObjectiveInteraction reach, press, and hold on one site.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const pressE = () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
  const upE = () => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
  try {
    ok(typeof T.getObjectiveInteraction === 'function', 'exported');
    ok(T.getObjectiveInteraction('nope') === null, 'unknown id is null');
    const bag = T.getObjectiveProps();
    const prop = bag && bag.props['objective:radio-repair'];
    ok(!!prop, 'radio prop is placed');
    if (!prop) return out.join('\n');
    const far = T.getObjectiveInteraction('objective:radio-repair');
    ok(far && far.reachable === false && (far.blockedBy === 'distance' || far.blockedBy === 'height'), 'too far: ' + (far && far.blockedBy));
    const a = prop.approach;
    T.player.position.set(a.x, a.y, a.z);
    const near = T.getObjectiveInteraction('objective:radio-repair');
    ok(near.reachable === true && near.blockedBy === null, 'at the approach: ' + near.blockedBy + ' d=' + near.distance.toFixed(2));
    const other = T.getObjectiveInteraction('objective:fuel-depot');
    ok(other && other.reachable === false, 'another site stays out of reach');
    if (typeof startMatch === 'function') await startMatch(T, 'T55');
    T.player.position.set(a.x, a.y, a.z);
    pressE();
    const held = T.getObjectiveInteraction('objective:radio-repair');
    ok(held.eHeld === true && held.ePressed === true, 'E down is pressed and held ' + held.eHeld + '/' + held.ePressed + ' cancel=' + held.cancelled);
    ok(held.holdSeconds === 0 || held.holdSeconds >= 0, 'hold timer exists');
    const fuel = T.getObjectiveInteraction('objective:fuel-depot');
    ok(fuel.holdSeconds === 0, 'hold timer does not follow a second site');
    upE();
    await wait(80);
    const dropped = T.getObjectiveInteraction('objective:radio-repair');
    ok(dropped.eHeld === false && dropped.cancelled === 'released', 'letting go cancels: ' + dropped.cancelled);
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.message));
  }
  return out.join('\n');
})()
