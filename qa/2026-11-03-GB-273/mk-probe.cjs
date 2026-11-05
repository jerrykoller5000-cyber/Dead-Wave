const fs = require('fs');
let s = fs.readFileSync('qa/2026-11-03-GB-273/run-seats.mjs', 'utf8').replace('qa/2026-11-03-GB-273/seats', 'qa/2026-11-03-GB-273/dusk-probe');
const rep = (a, b) => { if (s.split(a).length !== 2) throw new Error('nomatch ' + a.slice(0, 50)); s = s.replace(a, () => b); };
rep("groundShadowBandDiff: H.compareCanvases(0.52, 0.95), // lower half of frame where the wall's shadow falls across the near-side grass",
`groundShadowBandDiff: H.compareCanvases(0.52, 0.95),
          hiddenByWall: (() => {
            const out = [], W = T.wallCullDbg().cull;
            const visit = (o) => { const c = o.userData && o.userData._cull; if (c && c.hidden && c.wc >= 0 && W.isHidden(c.wc)) { const b = new T.THREE.Box3().setFromObject(o); out.push({ name: o.name || o.type, kids: o.children.length, r: +c.r.toFixed(2), x: +o.position.x.toFixed(1), z: +o.position.z.toFixed(1), y0: +b.min.y.toFixed(2), y1: +b.max.y.toFixed(2), cast: !!o.castShadow, mesh: !!o.isMesh }); } };
            for (const o of T.scene.children) { visit(o); if (o.userData && o.userData.cullKids) for (const k of o.children) visit(k); }
            return out;
          })(),`);
rep('groundShadowBandDiff: onShadow.groundShadowBandDiff,', 'groundShadowBandDiff: onShadow.groundShadowBandDiff, hiddenByWall: onShadow.hiddenByWall,');
rep('console.log(`[AG-222] Shadow ${sc.id}', 'console.log("HIDDEN " + sc.id + " " + JSON.stringify(entry.hiddenByWall)); console.log(`[AG-222] Shadow ${sc.id}');
fs.writeFileSync('qa/2026-11-03-GB-273/run-probe.mjs', s);