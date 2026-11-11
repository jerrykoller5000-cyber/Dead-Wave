import {makeAkModel} from '../../studio/weapon-longarms.js';
import {visiblePieces} from '../../tools/tests/weapon-seating.js';

// Compare against the independently allocated artist mesh from before the trim.
export function compareCover(ctx) {
  const originals = new Map();
  const raw = makeAkModel({...ctx, finishGun: gun => gun, gunKit: gun => {
    const kit = ctx.gunKit(gun);
    return {...kit, lathe(...args) {
      const mesh = kit.lathe(...args);
      if (args[2]?.seg === 20 && args[2]?.phase === Math.PI / 20) originals.set(mesh, mesh.geometry.clone());
      return mesh;
    }};
  }});
  const cover = raw.getObjectByName('KR-7 receiver cover');
  function exposed(geometry) {
    const {position, normal, uv} = geometry.attributes, result = new Set();
    for (let i = 0; i < position.count; i++) {
      const z = position.getZ(i), y = position.getY(i);
      const sideTop = Math.min(.04, .036 + (z + .2) * .2);
      if (y + cover.position.y <= sideTop + 1e-7) continue;
      result.add([position.getX(i),y,z,normal.getX(i),normal.getY(i),normal.getZ(i),
        uv.getX(i),uv.getY(i)].join(','));
    }
    return result;
  }
  const before = exposed(originals.get(cover)), after = exposed(cover.geometry);
  const pieces = visiblePieces(cover);
  const unmatched = [];
  for (const piece of pieces.filter(p => !p.closed)) {
    const edges = new Map();
    for (const face of piece.faces) for (let i=0;i<3;i++) {
      const j=(i+1)%3, key=[face.ids[i],face.ids[j]].sort((a,b)=>a-b).join(',');
      if (!edges.has(key)) edges.set(key,{count:0,points:[face.p[i].toArray(),face.p[j].toArray()]});
      edges.get(key).count++;
    }
    unmatched.push(...[...edges.values()].filter(e=>e.count!==2));
  }
  return {islands:pieces.length,closed:pieces.every(p=>p.closed),unmatched,before:before.size, after:after.size, missing:[...before].filter(p => !after.has(p)).length,
    added:[...after].filter(p => !before.has(p)).length};
}
