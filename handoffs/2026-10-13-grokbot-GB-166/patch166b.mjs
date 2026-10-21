import fs from 'node:fs';
const f = 'index.html', before = fs.readFileSync(f, 'utf8'); let s = before;
const once = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw Error('anchor x' + n + ': ' + a); s = s.replace(a, b); };
once("    function setFullMap(on) {\r\n", "    function setFullMap(on) {\r\n      syncTrainingMap(document, training.active);   // GB-166\r\n");
once("    function updateWorldAnimationsIndoors(dt) {   // CL-118: the Training Ground's frame\r\n", "    function updateWorldAnimationsIndoors(dt) {   // CL-118: the Training Ground's frame\r\n      syncTrainingMap(document, true);   // GB-166: the giraffe map\r\n");
if (fs.readFileSync(f, 'utf8') !== before) throw Error('changed under us');
fs.writeFileSync(f, s, 'utf8'); console.log('patched');
