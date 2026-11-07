// qa/2026-11-07-GB-311/fit-fp-support.mjs — curl FP support fingers against shotgun pump (GB-153 method in viewmodel)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'fit');
fs.mkdirSync(OUT, { recursive: true });
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
let code = 0;
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);
  await page.evaluate(`(async () => {
    const T = TT; await startMatch(T, 'GB311fit'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
    T.setWorldTime?.(0.42);
    for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'shotgun'; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun')); await new Promise((r) => setTimeout(r, 150));
    }
    T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
    T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4000)); return 1;
  })()`, 600000);

  // Inject a FP finger-fit against the pump mesh using viewmodel left hand
  const result = await page.evaluate(`(async () => {
    const T = TT, THREE = T.THREE, v = T.viewmodelDbg();
    if (!v || !v.arms || !v.arms.l || !v.arms.l.rig) return { err: 'no left rig' };
    const gun = T.weaponMeshes.shotgun, pump = gun.userData.pump;
    gun.updateMatrixWorld(true);
    // Collect pump world triangles near the support contact
    const tris = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();
    pump.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      o.updateMatrixWorld(true);
      const P = o.geometry.attributes.position, I = o.geometry.index, N = I ? I.count : P.count, mw = o.matrixWorld;
      for (let k = 0; k + 2 < N; k += 3) {
        const i0 = I ? I.getX(k) : k, i1 = I ? I.getX(k + 1) : k + 1, i2 = I ? I.getX(k + 2) : k + 2;
        a.fromBufferAttribute(P, i0).applyMatrix4(mw);
        b.fromBufferAttribute(P, i1).applyMatrix4(mw);
        d.fromBufferAttribute(P, i2).applyMatrix4(mw);
        n.crossVectors(e1.subVectors(b, a), e2.subVectors(d, a));
        const L = n.length(); if (L < 1e-12) continue; n.divideScalar(L);
        tris.push([a.x,a.y,a.z,b.x,b.y,b.z,d.x,d.y,d.z,n.x,n.y,n.z]);
      }
    });
    // Closest signed distance (Ericson-ish, same as fit-page)
    function sd(px,py,pz,t){
      const ax=t[0],ay=t[1],az=t[2],abx=t[3]-ax,aby=t[4]-ay,abz=t[5]-az,acx=t[6]-ax,acy=t[7]-ay,acz=t[8]-az;
      const apx=px-ax,apy=py-ay,apz=pz-az,d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;
      let qx,qy,qz;
      if(d1<=0&&d2<=0){qx=ax;qy=ay;qz=az;}
      else{
        const bpx=px-t[3],bpy=py-t[4],bpz=pz-t[5],d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;
        if(d3>=0&&d4<=d3){qx=t[3];qy=t[4];qz=t[5];}
        else{
          const vc=d1*d4-d3*d2;
          if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);qx=ax+abx*v;qy=ay+aby*v;qz=az+abz*v;}
          else{
            const cpx=px-t[6],cpy=py-t[7],cpz=pz-t[8],d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;
            if(d6>=0&&d5<=d6){qx=t[6];qy=t[7];qz=t[8];}
            else{
              const vb=d5*d2-d1*d6;
              if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);qx=ax+acx*w;qy=ay+acy*w;qz=az+acz*w;}
              else{
                const va=d3*d6-d5*d4;
                if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));qx=t[3]+(t[6]-t[3])*w;qy=t[4]+(t[7]-t[4])*w;qz=t[5]+(t[8]-t[5])*w;}
                else{const den=1/(va+vb+vc),v=vb*den,w=vc*den;qx=ax+abx*v+acx*w;qy=ay+aby*v+acy*w;qz=az+abz*v+acz*w;}
              }
            }
          }
        }
      }
      const dx=px-qx,dy=py-qy,dz=pz-qz,dist=Math.hypot(dx,dy,dz);
      return (dx*t[9]+dy*t[10]+dz*t[11])<0?-dist:dist;
    }
    function sdSet(px,py,pz){ let best=Infinity,bs=1; for(const t of tris){ const s=sd(px,py,pz,t),a=Math.abs(s); if(a<best){best=a;bs=s;} } return bs; }

    const CURL = [1.0, 1.15, 0.95];
    const digit = (c) => [c*CURL[0], c*CURL[1], c*CURL[2], 0];
    const swing = -0.15;
    const entry = { f: [0,0,0,0], t: [0, swing, null] };
    const near = [], dists = [];
    const rig = v.arms.l.rig;

    // sample finger skin verts by segment (same mapping as marine-hand skins)
    const sk = rig.skins && rig.skins[0];
    if (!sk) return { err: 'no skin', tris: tris.length };

    function evalDigit(i, c) {
      const pose = {
        f: [digit(i===0?c:entry.f[0]), digit(i===1?c:entry.f[1]), digit(i===2?c:entry.f[2]), digit(i===3?c:entry.f[3])],
        t: i===4 ? [c, swing, c*0.6] : [entry.t[0]||0, swing, (entry.t[0]||0)*0.6]
      };
      // keep already-fitted digits
      for (let k = 0; k < 4; k++) if (k !== i) pose.f[k] = digit(entry.f[k]||0);
      if (i !== 4) pose.t = [entry.t[0]||0, swing, (entry.t[0]||0)*0.6];
      rig.set(pose).update(true);
      sk.mesh.updateMatrixWorld(true);
      const P = sk.mesh.geometry.attributes.position, segs = i < 4 ? [1+i*3, 2+i*3, 3+i*3] : [13,14];
      const vv = new THREE.Vector3();
      let mn = Infinity;
      for (let vi = 0; vi < P.count; vi += 2) {
        if (!segs.includes(sk.seg[vi])) continue;
        vv.fromBufferAttribute(P, vi).applyMatrix4(sk.mesh.matrixWorld);
        mn = Math.min(mn, sdSet(vv.x, vv.y, vv.z));
      }
      return mn;
    }

    // Fit each digit: open from full curl until not penetrating >3mm
    for (let i = 0; i < 5; i++) {
      const max = 1.45, scan = [];
      for (let c = max; c >= -1e-9; c -= 0.05) scan.push([Math.max(0,c), evalDigit(i, Math.max(0,c))]);
      const d0 = scan[scan.length-1][1], thr = Math.min(-0.003, d0 - 0.0015);
      let pick = scan.find(([,d]) => d >= thr), tag;
      if (pick) {
        const k = scan.indexOf(pick);
        if (k > 0) { let lo = pick[0], hi = scan[k-1][0]; for (let j=0;j<6;j++){ const mid=(lo+hi)/2; if (evalDigit(i,mid)>=thr) lo=mid; else hi=mid;} pick=[lo, evalDigit(i,lo)]; }
        tag = pick[1] <= 0.004 ? (d0 < -0.003 ? 'touch(root in)' : 'touch') : 'free';
      } else { pick = scan.reduce((b,x)=>x[1]>b[1]?x:b); tag = 'clip'; }
      let c = pick[0];
      if (tag === 'free') c = i < 4 ? 1.05 : 1.0; // fist fallback
      const d = evalDigit(i, c);
      if (i < 4) entry.f[i] = +c.toFixed(3); else entry.t[0] = +c.toFixed(3);
      dists.push(+d.toFixed(4)); near.push(tag);
    }
    entry.t = [entry.t[0], swing];
    // Expanded HAND_POSES-shaped pose for VM_SOCKETS.supportPose
    const pose = {
      f: entry.f.map((c) => digit(c)),
      t: [entry.t[0], entry.t[1], +(entry.t[0]*0.6).toFixed(3)]
    };
    // Live-apply so after-shot script can also set via tune, but we write supportPose to file
    if (!v.info.tune.shotgun) v.info.tune.shotgun = {};
    v.info.tune.shotgun.poseL = pose;
    return { support: { entry, dists, near, tris: tris.length }, pose, pumpTris: tris.length };
  })()`, 600000);

  fs.writeFileSync(path.join(OUT, 'fit-fp-support.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (e) { console.error('FAILED', e && e.stack || e); code = 1; }
await browser.close?.(); server.close?.();
process.exit(code);
