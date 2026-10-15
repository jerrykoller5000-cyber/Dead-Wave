import {bakeStatic} from '../world/bake.js';
// A serviceable steel instrument cabinet, batched by material for the training room.
export function buildRangeControlModel(T,g,labels,owned){
 const keep=o=>(owned.push(o),o),materials=[];
 const standard=p=>{const m=keep(new T.MeshStandardMaterial(p));materials.push(m);return m;};
 const olive=standard({color:0x566158,roughness:.84,metalness:.35}),dark=standard({color:0x141b18,roughness:.7,metalness:.2}),steel=standard({color:0x818a80,roughness:.6,metalness:.68}),yellow=standard({color:0xc1a13b,roughness:.72,metalness:.2});
 const ready=keep(new T.MeshBasicMaterial({color:0x75c5a0}));materials.push(ready);
 const box=(w,h,d,mat,x,y,z)=>{const m=new T.Mesh(keep(new T.BoxGeometry(w,h,d)),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
 const cylinder=(r,d,mat,x,y,z,n=8)=>{const m=new T.Mesh(keep(new T.CylinderGeometry(r,r,d,n)),mat);m.rotation.x=Math.PI/2;m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
 // Cut corners read as a stamped housing instead of a flat poster.
 const corners=[[-.6,-.575],[.6,-.575],[.675,-.5],[.675,.5],[.6,.575],[-.6,.575],[-.675,.5],[-.675,-.5]],p=[];
 const tri=(a,b,c)=>p.push(...a,...b,...c);
 for(let i=0;i<8;i++){const a=corners[i],b=corners[(i+1)%8];tri([0,0,.075],[...a,.075],[...b,.075]);tri([0,0,-.11],[...b,-.11],[...a,-.11]);tri([...a,-.11],[...b,-.11],[...b,.075]);tri([...a,-.11],[...b,.075],[...a,.075]);}
 const shellGeo=keep(new T.BufferGeometry());shellGeo.setAttribute('position',new T.Float32BufferAttribute(p,3));shellGeo.computeVertexNormals();const shell=new T.Mesh(shellGeo,olive);shell.castShadow=true;shell.receiveShadow=true;g.add(shell);
 // Rubber corner guards, exposed fasteners, side vents and short mounting straps.
 for(const x of [-.605,.605])for(const y of [-.49,.49]){box(.12,.13,.075,dark,x,y,.05);cylinder(.024,.015,steel,x,y,.1);box(.027,.005,.003,dark,x,y,.109);}
 for(const x of [-.63,.63])for(let i=0;i<5;i++)box(.045,.017,.01,dark,x,.09+i*.045,.081);
 for(const y of [-.46,.46])box(.11,.2,.025,steel,0,y,-.113);
 box(1.09,.705,.036,dark,0,.125,.091);
 for(const x of [-.527,.527])box(.018,.64,.02,steel,x,.125,.117);
 for(const y of [-.196,.446])box(1.07,.018,.02,steel,0,y,.117);
 // One atlas carries the inset display and the lane numbers beneath real push buttons.
 const cv=document.createElement('canvas');cv.width=512;cv.height=320;const c=cv.getContext('2d');c.fillStyle='#081b16';c.fillRect(0,0,512,320);
 c.strokeStyle='#17352b';c.lineWidth=1;for(let y=10;y<286;y+=10){c.beginPath();c.moveTo(0,y);c.lineTo(512,y);c.stroke();}
 c.textAlign='center';c.fillStyle='#e0c65e';c.font='bold 44px monospace';c.fillText(labels.title,256,58);c.font='bold 25px monospace';c.fillStyle='#86c7a4';c.fillText(labels.subtitle,256,96);
 c.strokeStyle='#579c7a';c.lineWidth=3;for(let i=0;i<5;i++){const x=60+i*98;c.beginPath();c.arc(x,163,14,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(x,187);c.lineTo(x,234);c.stroke();c.fillStyle='#b5cda8';c.fillRect(x-21,238,42,5);}
 c.fillStyle='#cfdbc8';c.font='bold 25px monospace';for(let i=0;i<5;i++)c.fillText(String(i+1),60+i*98,313);
 const tex=keep(new T.CanvasTexture(cv));tex.colorSpace=T.SRGBColorSpace;const screen=keep(new T.MeshBasicMaterial({map:tex}));materials.push(screen);
 const plane=(w,h,y,lo,hi)=>{const geo=keep(new T.PlaneGeometry(w,h)),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i),lo+uv.getY(i)*(hi-lo));const m=new T.Mesh(geo,screen);m.position.set(0,y,.119);g.add(m);};
 plane(1.025,.61,.125,.1,1);plane(1.025,.06,-.477,0,.1);
 box(1.13,.205,.022,dark,0,-.35,.086);
 for(let i=0;i<5;i++){const x=-.392+i*.196;box(.139,.125,.015,steel,x,-.35,.104);cylinder(.045,.027,i%2?olive:yellow,x,-.35,.126);box(.019,.006,.005,dark,x,-.35,.143);}
 // A status lamp and protective top/bottom lips finish the enclosure.
 box(.13,.052,.03,dark,.49,.515,.096);box(.072,.02,.012,ready,.49,.515,.117);
 box(1.12,.038,.045,steel,0,.554,.083);box(1.12,.043,.06,dark,0,-.55,.088);
 for(const x of [-.49,.49]){box(.085,.022,.008,yellow,x,.507,.08);box(.062,.012,.007,steel,x,-.516,.081);}
 // Fine deterministic edge scuffs: no extra textures or changing world randomness.
 for(let i=0;i<9;i++)box(.025+(i%3)*.014,.006,.004,steel,-.53+i*.127,.524+(i%2)*.009,.079);
 // Keep the blend shader compiled from creation; cutaways change only opacity/depth state.
 for(const m of materials)m.transparent=true;
 bakeStatic(T,g);g.traverse(o=>{if(o.geometry&&o.userData.baked)keep(o.geometry);});
 return {materials,halfWidth:.675,halfHeight:.575,back:-.126,front:.15};
}
