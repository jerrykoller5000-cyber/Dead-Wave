import fs from 'node:fs';const file='index.html',src=fs.readFileSync(file,'utf8');let s=src;const edit=(a,b)=>{if(!s.includes(a)&&s.includes(a.replaceAll('\n','\r\n'))){a=a.replaceAll('\n','\r\n');b=b.replaceAll('\n','\r\n');}if(!s.includes(a))throw Error(a.slice(0,100));s=s.replace(a,b);};
edit('      if(hit.surface&&hit.len<L)origin.addScaledVector(_diveGunDir,-(L-hit.len+.035));',`      if(hit.surface&&hit.len<L){
        const pull=L-hit.len+.035;
        // Keep the safe arm/body pose intact: the shooter's whole envelope backs
        // away from the obstruction instead of pushing the pistol into his vest.
        localPlayer.position.addScaledVector(_diveGunDir,-pull);
        origin.addScaledVector(_diveGunDir,-pull);player.updateMatrixWorld(true);
        stopDiveIntoContact(dive,-_diveGunDir.x,-_diveGunDir.z);velX=dive.vx;velZ=dive.vz;
      }`);
edit(`      // An extended pistol/Uzi needs space as well as the torso. Reserve its reach
      // before posing the arms; wall tuck alone must not compress a gun into the vest.
      const gunMargin=!unarmed&&['pistol','revolver','uzi'].includes(currentWeapon)? .36*lie.flat:0;
      if(gunMargin>0)for(let i=0;i<S.length;i++){
        const s=S[i];S[i]=s.radius!=null?{...s,radius:s.radius+gunMargin}:{...s,minX:s.minX-gunMargin,maxX:s.maxX+gunMargin,minZ:s.minZ-gunMargin,maxZ:s.maxZ+gunMargin};
      }
`, '');
edit('resolveHardBuildCollisions(x,z,.29+gunMargin,true,p.y+lie.hip-.29);q=resolveStaticProps(q.x,q.z,.29+gunMargin,p.y+lie.hip-.29);','resolveHardBuildCollisions(x,z,.29,true,p.y+lie.hip-.29);q=resolveStaticProps(q.x,q.z,.29,p.y+lie.hip-.29);');
edit('pushOutOfHouse(q.x,q.z,.29+gunMargin);','pushOutOfHouse(q.x,q.z,.29);');
const start=s.indexOf('    function clearWallDiveGrip('),end=s.indexOf('    function poseDiveBrace(){',start);if(start<0||end<0)throw Error('wall helper missing');s=s.slice(0,start)+s.slice(end);
edit('        if(clearWallDiveGrip(anchor,gun,H,armR)){aimGun();tuckDiveGrip(anchor,gun,H,_hq.gun);}\n','');
edit('          if(clearWallDiveGrip(anchorL,offGun,H,armL,true))tuckDiveGrip(anchorL,offGun,H,_hq.gun);\n','');
if(fs.readFileSync(file,'utf8')!==src)throw Error('source changed');fs.writeFileSync(file,s);console.log('Wall clearance moves the whole shooter; safe joint pose retained');
