// Fit the grip's upper surface to the two underside facets and the rounded sides of the lower housing.
export function fitGwGrip(T, grip, splitArtworkRows, clipArtworkProfile) {
  const bevel=.005, inner=.0475/2-bevel, shoulder=inner+bevel*Math.SQRT1_2;
  const edge=.0475/2, rise=bevel*(1-Math.SQRT1_2);
  const levels=[-shoulder,-inner,inner,shoulder].map(Math.fround);
  const slope=.008/.060, diagonal=Math.hypot(1,slope);
  const inset=x=>{
    const a=Math.abs(x);
    if(a<=inner)return 0;
    if(a<=shoulder)return (a-inner)*rise/(shoulder-inner);
    return rise+(a-shoulder)*(bevel-rise)/(edge-shoulder);
  };
  const lower=z=>-.058+slope*Math.max(0,-.100-z);
  const source=splitArtworkRows(T,grip.geometry,levels,0);
  const p=source.attributes.position;
  for(let i=0;i<p.count;i++){
    const y=p.getY(i),z=p.getZ(i),d=inset(p.getX(i));
    p.setY(i,z-d*(diagonal-1)/slope);
    p.setZ(i,d-y);
  }
  const rows=[-.30,-.100,.30].map(z=>[z,-lower(z)]);
  const clipped=clipArtworkProfile(T,source,rows,1,'z',()=>null);source.dispose();
  const onCut=(z,y)=>Math.abs(z+lower(y))<1e-8;
  const keepSkin=(_,triangle)=>triangle.every(v=>onCut(v[2],v[1]))?null:triangle;
  const result=splitArtworkRows(T,clipped,levels,0,keepSkin);
  clipped.dispose();
  const {position:q,normal}=result.attributes;
  for(let i=0;i<q.count;i+=3){
    if([i,i+1,i+2].every(k=>onCut(q.getZ(k),q.getY(k)))){
      const x=(q.getX(i)+q.getX(i+1)+q.getX(i+2))/3;
      const rear=(q.getY(i)+q.getY(i+1)+q.getY(i+2))/3<-.100;
      const a=Math.abs(x),dx=Math.sign(x)*(a<inner?0:a<shoulder?rise/(shoulder-inner):(bevel-rise)/(edge-shoulder));
      const n=new T.Vector3(-dx*(rear?diagonal:1),1,rear?slope:0).normalize();
      for(let k=i;k<i+3;k++)normal.setXYZ(k,n.x,n.y,n.z);
    }
    for(let k=i;k<i+3;k++){
      const d=inset(q.getX(k)),z=q.getY(k)+d*(diagonal-1)/slope;
      q.setY(k,d-q.getZ(k));q.setZ(k,z);
    }
  }
  result.computeBoundingBox();result.computeBoundingSphere();result.userData.shared=true;
  grip.geometry=result;
}
