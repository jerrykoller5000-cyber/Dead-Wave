// tcl334 - CL-334 h (Jerry, 10 Nov, J126 rule 1, D-138, standing): "No one part of the hand may clip through another part
// of the hand." Every pose the game uses for the hand, on the hand the game draws (the first-person surface, posed by its
// skinning): no part of a finger or the thumb more than half a millimetre into another finger, the thumb or the palm
// (studio/marine-hand.js handClipReport), bare and gloved (the glove is what he wears; GLOVE_INFLATE). The poses: HAND_POSES, every gun's firing and support hands (VM_SOCKETS gripPose,
// supportPose, and game/viewmodel-fit.js's fitted holds, which the game uses first), the items' holds (studio/hand-grips.js), and the blends the game runs between them (rest to fist, open to
// fist, the viewmodel's item hands), every twentieth of the way. Also (J127, D-139): every joint inside its limits after the
// rig's clamp, and a blend's thumb wraps after the fingers (closing) and lets go before them (opening).
(async () => {
  const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const H = await import('/studio/marine-hand.js');
    const VP = await import('/game/viewmodel-poses.js');
    const FIT = (await import('/game/viewmodel-fit.js')).VM_FIT || {};
    const G = await import('/studio/hand-grips.js');
    const TOL = 0.5;   // mm
    const poses = [];
    for (const [k, p] of Object.entries(H.HAND_POSES)) poses.push(['HAND_POSES.' + k, p]);
    for (const [k, s] of Object.entries(VP.VM_SOCKETS || {})) {
      if (s && s.gripPose && !(FIT[k] && FIT[k].r && FIT[k].r.pose)) poses.push([k + ' firing hand', s.gripPose]);   // what the game uses: a fitted hold first
      if (s && s.supportPose && !(FIT[k] && FIT[k].l && FIT[k].l.pose)) poses.push([k + ' support hand', s.supportPose]);
    }
    for (const [k, f] of Object.entries(FIT)) { if (f.r && f.r.pose) poses.push([k + ' firing hand (fitted)', f.r.pose]); if (f.l && f.l.pose) poses.push([k + ' support hand (fitted)', f.l.pose]); }
    for (const [k, e] of Object.entries(G.ITEM_POSES || {})) poses.push(['item ' + k, G.gripPose(e)]);
    if (G.FIST) poses.push(['hand-grips FIST', G.gripPose(G.FIST)]);
    const bad = [];
    const GL = H.GLOVE_INFLATE || 0;
    for (const [name, p] of poses) for (const [hand, inf] of [['bare', 0], ['gloved', GL]]) {
      const r = H.handClipReport(p, TOL / 1000, false, inf);
      if (r.max > TOL) bad.push(name + ' (' + hand + ') ' + r.max + ' mm ' + JSON.stringify(r.pairs));
    }
    ok(poses.length >= 20, 'poses found: ' + poses.length);
    ok(bad.length === 0, 'no pose has a part of the hand through another, bare or gloved (' + poses.length + ' poses, ' + bad.length + ' breaches)' + (bad.length ? ': ' + bad.join('; ') : ''));
    // the blends
    const P = H.HAND_POSES, blends = [['relaxed', 'fist'], ['hang', 'fist'], ['open', 'fist'], ['fist', 'relaxed'], ['fist', 'hang'], ['fist', 'open'], ['open', 'point'], ['relaxed', 'open']];
    const badB = [];
    for (const [a, b] of blends) {
      let worst = 0, at = 0;
      for (let i = 1; i < 20; i++) for (const inf of [0, GL]) { const k = i / 20, r = H.handClipReport(H.lerpPose(P[a], P[b], k), TOL / 1000, false, inf); if (r.max > worst) { worst = r.max; at = k; } }
      if (worst > TOL) badB.push(a + ' to ' + b + ' ' + worst + ' mm at ' + at);
    }
    ok(badB.length === 0, 'no blend between the hand poses passes a part through another' + (badB.length ? ': ' + badB.join('; ') : ''));
    // the thumb's timing in a blend
    const half = H.lerpPose(P.hang, P.fist, 0.5), back = H.lerpPose(P.fist, P.hang, 0.5);
    const kf = (half.f[1][0] - P.hang.f[1][0]) / (P.fist.f[1][0] - P.hang.f[1][0]), kt = (half.t[5] - (P.hang.t[5] || 0)) / (P.fist.t[5] - (P.hang.t[5] || 0));
    const kb = (back.t[5] - P.fist.t[5]) / ((P.hang.t[5] || 0) - P.fist.t[5]);
    ok(Math.abs(kf - 0.5) < 1e-6 && kt < 0.2 && kb > 0.8, 'closing, the thumb wraps after the fingers (half way: fingers ' + kf.toFixed(2) + ', thumb ' + kt.toFixed(2) + '); opening it lets go first (' + kb.toFixed(2) + ')');
    // J127: the rig clamps every pose inside the joints' ranges: fingers asked far past their limits pose exactly as at them
    const J = H.JOINT_LIMITS, th = [0, 0, 0, 0, 0, 0];
    const diff = (A, B) => { let m = 0; for (let i = 0; i < A.p.length; i++) m = Math.max(m, Math.abs(A.p[i] - B.p[i])); return m * 1000; };
    const atHi = H.handPosed({ f: [0, 1, 2, 3].map(() => [J.mcp[1], J.pip[1], J.dip[1], 0]), t: th }), pastHi = H.handPosed({ f: [0, 1, 2, 3].map(() => [9, 9, 9, 0]), t: th });
    const atLo = H.handPosed({ f: [0, 1, 2, 3].map(() => [J.mcp[0], J.pip[0], J.dip[0], 0]), t: th }), pastLo = H.handPosed({ f: [0, 1, 2, 3].map(() => [-9, -9, -9, 0]), t: th });
    const dHi = diff(atHi, pastHi), dLo = diff(atLo, pastLo);
    ok(dHi < 0.01 && dLo < 0.01, 'fingers asked past their limits stop at them (curled ' + dHi.toFixed(3) + ' mm, bent back ' + dLo.toFixed(3) + ' mm from the limit pose)');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
