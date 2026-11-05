const fs = require('fs');
let s = fs.readFileSync('index.html', 'utf8'); const crBefore = (s.match(/\r/g)||[]).length;
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const pairs = [
  ['    scene.add(streamGroup);' + eol, '    scene.add(streamGroup);' + eol + '    const streamPebbles = new THREE.Group(); streamPebbles.userData.cullKids = true; scene.add(streamPebbles);   // GB-273 (AG-222): the river-bar pebbles, each culled on its own (the stream group spans the map)' + eol],
  ['          streamGroup.add(peb);', '          streamPebbles.add(peb);'],
];
for (const [a, b] of pairs) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('matches ' + n + ' for ' + a.slice(0, 50)); s = s.replace(a, () => b); }
const crAfter = (s.match(/\r/g)||[]).length; if (crAfter - crBefore !== 1) throw new Error('CR delta ' + (crAfter - crBefore));
fs.writeFileSync('index.html', s, 'utf8');