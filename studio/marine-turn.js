// GP-159: stationary footwork. Aim and the player's collision root remain untouched.
export const turnAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = u => u * u * (3 - 2 * u);
const mix = (a, b, t) => a + (b - a) * t;
// CU-99 (Jerry, 2026-10-09: "Player takes to many steps while rotating and standing. You would expect a bit more of a
// pivot and slide on the foot before he lifts his foot up and places it back down. Same for crouch."): the feet turn on
// the ground first. A planted foot pivots toward the aim (critically damped, `rate`) as far as it comfortably can from
// where it landed: the foot on the side he turns toward on its heel (`lead`), the other on its ball (`trail`); crouched,
// a little less of each. Only a foot the aim has gone `margin` past that steps (a foot that doesn't can pivot that far
// too). A step slides round on the ground for `slide` of its length (less the further behind it starts; none past about
// 140 degrees) before it lifts, and a step taken while he is still turning lands up to `ahead` past the aim. `ball` and
// `heel`: the pivot points, ankle space.
export const PIVOT = { lead: .8, trail: .5, crouchLead: .74, crouchTrail: .48, rate: 16, crouchRate: 13, margin: .06,
  slide: .32, stepDur: .2, crouchStepDur: .18, ahead: .4, aheadTime: .3, ball: .11, heel: -.06 };
// Foot 1 (legRG) stands on his +x side, the side a +yaw turn faces toward.
export const leadsTurn = (i, dir) => (i ? 1 : -1) * dir > 0;
// A step's progress at u: how far along the ground (pos), how far round (rot), how high (lift), all 0..1.
export function stepShape(u, slide) {
  const k = slide / PIVOT.slide, rot = smooth(Math.min(1, u / mix(1, .75, k)));
  if (u < slide) return { pos: .12 * smooth(u / slide), rot, lift: 0 };
  const q = slide > 0 ? (u - slide) / (1 - slide) : u;
  return { pos: slide > 0 ? .12 + .88 * smooth(q) : smooth(q), rot, lift: Math.sin(Math.PI * q) ** 2 };
}
export function createTurnSteps(yaw = 0) {
  const state = { yaw, feet: [yaw, yaw], planted: [yaw, yaw], vel: [0, 0], turned: [0, 0], swing: -1, u: 0, count: 0,
    from: yaw, to: yaw, slide: 0, pos: 0, rot: 0, lift: 0, lastAim: yaw, aimVel: 0 };
  const budget = (i, dir, crouch) => leadsTurn(i, dir) ? mix(PIVOT.lead, PIVOT.crouchLead, crouch) : mix(PIVOT.trail, PIVOT.crouchTrail, crouch);
  const need = (i, aim, crouch) => { const e = turnAngle(aim - state.planted[i]); return Math.abs(e) - budget(i, Math.sign(e) || 1, crouch); };
  // Planted foot i, h seconds nearer the aim; exact at any frame rate while the aim holds still.
  function pivotFoot(i, h, aim, crouch) {
    const w = mix(PIVOT.rate, PIVOT.crouchRate, crouch), old = state.feet[i];
    const x = turnAngle(old - aim), v = state.vel[i], e = Math.exp(-w * h);
    let nx = (x + (v + w * x) * h) * e, nv = (v - w * (v + w * x) * h) * e;
    if (Math.abs(nx) < 1e-6 && Math.abs(nv) < 1e-5) { nx = 0; nv = 0; }
    let to = old + turnAngle(aim + nx - old);
    // Never further round from where it landed than its pivot allows (a GB-149 pivot may have taken it past already).
    const p = state.planted[i], rel = turnAngle(to - p), b = Math.max(budget(i, Math.sign(rel) || 1, crouch) + PIVOT.margin, Math.abs(turnAngle(old - p)));
    if (Math.abs(rel) > b) { to = old + turnAngle(p + Math.sign(rel) * b - old); nv = 0; }
    state.feet[i] = to; state.vel[i] = nv; state.turned[i] += to - old;
  }
  return { state, step(dt, aim, crouch = 0) {
    const stepAngle = Math.PI / 2 - crouch * Math.PI / 6;
    state.aim = aim; state.reach = stepAngle; state.turned[0] = state.turned[1] = 0;
    let left = Math.max(0, Math.min(.1, dt));
    // How fast he is turning (a flick over 20 degrees in one frame is not a turn to run ahead of).
    const jump = turnAngle(aim - state.lastAim); state.lastAim = aim;
    if (Math.abs(jump) > .35 || left <= 0) state.aimVel = 0;
    else state.aimVel += (jump / left - state.aimVel) * (1 - Math.exp(-left / .12));
    while (left > 1e-8) {
      if (state.swing < 0) {
        const n0 = need(0, aim, crouch), n1 = need(1, aim, crouch);
        if (Math.max(n0, n1) <= PIVOT.margin) {
          pivotFoot(0, left, aim, crouch); pivotFoot(1, left, aim, crouch);
          state.yaw = state.feet[0] + turnAngle(state.feet[1] - state.feet[0]) * .5;
          break;
        }
        // The foot the aim has gone furthest past steps (on a turn from square, the trailing one: its pivot is smaller).
        state.swing = n0 > n1 ? 0 : 1;
        const support = state.feet[1 - state.swing];
        // GB-149: measured from the support foot, so a step of nearly 180 degrees still swings the near way round.
        state.from = state.feet[state.swing] = support + turnAngle(state.feet[state.swing] - support);
        const behind = Math.abs(turnAngle(aim - state.from)), dir = Math.sign(turnAngle(aim - state.from)) || 1;
        const ahead = state.aimVel * dir > 0 ? Math.min(PIVOT.ahead, Math.abs(state.aimVel) * PIVOT.aheadTime) * dir : 0;
        state.to = support + Math.max(-stepAngle, Math.min(stepAngle, turnAngle(aim + ahead - support)));
        state.u = 0; state.count++; state.vel[state.swing] = 0;
        state.slide = PIVOT.slide * (1 - Math.max(0, Math.min(1, (behind - 1.2) / 1.2)));
        // GB-149: a step that starts far behind the aim is quicker (down to 70% of it at 180 degrees behind); the slide
        // comes on top of the swing.
        state.dur = mix(PIVOT.stepDur, PIVOT.crouchStepDur, crouch) * (1 - .3 * Math.min(1, behind / Math.PI)) / (1 - state.slide);
      }
      const duration = state.dur, used = Math.min(left, (1 - state.u) * duration);
      pivotFoot(1 - state.swing, used, aim, crouch);
      state.u = Math.min(1, state.u + used / duration); left -= used;
      Object.assign(state, stepShape(state.u, state.slide));
      state.feet[state.swing] = state.from + (state.to - state.from) * state.rot;
      state.yaw = state.feet[0] + turnAngle(state.feet[1] - state.feet[0]) * .5;
      if (state.u >= 1 - 1e-8) { state.feet[state.swing] = state.planted[state.swing] = state.to; state.swing = -1; state.u = 0; state.lift = 0; }
    }
    return state;
  }, pivot(d) {
    // GB-149: both feet turn in place on the balls (a fast flick past what the hips can take): the stance's yaw, each
    // foot's and a step in flight all shift by d; the step in flight then re-aims from the moved support foot so it never
    // lands past the aim. Returns how far that step's landing turned.
    state.yaw += d; state.feet[0] += d; state.feet[1] += d;
    if (state.swing < 0) return 0;
    const support = state.feet[1 - state.swing], old = state.to;
    state.from += d;
    state.to = state.aim == null ? old + d : support + Math.max(-state.reach, Math.min(state.reach, turnAngle(state.aim - support)));
    return state.to - old;
  } };
}

