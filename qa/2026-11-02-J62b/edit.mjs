import fs from 'fs';
function edit(P, fn) {
  const raw = fs.readFileSync(P, 'utf8'); if (raw.charCodeAt(0) === 0xFEFF) throw new Error('BOM ' + P);
  const EOL = raw.includes('\r\n') ? '\r\n' : '\n'; const L = raw.split(EOL); fn(L); fs.writeFileSync(P, L.join(EOL)); console.log('ok', P, EOL === '\r\n' ? 'crlf' : 'lf');
}
edit('studio/weapon-heavy.js', (L) => {
  const A = '  // V3 has a smooth top and a tiny fixed datum, with no rail, lettering or raised ladder sight.';
  const i = L.indexOf(A); if (i < 0 || L.filter(l => l === A).length !== 1 || !L[i + 1].includes('[-0.215, 0.109], [-0.184, 0.109]')) throw new Error('anchor heavy');
  L.splice(i, 2,
    '  // V3 had a smooth top and a tiny fixed datum, with no rail, lettering or raised ladder sight; the datum stays as the leaf\'s hinge block.',
    L[i + 1],
    '  // J62 (Claude, 2026-11-02, from Jerry\'s J16: "the ability to arc rounds a little, maybe a leaf sight"): the drum\'s rim (y 0.123)',
    '  // stood above the only sight, so nothing could be aimed over it. A folding rear leaf on the datum, its three notched rungs',
    '  // (tops y 0.137, 0.144, 0.151: the higher ones lift the muzzle to arc a round further), and a front post on the front frame',
    '  // with its tip level with the first notch (y 0.137), both above the drum line. Small and dark, so third person reads as before.',
    '  K.cyl(0.0035, 0.0035, 0.03, gunDark, 0, 0.1225, -0.2, null, 8, \'x\');   // the leaf\'s hinge pin on the datum',
    '  for (const sx of [-1, 1]) {',
    '    K.box(0.004, 0.034, 0.003, gunDark, sx * 0.011, 0.14, -0.2);   // the leaf\'s side rails (to y 0.157)',
    '    for (const y of [0.137, 0.144, 0.151]) K.box(0.0065, 0.002, 0.003, gunDark, sx * 0.00575, y - 0.001, -0.2);   // the rungs, a 5 mm notch between halves',
    '  }',
    '  K.box(0.026, 0.003, 0.003, gunDark, 0, 0.1555, -0.2);   // the leaf\'s top bar');
  const B = '  K.slab([[0.265, -0.05], [0.315, -0.05], [0.315, 0.09], [0.265, 0.09]], 0.12, gunBody, { bevel: 0.014 });';
  const j = L.indexOf(B); if (j < 0 || L.filter(l => l === B).length !== 1) throw new Error('anchor frame');
  L.splice(j + 1, 0,
    '  // J62: the front post on the front frame, its tip at the first notch\'s height (y 0.137), between two low guard ears.',
    '  K.box(0.024, 0.012, 0.03, gunDark, 0, 0.096, 0.29);',
    '  K.box(0.004, 0.035, 0.004, gunDark, 0, 0.1195, 0.29);',
    '  for (const sx of [-1, 1]) K.box(0.003, 0.03, 0.012, gunDark, sx * 0.012, 0.117, 0.29);');
});
edit('game/sight-points.js', (L) => {
  const i = L.findIndex(l => l.startsWith('  launcher: { kind: \'iron\',  pos: [0, 0.1338, -0.25], fwd: [0, -0.0352, 0.9994] },'));
  if (i < 0) throw new Error('anchor sight');
  L.splice(i, 1,
    '  launcher: { kind: \'iron\',  pos: [0, 0.1370, -0.25], fwd: [0, 0, 1], notch: [-0.2, 0.137], tip: [0.29, 0.137] },   // J62: level through the leaf\'s first notch (.137 @ -0.2) to the new front post\'s tip (.137 @ 0.29); ChatGPT retunes the eye relief',
    '  //        GB-228 had: pos .1338, fwd [0, -.0352, .9994] (on the line over the drum, with no sight to aim by)');
});