import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-275'];
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
cam('start', '--match');
console.log(cam('eval', "const m=T.getMarine(); const out={mrot:m.rotation.y, par:m.parent&&m.parent.rotation.y, parname:m.parent&&m.parent.name, aim:T.aimSafetyDbg&&T.aimSafetyDbg(), at:T.aimTarget&&[T.aimTarget.x,T.aimTarget.z], mp:[m.position.x,m.position.z], keys:Object.keys(T).filter(k=>/aim|yaw|face|player|turn/i.test(k))}; return 'X'+JSON.stringify(out)+'Y';").split('\n').slice(-3).join('\n'));
cam('stop');