// GB-149 (Jerry, 2026-10-09: "the top half of the players body moves faster than his legs can keep up on rotation ... the
// legs need to keep up more with the top half"): the shoulders never turn more than `cap` past the hips. The hips lead
// the planted feet by up to `hip` (half the feet's lag, more if the cap needs it), and anything past cap + hip turns the
// feet in place on the balls instead of twisting him further.
// CB-291 (a) (J127, D-139; CLAUDE DIRECTOR 11 Nov): cap was .96 (55 deg); the spine turns at most 45 deg on the hips
// (core/body-limits.js BODY_LIMITS.spine), so the feet pivot and step round sooner; 3 deg left for the recoil's twist.
export const TWIST = { cap: 42 * Math.PI / 180, hip: .45, share: .5 };
export function createMarineTurn({ THREE: T, marine }) {
  const ud = marine.userData, lower = ud.lowerBody;
  const legs = [ud.legLG, ud.legRG], knees = [ud.kneeLG, ud.kneeRG], ankles = [ud.ankleLG, ud.ankleRG];
  const objects = [marine, lower, ...legs, ...knees, ...ankles];
  const saved = objects.map(o => ({ o, q: o.quaternion.clone(), y: o.position.y }));
  const feet = [0, 1].map(() => ({ p: new T.Vector3(), from: new T.Vector3(), to: new T.Vector3(), turnOn: new T.Vector3(),
    q: new T.Quaternion(), fromQ: new T.Quaternion(), toQ: new T.Quaternion(), radius: 0, angle: 0, height: 0 }));
  const fwd = new T.Vector3(), bootQ = new T.Quaternion(), legSpaceQ = new T.Quaternion();
  const center = new T.Vector3(), previous = new T.Vector3(), local = new T.Vector3(), hip = new T.Vector3();
  const direction = new T.Vector3(), pole = new T.Vector3(), knee = new T.Vector3(), a = new T.Vector3(), b = new T.Vector3();
  const worldQ = new T.Quaternion(), inverseQ = new T.Quaternion(), pivotQ = new T.Quaternion(), toPivotQ = new T.Quaternion(), yAxis = new T.Vector3(0, 1, 0);
  const xAxis = new T.Vector3(1, 0, 0), pivotPt = new T.Vector3(), held = { p: new T.Vector3(), q: new T.Quaternion() };   // CC-343
  const surfaceUp = new T.Vector3(), surfaceForward = new T.Vector3(), surfaceRight = new T.Vector3(), surfaceBasis = new T.Matrix4();
  // GP-20148: reads share a fresh parent matrix within one apply; no pose/limit changes.
  const readPosition = new T.Vector3(), readScale = new T.Vector3(), readQuaternion = new T.Quaternion();
  const parentReads = [0, 1].map(() => ({ parent: null, inverse: new T.Matrix4(), inverseQ: new T.Quaternion() }));
  let parentReadCount = 0;
  function readParent(parent) {
    for (let i = 0; i < parentReadCount; i++) if (parentReads[i].parent === parent) return parentReads[i];
    const r = parentReads[parentReadCount++]; r.parent = parent;
    parent.updateWorldMatrix(true, false);
    r.inverse.copy(parent.matrixWorld).invert();
    parent.matrixWorld.decompose(readPosition, r.inverseQ, readScale); r.inverseQ.invert();
    return r;
  }
  // GP-20149 review: advance the step clock, but replay a proven fixed leg/hip solve.
  // Inputs are compared exactly; no pose rounding and no skipped required surface reads.
  const fixedWorld=T.Object3D.prototype.updateWorldMatrix,fixedLocal=T.Object3D.prototype.updateMatrix;
  const fixedNodes=[marine,lower,...legs,...knees,...ankles],fixedCallbacks=fixedNodes.map(o=>o.quaternion._onChangeCallback);
  const fixedStateNames=['yaw','swing','u','count','from','to','slide','pos','rot','lift','lastAim','aim','reach','dur'];
  const fixedPivotNames=Object.keys(PIVOT),fixedTwistNames=Object.keys(TWIST);
  const fixedDebugNames=['active','swing','steps','plantedError','yaw','visualYaw','crouch','lift','slide','sink','hipLead','twist'];
  const fixed={valid:false,clock:null,nodes:[],parents:[],input:[],probe:[],state:[],nextState:[],debug:{},
    quats:[...legs,...knees,...ankles].map(()=>new T.Quaternion())};
  let sampledSurface=false;
  function clockValues(s,out){let n=0;for(const k of fixedStateNames)out[n++]=s[k];for(const a of[s.feet,s.planted,s.vel,s.turned]){out[n++]=a[0];out[n++]=a[1];}out.length=n;}
  function fixedInputs(out,dt,yaw,crouch,ankleH,sole,flex,aimLocked,surface){
    if(lower.parent!==marine||legs[0].parent!==lower||legs[1].parent!==lower||knees[0].parent!==legs[0]||knees[1].parent!==legs[1]||ankles[0].parent!==knees[0]||ankles[1].parent!==knees[1])return false;
    let n=0;out[n++]=fixed.dtFree?0:dt;out[n++]=yaw;out[n++]=crouch;out[n++]=ankleH;out[n++]=!!aimLocked;
    out[n++]=!!sole;out[n++]=sole?sole[0]:0;out[n++]=sole?sole[1]:0;out[n++]=!!flex;out[n++]=flex?flex[0]:0;out[n++]=flex?flex[1]:0;out[n++]=!!surface;out[n++]=ud.idleSway||0;out[n++]=ud.torsoG?ud.torsoG.rotation.y:0;
    for(const k of fixedPivotNames)out[n++]=PIVOT[k];for(const k of fixedTwistNames)out[n++]=TWIST[k];
    for(let j=0;j<fixed.nodes.length;j++){const o=fixed.nodes[j];
      if(o.parent!==fixed.parents[j]||!o.matrixAutoUpdate||o.matrixWorldAutoUpdate!==true||o.updateWorldMatrix!==fixedWorld||o.updateMatrix!==fixedLocal)return false;
      const p=o.position,q=o.quaternion,s=o.scale,e=o.rotation;
      out[n++]=p.x;out[n++]=p.y;out[n++]=p.z;out[n++]=q.x;out[n++]=q.y;out[n++]=q.z;out[n++]=q.w;out[n++]=s.x;out[n++]=s.y;out[n++]=s.z;out[n++]=e.x;out[n++]=e.y;out[n++]=e.z;out[n++]=e.order;
    }
    for(let j=0;j<fixedNodes.length;j++)if(fixedNodes[j].quaternion._onChangeCallback!==fixedCallbacks[j])return false;
    out.length=n;return true;
  }
  function sameFixed(a,b){if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!Object.is(a[i],b[i]))return false;return true;}
  function replayFixed(dt,yaw,crouch,ankleH,sole,flex,aimLocked,surface){
    if(!Number.isFinite(dt)||dt<0||!fixed.valid||clock!==fixed.clock||debug.swing!==-1||!fixedInputs(fixed.probe,dt,yaw,crouch,ankleH,sole,flex,aimLocked,surface)||!sameFixed(fixed.probe,fixed.input))return false;
    clockValues(clock.state,fixed.nextState);if(!sameFixed(fixed.state,fixed.nextState))return false;
    // aimVel still decays exactly, even though this stable stance cannot start a new step.
    clock.step(dt,yaw,crouch);
    for(const s of saved){s.q.copy(s.o.quaternion);s.y=s.o.position.y;}applied=true;
    marine.rotation.y=fixed.yaw;marine.position.y=fixed.y;lower.rotation.set(fixed.lowerX,fixed.lowerY,fixed.lowerZ);
    for(let i=0;i<6;i++)fixedNodes[i+2].quaternion.copy(fixed.quats[i]);
    debug.feet[0]=fixed.feet0;debug.feet[1]=fixed.feet1;Object.assign(debug,fixed.debug);
    return true;
  }
  let clock = null, applied = false, count = 0, visualYaw = 0;
  const debug = { active: false, swing: -1, steps: 0, plantedError: 0, feet: [0, 0] };
  ud.turn = debug;
  function restore() {
    if (!applied) return;
    for (const s of saved) { s.o.quaternion.copy(s.q); s.o.position.y = s.y; }
    applied = false;
  }
  // CC-343: footing(x, z, yaw) -> { y, slope, roll } (optional): what is under a boot at (x, z) facing yaw (the decks and a
  // stair's treads, not only the ground; its pitch along yaw and its tilt across), so a planted boot lies on it; ankleH:
  // the ankle's height over the sole (the built boot's); flex: the ankle's range [min, max] (core/body-limits.js), so a
  // crouched boot is pitched only as far as the ankle can (the heel up, the ball on the ground) and the clamp after the
  // pose changes nothing (it used to hold the ankle at -50 deg and put the toe 20 mm into the ground); sole: [heel, toe],
  // the sole's ends along the boot (ankle space z), the points it turns on there.
  // surface(x, z) (optional, CC-343): the height of what is under one point (the ground, a deck, a tread), for the point a
  // boot turns on past its ankle's range: off an edge (a crouched rear boot's toe out over a deck's edge) it has nothing
  // to stand on, so the boot is drawn back along its sole until that point is on what it stood on.
  function apply(dt, { eligible, yaw, ground, footing = null, surface = null, ankleH = .104, sole = null, flex = null, aimLocked = false, crouch = 0 }) {
    crouch = Math.max(0, Math.min(1, crouch));
    const lift = .065 - .03 * crouch;
    if(eligible&&replayFixed(dt,yaw,crouch,ankleH,sole,flex,aimLocked,surface))return;
    fixed.valid=false;fixed.dtFree=false;sampledSurface=false;
    const fixedClock=clock,fixedVisualYaw=visualYaw;
    let fixedInputReady=false;
    if(eligible&&clock&&clock.state.swing<0){
      fixed.nodes.length=0;for(const o of fixedNodes)fixed.nodes.push(o);for(let o=marine.parent;o;o=o.parent)fixed.nodes.push(o);
      fixed.parents.length=fixed.nodes.length;for(let i=0;i<fixed.nodes.length;i++)fixed.parents[i]=fixed.nodes[i].parent;
      fixedInputReady=fixedInputs(fixed.input,dt,yaw,crouch,ankleH,sole,flex,aimLocked,surface);
      clockValues(clock.state,fixed.state);
    }
    marine.updateWorldMatrix(true, false); center.setFromMatrixPosition(marine.matrixWorld);
    if (!eligible || (clock && center.distanceToSquared(previous) > .035 * .035)) {
      clock = null; debug.active = false; debug.swing = -1; return;
    }
    previous.copy(center);
    for (const s of saved) { s.q.copy(s.o.quaternion); s.y = s.o.position.y; }
    applied = true;
    marine.matrixWorld.decompose(readPosition, readQuaternion, a);
    const sc = a.y, ankleHeight = ankleH * sc;
    // CU-99: the point a boot turns on, on the ground under it: its heel when it leads the turn, its ball when it trails.
    const turnPoint = (f, i, dir, out) => {
      const z = (leadsTurn(i, dir) ? PIVOT.heel : PIVOT.ball) * sc;
      fwd.set(0, 0, 1).applyQuaternion(f.q); fwd.y = 0;
      const l = Math.hypot(fwd.x, fwd.z) || 1;
      return out.set(f.p.x + fwd.x / l * z, 0, f.p.z + fwd.z / l * z);
    };
    // Turn a planted boot by d on the ground about that point (the heel or the ball stays where it is).
    const turnBoot = (f, d, i, facing) => {
      if (!d) return;
      turnPoint(f, i, Math.sign(d), b);
      const c = Math.cos(d), sn = Math.sin(d), dx = f.p.x - b.x, dz = f.p.z - b.z;
      f.p.x = b.x + dx * c + dz * sn; f.p.z = b.z - dx * sn + dz * c;
      f.q.premultiply(bootQ.setFromAxisAngle(yAxis, d));
      if (crouch > .5 || footing) crouchSole(f.p, f.q, crouch > .5 ? facing : bootYaw(f.q));
      else if (ground) f.p.y = ground(f.p.x, f.p.z) + ankleHeight;
    };
    const bootYaw = (q) => { fwd.set(0, 0, 1).applyQuaternion(q); return Math.atan2(fwd.x, fwd.z); };
    const crouchSole = (p, q, facing) => {
      // Lay the whole sole against the ground plane, including when the new step faces across a slope.
      const d = .08;
      const F = footing ? footing(p.x, p.z, facing) : null;
      if (F) {   // CC-343: the plane under the boot along its own line and across it (a tread is flat to its nosing)
        const tf = Math.tan(F.slope || 0), tr = Math.tan(F.roll || 0), fx = Math.sin(facing), fz = Math.cos(facing);
        surfaceUp.set(-tf * fx - tr * fz, 1, -tf * fz + tr * fx).normalize();
      } else surfaceUp.set(ground ? (ground(p.x-d,p.z)-ground(p.x+d,p.z))/(2*d) : 0, 1,
        ground ? (ground(p.x,p.z-d)-ground(p.x,p.z+d))/(2*d) : 0).normalize();
      surfaceForward.set(Math.sin(facing),0,Math.cos(facing));
      surfaceForward.addScaledVector(surfaceUp,-surfaceForward.dot(surfaceUp)).normalize();
      surfaceRight.crossVectors(surfaceUp,surfaceForward).normalize();
      q.setFromRotationMatrix(surfaceBasis.makeBasis(surfaceRight,surfaceUp,surfaceForward));
      if (F) { p.x += F.dx || 0; p.z += F.dz || 0; p.y = F.y + ankleHeight / surfaceUp.y; }   // stepped off an edge it only tipped onto
      else if (ground) p.y = ground(p.x,p.z) + ankleHeight / surfaceUp.y;
    };
    if (!clock) {
      clock = createTurnSteps(yaw); visualYaw = yaw; count = 0;
      ankles.forEach((ankle, i) => {
        const f = feet[i]; ankle.getWorldPosition(f.p); ankle.getWorldQuaternion(f.q);
        // Keep the crouch's staggered feet, but reject a trailing gait ankle on entry.
        lower.worldToLocal(local.copy(f.p));
        local.x = legs[i].position.x;
        local.z = Math.max(-.05 - .05 * crouch, Math.min(.05 + .11 * crouch, local.z));
        lower.localToWorld(f.p.copy(local));
        // The rear crouch heel comes down for a stable pivot; don't carry its toe pose onto a flat ankle target.
        f.radius = Math.hypot(f.p.x - center.x, f.p.z - center.z);
        f.angle = Math.atan2(f.p.x - center.x, f.p.z - center.z) - yaw;
        if (ground) f.p.y = ground(f.p.x, f.p.z) + ankleHeight;
        if (crouch > .5) {
          crouchSole(f.p, f.q, yaw);
          if (flex && ground) {
            // Settle onto a flat boot the ankle can actually reach. With a deep crouch, a foot
            // inherited from the last walking frame can be too far behind the knee to plant.
            legs[i].getWorldPosition(hip);
            local.copy(hip).sub(f.p).applyQuaternion(inverseQ.copy(f.q).invert()).multiplyScalar(1 / sc);
            const shinAtLimit = a.copy(ankles[i].position).negate().applyAxisAngle(xAxis, -flex[0] - .02);
            const thigh = knees[i].position.length(), height = local.y - .008 * crouch - shinAtLimit.y;
            const available = thigh * thigh - height * height - (local.x - shinAtLimit.x) ** 2;
            const advance = available > 0 ? Math.min(.16, local.z - shinAtLimit.z + Math.sqrt(available)) : 0;
            if (advance > .001) {
              b.set(0, 0, advance * sc).applyQuaternion(f.q).add(f.p);
              // Keep the original support when the proposed plant would cross a tread edge.
              if (Math.abs(ground(b.x, b.z) - ground(f.p.x, f.p.z)) < .012 * sc) {
                f.p.copy(b); crouchSole(f.p, f.q, yaw);
                f.radius = Math.hypot(f.p.x - center.x, f.p.z - center.z);
                f.angle = Math.atan2(f.p.x - center.x, f.p.z - center.z) - yaw;
              }
            }
          }
        }
        else if (footing) crouchSole(f.p, f.q, bootYaw(f.q));   // CC-343
        f.height = f.p.y - center.y;
      });
    }
    const s = clock.step(dt, yaw, crouch);
    // A boot in the air last frame that is not now, or that steps again, has landed where its step went
    // (GB-149: so the same foot stepping again starts from there, not from last frame: no drift).
    for (let i = 0; i < 2; i++) if (debug.swing === i && (s.swing !== i || s.count !== count)) { feet[i].p.copy(feet[i].to); feet[i].q.copy(feet[i].toQ); }
    // CU-99: the planted boots turn on the ground (including one that turned and then lifted this frame).
    for (let i = 0; i < 2; i++) turnBoot(feet[i], s.turned[i], i, s.feet[i]);
    if (s.count !== count) {
      count = s.count;
      const f = feet[s.swing];
      // dt in the game is <= .05, so at most one new step (.14 s or more) begins per frame.
      if (f) {
        f.from.copy(f.p); f.fromQ.copy(f.q);
        f.to.set(center.x + Math.sin(f.angle + s.to) * f.radius, center.y + f.height,
          center.z + Math.cos(f.angle + s.to) * f.radius);
        f.to.y = ground ? ground(f.to.x, f.to.z) + ankleHeight : f.from.y;
        f.toQ.setFromAxisAngle(yAxis, s.to - s.from).multiply(f.q);
        if (crouch > .5) crouchSole(f.to,f.toQ,s.to);
        else if (footing) crouchSole(f.to, f.toQ, bootYaw(f.toQ));   // CC-343
        turnPoint(f, s.swing, Math.sign(s.to - s.from) || 1, f.turnOn);
      }
    }
    if (s.swing >= 0) {
      const f = feet[s.swing], turned = (s.to - s.from) * s.rot;
      f.p.lerpVectors(f.from, f.to, s.pos);
      // CU-99: while the step slides, the boot turns on its heel or ball (that point stays); that fades as it travels.
      const k = (1 - s.pos) * s.slide / PIVOT.slide;
      if (k > 0) {
        const c = Math.cos(turned), sn = Math.sin(turned), dx = f.from.x - f.turnOn.x, dz = f.from.z - f.turnOn.z;
        f.p.x += k * (f.turnOn.x + dx * c + dz * sn - f.from.x);
        f.p.z += k * (f.turnOn.z - dx * sn + dz * c - f.from.z);
      }
      f.p.y += s.lift * lift;
      // GB-149: standing, turn the boot by the step's own yaw (a slerp would take the other way round near 180 degrees).
      if (crouch > .5) f.q.slerpQuaternions(f.fromQ, f.toQ, s.rot);
      else f.q.setFromAxisAngle(yAxis, turned).multiply(f.fromQ);
    }
    // The chest leads the hips; the feet advance the hips. Guns still aim through holdWeapon's world-space solve.
    const lead = s.yaw + Math.max(-.65, Math.min(.65, turnAngle(yaw - s.yaw)));
    visualYaw += turnAngle(lead - visualYaw) * (1 - Math.exp(-22 * dt));
    // A shouldered gun needs its chest on the aim immediately; only the hips and feet lag it.
    // Unarmed, the entire upper body can anticipate and follow the planted-foot turn smoothly.
    if (aimLocked) visualYaw = yaw;
    // GB-149: shoulders (the chest's own turn, its bladed hold included) within TWIST.cap of the hips.
    const chest = ud.torsoG ? ud.torsoG.rotation.y : 0;
    let lag = turnAngle(visualYaw - s.yaw);
    let hipLead = Math.max(-TWIST.hip, Math.min(TWIST.hip, lag * TWIST.share));
    let twist = chest + lag - hipLead;
    if (Math.abs(twist) > TWIST.cap) {
      hipLead = Math.max(-TWIST.hip, Math.min(TWIST.hip, hipLead + twist - Math.sign(twist) * TWIST.cap));
      twist = chest + lag - hipLead;
    }
    if (Math.abs(twist) > TWIST.cap) {
      const d = twist - Math.sign(twist) * TWIST.cap;
      const dTo = clock.pivot(d); pivotQ.setFromAxisAngle(yAxis, d); toPivotQ.setFromAxisAngle(yAxis, dTo);
      for (let i = 0; i < 2; i++) {
        const f = feet[i];
        if (i === s.swing) { f.to.sub(center).applyQuaternion(toPivotQ).add(center); f.toQ.premultiply(toPivotQ); f.fromQ.premultiply(pivotQ); f.q.premultiply(pivotQ); if (crouch > .5) crouchSole(f.to, f.toQ, s.to); }
        else turnBoot(f, d, i, s.feet[i]);
      }
      lag -= d; twist -= d; debug.pivots = (debug.pivots || 0) + 1;
    }
    marine.rotation.y = turnAngle(visualYaw - yaw);
    // CU-99: the bored weight shift (studio/marine-idle.js, ud.idleSway) tilts his hips over the planted boots.
    lower.rotation.set(0, turnAngle(s.yaw + hipLead - visualYaw), ud.idleSway || 0);
    // GP-19920: a stationary turn should not impose a permanent half squat.
    // Keep the crouched turn clearance and the actual reach-based sink below.
    marine.position.y -= .008 * crouch;
    // GP-20148: only hips are read for reach; defer the full subtree refresh until final height.
    marine.updateWorldMatrix(true, false);
    for (const leg of legs) leg.updateWorldMatrix(true, false);
    // CU-99: turning on planted boots carries his hips round over them; where a leg could not reach its boot, he sinks
    // into the turn by what it lacks (the knees bend a little more) instead of the boot slipping.
    let sink = 0;
    for (let i = 0; i < 2; i++) {
      hip.setFromMatrixPosition(legs[i].matrixWorld);
      const reach = (knees[i].position.length() + ankles[i].position.length()) * sc * (.999 - .004*crouch), f = feet[i];
      const h = Math.hypot(hip.x - f.p.x, hip.z - f.p.z), can = Math.sqrt(Math.max(0, reach * reach - h * h));
      sink = Math.max(sink, hip.y - f.p.y - can);
    }
    sink = Math.min(.08 * sc, sink);
    if (sink > 0) marine.position.y -= sink / (marine.parent ? marine.parent.getWorldScale(a).y : 1);
    // GP-20149 review: the solve reads only the leg chains; scene/render updates other branches.
    marine.updateWorldMatrix(true, false);
    for (const leg of legs) leg.updateWorldMatrix(true, false);
    parentReadCount = 0;
    let worst = 0;
    // CC-343: five passes (three left a rear boot on its ball up to 1.7 deg past the ankle's range, which the clamp after the
    // pose then turned back about the ankle, lifting its toe 5 mm)
    for (let i = 0; i < 2; i++) for (let pass = 0; pass < (flex ? 5 : 1); pass++) {
      const leg = legs[i], kn = knees[i], ankle = ankles[i], f0 = feet[i];
      const f = pass ? held : f0;
      // Two-bone 3D IK preserves the support ankle in world space, including its sole orientation.
      const parentRead = readParent(leg.parent);
      local.copy(f.p).applyMatrix4(parentRead.inverse).sub(leg.position);
      const l1 = kn.position.length(), l2 = ankle.position.length();
      const dist = Math.max(.01, Math.min(l1 + l2 - .0001, local.length()));
      direction.copy(local).normalize();
      // CU-99: the knee goes over the toes (the leg turns at the hip with the boot) rather than staying on the hips' front.
      fwd.set(0, 0, 1).applyQuaternion(f.q).applyQuaternion(legSpaceQ.copy(parentRead.inverseQ)); fwd.y = 0;
      pole.set(0, 0, 1);
      if (fwd.lengthSq() > 1e-6) pole.lerp(fwd.normalize(), .7);
      if (pole.lengthSq() < .04) pole.set(0, 0, 1);
      pole.addScaledVector(direction, -pole.dot(direction)).normalize();
      const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
      knee.copy(direction).multiplyScalar(along).addScaledVector(pole, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
      leg.quaternion.setFromUnitVectors(a.copy(kn.position).normalize(), b.copy(knee).normalize());
      inverseQ.copy(leg.quaternion).invert();
      b.copy(local).sub(knee).applyQuaternion(inverseQ).normalize();
      kn.quaternion.setFromUnitVectors(a.copy(ankle.position).normalize(), b);
      if (kn.parent === leg) {
        leg.updateWorldMatrix(false, false); kn.updateWorldMatrix(false, false);
        kn.matrixWorld.decompose(readPosition, worldQ, readScale);
      } else kn.getWorldQuaternion(worldQ);
      ankle.quaternion.copy(worldQ.invert()).multiply(f.q);
      if (ankle.parent === kn && kn.parent === leg) {
        ankle.updateWorldMatrix(false, false); hip.setFromMatrixPosition(ankle.matrixWorld);
      } else ankle.getWorldPosition(hip);
      if (i !== s.swing) worst = Math.max(worst, hip.distanceTo(f.p));
      if (!flex) continue;
      // CC-343: the ankle's flex as core/body-limits.js reads it (Euler YXZ, about x); past its range the boot turns on its
      // ball (toe down, heel up) or its heel by what is over, and the leg is solved again onto that.
      const aq = ankle.quaternion, ex = Math.asin(Math.max(-1, Math.min(1, -2 * (aq.y * aq.z - aq.x * aq.w))));
      const over = ex < flex[0] ? flex[0] - ex : ex > flex[1] ? flex[1] - ex : 0;
      if (Math.abs(over) < 1e-3) break;
      if (!pass) { held.p.copy(f0.p); held.q.copy(f0.q); }
      const pz = (over > 0 ? (sole ? sole[1] : PIVOT.ball) : (sole ? sole[0] : PIVOT.heel)) * sc;   // the toe's tip (or the heel's) stays on the ground, ankle space (z)
      pivotPt.set(0, -ankleHeight, pz).applyQuaternion(held.q).add(held.p);
      if (!pass && surface) {
        sampledSurface=true;
        // CC-343: that point (and the boot's last 12 mm past it) out over a drop: draw the boot back along its sole, towards
        // its ankle, until the point is on what the sole stood on (at most the sole's length from it to the ankle).
        fwd.set(0, 0, Math.sign(pz)).applyQuaternion(held.q); fwd.y = 0;
        const fl = Math.hypot(fwd.x, fwd.z);
        if (fl > 1e-4) {
          fwd.multiplyScalar(1 / fl);
          const tip = .012 * sc, on = (t) => surface(pivotPt.x + fwd.x * (tip - t), pivotPt.z + fwd.z * (tip - t)) > pivotPt.y - .01;
          if (!on(0)) {
            let t = .005;
            while (t < Math.abs(pz) && !on(t)) t += .005;
            if (t < Math.abs(pz)) { const back = t + .006 * sc; held.p.x -= fwd.x * back; held.p.z -= fwd.z * back; pivotPt.x -= fwd.x * back; pivotPt.z -= fwd.z * back; }
          }
        }
      }
      held.q.multiply(bootQ.setFromAxisAngle(xAxis, over * 1.0005));
      held.p.copy(pivotPt).sub(a.set(0, -ankleHeight, pz).applyQuaternion(held.q));
    }
    debug.feet[0] = s.feet[0]; debug.feet[1] = s.feet[1];
    Object.assign(debug, { active: true, swing: s.swing, steps: count, plantedError: worst,
      yaw: s.yaw, visualYaw, crouch, lift: s.swing < 0 ? 0 : s.lift * lift, slide: s.swing < 0 ? 0 : s.slide, sink: Math.max(0, sink), hipLead, twist });
    if(fixedInputReady&&clock===fixedClock&&s.swing<0&&!sampledSurface&&Object.is(fixedVisualYaw,visualYaw)){
      clockValues(s,fixed.nextState);
      if(sameFixed(fixed.state,fixed.nextState)){
        fixed.dtFree=Object.is(visualYaw,lead)&&Object.is(s.feet[0],yaw)&&Object.is(s.feet[1],yaw)&&s.vel[0]===0&&s.vel[1]===0;
        if(fixed.dtFree)fixed.input[0]=0;
        fixed.clock=clock;fixed.yaw=marine.rotation.y;fixed.y=marine.position.y;fixed.lowerX=lower.rotation.x;fixed.lowerY=lower.rotation.y;fixed.lowerZ=lower.rotation.z;
        for(let i=0;i<6;i++)fixed.quats[i].copy(fixedNodes[i+2].quaternion);
        fixed.feet0=debug.feet[0];fixed.feet1=debug.feet[1];for(const k of fixedDebugNames)fixed.debug[k]=debug[k];fixed.valid=true;
      }
    }
  }
  return { restore, apply, debug, reset() { restore(); clock = null; debug.active = false; debug.swing = -1; } };
}
