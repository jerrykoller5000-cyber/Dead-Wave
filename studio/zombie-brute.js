// Director02:25 correction REVIEW ONLY: curve upper rear straps on final support; accepted V1 neck/face/rig retained.
// D-201 STEP 1 REVIEW COPY: raised rear neck/traps; accepted face and all joint rest transforms unchanged.
// GT-20111: Director-approved brute anatomy and tissue, on the original animated rig.
import {skinPoint,rowAt,columnAngles,EYE} from './zombie-brute-anatomy.js';
import {humanoidTube} from './zombie-humanoids.js';
export function refineBrute(A,T,g,s,M){
 const {head,eyes}=g.userData,{skin,shadow,wound,teeth}=M;
 const hideColors=new Set([skin.color.getHex(),shadow.color.getHex(),skin.color.clone().lerp(new T.Color(0xe6dfc8),.28).getHex()]);
 g.traverse(o=>{const m=o.material;if(m&&m!==wound&&m.userData.surface==='wet'&&hideColors.has(m.color.getHex()))m.userData.surface='skin';});
 for(const o of [...head.children])if(o.isMesh&&!eyes.includes(o))o.removeFromParent();
 const dry=A.mat(skin.color.clone().multiplyScalar(.94),false,0,'skin'),gum=A.mat(0x603a30,false,0,'wet'),dark=A.mat(0x211815,false,0,'skin');
 for(const m of [dry,dark]){m.userData.zombieColorRole='skin';m.userData.zombieColorBase=skin.color.getHex();}gum.userData.zombieColorRole='blood';gum.userData.zombieColorBase=wound.color.getHex();
 const ga=(d,r)=>Math.exp(-((d/r)**2)),sx=2.22,sy=1.35,sz=1.8;
 const morph=([x,y,z])=>{const jaw=ga(y-.078,.023),front=Math.max(0,Math.min(1,z/.11));let X=x*sx*(1+.20*jaw),Y=(y-.06)*sy-.160-.016/(1+Math.exp((y-.107)*500)),Z=z*sz;
  if(front>0){Z+=front*(-.028*ga(Math.abs(X)-.075,.045)*ga(Y+.004,.028)+.025*ga(Math.abs(X)-.075,.060)*ga(Y-.035,.018)-.010*ga(X,.045)*ga(Y+.050,.025)+.015*ga(Math.abs(X)-.030,.015)*ga(Y+.065,.014)+.045/(1+Math.exp((Y+.106)*130)));}
  X*=1-.15*ga(Y-.130,.050);Y+=.008*ga(X-.070,.040)*ga(Y-.120,.030);return[X,Y,Z];};
 const ys=[.05,.055,.06,.067,.075,.085,.094,.10,.103,.105,.108,.111,.114,.117,.12,.125,.13,.135,.14,.145,.15,.155,.16,.165,.169,.172,.175,.178,.181,.184,.188,.192,.20,.21,.22,.235,.25,.265,.28,.2895],rows=ys.map(y=>rowAt(0,y)),angles=columnAngles(48,1.35),C=angles.length,R=rows.length;
 const pts=[],pos=[],ix=[];
 for(let r=0;r<R;r++)for(let j=0;j<C;j++){const p=morph(skinPoint(angles[j],rows[r],false,false));pts.push(p);pos.push(...p.map(v=>v*s));}
 const j0=angles.findIndex(a=>a>=-.60),j1=angles.findLastIndex(a=>a<=.60),r0=6,r1=15;
 const oralBase=pts.map(p=>p.slice());
 // Shape the actual shared lip vertices into an asymmetric, drawn-back jaw opening.
 // Adjacent face rows follow the displacement so this is not an oval sticker on a slot.
 for(let r=Math.max(0,r0-3);r<=Math.min(R-1,r1+3);r++)for(let j=Math.max(0,j0-2);j<=Math.min(C-1,j1+2);j++){
  const jj=Math.max(j0,Math.min(j1,j)),u=(jj-j0)/(j1-j0)*2-1,lo=oralBase[r0*C+jj],hi=oralBase[r1*C+jj],mid=(lo[1]+hi[1])/2+.006*u,half=(hi[1]-lo[1])/2*(.16+.84*Math.sqrt(Math.max(0,1-u*u))),low=mid-half+.0015*Math.sin(jj*2.1),high=mid+half+.002*Math.sin(jj*1.7);
  const k=r*C+j,p0=oralBase[k],dy=r<r0?(low-lo[1])*(1-(r0-r)/3):r>r1?(high-hi[1])*(1-(r-r1)/3):low+(high-low)*(r-r0)/(r1-r0)-p0[1],side=j<j0?1-(j0-j)/2:j>j1?1-(j-j1)/2:1;
  pts[k]=[p0[0],p0[1]+dy*Math.max(0,side),p0[2]];pos[k*3+1]=pts[k][1]*s;
 }

 for(let r=0;r<R-1;r++)for(let j=0;j<C-1;j++){if(r>=r0&&r<r1&&j>=j0&&j<j1)continue;const a=r*C+j,b=a+C;ix.push(a,a+1,b,a+1,b+1,b);}
 // Close bottom and crown; the original neck remains inside the lower head root.
 for(const r of [0,R-1]){const at=pos.length/3;pos.push(0,(ys[r]-.06)*sy*s-.160*s,0);for(let j=0;j<C-1;j++){const a=r*C+j;ix.push(at,...(r?[a,a+1]:[a+1,a]));}}
 const mesh=(p,m,P,I,name)=>{const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setIndex(I);geo.computeVertexNormals();const o=A.put(p,geo,m);o.name=name;return o;};
 const headSurface=mesh(head,dry,pos,ix,'brute anatomical cranium and heavy mandible');headSurface.userData.zombieFeature={kind:'cranium'};
 const border=[];for(let j=j0;j<=j1;j++)border.push(pts[r1*C+j]);for(let r=r1-1;r>=r0;r--)border.push(pts[r*C+j1]);for(let j=j1-1;j>=j0;j--)border.push(pts[r0*C+j]);for(let r=r0+1;r<r1;r++)border.push(pts[r*C+j0]);
 const cp=[],wall=[],back=[],n=border.length;
 for(const p of border)cp.push(...p.map(v=>v*s));for(const[x,y]of border)cp.push(x*.82*s,(-.092+(y+.092)*.80)*s,.139*s);
 const center=cp.length/3;cp.push(0,-.092*s,.137*s);
 for(let i=0;i<n;i++){const k=(i+1)%n;wall.push(i,n+i,k,k,n+i,n+k);back.push(center,n+k,n+i);}
 mesh(head,gum,cp,wall,'brute recessed oral tissue');mesh(head,dark,cp,back,'brute dark oral cavity');
 // Broad visible eye caps sit in the sockets, independent of the marine's narrow eyelid contour.
 const probe=new T.Mesh(headSurface.geometry,dry),ray=new T.Raycaster();probe.updateMatrixWorld(true);
 const seat=(x,y,lift=0)=>{ray.set(new T.Vector3(x*s,y*s,1*s),new T.Vector3(0,0,-1));const hit=ray.intersectObject(probe,false)[0];if(!hit)throw Error('Unseated brute face detail '+x+','+y);return[x,y,hit.point.z/s+lift];};
 const vein=A.mat(skin.color.clone().multiplyScalar(.65),false,0,'skin');vein.userData.zombieColorRole='skin';vein.userData.zombieColorBase=skin.color.getHex();
 for(const [n,path]of [[[.127,.025],[.121,.062],[.095,.094]], [[-.13,.004],[-.124,.045],[-.103,.078]]].entries())A.path(head,vein,path.map(([x,y])=>seat(x,y,.001)),.0025,.0012).name='brute temporal vein '+n;
 // Tooth roots follow the actual lip edge and penetrate its skin by one millimetre.
 const lipY=(x,upper)=>{const row=upper?r1:r0,lip=pts.slice(row*C+j0,row*C+j1+1).slice().sort((a,b)=>a[0]-b[0]);for(let i=1;i<lip.length;i++)if(x<=lip[i][0]){const a=lip[i-1],b=lip[i],f=(x-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*f+(upper?.002:-.002);}throw Error('Tooth outside brute lip');};
 // A rolled, ragged tissue edge roots into the carved opening and exposes gums.
 const lipP=[],lipI=[],lipN=border.length;
 for(let q=0;q<4;q++)for(let i=0;i<lipN;i++){const p=border[i],len=Math.hypot(p[0],p[1]+.1)||1,nx=p[0]/len,ny=(p[1]+.1)/len,w=.005+.002*Math.sin(i*2.3),d=[0,-w,-w*.9,0][q],z=[0,.003,-.005,-.004][q];lipP.push((p[0]+nx*d)*s,(p[1]+ny*d)*s,(p[2]+z)*s);}
 for(let q=0;q<4;q++)for(let i=0;i<lipN;i++){const a=q*lipN+i,b=q*lipN+(i+1)%lipN,c=((q+1)%4)*lipN+i,d=((q+1)%4)*lipN+(i+1)%lipN;lipI.push(a,b,c,b,d,c);}
 let lipVolume=0;for(let i=0;i<lipI.length;i+=3){const[a,b,c]=lipI.slice(i,i+3).map(k=>new T.Vector3().fromArray(lipP,k*3));lipVolume+=a.dot(b.clone().cross(c));}if(lipVolume<0)for(let i=0;i<lipI.length;i+=3)[lipI[i+1],lipI[i+2]]=[lipI[i+2],lipI[i+1]];
 mesh(head,gum,lipP,lipI,'brute drawn-back torn lip tissue').userData.intrinsicZombieWound=true;
 // Short unequal crowns remain rooted behind the original anatomical lip margins.
 for(let i=0;i<8;i++)for(const upper of [true,false]){
  if(upper&&i===5||!upper&&i===1)continue;
  const x=(i-3.5)*.019,y=lipY(x,upper),z=seat(x,y,-.001)[2],h=[.026,.012,.021,.017,.025,.010,.019,.024][(i+(upper?0:3))%8],dir=upper?-1:1,rad=.0065+(i%3)*.0015,P=[],I=[],N=5;
  for(let r=0;r<3;r++)for(let j=0;j<N;j++){const a=j/N*Math.PI*2,w=r===0?1:r===1?.92:.60,chop=r===2?(.78+.22*Math.sin(j*2.7+i)):r/2;P.push((x+Math.cos(a)*rad*w)*s,(y+dir*h*chop)*s,(z+Math.sin(a)*rad*w+(r/2)*.003)*s);}
  for(let r=0;r<2;r++)for(let j=0;j<N;j++){const a=r*N+j,b=r*N+(j+1)%N;if(upper)I.push(a,b,a+N,b,b+N,a+N);else I.push(a,a+N,b,b,a+N,b+N);}for(const r of [0,2])for(let j=1;j<N-1;j++){const reverse=r===0?dir<0:dir>0;I.push(r*N,r*N+(reverse?j+1:j),r*N+(reverse?j:j+1));}
  const o=mesh(head,teeth,P,I,'brute heavy broken '+(upper?'upper':'lower')+' tooth '+i);o.userData.zombieFeature={kind:'tooth',slot:(upper?0:10)+i};
 }

 const healed=A.mat(skin.color.clone().lerp(new T.Color(0x9b8270),.28),false,0,'skin');healed.userData.zombieColorRole='skin';healed.userData.zombieColorBase=skin.color.getHex();
 A.path(head,healed,[[-.045,.105],[-.052,.070],[-.065,.041]].map(([x,y])=>seat(x,y,.001)),.003,.0015).name='brute healed brow scar';
 // The brow overhang is a flesh mass seated into the forehead, not a detached pale eyebrow.
 for(const sign of [-1,1]){const rows=[[.028,.010,.005,.010],[.055,.028,.014,.020],[.10,.035,.016,.022],[.14,.016,.005,.012]],P=[],I=[],N=12;
  for(const[x,y,ry,rz]of rows){const z=seat(sign*x,y,-.012)[2];for(let i=0;i<N;i++){const a=i/N*Math.PI*2;P.push(sign*x*s,(y+Math.sin(a)*ry)*s,(z+Math.cos(a)*rz)*s);}}
  for(let r=0;r<rows.length-1;r++)for(let i=0;i<N;i++){const a=r*N+i,b=r*N+(i+1)%N;if(sign>0)I.push(a,a+N,b,b,a+N,b+N);else I.push(a,b,a+N,b,b+N,a+N);}
  for(const r of [0,rows.length-1]){const c=P.length/3,z=seat(sign*rows[r][0],rows[r][1],-.012)[2];P.push(sign*rows[r][0]*s,rows[r][1]*s,z*s);for(let i=0;i<N;i++){const a=r*N+i,b=r*N+(i+1)%N;I.push(c,...((r===0)===(sign>0)?[b,a]:[a,b]));}}
  mesh(head,dry,P,I,'brute integrated overhanging brow '+sign);
 }
 for(const eye of eyes){const x=Math.sign(eye.position.x)*.075,y=-.004,p=seat(x,y,-.010);eye.position.set(...p.map(v=>v*s));eye.scale.set(.76,.56,.50);}

 for(const sign of [-1,1]){const geo=new T.SphereGeometry(1,16,8),P=geo.attributes.position;for(let i=0;i<P.count;i++){const y=P.getY(i),z=P.getZ(i);if(sign<0&&y>.05&&z>-.2)P.setY(i,y*.55-.20);if(sign>0&&y<-.3&&z>.1)P.setZ(i,z*.5);}P.needsUpdate=true;geo.computeVertexNormals();const ear=A.put(head,geo,dry,sign*.192,-.041,-.005);ear.scale.set(.018*s,.036*s,.022*s);ear.name='brute ragged ear cartilage '+sign;A.egg(head,shadow,sign*.196,-.038,.012,.012,.029,.005).name='brute torn ear fold '+sign;}
 refineBruteBody(A,T,g,s,M,dry);
 refineBruteLowerLimbs(A,T,g,s,M,dry);
 seatBruteRearHarness(T,g,s,M);
 paintBruteSkin(A,T,g,s,M,dry);
 g.userData.gtBrutePrototype={version:20,scope:'Director-approved v20: torn mouth, rooted broken teeth, smooth bruises and continuous muscled body',bonesUnchanged:true};
}

// Brute body detail; the original bones and all non-brute construction are retained.
// Original rig, actual muscle and tissue surfaces.
function refineBruteBody(A,T,g,s,M,dry){
 const u=g.userData,{leather,steel,wound,skin}=M,ga=(d,r)=>Math.exp(-((d/r)**2));
 const mesh=(p,m,P,I,name)=>{const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setIndex(I);geo.computeVertexNormals();const o=A.put(p,geo,m);o.name=name;return o;};
 const pale=skin.color.clone().lerp(new T.Color(0xe6dfc8),.28).getHex();
 for(const bone of [u.torso,u.armLG,u.armRG])for(const o of [...bone.children])if(o.isMesh&&o.material?.color?.getHex()===pale)o.removeFromParent();
 const vein=A.mat(skin.color.clone().multiplyScalar(.68),false,0,'skin');vein.userData.zombieColorRole='skin';vein.userData.zombieColorBase=skin.color.getHex();
 const rawSeat=(probe,x,y,lift=0)=>{const ray=new T.Raycaster(new T.Vector3(x*s,y*s,1*s),new T.Vector3(0,0,-1)),hit=ray.intersectObject(probe,false)[0];if(!hit)throw Error('Unseated brute muscle detail '+x+','+y);return[x,y,hit.point.z/s+lift];};
 const upperRows=[[-.373,.089,.096,-.002],[-.337,.093,.099,-.002],[-.29,.100,.103,0],[-.20,.142,.155,.014],[-.10,.168,.170,.008],[0,.176,.165,0],[.08,.110,.120,0]];
 for(const [side,arm]of [[-1,u.armLG],[1,u.armRG]]){
  arm.userData.upper.removeFromParent();
  const rows=[];for(let j=0;j<upperRows.length-1;j++)for(const t of [0,.5])rows.push(upperRows[j].map((v,k)=>v+(upperRows[j+1][k]-v)*t));rows.push(upperRows.at(-1));
  const P=[],I=[],N=32,cut=new Map();
  for(const[y,rx,rz,cz]of rows)for(let i=0;i<N;i++){
   const a=i/N*Math.PI*2,front=Math.max(0,Math.cos(a)),X=Math.sin(a)*rx,belly=.014*ga(y+.14,.08)*front,fascia=-.006*ga(y+.27,.035)*front,split=-.010*ga(X-side*.068,.025)*ga(y+.13,side<0?.068:.045)*front;
   P.push(X*s,y*s,(cz+Math.cos(a)*rz+belly+fascia+split)*s);
  }
  const edge=(a,b)=>{const k=[a,b].sort((x,y)=>x-y).join(':');if(cut.has(k))cut.delete(k);else cut.set(k,[a,b]);};
  for(let r=0;r<rows.length-1;r++)for(let i=0;i<N;i++){
   const a=r*N+i,b=r*N+(i+1)%N,c=a+N,d=b+N,x=(P[a*3]+P[b*3]+P[c*3]+P[d*3])/(4*s),y=(rows[r][0]+rows[r+1][0])/2,z=(P[a*3+2]+P[b*3+2])/(2*s),half=side<0?.028:.022;
   if(z>.05&&Math.abs(x-side*.068)<half&&Math.abs(y+.13)<(side<0?.075:.045)){edge(a,b);edge(b,d);edge(d,c);edge(c,a);continue;}
   I.push(a,b,c,b,d,c);
  }
  for(const r of [0,rows.length-1]){const c=P.length/3;P.push(0,rows[r][0]*s,rows[r][3]*s);for(let i=0;i<N;i++)I.push(c,...(r?[r*N+i,r*N+(i+1)%N]:[r*N+(i+1)%N,r*N+i]));}
  const upper=mesh(arm,dry,P,I,'brute sculpted deltoid biceps and triceps '+side);arm.userData.upper=upper;
  if(!cut.size)throw Error('No actual brute skin split generated');
  const edges=[...cut.values()],ordered=[edges.shift()[0]];while(edges.length){const n=ordered.at(-1),i=edges.findIndex(e=>e[0]===n||e[1]===n);if(i<0)throw Error('Disconnected brute skin tear');const e=edges.splice(i,1)[0];ordered.push(e[0]===n?e[1]:e[0]);}if(ordered.at(-1)===ordered[0])ordered.pop();
  // Stretch the actual shared skin vertices around an irregular oval tear, eliminating square panel cuts.
  const cx=ordered.reduce((a,i)=>a+P[i*3],0)/ordered.length/s,cy=ordered.reduce((a,i)=>a+P[i*3+1],0)/ordered.length/s,rx=Math.max(...ordered.map(i=>Math.abs(P[i*3]/s-cx))),ry=Math.max(...ordered.map(i=>Math.abs(P[i*3+1]/s-cy)));
  for(const i of ordered){const a=Math.atan2((P[i*3+1]/s-cy)/ry,(P[i*3]/s-cx)/rx),k=.90+.06*Math.sin(a*3+side),x=cx+Math.cos(a)*rx*k,y=cy+Math.sin(a)*ry*k;let lo=rows[0],hi=rows.at(-1);for(let j=1;j<rows.length;j++)if(y<=rows[j][0]){lo=rows[j-1];hi=rows[j];break;}const q=Math.max(0,Math.min(1,(y-lo[0])/(hi[0]-lo[0]))),R=lo.map((v,k)=>v+(hi[k]-v)*q),front=Math.sqrt(Math.max(0,1-(x/R[1])**2)),belly=.014*ga(y+.14,.08)*front,fascia=-.006*ga(y+.27,.035)*front,split=-.010*ga(x-side*.068,.025)*ga(y+.13,side<0?.068:.045)*front;P[i*3]=x*s;P[i*3+1]=y*s;P[i*3+2]=(R[3]+front*R[2]+belly+fascia+split)*s;}
  upper.geometry.attributes.position.array.set(P);upper.geometry.attributes.position.needsUpdate=true;upper.geometry.computeVertexNormals();upper.geometry.computeBoundingBox();upper.geometry.computeBoundingSphere();
  const Q=[],W=[],n=ordered.length;for(const i of ordered)Q.push(P[i*3],P[i*3+1],P[i*3+2]);for(const i of ordered)Q.push(P[i*3],P[i*3+1],P[i*3+2]-.014*s);const center=Q.length/3;Q.push(ordered.reduce((a,i)=>a+P[i*3],0)/n,ordered.reduce((a,i)=>a+P[i*3+1],0)/n,ordered.reduce((a,i)=>a+P[i*3+2],0)/n-.015*s);
  for(let i=0;i<n;i++){const k=(i+1)%n;W.push(i,k,n+i,k,n+k,n+i,center,n+i,n+k);}
  let signed=0;for(let i=0;i<n;i++){const k=(i+1)%n;signed+=Q[i*3]*Q[k*3+1]-Q[k*3]*Q[i*3+1];}if(signed<0)for(let i=0;i<W.length;i+=3)[W[i+1],W[i+2]]=[W[i+2],W[i+1]];
  const bed=mesh(arm,wound,Q,W,'brute essential stretched skin rupture '+side);bed.userData.intrinsicZombieWound=true;
  // Raised vascular branches follow the actual retained muscle triangles.
  const probe=new T.Mesh(upper.geometry,dry);probe.updateMatrixWorld(true);
  for(const [n,path]of [[[side*.018,-.055],[side*.026,-.105],[side*.018,-.19],[side*.035,-.28]],[[side*.018,-.17],[-side*.015,-.21],[-side*.032,-.26]]].entries())A.path(arm,vein,path.map(([x,y])=>rawSeat(probe,x,y,.001)),.0035,.0015).name='brute brachial vein '+side+' '+n;
 }
 // Long quadriceps and fascia carry the same native leg joints, under the retained skirt and guards.
 for(const[side,leg]of[[-1,u.legLG],[1,u.legRG]]){leg.userData.thigh.removeFromParent();const rows=[[-.405,.069,.075,.008],[-.379,.078,.084,.009],[-.335,.096,.107,.005],[-.29,.108,.135,0],[-.21,.130,.156,-.006],[-.13,.1404,.16065,-.010],[-.055,.138,.144,-.005],[.02,.1323,.1215,0]],P=[],I=[],N=28;
  for(const[y,rx,rz,cz]of rows)for(let i=0;i<N;i++){const a=i/N*Math.PI*2,x=Math.sin(a)*rx,front=Math.max(0,Math.cos(a)),mass=.010*ga(Math.abs(x)-.055,.032)*ga(y+.18,.11),seam=-.007*ga(x,.015)*ga(y+.21,.12);P.push(x*s,y*s,(cz+Math.cos(a)*rz+front*(mass+seam))*s);}
  for(let r=0;r<rows.length-1;r++)for(let i=0;i<N;i++){const a=r*N+i,b=r*N+(i+1)%N;I.push(a,b,a+N,b,b+N,a+N);}for(const r of[0,rows.length-1]){const c=P.length/3;P.push(0,rows[r][0]*s,rows[r][3]*s);for(let i=0;i<N;i++)I.push(c,...(r?[r*N+i,r*N+(i+1)%N]:[r*N+(i+1)%N,r*N+i]));}
  const thigh=mesh(leg,dry,P,I,'brute quadriceps and fascia '+side);leg.userData.thigh=thigh;
  const probe=new T.Mesh(thigh.geometry,dry);probe.updateMatrixWorld(true);A.path(leg,vein,[[side*.04,-.10],[side*.055,-.19],[side*.035,-.28]].map(([x,y])=>rawSeat(probe,x,y,.001)),.003,.0012).name='brute quadriceps vein '+side;
 }
 // Neck and traps form one thick load-bearing volume, with seated sternocleidomastoid ridges.
 const neckRows=[[.40,.210,.140,-.025],[.46,.200,.140,-.040],[.55,.170,.150,-.065],[.635,.145,.140,-.090],[.695,.100,.100,-.105]],P=[],I=[],N=32;
 for(const[y,rx,rz,cz]of neckRows)for(let i=0;i<N;i++){const a=i/N*Math.PI*2,x=Math.sin(a)*rx,front=Math.max(0,Math.cos(a)),line=.045+.065*(y-.40)/.22;P.push(x*s,y*s,(cz+Math.cos(a)*rz+.009*ga(Math.abs(x)-line,.018)*front)*s);}
 for(let r=0;r<neckRows.length-1;r++)for(let i=0;i<N;i++){const a=r*N+i,b=r*N+(i+1)%N;I.push(a,b,a+N,b,b+N,a+N);}for(const r of [0,neckRows.length-1]){const c=P.length/3;P.push(0,neckRows[r][0]*s,neckRows[r][3]*s);for(let i=0;i<N;i++)I.push(c,...(r?[r*N+i,r*N+(i+1)%N]:[r*N+(i+1)%N,r*N+i]));}
 mesh(u.torso,dry,P,I,'brute continuous neck and trapezius mass');
 // Organic shoulder roots merge the thick neck into each deltoid under the existing armor outline.
 for(const o of [...u.torso.children])if(o.isMesh&&o.material===skin&&o.geometry.type==='SphereGeometry'&&o.position.y/s>=.40&&Math.abs(o.position.x/s)>.06)o.removeFromParent();
 for(const side of [-1,1]){
  const rootX=Math.abs((side<0?u.armLG:u.armRG).position.x/s),rows=[[.06,.610,.120,.105,-.100],[.15,.590,.150,.115,-.090],[.25,.530,.170,.130,-.065],[.34,.470,.140,.100,-.040],[rootX*.92,.42,.09,.07,-.025]],P=[],I=[],N=24;
  for(const[x,y,rz,ry,cz]of rows)for(let i=0;i<N;i++){const a=i/N*Math.PI*2;P.push(side*x*s,(y+Math.sin(a)*ry)*s,(cz+Math.cos(a)*rz)*s);}
  for(let r=0;r<rows.length-1;r++)for(let i=0;i<N;i++){const a=r*N+i,b=r*N+(i+1)%N;if(side>0)I.push(a,a+N,b,b,a+N,b+N);else I.push(a,b,a+N,b,b+N,a+N);}
  for(const r of [0,rows.length-1]){const c=P.length/3;P.push(side*rows[r][0]*s,rows[r][1]*s,rows[r][4]*s);for(let i=0;i<N;i++){const a=r*N+i,b=r*N+(i+1)%N;const reverse=(r===0)===(side>0);I.push(c,...(reverse?[b,a]:[a,b]));}}
  mesh(u.torso,dry,P,I,'brute neck shoulder and trapezius continuity '+side);
 }
 // Read the actual retained plate triangles in torso space; seat each strap corner on its plate.
 const plateTriangles=[];
 for(const o of u.torso.children)if(o.isMesh&&(o.material===steel||o.material?.userData?.surface==='skin')){o.updateMatrix();const G=o.geometry,P=G.attributes.position,I=G.index;for(let i=0;i<(I?I.count:P.count);i+=3){const tri=[];for(let k=0;k<3;k++){const v=new T.Vector3().fromBufferAttribute(P,I?I.getX(i+k):i+k).applyMatrix4(o.matrix).divideScalar(s);tri.push(v);}plateTriangles.push(tri);}}
 const seat=(x,y,z)=>{const hits=[];for(const[a,b,c]of plateTriangles){const det=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(det)<1e-10)continue;const u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/det,v=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/det;if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001){const hit=u*a.z+v*b.z+(1-u-v)*c.z;if(Math.sign(hit)===Math.sign(z))hits.push(hit);}}return hits.length?(z>0?Math.max(...hits)+.004:Math.min(...hits)-.004):z;};
 const topHeight=(x,z)=>{const hits=[];for(const[a,b,c]of plateTriangles){const det=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(det)<1e-10)continue;const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/det,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/det;if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001)hits.push(u*a.y+v*b.y+(1-u-v)*c.y);}if(!hits.length)throw Error('Unseated brute shoulder harness');return Math.max(...hits)+.004;};
 // Wide closed leather load paths replace the round cord-like harness, fitted over the existing plates.
 for(const m of [...u.torso.children])if(m.isMesh&&m.material===leather)m.removeFromParent();
 for(const side of [-1,1]){
  const path=[[side*.15,.12,.220],[side*.22,.20,.251],[side*.23,.29,.251],[side*.21,.39,.237],[side*.20,.47,.177],[side*.23,topHeight(side*.23,-.035),-.035],[side*.22,.49,-.16],[side*.18,.40,-.214],[side*.18,.27,-.237],[side*.15,.12,-.229]],P=[],I=[],w=.022,t=.004;
  for(let j=0;j<path.length;j++){const[x,y,z]=path[j],prev=path[Math.max(0,j-1)],next=path[Math.min(path.length-1,j+1)],dy=next[1]-prev[1],dz=next[2]-prev[2],len=Math.hypot(dy,dz)||1,ny=dz/len,nz=-dy/len;for(const dx of [-w,w])for(const d of [-t,t])P.push((x+dx)*s,((j===5?topHeight(x+dx,z):y)+ny*d)*s,((j===5?z:seat(x+dx,y,z))+nz*d)*s);}
  for(let j=0;j<path.length-1;j++){const a=j*4,b=a+4;I.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);}
  I.push(0,1,2,1,3,2);const e=P.length/3-4;I.push(e,e+2,e+1,e+1,e+2,e+3);
  mesh(u.torso,leather,P,I,'brute broad load-bearing harness '+side);
  // Blank fasteners: original geometry, no insignia or copied markings.
  for(const [y,x,z]of [[.20,.22,.256],[.39,.21,.242]]){const o=A.put(u.torso,new T.CylinderGeometry(.006*s,.006*s,.004*s,8),steel,side*x,y,seat(side*x,y,z)+.003,Math.PI/2,0,0);o.name='brute harness rivet '+side+' '+y;}
 }
}

