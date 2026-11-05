import fs from 'node:fs';
const p = 'ui/marine-kit-fit.js';
let t = fs.readFileSync(p, 'utf8');
const old = `export function clearCarryPack(T,spot,primary=false) {
  const b=carryBounds(T,spot);if(!b)return;
  const side=spot.g.position.x<0?-1:1;
  if(primary){
    // Reserve the centre of the pack for secondaries; wide drums stay outboard.
    const inner=side>0?b.min.x:-b.max.x;
    spot.g.position.x+=side*Math.max(0,.265-inner);
  }else{`;
if (t.split(old).length !== 2) throw new Error('anchor');
const neu = `// GB-276: where each slung primary's innermost point rests on his side, as |x| in the torso frame, [+x side, -x side].
// GB-220's bars were recorded while the chapel halo (an invisible 0.9 m ellipsoid on the marine) stood in for his body, so
// every sling stopped on it; with the halo hidden (AG-200) the guns were 5-16 cm off his torso and pack (AG-233). These rest
// on the body's real side (measured on the real renderer with t189's inward ray, then a few mm of air), so a slung gun lies
// snug on his back. A gun not listed keeps the old rule (inner edge at .265, wide drums outboard of it).
const SLING_INNER={m4:[.213,.22],ak:[.195,.181],aa12:[.258,.257],shotgun:[.195,.193],sniper:[.21,.203],launcher:[.175,.17],flamer:[.193,.218],chainsaw:[.174,.198]};

export function clearCarryPack(T,spot,primary=false) {
  if(primary){
    // The spot starts where the rig put it and is placed afresh for each gun: before, it only ever moved outboard, so the
    // widest gun ever slung left every later gun standing off his back (AG-233).
    const u=spot.g.userData;
    if(u.carryBaseX===undefined)u.carryBaseX=spot.g.position.x;
    spot.g.position.x=u.carryBaseX;spot.g.updateMatrix();
  }
  const b=carryBounds(T,spot);if(!b)return;
  const side=spot.g.position.x<0?-1:1;
  if(primary){
    const inner=side>0?b.min.x:-b.max.x,want=SLING_INNER[spot.kind];
    if(want)spot.g.position.x+=side*(want[side>0?0:1]-inner);
    else spot.g.position.x+=side*Math.max(0,.265-inner);   // reserve the centre of the pack for secondaries; wide drums stay outboard
  }else{`;
t = t.replace(old, () => neu);
fs.writeFileSync(p, t);
