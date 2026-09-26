// studio/ik.js — two-bone IK, shared by every rig. Claude's (studio/*, D-40).
//
// Places a hanging limb (joint `a` = shoulder or hip, its child `b` = elbow or knee, bone
// lengths L1 and L2 in rig units) so the end of the second bone lands on `target` (world).
// `pole` is a world direction the middle joint is pushed toward (an elbow back and out, a knee
// forward). It works in world space and converts, so it doesn't care how the parent chain is
// posed or how the rig is scaled. Rig convention: a limb hangs along its joint's -Y at rest and
// the middle joint bends about its local +X.
import * as THREE from 'three';

const _S = new THREE.Vector3(), _T = new THREE.Vector3(), _E = new THREE.Vector3();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qp = new THREE.Quaternion();
const _X = new THREE.Vector3(1, 0, 0), _e = new THREE.Euler();
const _dp = new THREE.Vector3(), _ds = new THREE.Vector3();
// An object's world rotation, from its world matrix (what three's getWorldQuaternion does; spelled out
// because the game's test stand-in for three returns the local one).
// Blend q toward b the short way round. q and -q are the same turn; a slerp that doesn't check
// (the tests' stand-in three blends component-wise) swings the long way through a partial weight.
const _sq = new THREE.Quaternion();
export function slerpTo(q, b, t) {
  _sq.copy(b);
  if (q.x * _sq.x + q.y * _sq.y + q.z * _sq.z + q.w * _sq.w < 0) _sq.set(-_sq.x, -_sq.y, -_sq.z, -_sq.w);
  return q.slerp(_sq, t);
}
export function worldQuat(o, out) { o.updateWorldMatrix(true, false); o.matrixWorld.decompose(_dp, out, _ds); return out; }
export function worldScale(o, out) { o.updateWorldMatrix(true, false); o.matrixWorld.decompose(_dp, _q2s, out); return out; }
const _q2s = new THREE.Quaternion();

// `endLocal` (optional): where the limb's end really sits in `b`'s frame, when it isn't on b's -Y
// (the marine's grip is ahead of his forearm). Then L2 is that point's distance and b's bend is
// corrected by its angle, so the end point itself lands on the target. Its X is ignored.
export function ikLimb(a, b, L1, L2, target, pole, weight = 1, endLocal = null) {
  let psi = 0;
  if (endLocal) { L2 = Math.hypot(endLocal.y, endLocal.z) || L2; psi = Math.atan2(-endLocal.z, -endLocal.y); }
  a.updateWorldMatrix(true, false);
  _S.setFromMatrixPosition(a.matrixWorld);
  _T.copy(target).sub(_S);
  // The rig may be scaled as a whole; bone lengths are rig units, the target is metres.
  const sc = _v2.setFromMatrixColumn(a.matrixWorld, 1).length() || 1;
  _T.divideScalar(sc);
  const reach = L1 + L2;
  let d = _T.length();
  if (d < 1e-4) { _T.set(0, -1, 0); d = 1; }
  const dHat = _v1.copy(_T).divideScalar(d);
  // A limb aimed by its real end point (the marine's) may straighten to within 0.2% of its length;
  // the guardian's rig keeps the 1 cm it has always had (its baked clips are checked against it).
  d = Math.max(Math.abs(L1 - L2) + 0.02, Math.min(endLocal ? reach * 0.998 : reach - 0.01, d));
  _T.copy(dHat).multiplyScalar(d);   // clamped reach, so the lower bone ends on the reach line
  // Interior angles from the law of cosines.
  const cosA1 = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const a1 = Math.acos(cosA1);
  const cosA2 = Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2)));
  const bend = Math.PI - Math.acos(cosA2);
  // The bend plane: the middle joint goes toward the pole, projected off the reach line.
  const pp = _v2.copy(pole);
  pp.addScaledVector(dHat, -pp.dot(dHat));
  if (pp.lengthSq() < 1e-6) { pp.set(0, 0, -1).addScaledVector(dHat, -dHat.z); if (pp.lengthSq() < 1e-6) pp.set(1, 0, 0); }
  pp.normalize();
  const u = _v3.copy(dHat).multiplyScalar(Math.cos(a1)).addScaledVector(pp, Math.sin(a1)).normalize();   // upper bone
  _E.copy(u).multiplyScalar(L1);                                                                          // the middle joint
  const v = _v4.copy(_T).sub(_E).normalize();                                                             // lower bone
  // Bend axis: the rotation that takes u to v (about local +X in the child).
  const ax = _v2.crossVectors(u, v);
  if (ax.lengthSq() < 1e-8) ax.copy(pp).cross(u);
  ax.normalize();
  // World orientation for joint a: local X = bend axis, local -Y = the upper bone.
  const y = _v1.copy(u).negate();
  const z = _T.crossVectors(ax, y).normalize();
  // makeBasis(ax, y, z), written into the elements (column-major) so a stand-in three without it works too.
  const me = _m.identity().elements;
  me[0] = ax.x; me[1] = ax.y; me[2] = ax.z; me[4] = y.x; me[5] = y.y; me[6] = y.z; me[8] = z.x; me[9] = z.y; me[10] = z.z;
  _q.setFromRotationMatrix(_m);
  // Into the parent's frame (its rotation only: a scaled matrix isn't a rotation).
  worldQuat(a.parent, _qp).invert();
  _q.premultiply(_qp);
  if (weight >= 1) a.quaternion.copy(_q); else slerpTo(a.quaternion, _q, weight);
  const bx = bend - psi;
  if (weight >= 1) b.quaternion.setFromAxisAngle(_X, bx);
  else {
    // From its Euler angles read off the quaternion (not .rotation, which a stand-in three may not keep in step).
    _e.setFromQuaternion(b.quaternion, 'XYZ');
    b.quaternion.setFromEuler(_e.set(_e.x + (bx - _e.x) * weight, _e.y * (1 - weight), _e.z * (1 - weight), 'XYZ'));
  }
  return bend;
}
