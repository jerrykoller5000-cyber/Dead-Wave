const fs = require('fs');
const p = 'game/viewmodel-poses.js';
let s = fs.readFileSync(p, 'utf8');
const oldH = '    hip: { at: [0.24, -0.14, -0.55], yaw: 0.32, pitch: 0.08, roll: 0.15 },   // GB-292: raise rear throttle into frame (screen-map had grip/wristR below the bottom edge at y=-0.30)';
const newH = '    hip: { at: [0.26, -0.18, -0.52], yaw: 0.40, pitch: 0.18, roll: 0.22 },   // GB-292: rear throttle in frame (was off-bottom at 0.55 roll); keeps some L4D2 bar-up-left without hiding the trigger hand';
if (!s.includes(oldH)) { console.error('hip not found'); process.exit(1); }
s = s.replace(oldH, newH).replace(/\r\n/g, '\n');
fs.writeFileSync(p, s);
console.log('hip compromise');