// CC-355's stable carved-loft primitive, with brute-specific dimensions. Same joints;
// the existing hand, feet and guard silhouettes remain, continuous tissue meets them.
// Local bounds use the same vertex walk as Three's Box3 convenience method.
// Keep construction compatible with both the native renderer and the test scene graph.
function bruteBounds(T,attribute){
 const box=new T.Box3(),point=new T.Vector3();
 for(let i=0;i<attribute.count;i++)box.expandByPoint(point.fromBufferAttribute(attribute,i));
 return box;
}

function refineBruteLowerLimbs(A,T,g,s,M,dry){
 const u=g.userData;
 // The blank dark placard flattened the curved breastplate into a box.
 for(const o of [...u.torso.children])if(o.isMesh&&o.material?.color?.getHex()===0x424746&&o.material.userData.surface==='leather')o.removeFromParent();
 // One carved thorax carries pectorals, obliques and back masses under the retained plate.
 for(const o of [...u.torso.children])if(o.isMesh&&o.material===M.skin){const P=o.geometry.attributes.position,b=bruteBounds(T,P);if(b.min.y/s<-.075&&b.max.y/s>.50)o.removeFromParent();}
 const thorax=humanoidTube(A,T,s,u.torso,dry,{n:32,sub:2,warp:.14,keys:[{y:-.08,w:.1972,d:.128},{y:.03,w:.2448,d:.160},{y:.17,w:.2924,d:.188},{y:.31,w:.340,d:.200},{y:.42,w:.2992,d:.168},{y:.48,w:.1496,d:.112},{y:.51,w:.064,d:.065}],
  bumps:[{t:.65,y:.28,at:.45,ay:.10,a:.014},{t:-.65,y:.28,at:.45,ay:.10,a:.014},{t:1.15,y:.13,at:.5,ay:.15,a:.008},{t:-1.15,y:.13,at:.5,ay:.15,a:.008},{t:2.6,y:.31,at:.45,ay:.13,a:.008},{t:-2.6,y:.31,at:.45,ay:.13,a:.008},{t:2.39,y:.13,at:.49,ay:.10,a:.017},{t:-2.39,y:.13,at:.49,ay:.10,a:.017},{t:0,y:.28,at:.16,ay:.15,a:-.004}]});
 thorax.meshes.forEach(o=>o.name='brute continuous pectoral oblique and back mass');
 for(const[side,el,shin]of[[-1,u.armLG.userData.elbowG,u.legLG.userData.shinG],[1,u.armRG.userData.elbowG,u.legRG.userData.shinG]]){
  for(const o of [...el.children])if(o.isMesh&&o.material===M.leather)o.removeFromParent();
  for(const bone of[el,shin])for(const o of[...bone.children])if(o.isMesh){
   const b=bruteBounds(T,o.geometry.attributes.position);o.updateMatrix();b.applyMatrix4(o.matrix);const min=b.min.y/s,max=b.max.y/s;
   const foundational=o.material===M.skin&&((bone===el&&min<-.42&&max>.02)||(bone===shin&&min<-.33&&max>.015));
   const pale=o.material?.userData?.surface==='skin'&&o.material.color.getHex()===M.skin.color.clone().lerp(new T.Color(0xe6dfc8),.28).getHex();
   const jointCap=o.material===M.skin&&o.geometry.type==='SphereGeometry'&&Math.abs(o.position.y/s)<.025;
   if(foundational||pale||jointCap)o.removeFromParent();
  }
  const fore=humanoidTube(A,T,s,el,dry,{n:24,sub:2,warp:.18,keys:[
   {y:-.425,w:.0544,d:.0448,cz:.024},{y:-.39,w:.1088,d:.072,cz:.020},{y:-.35,w:.120,d:.080,cz:.020},
   {y:-.308,w:.0832,d:.0784,cz:.012},{y:-.26,w:.088,d:.0928},{y:-.17,w:.1232,d:.112,cz:-.010},
   {y:-.07,w:.114,d:.107},{y:-.017,w:.103,d:.101,cz:-.006},{y:.030,w:.091,d:.097,cz:-.005},{y:.060,w:.082,d:.092}],
   bumps:[{t:side*.8,y:-.10,at:.55,ay:.08,a:.010},{t:-side*.4,y:-.14,at:.4,ay:.07,a:.007},{t:0,y:-.275,at:.3,ay:.04,a:.004},{t:Math.PI,y:.006,at:.4,ay:.025,a:.008}]});
  fore.meshes.forEach(o=>o.name='brute continuous elbow forearm wrist and palm '+side);
  // Fasten the existing curved guard from its sides and back; broad front bars
  // made the entire arm read as stacked rings instead of one forearm.
  for(const y of [-.116,-.22]){
   const points=[];
   for(let i=0;i<=12;i++){
    const q=fore.at(.85+(Math.PI*2-1.7)*i/12,y+.009*Math.sin(i/12*Math.PI));
    points.push(q.p.addScaledVector(q.n,.001).toArray());
   }
   A.path(el,M.leather,points,.005,.004).name='brute rear forearm guard strap '+side+' '+y;
  }
  const vessel=A.mat(M.skin.color.clone().multiplyScalar(.58),false,0,'skin');vessel.userData.zombieColorRole='skin';vessel.userData.zombieColorBase=M.skin.color.getHex();
  const vein=[];for(const[t,y]of[[side*.35,-.045],[side*.45,-.12],[side*.30,-.21],[side*.22,-.28]]){const q=fore.at(t,y);vein.push(q.p.addScaledVector(q.n,.001).toArray());}A.path(el,vessel,vein,.004,.002).name='brute coloured superficial forearm vein '+side;

  const calf=humanoidTube(A,T,s,shin,dry,{n:22,sub:2,warp:.12,keys:[
   {y:-.34,w:.048,d:.051,cz:.010},{y:-.29,w:.054,d:.061,cz:.002},{y:-.23,w:.054,d:.066,cz:-.015},
   {y:-.16,w:.072,d:.080,cz:-.019},{y:-.12,w:.083,d:.085,cz:-.020},{y:-.045,w:.072,d:.074,cz:.002},
   {y:.018,w:.074,d:.078,cz:.005},{y:.059,w:.077,d:.079,cz:.008}],
   bumps:[{t:Math.PI-side*.35,y:-.135,at:.6,ay:.075,a:.006},{t:0,y:-.025,at:.36,ay:.035,a:.004},{t:0,y:-.18,at:.15,ay:.10,a:.003}]});
  calf.meshes.forEach(o=>o.name='brute continuous knee calf tibia and ankle '+side);
 }
}

