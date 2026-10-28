const fs=require('fs');let t=fs.readFileSync('index.html','utf8');
const a="waiting: () => survivorWaiting.map((s) => ({ style: s.style, camp: s.camp, day: s.day, x: s.x, z: s.z, state:";
if(t.split(a).length!==2){console.log('count');process.exit(1)}
t=t.replace(a,()=>"waiting: () => survivorWaiting.map((s) => ({ style: s.style, camp: s.camp, day: s.day, x: s.x, y: s.y, z: s.z, state:");
fs.writeFileSync('index.html',t);console.log('ok');
