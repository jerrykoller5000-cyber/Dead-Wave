const fs=require('fs'),crypto=require('crypto');
let t=fs.readFileSync('index.html','utf8');console.log('hash before',crypto.createHash('sha1').update(t).digest('hex'),'crlf',/\r\n/.test(t),'bom',t.charCodeAt(0)===0xfeff);
const R=[
["        const s = placeSurvivor(open || { kind: 'campsite', index: i, x: c.x, z: c.z }, day);\n",
 "        const s = placeSurvivor(open || { kind: 'campsite', index: i, x: c.x, z: c.z }, day, survivorPlace(c.style));\n"],
["    function survivorsAtThreadEnd() {\n",
`    // GB-232 (places): Okafor in the trapper's cellar (AG-135's trapper.cellarSpot), Brandt by the rangers' truck's door
    // (ranger.clues' 'truck' spot), Pike at the fire until the hikers' lead has a spot. null: the fire.
    function survivorPlace(style) {
      if (style === 'trapper' && trapper?.cellarSpot) { const c = trapper.cellarSpot; return { x: c.x, y: c.y, z: c.z, yaw: c.yaw }; }
      if (style === 'ranger') { const t = ranger?.clues?.find((q) => q.source === 'truck')?.spot; if (t) return { x: t.x, z: t.z }; }
      return null;
    }
    function survivorsAtThreadEnd() {
`],
["    function placeSurvivor(post, d) {\n","    function placeSurvivor(post, d, spot = null) {\n"],
["      const p = resolveStaticProps(post.x + Math.cos(a) * SURVIVOR_FIRE_R, post.z + Math.sin(a) * SURVIVOR_FIRE_R, 0.5);\n",
 "      // GB-232: a set spot with a height (the cellar) is used as is: AG-137's cheek walls and mound would push it out.\n      const p = spot ? (Number.isFinite(spot.y) ? { x: spot.x, z: spot.z } : resolveStaticProps(spot.x, spot.z, 0.5))\n        : resolveStaticProps(post.x + Math.cos(a) * SURVIVOR_FIRE_R, post.z + Math.sin(a) * SURVIVOR_FIRE_R, 0.5);\n"],
["      root.position.set(p.x, sampleHeight(p.x, p.z), p.z);\n      root.rotation.y = Math.atan2(post.x - p.x, post.z - p.z);   // facing the fire\n",
 "      const y = spot && Number.isFinite(spot.y) ? spot.y : sampleHeight(p.x, p.z);\n      root.position.set(p.x, y, p.z);\n      root.rotation.y = spot && Number.isFinite(spot.yaw) ? spot.yaw : Math.atan2(post.x - p.x, post.z - p.z);   // facing the fire\n"],
["      const s = { style, camp: post.index, day: d | 0, state: 'waiting', x: p.x, z: p.z, root, post };\n",
 "      const s = { style, camp: post.index, day: d | 0, state: 'waiting', x: p.x, y, z: p.z, root, post };\n"],
["        if (hypot(s.x - p.x, s.z - p.z) > SURVIVOR_REACH) continue;\n",
 "        if (hypot(s.x - p.x, s.z - p.z) > SURVIVOR_REACH) continue;\n        if (Number.isFinite(s.y) && Math.abs(s.y - p.y) > 1.6) continue;   // GB-232: the cellar under the yard\n"]];
for(const [a,b] of R){const n=t.split(a).length-1;if(n!==1){console.log('COUNT',n,a);process.exit(1)}}
const t2=fs.readFileSync('index.html','utf8');if(t2!==t){console.log('changed');process.exit(1)}
for(const [a,b] of R)t=t.replace(a,()=>b);
fs.writeFileSync('index.html',t);console.log('saved');
