const fs=require('fs');
function edit(f,pairs){let s=fs.readFileSync(f,'utf8');for(const[a,b]of pairs){const n=s.split(a).length-1;if(n!==1)throw new Error(f+' anchor x'+n+': '+a.slice(0,60));s=s.replace(a,b);}fs.writeFileSync(f,s);}
const nl = fs.readFileSync('studio/weapon-heavy.js','utf8').includes('\r\n')?'\r\n':'\n';
edit('studio/weapon-heavy.js',[
["gunRubber, brassMat, gunOlive, fuelRedMat } = ctx;\n  const gun = new THREE.Group();".replace(/\n/g,nl),
 "gunRubber, brassMat, gunOlive, fuelRedMat, glassMat, sightDotMat } = ctx;\n  const gun = new THREE.Group();".replace(/\n/g,nl)],
["  // GB-177 (pass 2: the trigger was a long red bar".replace(/\n/g,nl),
 ["  // GB-259 (J18, GP-20017): a small open reflex sight on the carry handle's top bar (rubber top 0.2775), its window",
  "  // and dot at y 0.330 so the aim line clears the rear top grip (tops out 0.320 near z -0.30). Dot 3.5 mm in a thin ring, as GW-4.",
  "  K.box(0.04, 0.012, 0.07, gunDark, 0, 0.2835, 0.01, 0, 0, 0, null, 0.003);",
  "  for (const sx of [-1, 1]) K.box(0.005, 0.072, 0.06, gunDark, sx * 0.024, 0.325, 0.01, 0, 0, 0, null, 0.0015);",
  "  K.box(0.053, 0.008, 0.06, gunDark, 0, 0.365, 0.01, 0, 0, 0, null, 0.002);",
  "  const reflexGlass = Object.assign(glassMat.clone(), { transparent: true, opacity: 0.18, depthWrite: false });",
  "  K.box(0.043, 0.064, 0.003, reflexGlass, 0, 0.325, 0.035);",
  "  K.box(0.0035, 0.0035, 0.002, sightDotMat, 0, 0.330, 0.0355);",
  "  K.tor(0.0075, 0.0006, sightDotMat, 0, 0.330, 0.0355, 0, 0, 0, null, Math.PI * 2, 24);",
  "  // GB-177 (pass 2: the trigger was a long red bar"].join(nl)]]);
edit('game/sight-points.js',[["minigun:  { kind: 'over',  pos: [0, 0.300, -0.30], fwd: [0, 0, 1] },                // no sights: over the carry handle (0.280 @ -0.072)",
"minigun:  { kind: 'iron',  pos: [0, 0.330, -0.30], fwd: [0, 0, 1] },                // GB-259 (J18): level through the carry-handle reflex dot (0.330 @ 0.0355), clear of the rear grip top 0.320; was 'over' at .300 (inside the grip)"]]);
console.log('ok');
