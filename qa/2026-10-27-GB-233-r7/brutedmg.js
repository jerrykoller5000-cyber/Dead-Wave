T.clearZombies && T.clearZombies();
const z = T.spawnZombie(-35, -630, 'brute', true, true); const hp0 = z.hp; let err = null;
try { T.damageZombie(z, 50, { kind: 'explosive', dir: { x: 1, z: 0 }, defense: true }); } catch (e) { err = String(e && e.stack || e).slice(0, 600); }
const hp1 = z.hp; let err2 = null;
try { T.damageZombie(z, 20, { kind: 'bullet', dir: { x: 1, z: 0 } }); } catch (e) { err2 = String(e).slice(0, 300); }
return { hp0, hp1, hp2: z.hp, err, err2, armor: z.mesh.userData.bruteArmor };
