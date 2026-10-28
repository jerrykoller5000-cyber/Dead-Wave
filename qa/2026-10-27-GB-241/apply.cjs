const fs=require('fs'),crypto=require('crypto');let t=fs.readFileSync('index.html','utf8');console.log('hash',crypto.createHash('sha1').update(t).digest('hex'));
const a="        if (shamblerTurn) { sx = shamblerTurn.x; sz = shamblerTurn.z; spd *= shamblerTurn.pace; }\n";
const b="        if (shamblerTurn) { sx = shamblerTurn.x; sz = shamblerTurn.z; spd *= shamblerTurn.pace; }\n        // GB-241 (Claude, t75): close to him and still facing away (knocked clear, or turned by a whiffed lunge's stumble),\n        // a shambler turns on the spot instead of walking its arc away at minPace, then shuffles back in to arm's length.\n        if (shamblerTurn && !shamblerRecovering) { const tdx = px0 - zx, tdz = pz0 - zz, td = zHyp(tdx, tdz); if (td > 1e-4 && td < 3 && (Math.sin(shamblerTurn.yaw) * tdx + Math.cos(shamblerTurn.yaw) * tdz) / td < 0.3) spd = 0; }\n";
if(t.split(a).length!==2){console.log('count');process.exit(1)}
if(fs.readFileSync('index.html','utf8')!==t)process.exit(1);
t=t.replace(a,()=>b);fs.writeFileSync('index.html',t);console.log('saved');
