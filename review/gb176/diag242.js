{ const THREE=T.THREE, gun=T.weaponMeshes.pistol, ud=gun.userData;
T.addCash(99999); try{ if(!T.weaponMods('pistol').ext) T.buyExtMag('pistol'); }catch(e){}
T.armoryDbg.fit('pistol','ext',true); await wait(50);
const cz=-0.02,cy=-0.08,h=0.18,d=0.074,rake=0.25,sr=Math.sin(rake),cr=Math.cos(rake),k=d/0.08;
const P=[[-0.04,0.016],[0.10,0.024],[0.28,0.020],[0.48,0.026],[0.72,0.022],[0.92,0.016],[1.00,0.004],[1.00,-0.014],[0.86,-0.028],[0.55,-0.030],[0.28,-0.026],[0.08,-0.040],[-0.02,-0.048],[-0.06,-0.016]];
const poly=P.map(([u,v])=>{const uu=(u-0.5)*h,vv=v*k;return [cz-uu*sr+vv*cr,cy-uu*cr-vv*sr];});
const uv=(z,y)=>{const dz=z-cz,dy=y-cy;return [-(dz*sr+dy*cr)/h+0.5,(dz*cr-dy*sr)/k];};
const inside=(z,y)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [zi,yi]=poly[i],[zj,yj]=poly[j];if((yi>y)!==(yj>y)&&z<(zj-zi)*(y-yi)/(yj-yi)+zi)c=!c;}return c;};
const edge=(z,y)=>{let m=1e9;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [ax,ay]=poly[j],[bx,by]=poly[i],ex=bx-ax,ey=by-ay,t=Math.max(0,Math.min(1,((z-ax)*ex+(y-ay)*ey)/(ex*ex+ey*ey)));m=Math.min(m,Math.hypot(z-ax-t*ex,y-ay-t*ey));}return m;};
const RR=0.008,HW=0.023,halfW=(m)=>HW-(m>=RR?0:RR-Math.sqrt(RR*RR-(RR-m)*(RR-m)));
gun.updateMatrixWorld(true); const inv=new THREE.Matrix4().copy(gun.matrixWorld).invert(), v=new THREE.Vector3();
let worst=-1e9,info='';
ud.mag.traverse(o=>{ if(!o.isMesh||o.visible===false) return; const m=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld),p=o.geometry.attributes.position;
 for(let i=0;i<p.count;i++){ v.set(p.getX(i),p.getY(i),p.getZ(i)).applyMatrix4(m); const [u,vv]=uv(v.z,v.y); if(u>0.985) continue;
  const mm=inside(v.z,v.y)?edge(v.z,v.y):-edge(v.z,v.y); const a=0.001-mm, b=Math.abs(v.x)-(halfW(Math.max(0,mm))-0.0005);
  if(Math.max(a,b)>worst){worst=Math.max(a,b);info=`u ${u.toFixed(3)} v ${vv.toFixed(4)} x ${v.x.toFixed(4)} y ${v.y.toFixed(4)} z ${v.z.toFixed(4)} out ${a.toFixed(4)} side ${b.toFixed(4)} m ${mm.toFixed(4)}`;} } });
return 'worst '+worst.toFixed(4)+' '+info+' | stretch '+ud.magStretch.scale.y+' magpos '+ud.mag.position.toArray().map(x=>x.toFixed(4));
 }
