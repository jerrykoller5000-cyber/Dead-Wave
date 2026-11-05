const fs=require('fs');
function edit(f,pairs){let s=fs.readFileSync(f,'utf8');for(const[a,b]of pairs){const n=s.split(a).length-1;if(n!==1)throw new Error(f+' anchor x'+n+': '+a.slice(0,60));s=s.replace(a,b);}fs.writeFileSync(f,s);}
edit('game/sight-points.js',[["aa12:     { kind: 'iron',  pos: [0, 0.1807, -0.25], fwd: [0, -0.0057, 1] },         // GB-228: on the line (was .183)",
"aa12:     { kind: 'iron',  pos: [0, 0.1680, -0.25], fwd: [0, 0, 1] },                // GB-259 (J20): level through the carry handle's rear ring (centre .168 @ -0.12) to the front post tip (.168 @ 0.75); GB-228 had .1807 sloping, over the ring's top"]]);
console.log('ok');