// Paint belongs to the actual skin triangles. Small nearby colour steps soften
// mottling; pressure bruises sit at the joints, harness and existing upper-arm tears.
function paintBruteSkin(A,T,g,s,M,dry){
 const u=g.userData,materials=new Map(),targets=[];
 const cloth=new T.Color(0x49473f);
 g.traverse(o=>{if(o.isMesh&&(o.material===M.skin||o.material===dry))targets.push(o);});
 for(const o of targets){
  const base=o.material.color,geo=o.geometry.clone(),P=geo.attributes.position;if(!P)continue;
  let material=materials.get(o.material);if(!material){material=A.mat(base.clone(),false,0,'skin');material.vertexColors=true;material.userData.zombieColorRole='skin';material.userData.zombieColorBase=M.skin.color.getHex();materials.set(o.material,material);}
  const bone=o.parent,side=[u.armLG,u.armLG.userData.elbowG,u.legLG,u.legLG.userData.shinG].includes(bone)?-1:1,C=[],bruise=new T.Color(0x514a56);
  const thigh=bone.userData.thigh===o;
  for(let i=0;i<P.count;i++){
   const x=P.getX(i)/s,y=P.getY(i)/s,z=P.getZ(i)/s,cloud=.22*Math.sin(x*13+side*2.3)*Math.sin(y*17+z*9)+.14*Math.sin(x*23-y*11+z*17),joint=Math.exp(-Math.pow((y+.03)/.05,2)),tear=bone===u.armLG||bone===u.armRG?Math.exp(-Math.pow((x-side*.068)/.045,2)-Math.pow((y+.13)/.085,2)):0,headMark=bone===u.head?Math.exp(-Math.pow((x-(-.052-(.07-y)*.20))/.014,2)-Math.pow((y-.07)/.05,2)):0,legMark=bone===u.legLG||bone===u.legRG?Math.exp(-Math.pow((x-side*.045)/.022,2)-Math.pow((y+.21)/.12,2)):0;
   const f=Math.max(0,Math.min(1,.16+cloud*.65+joint*.11+tear*.65+headMark*.55+legMark*.40)),colour=base.clone().lerp(bruise,.38*f).multiplyScalar(1.02-.20*f);
   if(thigh){
    // The close cloth takes the thigh's own surface, with a broken, asymmetric hem.
    const angle=Math.atan2(x,z),fray=Math.sin(angle*4+side)*.016+Math.cos(angle*7-side)*.010;
    const hem=-.113-.040*Math.max(0,Math.cos(angle))+fray;
    const cover=Math.max(0,Math.min(1,(y-hem)/.029));
    colour.lerp(cloth,.94*cover);
   }
   C.push(colour.r/base.r,colour.g/base.g,colour.b/base.b);
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(C,3));o.geometry=geo;o.material=material;
 }
}

