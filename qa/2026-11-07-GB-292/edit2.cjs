const fs = require('fs');
const p = 'game/viewmodel-poses.js';
let s = fs.readFileSync(p, 'utf8');
const oldH = '    hip: { at: [0.28, -0.30, -0.50], yaw: 0.42, pitch: 0.22, roll: 0.22 },   // GB-292: less roll/pitch so rear throttle + both hands stay in view (was 0.55/0.45/0.55, body hid the trigger hand)';
const newH = '    hip: { at: [0.24, -0.14, -0.55], yaw: 0.32, pitch: 0.08, roll: 0.15 },   // GB-292: raise rear throttle into frame (screen-map had grip/wristR below the bottom edge at y=-0.30)';
if (!s.includes(oldH)) { console.error('hip not found'); process.exit(1); }
s = s.replace(oldH, newH).replace(/\r\n/g, '\n');
fs.writeFileSync(p, s);
console.log('hip raised');
