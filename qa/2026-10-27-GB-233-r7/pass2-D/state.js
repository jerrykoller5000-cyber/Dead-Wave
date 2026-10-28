return {a:T.trainingDbg.alive(),zs:T.zombies.filter(z=>z.alive).map(z=>[z.typeKey,Math.round(z.hp),+z.mesh.position.z.toFixed(1)])};
