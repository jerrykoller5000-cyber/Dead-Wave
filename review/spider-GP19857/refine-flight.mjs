import fs from 'node:fs';import assert from 'node:assert/strict';const file='index.html',old=fs.readFileSync(file,'utf8');let out=old;
const edit=(a,b)=>{assert.equal(out.split(a).length,2);out=out.replace(a,b);};
edit('      const T = 1.0 + Math.hypot(aimX - ox, aimZ - oz) * 0.022;\r\n      const ty = sampleHeight(aimX, aimZ);\r\n      const web = !!z.spider;', '      const web = !!z.spider, gravity = web ? SPIDER_WEB.gravity : 16;\r\n      const T = web ? Math.max(0.32, Math.hypot(aimX - ox, aimZ - oz) / SPIDER_WEB.speed) : 1.0 + Math.hypot(aimX - ox, aimZ - oz) * 0.022;\r\n      const ty = sampleHeight(aimX, aimZ);');
edit('        vy: (ty - oy) / T + 0.5 * 16 * T,', '        vy: (ty - oy) / T + 0.5 * gravity * T,');
edit('        age: 0, web, trail: fromMouth && !web ? 0 : -1', '        age: 0, web, gravity, trail: fromMouth && !web ? 0 : -1');
edit('      if (fromMouth && !web) {   // the mouthful', '      if (web) { mesh.userData.spiderOrigin = { x: ox, y: oy, z: oz }; spiderWebs.orientDart(mesh, (aimX - ox) / T, (ty - oy) / T + 0.5 * gravity * T, (aimZ - oz) / T); }\r\n      if (fromMouth && !web) {   // the mouthful');
edit('        g.vy -= 16 * dt;', '        g.vy -= (g.gravity || 16) * dt;');
assert.equal(fs.readFileSync(file,'utf8'),old);fs.writeFileSync(file,out,'utf8');console.log('Five fresh, scoped flight edits: Spider darts17m/s with shallow gravity5; acid remains unchanged.');
