// GT-20104 / J151: a manufactured slide shell, open below and through its ejection
// port. These are model coordinates; the motion owner drives the existing slide.
import {boxProjectUV} from '../core/geometry.js';
const shells = new WeakMap();
const chambers = new WeakMap();

export function pistolSlideShellGeometry(T) {
  if (shells.has(T)) return shells.get(T);
  const outer = [[-.023,-.044],[.023,-.044],[.023,.018],[.017,.024],[-.017,.024],[-.023,.018]];
  const rearOuter = outer.map(([x,y])=>[x*.95,y>.006 ? .006+(y-.006)/3 : y]);
  const frontOuter = [[-.0218,-.044],[.0218,-.044],[.0218,.0175],[.0165,.0228],[-.0165,.0228],[-.0218,.0175]];
  const cavity = [[-.021,-.044],[.021,-.044],[.021,-.013],[.018,-.013],
    [.018,.0175],[-.018,.0175],[-.018,-.013],[-.021,-.013]];
  const section = [[-.023,-.044],[-.023,.018],[-.017,.024],[-.015,.024],
    [.017,.024],[.023,.018],[.023,.002],[.023,-.044],[.021,-.044],
    [.021,-.013],[.018,-.013],[.018,.002],[.018,.0175],[-.015,.0175],
    [-.018,.0175],[-.018,-.013],[-.021,-.013],[-.021,-.044]];
  const portLeft = [[-.023,-.044],[-.023,.018],[-.017,.024],[-.015,.024],
    [-.015,.0175],[-.018,.0175],[-.018,-.013],[-.021,-.013],[-.021,-.044]];
  const portRight = [[.023,-.044],[.023,.002],[.018,.002],[.018,-.013],
    [.021,-.013],[.021,-.044]];
  const portEnd = [[-.015,.024],[.017,.024],[.023,.018],[.023,.002],
    [.018,.002],[.018,.0175],[-.015,.0175]];
  const triangles = [];
  const area = p => p.reduce((n,a,i) => {const b=p[(i+1)%p.length];return n+a[0]*b[1]-b[0]*a[1];},0);
  const ccw = p => area(p)>0 ? p : p.slice().reverse();
  const at = (p,z) => [p[0],p[1],z];
  function wall(outline,a,b,inside=false) {
    const p=inside ? ccw(outline).slice().reverse() : ccw(outline);
    for(let i=0;i<p.length;i++) {
      const j=(i+1)%p.length, aa=at(p[i],a),bb=at(p[j],a),c=at(p[j],b),d=at(p[i],b);
      triangles.push([aa,bb,c],[aa,c,d]);
    }
  }
  function loft(first,last,a,b) {
    const p=ccw(first),q=ccw(last);
    for(let i=0;i<p.length;i++){
      const j=(i+1)%p.length,aa=at(p[i],a),bb=at(p[j],a),c=at(q[j],b),d=at(q[i],b);
      triangles.push([aa,bb,c],[aa,c,d]);
    }
  }
  function cap(outline,z,sign,holes=[]) {
    const p=ccw(outline),hs=holes.map(h=>ccw(h).slice().reverse()),all=[...p,...hs.flat()];
    const faces=T.ShapeUtils.triangulateShape(p.map(p=>new T.Vector2(...p)),hs.map(h=>h.map(p=>new T.Vector2(...p))));
    for(const f of faces) {
      const tri=f.map(i=>at(all[i],z));
      const a=tri[0],b=tri[1],c=tri[2],normal=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
      triangles.push(normal*sign>0 ? tri : [tri[0],tri[2],tri[1]]);
    }
  }
  const circle=(r,y)=>Array.from({length:32},(_,i)=>[r*Math.cos(i*Math.PI/16),y+r*Math.sin(i*Math.PI/16)]);
  const barrelHole = [0,1].flatMap(half=>Array.from({length:17},(_,i)=>{
    const angle=(half*16+i)*Math.PI/16;
    return [.0158*Math.cos(angle),(half ? -.004 : .001)+.0158*Math.sin(angle)];
  }));
  const holes=[barrelHole,circle(.010,-.033)];
  // A solid rear plate and a bored muzzle plate join the U-shell. Interface caps
  // cover only the cavity/difference, never duplicate the adjoining solid section.
  loft(rearOuter,outer,-.14,-.134);cap(rearOuter,-.14,-1);cap(cavity,-.134,1);
  wall(section,-.134,-.011);
  wall(portLeft,-.011,.05);wall(portRight,-.011,.05);
  cap(portEnd,-.011,1);cap(portEnd,.05,-1);
  wall(section,.05,.254);
  loft(outer,frontOuter,.254,.26);for(const h of holes)wall(h,.254,.26,true);
  cap(cavity,.254,-1,holes);cap(frontOuter,.26,1,holes);

  // Triangulation may remove a collinear contour point. Split every shared edge at
  // all authored points before writing the mesh, so the joined shell has no T seams.
  const vertices=[...new Map(triangles.flat().map(p=>[p.map(n=>n.toFixed(9)).join(','),p])).values()];
  const positions=[],normals=[];
  for(const tri of triangles) {
    const [a,b,c]=tri,ab=b.map((n,i)=>n-a[i]),ac=c.map((n,i)=>n-a[i]);
    const normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    const len=Math.hypot(...normal);if(len<1e-13)continue;
    for(let i=0;i<3;i++)normal[i]/=len;
    const edge=[];
    for(let j=0;j<3;j++) {
      const p=tri[j],q=tri[(j+1)%3],d=q.map((n,i)=>n-p[i]),dd=d.reduce((s,n)=>s+n*n,0),cuts=[];
      edge.push(p);
      for(const v of vertices) {
        const t=d.reduce((s,n,i)=>s+n*(v[i]-p[i]),0)/dd;
        if(t<=1e-8||t>=1-1e-8)continue;
        if(v.every((n,i)=>Math.abs(n-p[i]-t*d[i])<1e-9))cuts.push([t,v]);
      }
      cuts.sort((a,b)=>a[0]-b[0]);for(const [,v]of cuts)edge.push(v);
    }
    const centre=a.map((n,i)=>(n+b[i]+c[i])/3);
    for(let j=0;j<edge.length;j++) {
      const p=edge[j],q=edge[(j+1)%edge.length];
      for(const v of [centre,p,q]){positions.push(...v);normals.push(...normal);}
    }
  }
  const geometry=new T.BufferGeometry(),uv=new Float32Array(positions.length/3*2);
  boxProjectUV(positions,uv);
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
  geometry.computeBoundingSphere();geometry.userData.shared=true;
  shells.set(T,geometry);return geometry;
}

