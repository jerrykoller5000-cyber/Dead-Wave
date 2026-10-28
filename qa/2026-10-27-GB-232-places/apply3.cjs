const fs=require('fs');let t=fs.readFileSync('index.html','utf8');
const a="if (style === 'ranger') { const t = ranger?.clues?.find((q) => q.source === 'truck')?.spot; if (t) return { x: t.x, z: t.z }; }";
const b="if (style === 'ranger') { const t = ranger?.clues?.find((q) => q.source === 'truck')?.spot?.approach; if (t) return { x: t.x, z: t.z }; }   // rangerSpot: { approach, centre }";
if(t.split(a).length!==2){console.log('count');process.exit(1)} t=t.replace(a,()=>b);fs.writeFileSync('index.html',t);
let s=fs.readFileSync('tools/tests/t304.js','utf8');
s=s.replace("truck = T.rangerDbg.ranger.clues.find((c) => c.source === 'truck');","truck = T.rangerDbg.ranger.clues.find((c) => c.source === 'truck'), door = truck && truck.spot && truck.spot.approach;")
 .replace("if (br && truck && truck.spot) ok(Math.hypot(br.x - truck.spot.x, br.z - truck.spot.z) < 1.0, 'Brandt by the truck door (' + Math.hypot(br.x - truck.spot.x, br.z - truck.spot.z).toFixed(2) + ' m)');","if (br && door) ok(Math.hypot(br.x - door.x, br.z - door.z) < 1.0, 'Brandt by the truck door (' + Math.hypot(br.x - door.x, br.z - door.z).toFixed(2) + ' m)');")
 .replace("(truck && truck.spot ? 'set'","(door ? 'set'");
fs.writeFileSync('tools/tests/t304.js',s);console.log('ok',(s.match(/door/g)||[]).length);
