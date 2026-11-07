import fs from 'node:fs';

function edit(path, replacements) {
  let raw = fs.readFileSync(path);
  if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) raw = raw.slice(3);
  let text = raw.toString('utf8');
  let n = 0;
  for (const [from, to, label] of replacements) {
    if (!text.includes(from)) {
      console.error('MISSING in', path, label);
      console.error('wanted:', JSON.stringify(from).slice(0, 220));
      process.exitCode = 1;
      continue;
    }
    const count = text.split(from).length - 1;
    if (count !== 1) {
      console.error('AMBIGUOUS', count, 'in', path, label);
      process.exitCode = 1;
      continue;
    }
    text = text.replace(from, to);
    n++;
    console.log('OK', path, label);
  }
  const out = Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8');
  fs.writeFileSync(path, out);
  console.log('wrote', path, 'edits', n, 'bytes', out.length);
}

edit('studio/weapon-longarms.js', [
  [
    "K.cyl(0.0075, 0.0075, 0.003, gunDark, sx * 0.033, -0.15, -0.104, null, 10, 'x');",
    "K.cyl(0.0075, 0.0075, 0.003, gunDark, sx * 0.0285, -0.15, -0.104, null, 10, 'x');   // GB-297: seated on the grip face (half-width 0.027)",
    'ak-grip-screws'
  ]
]);

edit('studio/weapon-heavy.js', [
  [
    'for (const [z, y] of [[-0.229, 0.084], [0.023, 0.081], [-0.226, -0.035], [-0.12, -0.035]]) bolt(K, gunDark, gunAccent, sx * 0.087, y, z, 0.005);',
    'for (const [z, y, ox] of [[-0.229, 0.084, 0.0775], [0.023, 0.081, 0.0775], [-0.226, -0.035, 0.087], [-0.12, -0.035, 0.087]]) bolt(K, gunDark, gunAccent, sx * ox, y, z, 0.005);   // GB-297: upper bolts on the frame face, lower on the side panel',
    'launcher-side-bolts'
  ],
  [
    'for (const [z, y] of [[-0.151, 0.07], [0.318, 0.07], [-0.151, -0.02], [0.318, -0.02], [-0.106, 0.047], [0.256, 0.047]]) bolt(K, gunDark, gunAccent, sx * 0.068, y, z, 0.0038);',
    'for (const [z, y] of [[-0.125, 0.065], [0.270, 0.065], [-0.125, -0.015], [0.270, -0.015], [-0.106, 0.047], [0.256, 0.047]]) bolt(K, gunDark, gunAccent, sx * 0.0675, y, z, 0.0038);   // GB-297: corner bolts on the side panel, not past its edge',
    'flamer-side-bolts'
  ],
  [
    'for (const [z, y] of [[-0.227, 0.101], [0.06, 0.1], [-0.226, -0.012], [0.058, -0.012]]) bolt(K, gunDark, gunAccent, sx * 0.149, y, z, 0.0055);',
    'for (const [z, y] of [[-0.227, 0.101], [0.06, 0.1], [-0.226, -0.012], [0.058, -0.012]]) bolt(K, gunDark, gunAccent, sx * 0.1455, y, z, 0.0055);   // GB-297: seated on the outer cowling face (x 0.1435)',
    'chainsaw-side-bolts'
  ]
]);

edit('studio/weapon-optics.js', [
  [
    "cylinder(root, 'brightness dial', rubber, 0.007, 0.005, [0.034, 0.026, -0.027], 'x', 12);",
    "cylinder(root, 'brightness dial', rubber, 0.007, 0.005, [0.0295, 0.026, -0.027], 'x', 12);   // GB-297: seated on the chassis side (half-width 0.027)",
    'holo-brightness-dial'
  ]
]);