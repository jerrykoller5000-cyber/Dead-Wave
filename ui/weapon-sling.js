// GP-156: mount points are in the original gun-builder coordinates, before the
// carry copy is centred, scaled and fitted. Never derive them from the muzzle or
// the bounding box: a suppressor or a drum changes that box, not the sling studs.
// Each seat is a point followed by its outward normal (flat sides default to +x).
// Positive-X fixtures override only the seats on asymmetric model surfaces.
const mounts = {
  m4: [[.031, .032, -.52], [.05149, .02, .45, .9997, .0227, .0045]],
  ak: [[.02169, -.065, -.49, .9445, .0149, -.3281], [.02729, -.012, .532, .7071, -.1162, .6975]],
  aa12: [[.035, .025, -.51], [.045, -.015, .45]],
  shotgun: [[.02384, -.025, -.42, .5556, .8264, -.092], [.01451, .035, .63, .9808, .1951, 0]],
  sniper: [[.029, .045, -.56], [.0315, .023, .42]],
  launcher: [[.063, .015, -.25, .3827, 0, -.9239], [.07422, .04, .3, .9971, .0754, -.0049]],
  minigun: [[.112, .04, -.15], [.12274, 0, .14, .9999, -.009, .0128]],
  flamer: [[.055, .065, -.13], [.055, .065, .3]],
  chainsaw: [[.1435, .08, -.23], [.1435, .065, .02]]
};
const positiveSide = {
  m4: {1: [.05112, .02, .45, .9987, .0498, .0063]},
  launcher: {1: [.07422, .04, .3, .9994, .0348, -.0049]},
  minigun: {1: [.09612, 0, .14, .9659, 0, .2588]},
  flamer: {0: [.08081, .065, -.13, .7706, .5835, -.2564]}
};
const slingMaterials=new WeakMap();

// Flat webbing whose cross-section turns with the path. Projecting the width
// onto each tangent's plane avoids a zero-width twist on the shoulder bend.
function ribbon(T, points) {
  const curve=new T.CatmullRomCurve3(points,false,'centripetal');
  const p=[],uv=[],ix=[],steps=56,width=.036,thickness=.006;
  let axis=new T.Vector3(1,0,0);
  for(let j=0;j<=steps;j++){
    const u=j/steps,c=curve.getPointAt(u),t=curve.getTangentAt(u);
    let side=axis.clone().addScaledVector(t,-axis.dot(t));
    if(side.lengthSq()<1e-6)side=new T.Vector3(0,0,1).cross(t);
    side.normalize();if(side.dot(axis)<0)side.negate();axis=side;
    const normal=new T.Vector3().crossVectors(side,t).normalize();
    const endWidth=.022+(width-.022)*Math.min(1,Math.min(u,1-u)/.07);
    for(const [s,h]of[[-1,-1],[1,-1],[-1,1],[1,1]]){
      const v=c.clone().addScaledVector(side,s*endWidth/2).addScaledVector(normal,h*thickness/2);
      p.push(v.x,v.y,v.z);uv.push((s+1)/2,u*6);
    }
  }
  for(let j=0;j<steps;j++)for(const[a,b]of[[0,1],[1,3],[3,2],[2,0]]){
    // Outward winding: the former order lit the inside of the webbing, making
    // its visible connections almost black at the overhead gameplay angle.
    const x=j*4+a,y=j*4+b;ix.push(x,x+4,y,y,x+4,y+4);
  }
  // Close the cut ends where the webbing bears on the metal rings.
  const last=4*steps;
  ix.push(0,1,3,0,3,2,last,last+3,last+1,last,last+2,last+3);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}

export function fitWeaponSling(T, spot, vest, clipMaterial) {
  const strap=spot.sling, model=spot.gun?.children[0], spec=mounts[spot.kind];
  strap.visible=!!(model&&spec);
  if(!strap.visible){strap.userData.signature=null;return;}
  if(!strap.userData.slingMaterial){
    const base=strap.material;
    if(!slingMaterials.has(base)){
      const mat=base.clone();mat.color.setHex(0x596044);mat.roughness=.95;mat.metalness=0;
      slingMaterials.set(base,mat);
    }
    strap.material=slingMaterials.get(base);strap.userData.slingMaterial=true;
  }
  spot.g.updateMatrix();spot.gun.updateMatrix();model.updateMatrix();
  // Everything is solved in torso coordinates, so animation moves the complete
  // gun/strap assembly together. No world-space or per-frame mesh rebuilding.
  const matrix=new T.Matrix4().multiplyMatrices(spot.g.matrix,spot.gun.matrix).multiply(model.matrix);
  const side=spot.g.position.x<0?-1:1;
  const signature=spot.kind+':'+vest+':'+matrix.elements.join(',');
  if(strap.userData.signature===signature)return;
  // Mount on the body-facing side of each gun. Outboard mounts hid the junction
  // behind the receiver and sent the lead away from the shoulder.
  const faces=spec.map((p,i)=>side<0?(positiveSide[spot.kind]?.[i]??p):p);
  const anchors=faces.map(p=>[-p[0]*side,p[1],p[2]]);
  const [a,b]=anchors.map(p=>new T.Vector3(...p).applyMatrix4(matrix));
  const tp=strap.userData.torsoPivotY;
  const at=(x,y,z)=>new T.Vector3(side*x,y-tp,z);
  const lower=at(.222,.89,-.19), shoulder=at(.205,1.155,-.135);
  const inverse=spot.g.matrix.clone().invert();
  const modelToSpot=spot.gun.matrix.clone().multiply(model.matrix);
  const major=.015, minor=.0035;
  const mountsInSpot=[a,b].map(p=>p.clone().applyMatrix4(inverse));
  const frames=mountsInSpot.map((seat,i)=>{
    const s=faces[i],out=new T.Vector3(-side*(s[3]??1),s[4]??0,s[5]??0).transformDirection(modelToSpot);
    const toward=(i===0?lower:shoulder).clone().applyMatrix4(inverse).sub(seat);
    const tangent=toward.addScaledVector(out,-out.dot(toward));
    if(tangent.lengthSq()<1e-8)tangent.set(0,1,0).addScaledVector(out,-out.y);
    tangent.normalize();
    const normal=new T.Vector3().crossVectors(out,tangent).normalize();
    return {out,tangent,normal,center:seat.clone().addScaledVector(out,major+minor),
      web:seat.clone().addScaledVector(out,2*(major+minor)-.0002)};
  });
  const web=frames.map(f=>f.web.clone().applyMatrix4(spot.g.matrix));
  const leads=frames.map(f=>f.web.clone().addScaledVector(f.out,.045).applyMatrix4(spot.g.matrix));
  const points=[web[0],leads[0],lower,at(.235,.98,.115),
    at(.19,1.09,vest?.224:.158),at(.205,1.151,.105),at(.212,1.177,-.015),
    shoulder,leads[1],web[1]];
  const geometry=ribbon(T,points);geometry.applyMatrix4(inverse);
  strap.geometry.dispose();strap.geometry=geometry;
  if(!strap.userData.clips){
    strap.userData.clips=frames.map(()=>{
      const clip=new T.Mesh(new T.TorusGeometry(major,minor,4,10),clipMaterial);
      clip.castShadow=true;strap.add(clip);return clip;
    });
  }
  strap.userData.clips.forEach((clip,i)=>{
    const f=frames[i];
    clip.position.copy(f.center);
    clip.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(f.out,f.tangent,f.normal));
  });
  strap.userData.signature=signature;
  strap.userData.fit={anchors,ends:frames.map(f=>f.center.toArray()),attachments:mountsInSpot.map(p=>p.toArray())};
}
