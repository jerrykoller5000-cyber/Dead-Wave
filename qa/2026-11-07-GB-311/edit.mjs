// qa/2026-11-07-GB-311/edit.mjs <vm|ak> : exact-line edits, keeping each file's line endings, no BOM.
import fs from 'node:fs';
const which = process.argv[2];
function edit(file, pairs) {
  const buf = fs.readFileSync(file); if (buf[0] === 0xef && buf[1] === 0xbb) throw new Error('BOM in ' + file);
  let t = buf.toString('utf8');
  const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
  const eol = crlf === lf ? '\r\n' : (crlf === 0 ? '\n' : null); if (!eol) throw new Error('mixed EOL ' + file + ' ' + crlf + '/' + lf);
  const lines = t.split(eol);
  for (const [from, to] of pairs) {
    const idx = lines.map((l, i) => (l === from ? i : -1)).filter((i) => i >= 0);
    if (idx.length !== 1) throw new Error('line found ' + idx.length + 'x: ' + from.slice(0, 80));
    lines.splice(idx[0], 1, ...to);
  }
  const out = lines.join(eol); fs.writeFileSync(file, out);
  const c2 = (out.match(/\r\n/g) || []).length, l2 = (out.match(/\n/g) || []).length;
  console.log(file, 'eol', JSON.stringify(eol), 'before', crlf + '/' + lf, 'after', c2 + '/' + l2);
}
if (which === 'vm') edit('game/viewmodel-poses.js', [
  ["  ak: { grip: [0, -0.126, -0.095], support: [0, -0.025, 0.37], magFoot: [0, -0.311, 0.14], work: [0.041, 0.02, 0.13] },   // CL-311: the slim receiver's charging knob (x 0.041, was 0.083) and the mag 2 cm higher",
   ["  // GB-311 (CL-311/CL-312, GB-153's fit run on the view gun and view hands, qa/2026-11-07-GB-311/fit/fit-fp-run2.json): the",
    "  // support fingers curled to the slim handguard (44 mm, was 74) until each touches; the fist's thumb sat 19 mm into it.",
    "  ak: { grip: [0, -0.126, -0.095], support: [0, -0.025, 0.37], magFoot: [0, -0.311, 0.14], work: [0.041, 0.02, 0.13],   // CL-311: the slim receiver's charging knob (x 0.041, was 0.083) and the mag 2 cm higher",
    "    supportPose: { f: [[0.949, 1.091, 0.902, 0], [0.973, 1.119, 0.924, 0], [1.055, 1.213, 1.002, 0], [0.973, 1.119, 0.924, 0]], t: [0.08, -0.15, 0.048] } },"]],
  ["  shotgun: { grip: [0, -0.088, -0.056], support: [0, -0.016, 0.37], port: [0, -0.034, 0.12] },   // CL-312 (D-121): the forend 44 mm across on the tube (its middle y -0.006, z 0.28-0.49); the loading port under the receiver",
   ["  // GB-311 (CL-312, the same fit): the fingers close further round the 44 mm forend (the fist's middle finger sat 10 mm in",
    "  // at its root, so it curls round instead; the little finger meets nothing past the forend and keeps the fist's curl).",
    "  shotgun: { grip: [0, -0.088, -0.056], support: [0, -0.016, 0.37], port: [0, -0.034, 0.12],   // CL-312 (D-121): the forend 44 mm across on the tube (its middle y -0.006, z 0.28-0.49); the loading port under the receiver",
    "    supportPose: { f: [[1.181, 1.358, 1.122, 0], [1.45, 1.668, 1.378, 0], [1.45, 1.668, 1.378, 0], [1.08, 1.242, 1.026, 0]], t: [1.45, -0.15, 0.87] } },"]]
]);
if (which === 'ak') edit('index.html', [
  ["      ak:       { twist: 0.8, hold: [-0.24, -0.12, 0.28], grip: [0, -0.126, -0.095], trig: [0, -0.062, -0.019], fore: [0, -0.02, 0.37], sh: { butt: [0, -0.078, -0.597], eye: [0, 0.09, -0.30] } },",
   ["      ak:       { twist: 0.8, hold: [-0.24, -0.12, 0.28], grip: [0, -0.126, -0.095], trig: [0, -0.052, -0.019], fore: [0, -0.02, 0.37], sh: { butt: [0, -0.078, -0.597], eye: [0, 0.074, -0.30] } },   // GB-311 (CL-311): the slim KR-7's cover 2.6 cm lower (SIGHT.ak 0.074), its trigger 1 cm up"]]
]);