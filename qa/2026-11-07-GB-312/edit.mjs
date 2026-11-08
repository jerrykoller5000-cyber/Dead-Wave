// qa/2026-11-07-GB-312/edit.mjs - exact-line supportPose edits, LF kept, no BOM.
import fs from 'node:fs';
function edit(file, pairs) {
  const buf = fs.readFileSync(file); if (buf[0] === 0xef && buf[1] === 0xbb) throw new Error('BOM in ' + file);
  let t = buf.toString('utf8');
  const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
  const eol = crlf === lf ? '\r\n' : (crlf === 0 ? '\n' : null); if (!eol) throw new Error('mixed EOL ' + file + ' ' + crlf + '/' + lf);
  const lines = t.split(eol);
  for (const [from, to] of pairs) {
    const idx = lines.map((l, i) => (l === from ? i : -1)).filter((i) => i >= 0);
    if (idx.length !== 1) throw new Error('line found ' + idx.length + 'x: ' + from.slice(0, 100));
    lines.splice(idx[0], 1, ...to);
  }
  const out = lines.join(eol); fs.writeFileSync(file, out);
  const c2 = (out.match(/\r\n/g) || []).length, l2 = (out.match(/\n/g) || []).length;
  console.log(file, 'eol', JSON.stringify(eol), 'before', crlf + '/' + lf, 'after', c2 + '/' + l2);
}
edit('game/viewmodel-poses.js', [
  ["  m4: { grip: [0, -0.106, -0.076], support: [0, 0.004, 0.36], magFoot: [0, -0.278, 0.04], work: [-0.03, -0.03, 0.105] },   // CL-310: the 40 mm handguard (its bottom -0.01, was -0.027) and the bolt catch on the 32 mm lower",
   ["  // GB-312 (CL-310, GB-153 fit qa/2026-11-07-GB-312/fit/fit-fp.json): support fingers curled to the 40 mm handguard until each touches.",
    "  m4: { grip: [0, -0.106, -0.076], support: [0, 0.004, 0.36], magFoot: [0, -0.278, 0.04], work: [-0.03, -0.03, 0.105],   // CL-310: the 40 mm handguard (its bottom -0.01, was -0.027) and the bolt catch on the 32 mm lower",
    "    supportPose: { f: [[1.038, 1.194, 0.986, 0], [1.257, 1.446, 1.194, 0], [1.357, 1.561, 1.289, 0], [1.45, 1.668, 1.378, 0]], t: [1.45, -0.15, 0.87] } },"]],
  ["  // GB-311 (CL-311/CL-312, GB-153's fit run on the view gun and view hands, qa/2026-11-07-GB-311/fit/fit-fp-run2.json): the",
   ["  // GB-312 (re-fit after CL-310/313/314; was GB-311): support fingers on the 44 mm handguard; thumb curl 0.079 (was 0.08).",
    "  // GB-311 (CL-311/CL-312, GB-153's fit run on the view gun and view hands, qa/2026-11-07-GB-311/fit/fit-fp-run2.json): the"]],
  ["    supportPose: { f: [[0.949, 1.091, 0.902, 0], [0.973, 1.119, 0.924, 0], [1.055, 1.213, 1.002, 0], [0.973, 1.119, 0.924, 0]], t: [0.08, -0.15, 0.048] } },",
   ["    supportPose: { f: [[0.946, 1.088, 0.899, 0], [0.976, 1.122, 0.927, 0], [1.03, 1.184, 0.978, 0], [0.966, 1.111, 0.918, 0]], t: [0.079, -0.15, 0.047] } },"]],
  ["  // GB-311 (CL-312, the same fit): the fingers close further round the 44 mm forend (the fist's middle finger sat 10 mm in",
   ["  // GB-312 (re-fit): index closes to a full curl (1.45; was 1.181); little finger free past the forend keeps the fist.",
    "  // GB-311 (CL-312, the same fit): the fingers close further round the 44 mm forend (the fist's middle finger sat 10 mm in"]],
  ["    supportPose: { f: [[1.181, 1.358, 1.122, 0], [1.45, 1.668, 1.378, 0], [1.45, 1.668, 1.378, 0], [1.08, 1.242, 1.026, 0]], t: [1.45, -0.15, 0.87] } },",
   ["    supportPose: { f: [[1.45, 1.668, 1.378, 0], [1.45, 1.668, 1.378, 0], [1.45, 1.668, 1.378, 0], [1.08, 1.242, 1.026, 0]], t: [1.45, -0.15, 0.87] } },"]],
  ["  aa12: { grip: [0, -0.145, -0.166], support: [0, -0.035, 0.36], magFoot: [0, -0.415, 0.05], work: [-0.058, 0.05, 0.18] },   // CL-313: the charging handle on the 62 mm receiver (was 96)",
   ["  // GB-312 (CL-313, GB-153 fit): support fingers wrap the 62 mm handguard; roots stay a few mm in (socket depth; WEAPON_HOLD unchanged).",
    "  aa12: { grip: [0, -0.145, -0.166], support: [0, -0.035, 0.36], magFoot: [0, -0.415, 0.05], work: [-0.058, 0.05, 0.18],   // CL-313: the charging handle on the 62 mm receiver (was 96)",
    "    supportPose: { f: [[1.45, 1.668, 1.378, 0], [1.39, 1.598, 1.32, 0], [1.45, 1.668, 1.378, 0], [1.445, 1.662, 1.373, 0]], t: [1.315, -0.15, 0.789] } },"]],
  ["  sniper: { grip: [0, -0.088, -0.117], support: [0, -0.005, 0.35], magFoot: [0, -0.203, 0.02], boltKnob: [0.13, 0.067, -0.16] },   // CL-306: the handle on +x (reads right in the mirrored view)",
   ["  // GB-312 (CL-314, GB-153 fit): support fingers open on the 50 mm forend (fist sat 7-15 mm in); thumb keeps a full curl.",
    "  sniper: { grip: [0, -0.088, -0.117], support: [0, -0.005, 0.35], magFoot: [0, -0.203, 0.02], boltKnob: [0.13, 0.067, -0.16],   // CL-306: the handle on +x (reads right in the mirrored view)",
    "    supportPose: { f: [[0.766, 0.881, 0.728, 0], [0.527, 0.606, 0.501, 0], [0.2, 0.23, 0.19, 0], [0.09, 0.103, 0.085, 0]], t: [1.45, -0.15, 0.87] } },"]],
]);