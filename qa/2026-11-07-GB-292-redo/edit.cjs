// qa/2026-11-07-GB-292-redo/edit.cjs - exact-line edits to game/viewmodel-poses.js (LF, no BOM kept)
const fs = require('fs');
const f = 'game/viewmodel-poses.js';
let s = fs.readFileSync(f, 'utf8');
if (s.charCodeAt(0) === 0xFEFF) throw new Error('BOM');
if (s.includes('\r\n')) throw new Error('CRLF');
const rep = [
  ["    hip: { at: [0.26, -0.18, -0.52], yaw: 0.40, pitch: 0.18, roll: 0.22 },   // GB-292: rear throttle in frame (was off-bottom at 0.55 roll); keeps some L4D2 bar-up-left without hiding the trigger hand\n",
   "    hip: { at: [0.26, -0.23, -0.62], yaw: 0.25, pitch: 0.45, roll: 0.4 },   // GB-292 redo: saw low right, nose up so the bar shows above the left forearm; both hands on their handles in view\n"],
  ["  // Right: vertical throttle, palm inward, elbow back; left: motorcycle on the hoop top, palm down, forearm mostly back.\n",
   "  // Right: vertical throttle, palm inward, elbow back; left: motorcycle on the hoop top, palm down, forearm mostly back.\n" +
   "  // GB-292 redo (Claude's 04:14Z review: one forearm filled the view): elbowFollow runs each forearm along its hand's y, which\n" +
   "  // the code keeps square to the channel x. With x along the hoop the left forearm could only run back, so it crossed the view\n" +
   "  // over the rear hand. The left channel now crosses the bar on a diagonal and the forearms run out to the bottom corners.\n"],
  ["  chainsaw: { grip: [0, -0.014, -0.43], gripBasis: { x: [0, -1, 0], y: [0, 0.12, -1] },\n",
   "  chainsaw: { grip: [0, -0.014, -0.43], gripBasis: { x: [0, -1, 0], y: [0.5, -0.1, -0.85] },\n"],
  ["    support: [-0.01, 0.250, -0.035], supportBasis: { x: [-1, 0, 0], y: [0, -0.28, -0.96] },\n",
   "    support: [-0.01, 0.250, -0.035], supportBasis: { x: [-0.4, 0.2, 0.7], y: [-0.85, -0.3, -0.4] },\n"],
];
for (const [a, b] of rep) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error('match count ' + n + ' for: ' + a.slice(0, 60));
  s = s.replace(a, b);
}
fs.writeFileSync(f, s);
console.log('edited', f);
