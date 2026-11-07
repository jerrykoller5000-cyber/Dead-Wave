const fs = require('fs');
const s = fs.readFileSync('game/viewmodel.js','utf8');
// find supportPose / support basis / handPlace fore usage
const lines = s.split(/\n/);
for (let i=0;i<lines.length;i++) {
  if (/supportPose|supportBasis|handPlace|SOCKETS|\.support\b|fore/.test(lines[i]) && /support|fore|handPlace|SOCKET/.test(lines[i])) {
    if (i>0 && i<lines.length) console.log((i+1)+'|'+lines[i].slice(0,160));
  }
}
