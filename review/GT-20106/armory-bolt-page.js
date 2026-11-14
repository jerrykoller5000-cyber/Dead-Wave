(async()=>{
const T=TT,G=T.THREE,H=T.inspectHost(),tg=T.trainingDbg.tg(),bolts=tg.group.getObjectByName('armory-frame-bolts'),arm=bolts?.parent,surround=arm?.getObjectByName('armory-wall-surround');
if(!bolts?.isInstancedMesh||!surround)throw Error('native instanced bolt/frame missing');
tg.group.updateMatrixWorld(true);bolts.geometry.computeBoundingBox();const proto=bolts.geometry.boundingBox,m=new G.Matrix4(),world=new G.Matrix4(),scale=arm.getWorldScale(new G.Vector3()).x,rows=[];
for(let i=0;i<bolts.count;i++){bolts.getMatrixAt(i,m);world.multiplyMatrices(bolts.matrixWorld,m);const b=proto.clone().applyMatrix4(world),centre=new G.Vector3().setFromMatrixPosition(m),back=centre.clone().applyMatrix4(bolts.matrixWorld),direction=new G.Vector3(0,0,-1).transformDirection(bolts.matrixWorld),hits=new G.Raycaster(back,direction,0,1).intersectObject(surround);
rows.push({i,centre:centre.toArray(),worldMin:b.min.toArray(),worldMax:b.max.toArray(),aboveFloor:b.min.y-tg.floorY,gapWorld:hits[0]?hits[0].distance-.009*scale:null,gapArmory:hits[0]?hits[0].distance/scale-.009:null});}
const centre=new G.Vector3(-1.39,1.25,.885),eye=centre.clone().add(new G.Vector3(.24,.03,.12)).applyMatrix4(arm.matrixWorld),target=centre.clone().applyMatrix4(arm.matrixWorld);
T.setUnarmedDbg(true);T.setViewFirstDbg(false);T.flightHold(true);T.player.visible=false;T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:35});for(let i=0;i<3;i++)T.stepFrame(1/60);H.attach({held:()=>true,scale:dt=>dt,frame:()=>{}});
H.camera.position.copy(eye);H.camera.lookAt(target);H.camera.fov=35;H.camera.updateProjectionMatrix();const taskLight=new G.PointLight(0xffffff,.25,2,2);taskLight.position.copy(eye);taskLight.name='GT20106 inspection task light';H.scene.add(taskLight);const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);window.boltReview={H,T,G,eye,target};
return{taskLight:.25,count:bolts.count,scale,rows,prototype:proto.min.toArray(),floor:tg.floorY,camera:{p:H.camera.position.toArray(),q:H.camera.quaternion.toArray(),fov:H.camera.fov}};
})()
