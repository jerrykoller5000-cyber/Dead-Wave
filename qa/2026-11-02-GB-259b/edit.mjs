import fs from 'node:fs';
const edits = {
 'studio/weapon-longarms.js': [
  // AA-12 stock
  ["  K.slab([[-0.255, 0.074], [-0.31, 0.072], [-0.31, -0.07], [-0.282, -0.074], [-0.255, -0.078]], 0.118, gunPoly, { bevel: 0.012, segs: 3 });",
   "  // GB-259 (GP-20014): the stock (nose, body, comb, panels, pad) is one group, gun.userData.fpStock ('fp-stock'), for the\n  // view gun to leave out of the eye; third person and the shadow keep it. Every part is where it was.\n  const stock = K.group(0, 0, 0); stock.name = 'fp-stock';\n  K.slab([[-0.255, 0.074], [-0.31, 0.072], [-0.31, -0.07], [-0.282, -0.074], [-0.255, -0.078]], 0.118, gunPoly, { bevel: 0.012, segs: 3, parent: stock });"],
  ["  K.slab([[-0.3, 0.07], [-0.535, 0.064], [-0.553, 0.058], [-0.553, -0.1], [-0.538, -0.106], [-0.47, -0.092], [-0.36, -0.07], [-0.3, -0.066]], 0.086, gunPoly, { bevel: 0.014, segs: 3 });",
   "  K.slab([[-0.3, 0.07], [-0.535, 0.064], [-0.553, 0.058], [-0.553, -0.1], [-0.538, -0.106], [-0.47, -0.092], [-0.36, -0.07], [-0.3, -0.066]], 0.086, gunPoly, { bevel: 0.014, segs: 3, parent: stock });"],
  ["  K.slab([[-0.34, 0.078], [-0.522, 0.073], [-0.532, 0.064], [-0.34, 0.068]], 0.062, gunPoly, { bevel: 0.006, segs: 2 });   // the comb",
   "  K.slab([[-0.34, 0.078], [-0.522, 0.073], [-0.532, 0.064], [-0.34, 0.068]], 0.062, gunPoly, { bevel: 0.006, segs: 2, parent: stock });   // the comb"],
  ["  for (const sx of [-1, 1]) K.slab([[-0.335, 0.04], [-0.5, 0.034], [-0.5, -0.042], [-0.42, -0.054], [-0.335, -0.038]], 0.003, gunPoly, { x: sx * 0.044, bevel: 0.002 });",
   "  for (const sx of [-1, 1]) K.slab([[-0.335, 0.04], [-0.5, 0.034], [-0.5, -0.042], [-0.42, -0.054], [-0.335, -0.038]], 0.003, gunPoly, { x: sx * 0.044, bevel: 0.002, parent: stock });"],
  ["  K.slab([[-0.576, 0.058], [-0.553, 0.06], [-0.553, -0.102], [-0.573, -0.108], [-0.579, -0.09], [-0.579, 0.044]], 0.092, gunRubber, { bevel: 0.008 });   // butt pad",
   "  K.slab([[-0.576, 0.058], [-0.553, 0.06], [-0.553, -0.102], [-0.573, -0.108], [-0.579, -0.09], [-0.579, 0.044]], 0.092, gunRubber, { bevel: 0.008, parent: stock });   // butt pad\n  gun.userData.fpStock = stock;"],
  // Shotgun stock
  ["  K.slab([[-0.186, 0.056], ...profileCurve([-0.186, 0.056], [-0.229, 0.011], [-0.266, 0.027], 5),",
   "  // GB-259 (GP-20014): the stock, its pad, comb and sling loop are one group, gun.userData.fpStock ('fp-stock'), for the\n  // view gun to leave out of the eye; third person and the shadow keep it. Every part is where it was.\n  const stock = K.group(0, 0, 0); stock.name = 'fp-stock';\n  K.slab([[-0.186, 0.056], ...profileCurve([-0.186, 0.056], [-0.229, 0.011], [-0.266, 0.027], 5),"],
  ["    ...profileCurve([-0.27, -0.094], [-0.228, -0.025], [-0.196, -0.035], 5), [-0.155, -0.044]], 0.084, gunPoly, { bevel: 0.012, segs: 3 });",
   "    ...profileCurve([-0.27, -0.094], [-0.228, -0.025], [-0.196, -0.035], 5), [-0.155, -0.044]], 0.084, gunPoly, { bevel: 0.012, segs: 3, parent: stock });"],
  ["  K.slab([[-0.494, 0.055], [-0.464, 0.054], [-0.47, -0.12], [-0.491, -0.124], [-0.496, -0.103]], 0.088, gunRubber, { bevel: 0.008 });",
   "  K.slab([[-0.494, 0.055], [-0.464, 0.054], [-0.47, -0.12], [-0.491, -0.124], [-0.496, -0.103]], 0.088, gunRubber, { bevel: 0.008, parent: stock });"],
  ["  K.slab([[-0.294, 0.047], [-0.45, 0.047], [-0.447, 0.024], [-0.424, 0.014], [-0.326, 0.026]], 0.087, gunPoly, { bevel: 0.007, segs: 3 });",
   "  K.slab([[-0.294, 0.047], [-0.45, 0.047], [-0.447, 0.024], [-0.424, 0.014], [-0.326, 0.026]], 0.087, gunPoly, { bevel: 0.007, segs: 3, parent: stock });"],
  ["  K.tor(0.012, 0.004, gunDark, 0, -0.088, -0.4, 0, Math.PI / 2, 0);",
   "  K.tor(0.012, 0.004, gunDark, 0, -0.088, -0.4, 0, Math.PI / 2, 0, stock);\n  gun.userData.fpStock = stock;"],
  // Sniper stock
  ["  K.slab([[-0.245, 0.062], [-0.6, 0.062], [-0.6, -0.112], [-0.56, -0.114], [-0.43, -0.082], [-0.31, -0.06], [-0.245, -0.045]], 0.074, gunTan, { bevel: 0.012, segs: 3 });",
   "  // GB-259 (GP-20014): the stock body, cheek riser, butt, pad and monopod are one group, gun.userData.fpStock ('fp-stock'),\n  // for the view gun to leave out of the eye; third person and the shadow keep it. Every part is where it was.\n  const stock = K.group(0, 0, 0); stock.name = 'fp-stock';\n  K.slab([[-0.245, 0.062], [-0.6, 0.062], [-0.6, -0.112], [-0.56, -0.114], [-0.43, -0.082], [-0.31, -0.06], [-0.245, -0.045]], 0.074, gunTan, { bevel: 0.012, segs: 3, parent: stock });"],
  ["  K.slab([[-0.32, 0.058], [-0.535, 0.058], [-0.535, 0.122], [-0.37, 0.128], [-0.32, 0.106]], 0.07, gunTan, { bevel: 0.01, segs: 3 });   // GB-180: a tall cheek riser",
   "  K.slab([[-0.32, 0.058], [-0.535, 0.058], [-0.535, 0.122], [-0.37, 0.128], [-0.32, 0.106]], 0.07, gunTan, { bevel: 0.01, segs: 3, parent: stock });   // GB-180: a tall cheek riser"],
  ["  for (const z of [-0.36, -0.48]) for (const sx of [-1, 1]) K.cyl(0.008, 0.008, 0.004, steelMat, sx * 0.036, 0.09, z, null, 8, 'x');   // riser clamp knobs",
   "  for (const z of [-0.36, -0.48]) for (const sx of [-1, 1]) K.cyl(0.008, 0.008, 0.004, steelMat, sx * 0.036, 0.09, z, stock, 8, 'x');   // riser clamp knobs"],
  ["  K.slab(gunBand([[-0.3, -0.052], [-0.45, -0.075], [-0.575, -0.098]], 0.015), 0.062, gunTan, { bevel: 0.01 });",
   "  K.slab(gunBand([[-0.3, -0.052], [-0.45, -0.075], [-0.575, -0.098]], 0.015), 0.062, gunTan, { bevel: 0.01, parent: stock });"],
  ["  K.slab([[-0.566, 0.068], [-0.594, 0.068], [-0.598, -0.1], [-0.57, -0.104]], 0.07, gunTan, { bevel: 0.01 });",
   "  K.slab([[-0.566, 0.068], [-0.594, 0.068], [-0.598, -0.1], [-0.57, -0.104]], 0.07, gunTan, { bevel: 0.01, parent: stock });"],
  ["  K.slab([[-0.598, 0.074], [-0.636, 0.074], [-0.64, -0.118], [-0.602, -0.122]], 0.084, gunRubber, { bevel: 0.01 });   // GB-180: a thick pad",
   "  K.slab([[-0.598, 0.074], [-0.636, 0.074], [-0.64, -0.118], [-0.602, -0.122]], 0.084, gunRubber, { bevel: 0.01, parent: stock });   // GB-180: a thick pad"],
  ["    for (const [z, y] of [[-0.29, 0.025], [-0.29, -0.025], [-0.584, 0.052], [-0.588, -0.081]]) K.cyl(0.0045, 0.0045, 0.003, gunDark, sx * 0.035, y, z, null, 8, 'x');",
   "    for (const [z, y] of [[-0.29, 0.025], [-0.29, -0.025], [-0.584, 0.052], [-0.588, -0.081]]) K.cyl(0.0045, 0.0045, 0.003, gunDark, sx * 0.035, y, z, stock, 8, 'x');"],
  ["    K.slab(gunBand([[-0.309, -0.05], [-0.444, -0.076], [-0.564, -0.098]], 0.002), 0.003, gunBody, { x: sx * 0.031, bevel: 0.001 });",
   "    K.slab(gunBand([[-0.309, -0.05], [-0.444, -0.076], [-0.564, -0.098]], 0.002), 0.003, gunBody, { x: sx * 0.031, bevel: 0.001, parent: stock });"],
  ["  K.cyl(0.01, 0.01, 0.1, gunDark, 0, -0.12, -0.5, null, 6, 'y');\n  K.cyl(0.014, 0.014, 0.015, gunBody, 0, -0.127, -0.5, null, 12, 'y');",
   "  K.cyl(0.01, 0.01, 0.1, gunDark, 0, -0.12, -0.5, stock, 6, 'y');\n  K.cyl(0.014, 0.014, 0.015, gunBody, 0, -0.127, -0.5, stock, 12, 'y');\n  gun.userData.fpStock = stock;"],
 ],
 'studio/weapon-sidearms.js': [
  ["  // Hammer (cocks and falls): the body and a chequered spur.\n  const hammer = K.group(0, 0.1, -0.08);",
   "  // Hammer (cocks and falls): the body and a chequered spur.\n  // GB-259 (GP-20014, J13): the pivot 15 mm lower (was y 0.1), so the idle spur sits 5+ mm under the notch-to-blade line\n  // instead of 8.7 mm over it in the notch; cock and fall still turn it about the same axis from baseHammerRot.\n  const hammer = K.group(0, 0.085, -0.08);"],
 ],
 'game/sight-points.js': [
  ["  sniper:   { kind: 'optic', pos: [0, 0.180, -0.20], fwd: [0, 0, 1] },                // scope tube top 0.209 @ 0.069; axis taken ~3 cm below (estimate)",
   "  sniper:   { kind: 'optic', pos: [0, 0.140, -0.20], fwd: [0, 0, 1] },                // GB-259 (GP-20014): on the scope's modelled axis (the tube lathe's y 0.14, GP-19994); was .180, an estimate under the tube top 0.209"],
 ],
};
for (const [f, list] of Object.entries(edits)) {
  let t = fs.readFileSync(f, 'utf8'); const crlf = t.includes('\r\n');
  if (t.charCodeAt(0) === 0xFEFF) throw new Error(f + ': BOM');
  if (crlf) t = t.replace(/\r\n/g, '\n');
  for (const [a, b] of list) { const n = t.split(a).length - 1; if (n !== 1) throw new Error(f + ': ' + n + ' matches for ' + a.slice(0, 80)); t = t.replace(a, () => b); }
  fs.writeFileSync(f, crlf ? t.replace(/\n/g, '\r\n') : t); console.log(f + ': ' + list.length + ' edits');
}