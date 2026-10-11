// GP-156: mount points are in the original gun-builder coordinates, before the
// carry copy is centred, scaled and fitted. Never derive them from the muzzle or
// the bounding box: a suppressor or a drum changes that box, not the sling studs.
const mounts = {
  m4:       [[.035,.032,-.52],[.046,.02,.45]],
  ak:       [[.035,-.065,-.49],[.046,-.012,.532]],
  aa12:     [[.05,.025,-.51],[.055,-.015,.45]],
  shotgun:  [[.042,-.025,-.42],[.022,-.04,.8]],
  sniper:   [[.035,.045,-.56],[.043,-.005,.60]],
  launcher: [[.04,.03,-.44],[.06,.04,.30]],
  minigun:  [[.156,.07,-.24],[.13,.03,.24]],
  flamer:   [[.055,.065,-.13],[.055,.065,.30]],
  chainsaw: [[.12,.08,-.23],[.11,.065,.02]]
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
    for(const [s,h]of[[-1,-1],[1,-1],[-1,1],[1,1]]){
      const v=c.clone().addScaledVector(side,s*width/2).addScaledVector(normal,h*thickness/2);
      p.push(v.x,v.y,v.z);uv.push((s+1)/2,u*6);
    }
  }
  for(let j=0;j<steps;j++)for(const[a,b]of[[0,1],[1,3],[3,2],[2,0]]){
    // Outward winding: the former order lit the inside of the webbing, making
    // its visible connections almost black at the overhead gameplay angle.
    const x=j*4+a,y=j*4+b;ix.push(x,x+4,y,y,x+4,y+4);
  }
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
  const anchors=spec.map(p=>[-p[0]*side,p[1],p[2]]);
  const [a,b]=anchors.map(p=>new T.Vector3(...p).applyMatrix4(matrix));
  const tp=strap.userData.torsoPivotY;
  const at=(x,y,z)=>new T.Vector3(side*x,y-tp,z);
  // Short leads leave each gun toward the body, clear of the receiver/optic/drum.
  // The rest of the sling runs under the arm, across the chest and over that
  // shoulder, returning to the forward mount. Both carry slots mirror the route.
  const lower=at(.225,.86,-.17);
  const rear=a.clone().lerp(lower,.3);
  const shoulder=at(.205,1.185,-.145);
  const front=b.clone().lerp(shoulder,.28);
  const points=[a,rear,lower,at(.235,.98,.115),
    at(.17,1.12,vest?.22:.16),at(.175,1.185,.12),at(.18,1.205,-.035),
    shoulder,front,b];
  const inverse=spot.g.matrix.clone().invert();
  const geometry=ribbon(T,points);geometry.applyMatrix4(inverse);
  strap.geometry.dispose();strap.geometry=geometry;
  const ends=[a,b].map(p=>p.clone().applyMatrix4(inverse));
  if(!strap.userData.clips){
    strap.userData.clips=ends.map(()=>{
      const clip=new T.Mesh(new T.TorusGeometry(.015,.0035,4,10),clipMaterial);
      clip.castShadow=true;strap.add(clip);return clip;
    });
  }
  const normal=new T.Vector3(-side,0,0).transformDirection(spot.gun.matrix.clone().multiply(model.matrix));
  strap.userData.clips.forEach((clip,i)=>{
    clip.position.copy(ends[i]);clip.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);
  });
  strap.userData.signature=signature;
  strap.userData.fit={anchors,ends:ends.map(p=>p.toArray())};
}
