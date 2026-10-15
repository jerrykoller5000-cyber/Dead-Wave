import fs from 'node:fs';const file='index.html',src=fs.readFileSync(file,'utf8');let s=src;const edit=(a,b)=>{if(!s.includes(a))throw Error(a.slice(0,100));s=s.replace(a,b);};
edit('    let diveGripSetR=false,diveGripSetL=false;','    let diveGripSetR=false,diveGripSetL=false,diveSideHoldR=false;');
edit(`      const torso=arm.parent;torso.worldToLocal(_diveGripLocal.copy(anchor));
      clearDiveGrip(_diveGripLocal,arm.position,diveFlatW,_diveGripLocal,akimboOn()?(left?-1:1):0);`, `      const torso=arm.parent;torso.getWorldQuaternion(_diveAimQ);
      const sideClear=_diveAimLocal.set(0,0,1).applyQuaternion(_diveAimQ).y<-.5;
      if(!left)diveSideHoldR=sideClear;
      torso.worldToLocal(_diveGripLocal.copy(anchor));const side=sideClear||akimboOn()?(left?-1:1):0;
      clearDiveGrip(_diveGripLocal,arm.position,diveFlatW,_diveGripLocal,side,sideClear);`);
edit('clearDiveGrip(last,arm.position,diveFlatW,last,akimboOn()?(left?-1:1):0);','clearDiveGrip(last,arm.position,diveFlatW,last,side,sideClear);');
edit('      torso.localToWorld(anchor.copy(last));','      torso.localToWorld(anchor.copy(last));\n      if(sideClear)anchor.y=Math.max(anchor.y,localPlayer.position.y+.27*diveFlatW);');
edit('      if(!diving()){diveGripSetR=false;diveGripSetL=false;}','      diveSideHoldR=false;\n      if(!diving()){diveGripSetR=false;diveGripSetL=false;}');
edit('      const wantL = on && knifeAnimT <= 0 ? 1 : 0;',`      const wantL = on && knifeAnimT <= 0 && !diveSideHoldR ? 1 : 0;
      if(diveSideHoldR){
        holdWL += (0-holdWL)*_lerpK(16,dt);
        if(knifeAnimT<=0){
          torso.localToWorld(_divePalm.set(-.38,.18+Math.sin(dive.real*6)*.025,.20));
          _divePalm.y=Math.max(_divePalm.y,localPlayer.position.y+.13);
          solveArmIK(armL,ud.elbowLG,_HAND_L,_divePalm,_POLE_L,1);
        }
        return;
      }`);
if(fs.readFileSync(file,'utf8')!==src)throw Error('source changed');fs.writeFileSync(file,s);console.log('Forward floor-safe side hold and balancing free arm');
