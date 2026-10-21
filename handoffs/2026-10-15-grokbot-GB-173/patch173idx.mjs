import fs from 'node:fs';
const p = 'index.html', before = fs.readFileSync(p, 'utf8');
const a = "      aa12:     { twist: 0.8, hold: [-0.24, -0.13, 0.26], grip: [0, -0.145, -0.096], trig: [0, -0.104, -0.016], fore: [0, -0.015, 0.36], sh: { butt: [0, -0.005, -0.572], eye: [0, 0.16, -0.30] } },\r\n";
const b = "      aa12:     { twist: 0.8, hold: [-0.24, -0.13, 0.203], grip: [0, -0.145, -0.166], trig: [0, -0.104, -0.086], fore: [0, -0.015, 0.36], sh: { butt: [0, -0.005, -0.572], eye: [0, 0.16, -0.30] } },   // GB-173: the grip moved 70 mm back on the model; hold -0.057 (x0.82) keeps the gun where it was\r\n";
if (before.split(a).length !== 2) { console.error('anchor', before.split(a).length - 1); process.exit(1); }
const next = before.replace(a, b);
if (fs.readFileSync(p, 'utf8') !== before) { console.error('changed under us'); process.exit(1); }
fs.writeFileSync(p, next, 'utf8'); console.log('patched index.html');
