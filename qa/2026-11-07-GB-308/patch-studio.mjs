import fs from 'node:fs';
let t = fs.readFileSync('qa/2026-11-07-GB-308/studio.html', 'utf8');
t = t.replace(/const sizeK = [^;]+;/, 'const sizeK = 0.484 * 1.4 * MARINE_UPM / 0.538;');
const recv = `} else if (view === 'recv') {
  C.fov = 28; C.updateProjectionMatrix();
  C.position.set(0.18 * sizeK / 0.6, 0.08 * sizeK / 0.6, 0.04 * sizeK / 0.6);
  C.lookAt(0, 0.06 * sizeK / 0.6, 0.02 * sizeK / 0.6);
} else if (view === 'grip') {
  C.fov = 28; C.updateProjectionMatrix();
  C.position.set(0.16 * sizeK / 0.6, -0.04 * sizeK / 0.6, -0.02 * sizeK / 0.6);
  C.lookAt(0, -0.08 * sizeK / 0.6, -0.04 * sizeK / 0.6);
`;
t = t.replace(/\} else if \(view === 'recv'\) \{[\s\S]*?C\.lookAt\(0, -0\.05 \* sizeK \/ 0\.6, -0\.02 \* sizeK \/ 0\.6\);/, recv);
fs.writeFileSync('qa/2026-11-07-GB-308/studio.html', t);
console.log('patched', /0\.484 \* 1\.4/.test(t), /0\.08 \* sizeK/.test(t));