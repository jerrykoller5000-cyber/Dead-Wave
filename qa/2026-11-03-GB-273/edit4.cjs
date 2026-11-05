const fs = require('fs');
let s = fs.readFileSync('index.html', 'utf8'); const crBefore = (s.match(/\r/g)||[]).length;
const a = 'c.wc = c.r <= 10 && !ud.noWallCull ? wallCull.include(';
if (s.split(a).length !== 2) throw new Error('nomatch');
s = s.replace(a, () => 'c.wc = c.r <= 10 && !ud.noWallCull && _cullBox.max.y - _cullBox.min.y <= 3 ? wallCull.include(');   // the spec: only what is under 3 m (a taller one throws its shadow over the wall at dawn and dusk)
if ((s.match(/\r/g)||[]).length !== crBefore) throw new Error('CR');
fs.writeFileSync('index.html', s, 'utf8');