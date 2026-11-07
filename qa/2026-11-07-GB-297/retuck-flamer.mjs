import fs from 'node:fs';
const path = 'studio/weapon-heavy.js';
let raw = fs.readFileSync(path);
if (raw[0] === 0xEF) raw = raw.slice(3);
let text = raw.toString('utf8');
const from = 'for (const [z, y] of [[-0.125, 0.065], [0.270, 0.065], [-0.125, -0.015], [0.270, -0.015], [-0.106, 0.047], [0.256, 0.047]]) bolt(K, gunDark, gunAccent, sx * 0.0675, y, z, 0.0038);   // GB-297: corner bolts on the side panel, not past its edge';
const to = 'for (const [z, y] of [[-0.120, 0.050], [0.260, 0.050], [-0.120, -0.010], [0.260, -0.010], [-0.106, 0.047], [0.256, 0.047]]) bolt(K, gunDark, gunAccent, sx * 0.066, y, z, 0.0038);   // GB-297: corner bolts seated on the side panel face';
if (!text.includes(from)) { console.error('MISSING'); process.exit(1); }
text = text.replace(from, to);
fs.writeFileSync(path, Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8'));
console.log('flamer retuck ok');