// The hood is the upper face of the chamber, not a plate that stays on the frame.
// Its through-bore joins the barrel tube; the rear opening remains visible when
// the slide is held back. Coordinates are still in the resting gun's frame.
export function pistolChamberGeometry(T) {
  if(chambers.has(T))return chambers.get(T);
  const outline=[[-.014,.0375],[-.012,.0355],[.012,.0355],[.014,.0375],
    [.014,.072],[.012,.074],[-.012,.074],[-.014,.072]];
  const hole=Array.from({length:32},(_,i)=>{
    const angle=-i*Math.PI/16;return [.0065*Math.cos(angle),.05+.0065*Math.sin(angle)];
  });
  const points=[...outline,...hole],positions=[],normals=[];
  const vertex=(p,z)=>[p[0],p[1],z];
  function tri(a,b,c){
    const ab=b.map((n,i)=>n-a[i]),ac=c.map((n,i)=>n-a[i]);
    const normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],length=Math.hypot(...normal);
    if(length<1e-13)return;
    for(const p of [a,b,c]){positions.push(...p);normals.push(...normal.map(n=>n/length));}
  }
  for(const p of [outline,hole])for(let i=0;i<p.length;i++){
    const a=vertex(p[i],.047),b=vertex(p[(i+1)%p.length],.047),c=vertex(p[(i+1)%p.length],.097),d=vertex(p[i],.097);
    tri(a,b,c);tri(a,c,d);
  }
  const caps=T.ShapeUtils.triangulateShape(outline.map(p=>new T.Vector2(...p)),[hole.map(p=>new T.Vector2(...p))]);
  for(const face of caps)for(const [z,sign]of [[.047,-1],[.097,1]]){
    const [a,b,c]=face.map(i=>vertex(points[i],z));
    const normal=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(normal*sign>0)tri(a,b,c);else tri(a,c,b);
  }
  const geometry=new T.BufferGeometry(),uv=new Float32Array(positions.length/3*2);
  boxProjectUV(positions,uv);
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
  geometry.computeBoundingSphere();geometry.userData.shared=true;
  chambers.set(T,geometry);return geometry;
}
