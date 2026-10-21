import fs from 'node:fs';const file='index.html',src=fs.readFileSync(file,'utf8');let s=src;const edit=(a,b)=>{if(!s.includes(a))throw Error(a.slice(0,100));s=s.replace(a,b);};
edit('    function poseDiveBrace(){',`    function clearWallDiveGrip(anchor,gun,H,arm,left=false){
      if(!diving()||diveFlatW<.5||reloading||H.level)return false;
      arm.parent.worldToLocal(_diveGripLocal.copy(anchor));
      // Wall tuck must not undo chest clearance. Move the whole grip outside the
      // shoulder before aiming/tucking again, keeping the barrel on this side of the wall.
      if(_diveGripLocal.z>=.34||Math.abs(_diveGripLocal.x)>=.31||_diveGripLocal.y>.70)return false;
      clearDiveGrip(_diveGripLocal,arm.position,1,_diveGripLocal,left?-1:1,true);
      arm.parent.localToWorld(anchor.copy(_diveGripLocal));
      anchor.y=Math.max(anchor.y,localPlayer.position.y+.27*diveFlatW);
      if(!left)diveSideHoldR=true;return true;
    }
    function poseDiveBrace(){`);
edit('        tuckDiveGrip(anchor,gun,H,_hq.gun);',`        tuckDiveGrip(anchor,gun,H,_hq.gun);
        if(clearWallDiveGrip(anchor,gun,H,armR)){aimGun();tuckDiveGrip(anchor,gun,H,_hq.gun);}`);
// The off-hand shares the same aim orientation; the small lateral move keeps the
// gun on its side without changing its trigger/magazine selection.
edit('          tuckDiveGrip(anchorL,offGun,H,_hq.gun);','          tuckDiveGrip(anchorL,offGun,H,_hq.gun);\n          if(clearWallDiveGrip(anchorL,offGun,H,armL,true))tuckDiveGrip(anchorL,offGun,H,_hq.gun);');
if(fs.readFileSync(file,'utf8')!==src)throw Error('source changed');fs.writeFileSync(file,s);console.log('Wall tuck retains outboard body clearance');
