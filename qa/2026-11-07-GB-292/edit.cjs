const fs = require('fs');
const p = 'game/viewmodel-poses.js';
let s = fs.readFileSync(p, 'utf8');
const n = s.includes('\r\n') ? '\r\n' : '\n';
const hipOld = '    hip: { at: [0.315, -0.374, -0.452], yaw: 0.55, pitch: 0.45, roll: 0.55 },   // GP-20022: placed by the new rear grip (the saw where it was)   // CL-301 (Jerry, 3 Nov: "Chainsaw... still weird"; his L4D2 refs): the body low right, the bar up to the upper left (was up the middle, the body hiding it)';
const hipNew = '    hip: { at: [0.28, -0.30, -0.50], yaw: 0.42, pitch: 0.22, roll: 0.22 },   // GB-292: less roll/pitch so rear throttle + both hands stay in view (was 0.55/0.45/0.55, body hid the trigger hand)';
if (!s.includes(hipOld)) { console.error('hip old not found'); process.exit(1); }
s = s.replace(hipOld, hipNew);
const sockOld = [
  '  // CL-301 (GP-20022, Jerry\'s refs): onto the rebuilt saw\'s handles: the rear throttle grip in line behind the body, the front hoop\'s top.',
  '  // Jerry, 4 Nov: "Left hand should have a motorcycle grip on chainsaw palm facing down": the left hand\'s own axes set outright',
  '  // (supportBasis: its grip channel along the hoop\'s top bar, its forearm down and back), the fingers in a fist round the bar.',
  '  chainsaw: { grip: [0, -0.014, -0.46], support: [-0.01, 0.246, -0.035], supportBasis: { x: [-1, 0, 0], y: [0, -0.85, -0.5] },',
  '    supportPose: { f: [[1.05, 1.15, 1.0, 0], [1.05, 1.15, 1.0, 0], [1.05, 1.15, 1.0, 0], [1.08, 1.2, 1.0, 0]], t: [1.0, -0.3, 0.55] } },   // HAND_POSES.fist'
].join(n);
const sockNew = [
  '  // CL-301 (GP-20022): rear throttle + front hoop. GB-292 (J1): contacts were already R=rear/L=front but the left fist',
  '  // sat on the cowling behind the hoop (basis too steep) and the right hand had no gripBasis so the rear throttle read empty.',
  '  // Right: vertical throttle, palm inward, elbow back; left: motorcycle on the hoop top, palm down, forearm mostly back.',
  '  chainsaw: { grip: [0, -0.014, -0.43], gripBasis: { x: [0, -1, 0], y: [0, 0.12, -1] },',
  '    support: [-0.01, 0.250, -0.035], supportBasis: { x: [-1, 0, 0], y: [0, -0.28, -0.96] },',
  '    supportPose: { f: [[1.05, 1.15, 1.0, 0], [1.05, 1.15, 1.0, 0], [1.05, 1.15, 1.0, 0], [1.08, 1.2, 1.0, 0]], t: [1.0, -0.3, 0.55] } },   // HAND_POSES.fist'
].join(n);
if (!s.includes(sockOld)) { console.error('sock old not found'); process.exit(2); }
s = s.replace(sockOld, sockNew);
s = s.replace(/\r\n/g, '\n');
fs.writeFileSync(p, s);
const buf = fs.readFileSync(p);
console.log('updated bytes', buf.length, 'hasCR', buf.includes(0x0d), 'hasBOM', buf[0]===0xEF);
