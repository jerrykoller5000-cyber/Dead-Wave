import fs from 'node:fs';
const p = 'index.html', before = fs.readFileSync(p, 'utf8');
const a = "      if (ud.wristLG) ud.wristLG.rotation.set(0.05, 1.15, 0);\r\n      if (ud.wristRG) ud.wristRG.rotation.set(0.05, -1.15, 0);\r\n      for (const w of [ud.wristLG, ud.wristRG]) if (w && w.userData.hand) w.userData.hand.set(HAND_POSES.hang).update();\r\n";
const b = "      // GB-170 (Jerry: the palms turned forward): the figure keeps no wristLG/RG of its own; the wrist hangs off the elbow\r\n      // (as in poseHands). Palms to the outer thigh, thumbs forward, backs of the hands out (t254).\r\n      const wL = ud.elbowLG && ud.elbowLG.userData.wrist, wR = ud.elbowRG && ud.elbowRG.userData.wrist;\r\n      if (wL) wL.rotation.set(0.05, 1.15, 0);\r\n      if (wR) wR.rotation.set(0.05, -1.15, 0);\r\n      for (const w of [wL, wR]) if (w && w.userData.hand) w.userData.hand.set(HAND_POSES.hang).update();\r\n";
if (before.split(a).length !== 2) { console.error('anchor count', before.split(a).length - 1); process.exit(1); }
const next = before.replace(a, b);
if (fs.readFileSync(p, 'utf8') !== before) { console.error('changed under us'); process.exit(1); }
fs.writeFileSync(p, next, 'utf8'); console.log('patched');
