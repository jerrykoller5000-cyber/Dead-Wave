// GP-111: a hand-repaired, iron-lined cellar entrance. Static visual details only.
export function cellar(T){
 const g=new T.Group();g.name='cellar-hatch';const parts=[];
 const P={wood:0x65583e,old:0x514936,patch:0x8a7755,iron:0x3b403a,rust:0x795438,stone:0x747267,soil:0x5b5540,dark:0x292e27};
 const add=(geo,c,x,y,z,rx=0,ry=0,rz=0)=>{const m=new T.Mesh(geo);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.updateMatrix();parts.push({m,c});return m;};
 const box=(w,h,d,c,x,y,z,ry=0)=>add(new T.BoxGeometry(w,h,d),c,x,y,z,0,ry);
 const ring=(r,t,c,x,y,z,rx=0,ry=0,rz=0,arc=Math.PI*2)=>add(new T.TorusGeometry(r,t,4,16,arc),c,x,y,z,rx,ry,rz);
 const nail=(x,y,z)=>add(new T.CylinderGeometry(.016,.018,.014,6),P.iron,x,y,z);
 // Stone collar and packed earth stay shallow and entirely above unmodified terrain.
 box(1.42,.08,1.3,P.soil,0,.035,0);
 for(const s of [-1,1]){
  for(let k=0;k<4;k++)box(.23,.13,.295,k%2?P.stone:0x66685d,s*.64,.09,-.46+k*.305,(k%2-.5)*.045);
  for(let k=0;k<4;k++)box(.276,.12,.18,k%2?P.stone:0x66685d,-.44+k*.293,.085,s*.6);
  box(.045,.16,1.11,P.iron,s*.52,.17,0);
  box(1.08,.16,.045,P.iron,0,.17,s*.52);
  // Riveted edge of the continuous iron liner, visible around the wooden lid.
  for(let k=0;k<4;k++){nail(s*.55,.258,-.39+k*.26);nail(-.39+k*.26,.258,s*.55);}
 }
 box(1.04,.035,1.04,P.dark,0,.203,0);
 for(let k=0;k<5;k++){
  const x=-.407+k*.204;box(.193,.075,1.005,k%2?P.old:P.wood,x,.25,0);
  for(let j=0;j<3;j++)box(.008,.002,.1+j*.044,0x3e3b2d,x-.054+j*.047,.289,-.38+j*.27+(k%3)*.055);
 }
 for(const z of [-.32,.32]){
  box(1.045,.027,.1,P.iron,0,.302,z);
  for(const x of [-.44,-.22,0,.22,.44])nail(x,.322,z);
  box(.14,.008,.084,P.rust,.32,.321,z);
 }
 // Replaced corner and short reinforcing strap: the repairs are deliberately mismatched.
 box(.17,.022,.36,P.patch,.32,.299,.04,-.05);
 for(const z of [-.1,.17])nail(.32,.319,z);
 box(.31,.02,.052,P.iron,.34,.326,.05,.3);
 for(const x of [-.32,.32]){
  box(.12,.022,.2,P.iron,x,.31,-.48);
  add(new T.CylinderGeometry(.032,.032,.18,8),P.iron,x,.334,-.54,0,0,Math.PI/2);
  nail(x,.329,-.43);
 }
 box(.16,.014,.16,0x76664a,-.05,.295,.08);
 box(.07,.018,.065,P.iron,-.05,.312,.08);
 box(.048,.045,.09,P.iron,-.05,.323,.035); // Ring eyelet, attached to its mounting plate.
 const handle=new T.Mesh(new T.TorusGeometry(.092,.017,5,16),new T.MeshStandardMaterial({color:P.iron,roughness:.76,metalness:.35}));
 handle.name='cellar-ring';handle.rotation.x=Math.PI*.32;handle.position.set(-.05,.39,.095);handle.castShadow=true;g.add(handle);
 // Repeated scratches fan from the lifting ring; old nail holes remain at a former hinge.
 for(let k=0;k<4;k++)box(.006,.002,.105,P.patch,-.16+k*.027,.289,.17+(k%2)*.023,-.2+k*.1);
 for(const x of [-.4,-.33])box(.018,.003,.018,P.dark,x,.29,-.43);
 // A horseshoe nailed to the stone head of the hatch repeats the cabin's precaution.
 ring(.092,.018,P.iron,0,.17,-.605,-Math.PI/2,0,Math.PI*.75,Math.PI*1.5);
 // Thin flattened debris and worn stepping stones suggest the short daily route.
 for(const [x,z,a]of [[-.24,.76,.1],[.17,.79,-.09]])box(.3,.045,.22,P.stone,x,.025,z,a);
 for(let k=0;k<3;k++)box(.035,.018,.16,P.old,-.64+k*.055,.025,.64,-.4+k*.2);
 const pos=[],norm=[],col=[];
 for(const {m,c}of parts){const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);geo.computeVertexNormals();const p=geo.attributes.position.array,n=geo.attributes.normal.array,color=new T.Color(c);for(let i=0;i<p.length;i++)pos.push(p[i]);for(let i=0;i<n.length;i++)norm.push(n[i]);for(let i=0;i<p.length/3;i++)col.push(color.r,color.g,color.b);geo.dispose();m.geometry.dispose();}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.computeBoundingBox();geo.computeBoundingSphere();
 const body=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.93,metalness:.08}));body.name='cellar-lining-and-lid';body.castShadow=true;body.receiveShadow=true;g.add(body);
 g.userData.seatHistoryTerrain=height=>{
  if(g.userData.terrainSeated)return;g.userData.terrainSeated=true;const c=Math.cos(g.rotation.y),s=Math.sin(g.rotation.y),base=height(g.position.x,g.position.z);
  const dy=(x,z)=>height(g.position.x+c*x+s*z,g.position.z-s*x+c*z)-base;
  const a=geo.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i);a.setY(i,a.getY(i)+dy(x,z));}a.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();handle.position.y+=dy(handle.position.x,handle.position.z);
 };
 return g;
}
