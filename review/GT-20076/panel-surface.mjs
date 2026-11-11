import {visiblePieces} from '../../tools/tests/weapon-seating.js';

export function comparePlanarBack(mesh,before,backDistance,axis='x',side=Math.sign(mesh.position[axis])) {
  function surface(geometry){
    const {position,normal,uv}=geometry.attributes;
    const tuples=new Set();
    let inner=Infinity,outer=-Infinity;
    for(let i=0;i<position.count;i++){
      const dist=side*(mesh.position[axis]+(axis==='x'?position.getX(i):position.getY(i)));
      inner=Math.min(dist,inner);
      outer=Math.max(dist,outer);
      if(dist>backDistance+1e-7){
        tuples.add([position.getX(i),position.getY(i),position.getZ(i),
          normal.getX(i),normal.getY(i),normal.getZ(i),uv.getX(i),uv.getY(i)].join(','));
      }
    }
    return {tuples,inner,outer};
  }
  const a=surface(before),b=surface(mesh.geometry),pieces=visiblePieces(mesh);
  return {
    side,before:a.tuples.size,after:b.tuples.size,
    missing:[...a.tuples].filter(tuple=>!b.tuples.has(tuple)).length,
    added:[...b.tuples].filter(tuple=>!a.tuples.has(tuple)).length,
    innerBefore:a.inner,inner:b.inner,outer:b.outer,outerMotion:b.outer-a.outer,
    closed:pieces.length===1 && pieces[0].closed
  };
}
