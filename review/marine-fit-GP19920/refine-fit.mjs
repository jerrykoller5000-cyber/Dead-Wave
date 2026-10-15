import fs from 'node:fs';
function edit(file,fn){const before=fs.readFileSync(file,'utf8');let s=before.replaceAll('\r\n','\n');const r=(a,b)=>{if(s.split(a).length!==2)throw Error(file+': '+a);s=s.replace(a,b);};fn(r);if(fs.readFileSync(file,'utf8')!==before)throw Error('concurrent edit');fs.writeFileSync(file,s.replaceAll('\n',before.includes('\r\n')?'\r\n':'\n'));}
edit('studio/marine-turn.js',r=>r('marine.position.y -= .018 - .01 * crouch;','// GP-19920: a stationary turn should not impose a permanent half squat.\n    // Keep the crouched turn clearance and the actual reach-based sink below.\n    marine.position.y -= .008 * crouch;'));
edit('studio/marine-body.js',r=>{
 r("[-.185,.0345,.0345,ox,oz],[-.215,.0305,.0275,ox,oz],[-.227,.03,.026,ox,oz]].reverse()","[-.18,.037,.036,ox,oz]].reverse()");
 r('dress.sleeveRolled.push(transition);','bare.add(transition);');
 r('const legG=new T.Group();legG.position.set(side*.13,.62,0);lowerBody.add(legG);',`const legG=new T.Group();legG.position.set(side*.13,.62,0);lowerBody.add(legG);
    // A thigh mount and retention band support the hollow carry holster.
    put(legG,rmesh(.012,.105,.082,holsterW,.004),side*.108,-.083,.035);
    put(legG,form([[-.008,.101,.113],[.008,.101,.113]],strapMat,'holster-thigh-band',16,'high'),0,-.11,.012);`);
});
edit('studio/marine-idle.js',r=>{
 r('const smokePose=', 'const twistQ=new THREE.Quaternion(),axis=new THREE.Vector3();\n  const smokePose=');
 r("u.elbowRG.getWorldQuaternion(parentQ);wr.quaternion.copy(parentQ.invert()).multiply(handQ);",`// Roll the forearm around the solved wrist line before asking the wrist to
    // bend. Rolling preserves contact; putting all this twist in the wrist did not.
    u.elbowRG.getWorldQuaternion(parentQ);wr.quaternion.copy(parentQ.invert()).multiply(handQ);
    axis.copy(wr.position).normalize();
    const projection=wr.quaternion.x*axis.x+wr.quaternion.y*axis.y+wr.quaternion.z*axis.z;
    let angle=2*Math.atan2(projection,wr.quaternion.w);angle=Math.atan2(Math.sin(angle),Math.cos(angle));
    twistQ.setFromAxisAngle(axis,Math.max(-1.7,Math.min(1.7,angle)));
    u.elbowRG.quaternion.multiply(twistQ);u.elbowRG.updateWorldMatrix(true,false);
    u.elbowRG.getWorldQuaternion(parentQ);wr.quaternion.copy(parentQ.invert()).multiply(handQ);`);
 r("mouth.set(.025, .114, .171)","mouth.set(.025, .125, .171)");
});
