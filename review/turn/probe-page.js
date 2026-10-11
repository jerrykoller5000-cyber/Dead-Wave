// CU-99 probe (page side, after posesheet's PAGE): t226's standing turns in its order on the 60 fps clock, and the worst
// gap between his boots and the worst gap between the step model's foot yaws and the boots as drawn.
(() => {
  const T = TT, THREE = T.THREE, m = T.getMarine(), ud = m.userData, D = 180 / Math.PI;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const yawOf = (o) => { const v = new THREE.Vector3(0, 0, 1).applyQuaternion(o.getWorldQuaternion(new THREE.Quaternion())); return Math.atan2(v.x, v.z); };
  __weapon('m4'); __step(60);
  let worst = 0, at = '', mis = 0, misAt = '', steps = {}, log = [];
  const line = (name, t, d, L, R) => name + ' t' + t.toFixed(3) + ' sw' + d.swing + ' st' + d.steps + ' L' + (L * D).toFixed(0) + ' R' + (R * D).toFixed(0) +
    ' model ' + (d.feet[0] * D).toFixed(0) + '/' + (d.feet[1] * D).toFixed(0) + ' y' + (d.yaw * D).toFixed(0) + ' piv' + (d.pivots || 0) + ' tw' + ((d.twist || 0) * D).toFixed(0);
  const look = (name, t) => {
    const d = ud.turn; if (!d || !d.active) return;
    const L = yawOf(ud.ankleLG), R = yawOf(ud.ankleRG), g = Math.abs(wrap(L - R));
    const mm = Math.max(Math.abs(wrap(L - d.feet[0])), Math.abs(wrap(R - d.feet[1])));
    if (g > worst) { worst = g; at = line(name, t, d, L, R); }
    if (mm > mis) { mis = mm; misAt = line(name, t, d, L, R); }
    if (window.__LOG && name === window.__LOG && t < 0.25) log.push(line(name, t, d, L, R));
  };
  const run = (name, from, by, rate) => {
    __aim(from); for (let i = 0; i < 120; i++) { __step(1); look(name + ' take', 0); }
    const s0 = ud.turn ? ud.turn.steps : 0, dur = rate === 0 ? 0 : Math.abs(by) / rate;
    for (let i = 0; i < (dur + 1.2) * 60; i++) { const t = i / 60; __aim(from + (dur ? Math.sign(by) * Math.min(Math.abs(by), rate * t) : by)); __step(1); look(name, t); }
    steps[name] = (ud.turn ? ud.turn.steps : 0) - s0;
    for (let i = 0; i < 36; i++) { __step(1); look(name + ' after', 0); }
  };
  run('90/s x180', 0, Math.PI, Math.PI / 2); run('360/s x360', 0, 2 * Math.PI, 2 * Math.PI);
  run('snap 180', 0, Math.PI - .01, 0); run('snap 180 other way', 0, -Math.PI + .01, 0);
  return ['worst boot gap ' + (worst * D).toFixed(0) + ' deg at ' + at, 'worst model/drawn ' + (mis * D).toFixed(1) + ' deg at ' + misAt,
    'steps ' + JSON.stringify(steps), ...log].join('\n');
})()
