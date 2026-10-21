import fs from 'node:fs';const file='index.html',src=fs.readFileSync(file,'utf8');let s=src;const edit=(a,b)=>{if(!s.includes(a))throw Error(a.slice(0,100));s=s.replace(a,b);};
edit('      const q=constrainDiveBody(playerFrameStart,p,dive.dirX,dive.dirZ,lie.flat,lie.hip,S);',`      // An extended pistol/Uzi needs space as well as the torso. Reserve its reach
      // before posing the arms; wall tuck alone must not compress a gun into the vest.
      const gunMargin=!unarmed&&['pistol','revolver','uzi'].includes(currentWeapon)? .36*lie.flat:0;
      if(gunMargin>0)for(let i=0;i<S.length;i++){
        const s=S[i];S[i]=s.radius!=null?{...s,radius:s.radius+gunMargin}:{...s,minX:s.minX-gunMargin,maxX:s.maxX+gunMargin,minZ:s.minZ-gunMargin,maxZ:s.maxZ+gunMargin};
      }
      const q=constrainDiveBody(playerFrameStart,p,dive.dirX,dive.dirZ,lie.flat,lie.hip,S);`);
edit('resolveHardBuildCollisions(x,z,.29,true,p.y+lie.hip-.29);q=resolveStaticProps(q.x,q.z,.29,p.y+lie.hip-.29);','resolveHardBuildCollisions(x,z,.29+gunMargin,true,p.y+lie.hip-.29);q=resolveStaticProps(q.x,q.z,.29+gunMargin,p.y+lie.hip-.29);');
edit('pushOutOfHouse(q.x,q.z,.29);','pushOutOfHouse(q.x,q.z,.29+gunMargin);');
if(fs.readFileSync(file,'utf8')!==src)throw Error('source changed');fs.writeFileSync(file,s);console.log('Armed dive collision reserves pistol reach before posing');
