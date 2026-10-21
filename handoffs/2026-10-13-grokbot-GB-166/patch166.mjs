// GB-166: two lines into index.html (CRLF, unchanged-file check before write).
import fs from 'node:fs';
const f = 'index.html', before = fs.readFileSync(f, 'utf8');
let s = before;
const once = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw Error('anchor x' + n + ': ' + a); s = s.replace(a, b); };
if (s.includes('syncTrainingMap')) { console.log('already patched'); process.exit(0); }
once("import { marineAimPoint, AIM_PERSONAL_SPACE } from './ui/marine-aim-safety.js';", "import { marineAimPoint, AIM_PERSONAL_SPACE } from './ui/marine-aim-safety.js';\r\n    import { syncTrainingMap } from './ui/training-map.js';   // GB-166: the giraffe map in the Training Ground");
once("    function drawMinimap(dt) {\r\n", "    function drawMinimap(dt) {\r\n      syncTrainingMap(document, training.active);   // GB-166\r\n");
if (fs.readFileSync(f, 'utf8') !== before) throw Error('index.html changed under us');
fs.writeFileSync(f, s, 'utf8'); console.log('patched index.html');
