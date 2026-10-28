const D=T.trainingDbg;return {a:D.alive(),zs:T.zombies.filter(z=>z.alive).map(z=>[z.typeKey,+z.mesh.position.x.toFixed(1),+z.mesh.position.z.toFixed(1),z.attackCd>0?1:0])};
