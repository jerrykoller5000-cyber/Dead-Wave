// GB-169: the CIF pose can be overridden (Jerry's pose tool): window.dwCifPose(ud, t) returning anything but false wins.
import fs from 'node:fs';
const f = 'index.html', before = fs.readFileSync(f, 'utf8'); let s = before;
const a = "      const ud = dressPreview && dressPreview.userData;\r\n      if (!ud) return;\r\n      const U = UNARMED_ARMS,";
if (s.includes('dwCifPose')) { console.log('already patched'); process.exit(0); }
if (s.split(a).length !== 2) throw Error('anchor');
s = s.replace(a, "      const ud = dressPreview && dressPreview.userData;\r\n      if (!ud) return;\r\n      if (typeof window.dwCifPose === 'function' && window.dwCifPose(ud, t) !== false) return;   // GB-169: a pose tool may take over\r\n      const U = UNARMED_ARMS,");
if (fs.readFileSync(f, 'utf8') !== before) throw Error('changed under us');
fs.writeFileSync(f, s, 'utf8'); console.log('patched index.html');
