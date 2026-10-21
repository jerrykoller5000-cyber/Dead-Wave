import fs from 'node:fs';
const p='review/range-barrier-GP19907/';let s=fs.readFileSync(p+'verify.mjs','utf8');
s=s.slice(0,s.indexOf(' proof.console='))+`
proof.grenades=[];
for(const z of [-640.61,-642.5]){
const r=await E.ev("T.rangeDbg.exit();__S.x=0;__S.z="+z+";T.player.position.set(0,-200,__S.z);T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));__target.set(0,-198.4,-632);__step(90);T.setGrenadesDbg(4);T.startGrenadeCharge();__step(12);const arc=T.grenadeArcDbg();T.releaseGrenadeCharge();let maxZ=-Infinity,crossed=false;for(let j=0;j<100;j++){__step(1);for(const g of T.grenadesInFlight){maxZ=Math.max(maxZ,g.pos.z);if(g.pos.z>-639.18)crossed=true;}}return {z:"+z+",arc,crossed,maxZ,last:T.grenadeArcDbg().last};");proof.grenades.push(r);console.log(JSON.stringify(r));assert(r.crossed,'a short hand throw passes the shooting slot');
}
proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
}finally{fs.writeFileSync(dir+'/grenade-proof.json',JSON.stringify(proof,null,2));await E.close();}process.exit(0);
`;
fs.writeFileSync(p+'grenade-check.mjs',s);
