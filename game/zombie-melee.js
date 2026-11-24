import { shamblerLeg } from './shambler-motion.js';

// Surface and warren claws share a strike clock. The victim can leave during the windup.
export const CLAW_WIND = .22, CLAW_SWING = .28;
const CONTACT = .30;
const ease = t => t * t * (3 - 2 * t);

// All claws need a forward reach, including species with no bespoke steering.
export function clawFaces(z, dx, dz) {
  const yaw = z.mesh.rotation.y;
  return Math.sin(yaw) * dx + Math.cos(yaw) * dz >= .25 * Math.hypot(dx, dz);
}

export function advanceClaw(z, dt) {
  if (z.attackWindup > 0) {
    const left = z.attackWindup - dt;
    z.attackWindup = Math.max(0, left);
    if (left > 0 || !z._pendingAttack) return null;
    z.swingT = CLAW_SWING;
    dt = -left;
  }
  if (!(z.swingT > 0)) return null;
  z.swingT = Math.max(0, z.swingT - dt);
  if (z.swingT > CLAW_SWING * (1 - CONTACT)) return null;
  const contact = z._pendingAttack;
  z._pendingAttack = null;
  return contact;
}

function armPose(arm, base, spread, side, lead, load, reach) {
  if (!arm) return;
  arm.rotation.x = base - load * (lead ? 1.48 : .40) - reach * (lead ? 1.11 : .26);
  arm.rotation.z = spread + side * (load * (lead ? .66 : .24) + reach * (lead ? .08 : .32));
  if (arm.userData.elbowG) arm.userData.elbowG.rotation.x = -load * (lead ? .98 : .50) - reach * (lead ? .14 : .66);
}

const clawStances = new WeakMap();

function ankleDepth(leg) {
  const shin = leg.userData.shinG, ankle = leg.userData.shamblerAnkle;
  const thigh = leg.rotation.x, bend = thigh + shin.rotation.x;
  return leg.position.z + shin.position.y * Math.sin(thigh)
    + ankle.position.y * Math.sin(bend) + ankle.position.z * Math.cos(bend);
}

function braceShambler(z, side, load, reach) {
  const u = z.mesh.userData, hips = u.hips;
  if (z.typeKey !== 'shambler' || z.farLod || z.crawling || z.hopping ||
      z.partsLost?.legL || z.partsLost?.legR || !u.legLG?.userData.shamblerAnkle || !u.legRG?.userData.shamblerAnkle) return;
  const weight = load + reach;
  if (weight <= 0) { clawStances.delete(z); return; }
  const legs = [u.legLG, u.legRG], lead = side > 0 ? 0 : 1;
  const scale = Math.abs(legs[0].userData.shinG.position.y) / .38;
  let stance = clawStances.get(z);
  const root = z.mesh.position, yaw = z.mesh.rotation.y;
  if (!stance || (z._pendingAttack && z._pendingAttack !== stance.attack)) {
    const start = legs.map(ankleDepth);
    // One foot keeps its print. The opposite foot takes a short step under the striking shoulder.
    const landing = Math.min(.34 * scale, Math.max(.16 * scale, start[1-lead] + .24 * scale));
    stance = {start, landing, x:root.x, z:root.z, attack:z._pendingAttack};
    clawStances.set(z, stance);
  }
  hips.position.y += (u.baseHipsY - .06 * scale - hips.position.y) * weight;
  const travel = ((root.x-stance.x)*Math.sin(yaw) + (root.z-stance.z)*Math.cos(yaw)) / z.mesh.scale.z;
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i], shin = leg.userData.shinG, ankle = leg.userData.shamblerAnkle;
    const advance = z.attackWindup > 0 ? load : 1;
    const step = i === lead ? (stance.landing - stance.start[i]) * advance : 0;
    const lift = i === lead ? .045 * scale * Math.sin(Math.PI * advance) : 0;
    const y = leg.userData.shamblerFootY + lift - hips.position.y - leg.position.y;
    const depth = stance.start[i] + step - travel - hips.position.z - leg.position.z;
    const pose = shamblerLeg(y, depth - ankle.position.z, -shin.position.y, -ankle.position.y);
    leg.rotation.x += (pose.thigh - leg.rotation.x) * weight;
    shin.rotation.x += (pose.knee - shin.rotation.x) * weight;
    ankle.rotation.x += (-hips.rotation.x - leg.rotation.x - shin.rotation.x - ankle.rotation.x) * weight;
  }
}

// One shoulder opens away from the target, the other arm balances. The elbow opens
// as the trunk turns through contact. Both release into the underlying gait.
export function poseClaw(z, windDuration = CLAW_WIND) {
  const winding = z.attackWindup > 0;
  const u = z.mesh.userData, r = u.rest || {}, lost = z.partsLost || {};
  const side = lost.armR ? -1 : lost.armL ? 1 : z.swingSide || 1;
  const progress = winding ? 0 : 1 - z.swingT / CLAW_SWING;
  const launch = ease(Math.min(1, progress / CONTACT));
  const load = winding ? ease(Math.max(0, 1 - z.attackWindup / windDuration)) : 1 - launch;
  const reach = progress <= CONTACT ? launch : 1 - ease((progress - CONTACT) / (1 - CONTACT));
  if (!lost.armL) armPose(u.armLG, r.armLBase ?? -.4, r.armLRZ || 0, -1, side < 0, load, reach);
  if (!lost.armR) armPose(u.armRG, r.armRBase ?? -.4, r.armRRZ || 0, 1, side > 0, load, reach);
  if (u.torso) {
    u.torso.rotation.y = (r.torsoRY || 0) + side * (.38 * load - .44 * reach);
    u.torso.rotation.x = (r.torsoRX || 0) - .10 * load + .28 * reach;
    u.torso.rotation.z = (r.torsoRZ || 0) + side * (.06 * load - .08 * reach);
  }
  if (u.head && !lost.head) u.head.rotation.x = (r.headRX || 0) - .09 * load - .10 * reach;
  if (u.hips && !z.crawling) u.hips.position.z = -.035 * load + .085 * reach;
  braceShambler(z, side, load, reach);
}
