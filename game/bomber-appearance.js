// GP-19886: reuse the belly skin and existing single vein draw; no new lights.
const pulses=new WeakMap();
// GP-19891: continuous, softly eased glow; proximity changes rate without resetting phase.
export function pulseBomberVeins(z,dt,target){
 const u=z.mesh?.userData,mat=u?.pulseMats?.[1];if(!z.alive||!u?.bomberVeins||!mat||!Number.isFinite(dt)||dt<=0)return;
 const h=Math.min(dt,.1),p=z.mesh.position,d=target&&Number.isFinite(target.x+target.y+target.z)&&Math.abs(target.y-p.y)<1.6?Math.hypot(target.x-p.x,target.z-p.z):Infinity,near=Math.max(0,Math.min(1,(10-d)/7.2));
 let s=pulses.get(z);if(!s){s={phase:((z.bob||0)*Math.PI*2)%(Math.PI*2),near:0};pulses.set(z,s);}
 s.near+=(near-s.near)*(1-Math.exp(-4*h));s.phase=(s.phase+h*Math.PI*2*(.35+1.25*s.near))%(Math.PI*2);
 const ambient=.42+(.38+.32*s.near)*(.5-.5*Math.cos(s.phase));
 // The bomb tactic lights the fuse earlier in the frame. Keep that warning
 // visible when this pose update runs, while retaining the idle vein pulse.
 const fuse=z.fuseT>0 ? .5+(.55+.45*Math.sin(z.fuseT*(d<14?9:4)))*1.2 : 0;
 mat.emissiveIntensity=Math.max(ambient,fuse);
}
export function resetBomberVeins(z){pulses.delete(z);const mat=z.mesh?.userData?.pulseMats?.[1];if(mat)mat.emissiveIntensity=.5;}
export function blendBomberSkin(T,u,scale){
 const belly=u.bomberBelly,skin=u.concept?.skin,mat=u.pulseMats?.[0],glow=u.pulseMats?.[1];
 if(!belly||skin==null||!mat||!glow)return;
 mat.color.setHex(skin);mat.emissive.setHex(0);mat.emissiveIntensity=0;mat.roughness=.86;
 glow.color.setHex(skin);glow.emissive.setHex(skin);glow.emissiveIntensity=.5;
 const vein=u.torso.children.find(m=>m.isMesh&&m.material===glow);if(!vein)return;
 // Trace the already sculpted belly, so the fine branches hug its faceted skin.
 const probe=new T.Mesh(belly.geometry,mat),ray=new T.Raycaster(),down=new T.Vector3(0,0,-1),hits=[];
 probe.updateMatrixWorld(true);belly.geometry.computeBoundingBox();const front=belly.geometry.boundingBox.max.z+.1*scale;
 const paths=[
  [[-.06,.35],[-.13,.23],[-.09,.11],[-.18,-.03],[-.14,-.22]],
  [[.09,.34],[.16,.23],[.12,.10],[.20,-.03],[.13,-.25]],
  [[-.13,.23],[-.27,.20],[-.34,.09],[-.43,.03]],
  [[-.09,.11],[-.25,.08],[-.31,-.04],[-.40,-.12]],
  [[-.18,-.03],[-.29,-.10],[-.25,-.20],[-.29,-.25]],
  [[.16,.23],[.26,.25],[.33,.14],[.41,.09]],
  [[.12,.10],[.25,.08],[.29,-.04],[.41,-.10]],
  [[.20,-.03],[.30,-.11],[.26,-.21],[.29,-.25]],
  // GP-19891: finer tributaries fill the belly without adding another draw.
  [[.01,.32],[.025,.19],[-.02,.02],[.03,-.16],[0,-.28]],
  [[-.06,.35],[-.20,.33],[-.30,.28],[-.39,.23]],
  [[.09,.34],[.23,.32],[.32,.29],[.42,.20]],
  [[-.27,.20],[-.33,.25],[-.40,.22],[-.47,.16]],
  [[.26,.25],[.36,.22],[.43,.24],[.48,.17]],
  [[-.25,.08],[-.33,.13],[-.42,.11],[-.49,.06]],
  [[.25,.08],[.33,.13],[.41,.07],[.49,.01]],
  [[-.31,-.04],[-.40,-.02],[-.47,-.08],[-.49,-.13]],
  [[.29,-.04],[.36,-.02],[.44,-.06],[.49,-.12]],
  [[-.29,-.10],[-.36,-.16],[-.42,-.17],[-.45,-.23]],
  [[.30,-.11],[.37,-.16],[.43,-.18],[.44,-.24]],
  [[.025,.19],[.07,.21],[.09,.28],[.15,.30]],
  [[-.02,.02],[-.06,.09],[-.04,.17],[-.11,.20]],
  [[.03,-.16],[.10,-.13],[.14,-.16],[.20,-.19]],
  [[-.14,-.22],[-.10,-.17],[-.05,-.20],[-.03,-.28]],
  [[.13,-.25],[.08,-.24],[.06,-.29],[.03,-.31]]
 ];
 const positions=[],normals=[];
 // Three segments per branch and the first thirteen balanced paths keep the belly's
 // branching pattern readable while avoiding thousands of subpixel tube triangles.
 const visiblePaths=13,steps=3;
 for(let j=0;j<visiblePaths;j++){
  const curve=new T.CatmullRomCurve3(paths[j].map(([x,y])=>new T.Vector3(x*scale,y*scale,0))),points=[];
  for(let i=0;i<=steps;i++){
   const p=curve.getPoint(i/steps);ray.set(new T.Vector3(p.x,p.y,front),down);hits.length=0;ray.intersectObject(probe,false,hits);
   if(hits[0])points.push(new T.Vector3(p.x,p.y,hits[0].point.z+.004*scale));
  }
  if(points.length<3)continue;
  // Independent short segments follow the facets exactly; taper out at branch tips.
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],delta=b.clone().sub(a),t=i/(points.length-1),radius=(j<2?.007:j<8?.0045:.0036)*scale;
   const geo=new T.CylinderGeometry(radius*(1-.75*t),radius*(1-.75*(i-1)/(points.length-1)),delta.length(),4,1,true);
   const m=new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()),new T.Vector3(1,1,1));
   const flat=geo.toNonIndexed();flat.applyMatrix4(m);positions.push(...flat.attributes.position.array);normals.push(...flat.attributes.normal.array);flat.dispose();geo.dispose();
  }
 }
 if(!positions.length)return;
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.computeBoundingBox();geometry.computeBoundingSphere();
 // Old vein geometry was cloned by the private Bomber sculpt; templates stay intact.
 const old=vein.geometry;vein.geometry=geometry;old.dispose();vein.name='bomber-branching-veins';vein.castShadow=false;
 // The belly's existing jiggle now carries its veins too, keeping them on the skin.
 vein.removeFromParent();belly.add(vein);vein.position.set(0,0,0);vein.rotation.set(0,0,0);vein.scale.set(1,1,1);u.bomberVeins=vein;
}