// D-201 step1 correction: only the two upper rear harness runs. The accepted
// neck/face/rig stay exact. Sample the FINAL retained back skin/plate surfaces,
// rather than leaving a straight chord buried in the new curved trapezius.
function seatBruteRearHarness(T,g,s,M){
 const torso=g.userData.torso,hosts=[];
 for(const o of torso.children)if(o.isMesh&&(o.material===M.steel||o.material?.userData?.surface==='skin')){
  o.updateMatrix();const P=o.geometry.attributes.position,J=o.geometry.index;
  for(let i=0;i<(J?.count??P.count);i+=3){const v=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(P,J?J.getX(i+k):i+k).applyMatrix4(o.matrix)),tri=new T.Triangle(...v),n=tri.getNormal(new T.Vector3());if(n.lengthSq()>.5)hosts.push({tri,n});}
 }
 if(!hosts.length)throw Error('Final torso support triangles required for rear harness');
 const ray=new T.Ray(),hit=new T.Vector3(),direction=new T.Vector3(0,0,1);
 const back=(x,y)=>{ray.set(new T.Vector3(x,y,-1.5*s),direction);let best=null;for(const h of hosts)if(ray.intersectTriangle(h.tri.a,h.tri.b,h.tri.c,false,hit)&&hit.z<-.015*s&&(!best||hit.z<best.p.z)){const n=h.n.clone();if(n.z>0)n.negate();best={p:hit.clone(),n};}if(!best)throw Error('Rear harness must meet actual final support at '+x+','+y);return best;};
 const straps=torso.children.filter(o=>o.isMesh&&o.name.startsWith('brute broad load-bearing harness '));if(straps.length!==2)throw Error('Exactly two existing rear harness strips required');
 for(const o of straps){
  const old=o.geometry,P=old.attributes.position;if(P.count!==40)throw Error('Original ten-ring harness topology required before local rear fit');
  const V=[],I=[],read=i=>new T.Vector3().fromBufferAttribute(P,i),row=j=>{for(let k=0;k<4;k++)V.push(...read(j*4+k).toArray());};
  for(let j=0;j<=5;j++)row(j); // front and crest unchanged
  // Seven intermediate rings plus the existing back-plate entry replace only
  // the old two straight rear spans; both width edges sit on real support.
  for(let j=1;j<=8;j++)for(const edge of[0,2]){
   const a=read(5*4+edge+1),b=read(7*4+edge+1),t=j/8,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,q=back(x,y),outer=q.p.clone().addScaledVector(q.n,.008*s);
   V.push(...outer.toArray(),...q.p.toArray());
  }
  for(const r of [8,9])for(const edge of [0,2]){
   const p=read(r*4+edge+1),q=back(p.x,p.y),outer=q.p.clone().addScaledVector(q.n,.006*s);
   V.push(...outer.toArray(),...q.p.toArray());
  }
  const rows=V.length/12;if(rows!==16)throw Error('Sixteen supported harness rings required');
  for(let j=0;j<rows-1;j++){const a=j*4,b=a+4;I.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);}
  I.push(0,1,2,1,3,2);const e=V.length/3-4;I.push(e,e+2,e+1,e+1,e+2,e+3);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(V,3));geo.setIndex(I);geo.computeVertexNormals();o.geometry=geo;old.dispose();
 }
}
