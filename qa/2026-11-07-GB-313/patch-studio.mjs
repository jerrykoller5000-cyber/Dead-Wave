import fs from 'node:fs';
const FILE = 'qa/2026-11-07-GB-313/studio.html';
let t = fs.readFileSync(FILE, 'utf8');
t = t.replace('GB-308 revolver studio', 'GB-313 revolver rear sight');
if (!t.includes("view === 'rearsight'")) {
  t = t.replace(
    "} else if (view === 'grip') {",
    "} else if (view === 'rearsight') {\n  C.fov = 26; C.updateProjectionMatrix();\n  const k = sizeK / 0.6;\n  C.position.set(0.14 * k, 0.14 * k, -0.02 * k);\n  C.lookAt(0, 0.118 * k, -0.050 * k);\n} else if (view === 'grip') {"
  );
}
fs.writeFileSync(FILE, t);
console.log('studio updated', t.includes("view === 'rearsight'"));