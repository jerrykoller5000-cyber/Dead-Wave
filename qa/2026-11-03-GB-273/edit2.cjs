const fs = require('fs');
function edit(file, pairs) {
  let s = fs.readFileSync(file, 'utf8'); const crBefore = (s.match(/\r/g)||[]).length;
  if (s.charCodeAt(0) === 0xFEFF) throw new Error('BOM in ' + file);
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(file + ': expected 1 match, got ' + n + ' for ' + a.slice(0, 60));
    s = s.replace(a, () => b);
  }
  if ((s.match(/\r/g)||[]).length !== crBefore) throw new Error('CR count changed in ' + file);
  fs.writeFileSync(file, s, 'utf8');
}
edit('game/wall-cull.js', [
  ['function include(cx, cy, cz, r) {', 'function include(cx, cy, cz, r, top) {   // top: the draw\'s own highest point (AG-222: the sphere\'s cy + r over-counts wide, low props)'],
  ['box[o + 4] = Math.max(box[o + 4], cy + r);', 'box[o + 4] = Math.max(box[o + 4], top === undefined ? cy + r : top);'],
]);
edit('index.html', [
  ['wallCull.include(_cullS.center.x, _cullS.center.y, _cullS.center.z, c.r) : -2;', 'wallCull.include(_cullS.center.x, _cullS.center.y, _cullS.center.z, c.r, _cullBox.max.y) : -2;'],
]);