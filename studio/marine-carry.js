// CC-350 (Claude 3; Jerry's J153 notes 20 and 38, D-181): the third-person carry rig, the way a soldier carries.
// "3rd person sling and weapon placement needs huge work ... the Magazine towards the player leaving a massive gap. Someone
// needs to think about how weapons would actually be carried. Check out that weird sideways holster."
//  - A slung long gun lies FLAT across his back over the pack (the receiver's flat side on it), diagonal, muzzle up behind a
//    shoulder, stock low by the other hip, magazine or drum out and down, away from him: never on its edge with the magazine
//    turned in (the Breacher's drum stood between him and the gun). Two cross in an X, the second resting on the first, slid
//    along its length so they cross where both are thin. Each hangs on its own two-point sling: from the stock's stud round his
//    other side at the belt, across his chest and over the shoulder to the front stud, a ring on each stud (GP-156's seats).
//  - The handguns (index.html, rig.placeStation) ride vertical, muzzle down, never on their side.
// Everything is solved in the torso's frame (marine heights, y absolute: torso y = y - torsoPivotY), from his body's surface
// measured on the game's own body (Training, ray casts, the gun in his hands and the carry rig left out:
// review/CC-350/surface.js). No ray casts at run time, so the fit is the same on the test page.
//
// The surface tables: z of his back (BACK) and front (FRONT) as seen along +z / -z, at x = -0.18..0.18 (step 0.03) and
// y = 0.50..1.34 (step 0.04), with the plate carrier (vest) and without (shirt). null: nothing there (past his outline).
export const SURF_X0 = -0.18, SURF_DX = 0.03, SURF_NX = 13, SURF_Y0 = 0.5, SURF_DY = 0.04, SURF_NY = 22;
export const SURFACE = { vest: null, shirt: null };
SURFACE.vest = {
  back: [
    [-0.038,-0.049,-0.049,-0.043,-0.013,null,null,null,-0.024,-0.052,-0.058,-0.056,-0.044],
    [-0.049,-0.059,-0.059,-0.052,-0.023,null,null,null,-0.032,-0.059,-0.065,-0.064,-0.054],
    [-0.06,-0.068,-0.068,-0.061,-0.035,null,null,null,-0.041,-0.066,-0.073,-0.072,-0.063],
    [-0.084,-0.087,-0.088,-0.084,-0.07,0.024,null,0.001,-0.074,-0.088,-0.091,-0.089,-0.085],
    [-0.079,-0.086,-0.086,-0.08,-0.058,null,null,null,-0.06,-0.081,-0.086,-0.086,-0.079],
    [-0.087,-0.095,-0.095,-0.09,-0.071,null,-0.023,null,-0.07,-0.088,-0.093,-0.092,-0.085],
    [-0.092,-0.1,-0.1,-0.095,-0.094,-0.097,-0.097,-0.095,-0.091,-0.092,-0.097,-0.096,-0.087],
    [-0.092,-0.1,-0.112,-0.123,-0.128,-0.129,-0.13,-0.153,-0.154,-0.155,-0.153,-0.095,-0.087],
    [-0.087,-0.096,-0.111,-0.12,-0.125,-0.125,-0.126,-0.154,-0.156,-0.156,-0.153,-0.091,-0.081],
    [-0.069,-0.092,-0.117,-0.118,-0.121,-0.123,-0.138,-0.123,-0.119,-0.115,-0.109,-0.088,-0.063],
    [-0.069,-0.086,-0.117,-0.113,-0.116,-0.118,-0.138,-0.118,-0.114,-0.11,-0.102,-0.082,-0.063],
    [null,-0.041,-0.261,-0.264,-0.261,-0.261,-0.261,-0.261,-0.261,-0.264,-0.261,-0.036,null],
    [-0.167,-0.17,-0.262,-0.265,-0.262,-0.262,-0.262,-0.262,-0.262,-0.265,-0.262,-0.17,-0.167],
    [-0.167,-0.188,-0.25,-0.276,-0.283,-0.285,-0.286,-0.285,-0.283,-0.276,-0.25,-0.188,-0.167],
    [-0.167,-0.17,-0.259,-0.288,-0.319,-0.316,-0.319,-0.316,-0.319,-0.287,-0.259,-0.233,-0.167],
    [-0.167,-0.17,-0.279,-0.279,-0.307,-0.309,-0.31,-0.309,-0.306,-0.279,-0.279,-0.255,-0.167],
    [-0.167,-0.17,-0.277,-0.28,-0.287,-0.309,-0.311,-0.309,-0.287,-0.28,-0.277,-0.256,-0.231],
    [-0.064,-0.17,-0.277,-0.296,-0.297,-0.297,-0.297,-0.297,-0.297,-0.296,-0.277,-0.253,-0.064],
    [-0.041,-0.067,-0.168,-0.296,-0.269,-0.262,-0.264,-0.262,-0.269,-0.296,-0.168,-0.066,-0.041],
    [null,null,null,-0.05,-0.075,-0.087,-0.091,-0.087,-0.075,-0.05,null,null,null],
    [null,0.187,null,null,-0.029,-0.059,-0.065,-0.057,-0.022,null,null,null,null],
    [null,null,null,null,-0.064,-0.082,-0.087,-0.081,-0.057,null,null,null,null]
  ],
  front: [
    [0.115,0.126,0.127,0.12,0.088,null,null,null,0.085,0.112,0.118,0.117,0.105],
    [0.115,0.125,0.126,0.119,0.09,null,null,null,0.088,0.113,0.119,0.119,0.108],
    [0.117,0.125,0.126,0.119,0.091,null,null,null,0.091,0.115,0.121,0.121,0.112],
    [0.118,0.125,0.125,0.118,0.092,0.027,null,0.046,0.117,0.129,0.133,0.132,0.128],
    [0.116,0.123,0.123,0.117,0.093,null,null,null,0.095,0.116,0.122,0.122,0.114],
    [0.112,0.118,0.119,0.113,0.094,null,0.019,null,0.097,0.115,0.12,0.12,0.112],
    [0.113,0.113,0.114,0.109,0.093,0.097,0.099,0.098,0.097,0.113,0.118,0.117,0.109],
    [0.103,0.11,0.111,0.106,0.111,0.112,0.114,0.113,0.112,0.11,0.115,0.118,0.106],
    [0.097,0.148,0.149,0.135,0.113,0.114,0.116,0.115,0.114,0.151,0.153,0.152,0.1],
    [0.063,0.149,0.151,0.146,0.11,0.112,0.138,0.113,0.112,0.152,0.156,0.154,0.07],
    [0.062,0.158,0.159,0.158,0.114,0.139,0.14,0.118,0.115,0.162,0.163,0.163,0.07],
    [null,0.039,0.084,0.098,0.104,0.107,0.131,0.107,0.105,0.099,0.085,0.036,null],
    [0.17,0.178,0.178,0.178,0.183,0.178,0.183,0.178,0.183,0.178,0.178,0.178,0.17],
    [0.17,0.173,0.213,0.214,0.203,0.215,0.215,0.215,0.203,0.214,0.213,0.173,0.17],
    [0.203,0.173,0.212,0.214,0.206,0.214,0.214,0.214,0.206,0.214,0.212,0.173,0.203],
    [0.17,0.231,0.219,0.219,0.218,0.219,0.226,0.219,0.218,0.219,0.219,0.231,0.17],
    [0.17,0.173,0.228,0.203,0.203,0.173,0.173,0.173,0.173,0.188,0.228,0.183,0.17],
    [0.088,0.217,0.217,0.203,0.205,0.173,0.189,0.19,0.19,0.189,0.217,0.217,0.088],
    [0.075,0.148,0.168,0.192,0.196,0.174,0.171,0.171,0.171,0.171,0.168,0.148,0.075],
    [null,null,null,0.058,0.083,0.093,0.088,0.093,0.082,0.058,null,null,null],
    [null,0.192,null,null,0.05,0.094,0.113,0.094,0.039,null,null,null,null],
    [null,null,null,null,0.084,0.104,0.121,0.103,0.081,null,null,null,null]
  ]
};
SURFACE.shirt = {
  back: [
    [-0.037,-0.048,-0.049,-0.042,-0.011,null,null,null,-0.024,-0.052,-0.057,-0.056,-0.044],
    [-0.049,-0.058,-0.058,-0.051,-0.022,null,null,null,-0.033,-0.059,-0.065,-0.064,-0.053],
    [-0.06,-0.068,-0.068,-0.061,-0.033,null,null,null,-0.042,-0.066,-0.072,-0.072,-0.063],
    [-0.083,-0.087,-0.087,-0.083,-0.069,null,null,-0.004,-0.075,-0.087,-0.091,-0.089,-0.085],
    [-0.079,-0.086,-0.085,-0.079,-0.057,null,null,null,-0.06,-0.081,-0.086,-0.085,-0.078],
    [-0.087,-0.095,-0.095,-0.089,-0.07,null,-0.023,null,-0.07,-0.088,-0.093,-0.092,-0.084],
    [-0.092,-0.1,-0.1,-0.095,-0.094,-0.097,-0.097,-0.095,-0.091,-0.092,-0.097,-0.095,-0.087],
    [-0.092,-0.1,-0.112,-0.123,-0.128,-0.129,-0.13,-0.153,-0.154,-0.155,-0.153,-0.095,-0.086],
    [-0.087,-0.096,-0.111,-0.12,-0.124,-0.125,-0.126,-0.154,-0.156,-0.156,-0.153,-0.091,-0.081],
    [-0.069,-0.093,-0.112,-0.118,-0.121,-0.123,-0.138,-0.122,-0.119,-0.115,-0.109,-0.088,-0.063],
    [-0.069,-0.086,-0.105,-0.113,-0.116,-0.118,-0.138,-0.117,-0.114,-0.11,-0.102,-0.081,-0.063],
    [null,-0.042,-0.261,-0.264,-0.261,-0.261,-0.261,-0.261,-0.261,-0.264,-0.261,-0.035,null],
    [null,-0.055,-0.262,-0.265,-0.262,-0.262,-0.262,-0.262,-0.262,-0.265,-0.262,-0.052,null],
    [null,-0.187,-0.25,-0.276,-0.283,-0.285,-0.286,-0.285,-0.283,-0.276,-0.25,-0.187,null],
    [-0.02,-0.078,-0.259,-0.288,-0.319,-0.316,-0.319,-0.316,-0.319,-0.287,-0.259,-0.233,-0.021],
    [-0.032,-0.086,-0.279,-0.279,-0.307,-0.309,-0.31,-0.309,-0.306,-0.279,-0.279,-0.255,-0.033],
    [-0.047,-0.092,-0.277,-0.28,-0.287,-0.309,-0.311,-0.309,-0.287,-0.28,-0.277,-0.256,-0.231],
    [-0.064,-0.094,-0.277,-0.296,-0.297,-0.297,-0.297,-0.297,-0.297,-0.296,-0.277,-0.253,-0.064],
    [-0.041,-0.067,-0.158,-0.296,-0.269,-0.262,-0.264,-0.262,-0.269,-0.296,-0.158,-0.066,-0.041],
    [null,null,null,-0.05,-0.075,-0.087,-0.091,-0.087,-0.075,-0.05,null,null,null],
    [null,null,null,null,-0.029,-0.059,-0.073,-0.057,-0.022,null,null,null,null],
    [null,null,null,null,-0.064,-0.082,-0.087,-0.081,-0.057,null,null,null,null]
  ],
  front: [
    [0.116,0.127,0.127,0.12,0.087,null,null,null,0.086,0.113,0.119,0.118,0.105],
    [0.116,0.126,0.126,0.119,0.09,null,null,null,0.089,0.114,0.12,0.119,0.108],
    [0.118,0.126,0.126,0.119,0.091,null,null,null,0.092,0.115,0.122,0.121,0.112],
    [0.118,0.125,0.125,0.118,0.092,null,null,0.053,0.117,0.13,0.134,0.132,0.128],
    [0.117,0.123,0.123,0.117,0.093,null,null,null,0.096,0.116,0.122,0.122,0.114],
    [0.112,0.119,0.119,0.114,0.093,null,0.019,null,0.098,0.115,0.12,0.12,0.112],
    [0.113,0.114,0.115,0.109,0.093,0.097,0.099,0.098,0.097,0.113,0.118,0.117,0.108],
    [0.103,0.11,0.111,0.106,0.111,0.112,0.114,0.113,0.112,0.11,0.115,0.118,0.105],
    [0.097,0.148,0.149,0.108,0.113,0.114,0.116,0.115,0.114,0.151,0.153,0.152,0.1],
    [0.062,0.15,0.151,0.144,0.11,0.112,0.138,0.113,0.112,0.152,0.156,0.154,0.07],
    [0.062,0.158,0.159,0.158,0.114,0.139,0.14,0.118,0.115,0.162,0.163,0.163,0.07],
    [null,0.04,0.084,0.098,0.104,0.107,0.131,0.107,0.105,0.099,0.084,0.032,null],
    [null,0.055,0.089,0.102,0.108,0.11,0.131,0.11,0.108,0.102,0.089,0.051,null],
    [null,0.174,0.179,0.178,0.114,0.115,0.131,0.116,0.114,0.178,0.179,0.175,null],
    [0.055,0.18,0.181,0.181,0.12,0.121,0.131,0.121,0.12,0.181,0.181,0.18,0.054],
    [0.067,0.149,0.14,0.136,0.136,0.125,0.131,0.125,0.136,0.136,0.14,0.149,0.067],
    [0.075,0.146,0.141,0.136,0.136,0.127,0.131,0.127,0.136,0.136,0.141,0.146,0.074],
    [0.088,0.144,0.141,0.141,0.141,0.126,0.131,0.126,0.141,0.141,0.141,0.144,0.088],
    [0.075,0.131,0.122,0.102,0.107,0.109,0.11,0.109,0.107,0.102,0.122,0.132,0.075],
    [null,null,null,0.058,0.083,0.093,0.088,0.093,0.082,0.058,null,null,null],
    [null,null,null,null,0.05,0.095,0.113,0.094,0.039,null,null,null,null],
    [null,null,null,null,0.084,0.104,0.121,0.103,0.081,null,null,null,null]
  ]
};

// Where the slung guns lie (torso frame, y absolute): the V's centre line per side, its tilt from vertical (rad, muzzle out),
// the lean of the muzzle toward his back (z per unit up), the height of the gun's middle, and the air left between the gun's
// nearest point and the pack or his back.
export const BACK_CARRY = { x: 0, y: 1.08, tilt: 0.55, lean: -0.14, clear: 0.004, lowest: 0.42, highest: 1.78 };

// Sling seats per gun, in the gun builder's own coordinates: GP-156's (ChatGPT, ui/weapon-sling.js), the same studs and clips as
// before CC-350, so every clip still sits on its stud. Each seat is a point and its outward normal (default +x, the flat side);
// the seat on the body-facing side is used (x mirrored), with SLING_POSITIVE overriding the seats on asymmetric +x surfaces.
export const SLING_STUDS = {
  m4: [[.031, .032, -.52], [.05149, .02, .45, .9997, .0227, .0045]],
  ak: [[.023, -.065, -.484], [.048, -.012, .512, 1, 0, 0]],   // CC-350 p2: the front ring on ChatGPT 2's real retainer stud (GT-20106: face x .048, +x only)
  aa12: [[.035, .025, -.51], [.045, -.015, .45]],
  shotgun: [[.02384, -.025, -.42, .5556, .8264, -.092], [.01451, .035, .63, .9808, .1951, 0]],
  sniper: [[.029, .045, -.56], [.0315, .023, .42]],
  launcher: [[.063, .015, -.25, .3827, 0, -.9239], [.075, .04, .3]],
  minigun: [[.112, .04, -.15], [.12274, 0, .14, .9999, -.009, .0128]],
  flamer: [[.055, .065, -.13], [.055, .065, .3]],
  chainsaw: [[.1435, .08, -.23], [.1435, .065, .02]]
};
// Studs that exist on one side of the gun only (per stud [rear, front]: 0 both sides (mirrored), 1 its +x side, -1 its -x
// side): the ring stays on that stud; when that side faces away from him the strap wraps over the gun's top to reach him
// (SLING_WRAP: the gun's top y and half width at the stud, its own units).
export const SLING_STUD_SIDE = { ak: [0, 1] };
export const SLING_WRAP = { ak: { 1: { top: 0.04, half: 0.033 } } };
// and the seats on the -x surface where the mirrored one is wrong (given as +x values, mirrored): the minigun's front ring on the
// mirrored stud stood inside the motor housing on that side (tgt20076)
export const SLING_NEGATIVE = { minigun: { 1: [.228, 0, .12, 1, 0, 0] } };   // the housing's outer face (tgt20076: in contact, clear)
// how far the strap runs straight off a ring before it turns for him, on the gun's +x side per stud [rear, front] (default
// 4.5 cm): the minigun's front ring sits beside its laser module (tgt20076: the strap of the stacked second one ran through it)
export const SLING_LEAD = { minigun: [0.045, 0.08] };
export const SLING_POSITIVE = {
  m4: { 1: [.05112, .02, .45, .9987, .0498, .0063] },
  minigun: { 1: [.09612, 0, .14, .9659, 0, .2588] },
  flamer: { 0: [.08081, .065, -.13, .7706, .5835, -.2564] },
  chainsaw: { 1: [.160483, .06, .02, .995732, .084361, -.037433] }
};

export function surfaceZ(table, x, y) {
  if (!table) return null;
  const fx = (x - SURF_X0) / SURF_DX, fy = (y - SURF_Y0) / SURF_DY;
  if (fx < 0 || fy < 0 || fx > SURF_NX - 1 || fy > SURF_NY - 1) return null;
  const i = Math.min(SURF_NX - 2, Math.floor(fx)), j = Math.min(SURF_NY - 2, Math.floor(fy)), u = fx - i, v = fy - j;
  const a = table[j][i], b = table[j][i + 1], c = table[j + 1][i], d = table[j + 1][i + 1];
  const k = [a, b, c, d].filter((q) => q !== null);
  if (k.length < 4) {   // at the outline: the nearest known corner, so the edge of the body still counts
    if (!k.length) return null;
    const w = [[a, (1 - u) * (1 - v)], [b, u * (1 - v)], [c, (1 - u) * v], [d, u * v]].filter((q) => q[0] !== null).sort((p, q) => q[1] - p[1]);
    return w[0][1] > 0.25 ? w[0][0] : null;
  }
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

// The rotation that lays a gun flat on his back on `side` (+1 his +x half, the gun hand's; -1 the other): muzzle (+z of the
// gun) up and out by `tilt`, leaning in by `lean`; magazine (-y) out and down; the flat side (x) against him.
export function backBasis(T, side, P = BACK_CARRY) {
  const u = new T.Vector3(side * Math.sin(P.tilt), Math.cos(P.tilt), P.lean).normalize();
  const mag = new T.Vector3(side * Math.cos(P.tilt), -Math.sin(P.tilt), 0);
  mag.addScaledVector(u, -mag.dot(u)).normalize();
  const y = mag.negate(), x = new T.Vector3().crossVectors(y, u).normalize();
  return new T.Matrix4().makeBasis(x, y, u);
}

// CC-350 p2: a gun that lies on its bottom, not its side: the chainsaw (its bar and rear handle sit on the powerhead's centre
// plane, 13 cm in from either side cover, so on its side the bar stood 16 cm off the pack; its bottom is flat to 7 cm end to
// end). Muzzle (bar) along the same diagonal, its top straight out from his back.
export const CARRY_FACE = { chainsaw: 'bottom' };
export function bottomBasis(T, side, P = BACK_CARRY) {
  const u = new T.Vector3(side * Math.sin(P.tilt), Math.cos(P.tilt), P.lean).normalize();
  const y = new T.Vector3(0, 0, -1); y.addScaledVector(u, -y.dot(u)).normalize();
  const x = new T.Vector3().crossVectors(y, u).normalize();
  return new T.Matrix4().makeBasis(x, y, u);
}
const _v = [];
// The gun's vertices in its spot's parent (the torso) frame, every `step`-th one (enough for the fit, cheap).
function gunPoints(T, spot, step = 3) {
  const pts = [];
  spot.g.updateMatrix(); spot.gun.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(spot.g.parent.matrixWorld).invert(), m = new T.Matrix4(), v = new T.Vector3();
  spot.gun.traverseVisible((o) => {
    const P = o.geometry && o.geometry.attributes && o.geometry.attributes.position;
    if (!o.isMesh || !P) return;
    m.multiplyMatrices(inv, o.matrixWorld);
    const n = o.isInstancedMesh ? 1 : 0;
    for (let i = 0; i < P.count; i += step) pts.push(v.fromBufferAttribute(P, i).applyMatrix4(m).clone());
  });
  return pts;
}

// CC-350 p2 (D-182): two slung guns where one is bulky (the saw, the minigun, the launcher, the flamer) do not stack. The bulky
// one with a thin gun crosses over the thin one (which lies flat on the pack, a few cm under it); two bulky ones: the longer
// lies across the pack as when it is alone and the other hangs upright on the pack's other upper side (muzzle up behind that
// shoulder), clear of the first. Nothing of a pair
// hangs below mid-thigh, stands more than ~8 cm off the pack (on the gun under it), or reaches where his arm swings back.
// Lengths along the gun (m, as carried): which bulky gun lies across (the longer) and which hangs upright.
export const BULKY_LENGTH = { chainsaw: 0.97, flamer: 0.81, launcher: 0.62, minigun: 0.5 };
// mode: two bulky ones 'stack' (the second lies straight on the first, crossing it, no air: the Director's lean, 01:45Z) or
// 'upright' (the second hangs upright on the pack's other upper corner, partly on the first's edge)
export const PAIR_CARRY = { mode: 'stack', lowest: 0.66, maxOff: 0.08, uprightTilt: 0.12, arm: { x: 0.17, y: 1.24, z: -0.36 } };
// The order to seat two slung guns (kinds per slot): { first: slot seated first, upright: slot hung upright or -1, bulky }.
export function carryOrder(kinds) {
  const a = kinds[0], b = kinds[1], A = BULKY_LENGTH[a], B = BULKY_LENGTH[b];
  if (!a || !b || (!A && !B)) return { first: 0, upright: -1, bulky: false };
  if (A && B) { const first = A >= B ? 0 : 1; return { first, upright: PAIR_CARRY.mode === 'upright' ? 1 - first : -1, bulky: true }; }
  return { first: A ? 1 : 0, upright: -1, bulky: true };   // a thin gun first, flat on the pack; the bulky one rests on it
}

// Lay a slung gun flat on his back on `side` and seat it: the nearest point of the gun `clear` off the pack (or his back),
// none of it inside. `under`: the points of a gun already on his back (the first of two crosses under the second), which the
// gun then rests on where it crosses it. `opt`: { upright: hang it upright beside `under` instead of across it, lowest: the
// lowest it may reach (marine height), pair: true for a bulky pair (stand-off and arm limits) }.
// Returns the fit (for the tests) and the gun's points, for the next gun.
export function seatOnBack(T, spot, side, tp, vest, P = BACK_CARRY, under = null, opt = {}) {
  if (!spot.gun) return null;
  const lowest = opt.lowest !== undefined ? opt.lowest : P.lowest, upright = !!opt.upright;
  const PB = upright ? { ...P, tilt: PAIR_CARRY.uprightTilt } : P;
  spot.g.quaternion.setFromRotationMatrix(CARRY_FACE[spot.kind] === 'bottom' ? bottomBasis(T, side, PB) : backBasis(T, side, PB));
  spot.g.position.set(side * P.x, P.y - tp, -0.3);
  spot.gun.position.set(0, 0, 0);
  spot.g.parent.updateWorldMatrix(true, false);
  spot.g.updateMatrixWorld(true);
  const table = (vest ? SURFACE.vest : SURFACE.shirt).back;
  const pts = gunPoints(T, spot);
  // the gun under it, as a depth map on a 1.5 cm grid (its back-most point in each cell)
  const cell = 0.015, map = new Map(), key = (x, y) => Math.round(x / cell) + ',' + Math.round(y / cell);
  if (under) for (const q of under) { const k = key(q.x, q.y), z = map.get(k); if (z === undefined || q.z < z) map.set(k, q.z); }
  const depth = (ox, oy, use = pts) => {   // how far back the gun must go, slid by (ox, oy) in his back's plane; body: for his body alone
    let dz = Infinity, body = Infinity, on = 'body';
    for (const p of use) {
      const x = p.x + ox, y = p.y + oy, s = surfaceZ(table, x, y + tp);
      if (s !== null && s - P.clear - p.z < dz) { dz = s - P.clear - p.z; on = 'body'; }
      if (s !== null && s - P.clear - p.z < body) body = s - P.clear - p.z;
      if (map.size) { const u = map.get(key(x, y)); if (u !== undefined && u - P.clear - p.z < dz) { dz = u - P.clear - p.z; on = 'gun'; } }
    }
    return { dz, on, off: Number.isFinite(body) && Number.isFinite(dz) ? Math.max(0, body - dz) : 0 };
  };
  // where his arm swings back (run, crouch): no part of a pair's gun there once seated
  const A = PAIR_CARRY.arm, inArm = (use, ox, oy, dz) => { let n = 0; for (const p of use) if (Math.abs(p.x + ox) > A.x && p.y + oy + tp < A.y && p.z + dz > A.z) n++; return n; };
  const ax = new T.Vector3(0, 0, 1).applyQuaternion(spot.g.quaternion), ac = new T.Vector3(0, 1, 0).applyQuaternion(spot.g.quaternion);
  let ylo = Infinity, yhi = -Infinity; for (const p of pts) { if (p.y < ylo) ylo = p.y; if (p.y > yhi) yhi = p.y; }
  const fits = (oy) => ylo + oy + tp >= lowest - 1e-6 && yhi + oy + tp <= P.highest + 1e-6;
  const few = pts.filter((_, i) => i % 4 === 0);
  // how tight it lies (a pair): the mean air between its near face and what is under it (his back or pack, or the gun under
  // it), per 3 cm cell of its outline, each capped at 30 cm; low = it lies along the pack, not on one corner of it
  const air = (ox, oy, dz, use = few) => {
    const near = new Map(); for (const p of use) { const k = Math.round((p.x + ox) / 0.03) + ',' + Math.round((p.y + oy) / 0.03), z = near.get(k); if (z === undefined || p.z > z) near.set(k, p.z); }
    let sum = 0, n = 0;
    for (const [k, z] of near) {
      const [i, j] = k.split(',').map(Number), x = i * 0.03, y = j * 0.03;
      let under = surfaceZ(table, x, y + tp); if (under === null) under = -0.12;   // past his outline: as far as his side
      if (map.size) { const u = map.get(key(x, y)); if (u !== undefined && u < under) under = u; }
      sum += Math.min(0.3, Math.max(0, under - P.clear - (z + dz))); n++;
    }
    return n ? sum / n : 0;
  };
  let best;
  if (upright) {
    // hung upright on its side of the pack, beside the gun across it: the spot nearest the pack's upper corner on its side
    // where it rests on the pack (or no more than maxOff on the other gun), out of his arm's way
    let bestScore = -Infinity;
    for (let gx = 0; gx <= 0.2001; gx += 0.02) for (let gy = -0.3; gy <= 0.3001; gy += 0.03) {
      const ox = -side * P.x + side * gx, oy = gy;
      if (!fits(oy)) continue;
      const d = depth(ox, oy, few), arm = inArm(few, ox, oy, d.dz);
      const score = -air(ox, oy, d.dz) - 2 * Math.max(0, d.off - PAIR_CARRY.maxOff) - 0.5 * d.off - 0.02 * arm - 0.05 * Math.abs(gx - 0.1) - 0.05 * Math.abs(gy);
      if (score > bestScore) { bestScore = score; best = { ox, oy, a: gx, c: gy }; }
    }
    if (!best) best = { ox: 0, oy: 0, a: 0, c: 0 };
  } else {
    // Crossing a gun already there: slide this one along its length (and a little across) so the two cross where both are
    // thin (a barrel over a stock), not receiver on receiver or over a drum; the least slide that keeps it closest to him.
    // Alone (or the first of a pair), only slid up its length when it would reach below `lowest`.
    let bestScore = -Infinity;
    // (a pair's first gun: the slide up its length and across that lies tightest on the pack)
    const slides = map.size ? [-0.3, -0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3] : opt.pair ? [0, 0.03, 0.06, 0.09, 0.12, 0.15, 0.18, 0.21, 0.24, 0.27, 0.3] : [0, 0.03, 0.06, 0.09, 0.12, 0.15, 0.18, 0.21, 0.24];
    search: for (const a of slides) for (const c of (map.size ? [-0.08, -0.04, 0, 0.04, 0.08] : opt.pair ? [-0.06, -0.03, 0, 0.03, 0.06] : [0])) {
      const ox = ax.x * a + ac.x * c, oy = ax.y * a + ac.y * c;
      if (!fits(oy)) continue;   // not down to his knees, not over his head
      if (!map.size && !opt.pair) { best = { ox, oy, a, c }; break search; }
      const d = depth(ox, oy, few);
      const score = opt.pair ? -air(ox, oy, d.dz) - 0.5 * d.off - 2 * Math.max(0, d.off - PAIR_CARRY.maxOff) - 0.01 * (Math.abs(a) + Math.abs(c)) - 0.002 * inArm(few, ox, oy, d.dz)
        : d.dz - 0.1 * (Math.abs(a) + Math.abs(c));
      if (score > bestScore) { bestScore = score; best = { ox, oy, a, c }; }
    }
    if (!best) best = { ox: 0, oy: 0, a: 0, c: 0 };
  }
  const d = depth(best.ox, best.oy), ox = best.ox, oy = best.oy;
  let dz = d.dz; const on = d.on;
  spot.g.position.x += ox; spot.g.position.y += oy;
  for (const p of pts) { p.x += ox; p.y += oy; }
  if (Number.isFinite(dz)) { spot.g.position.z += dz; for (const p of pts) p.z += dz; }
  spot.g.updateMatrix();
  return { dz, z: spot.g.position.z, on, off: d.off, air: air(0, 0, 0, pts), upright, slide: [best.a, best.c], arm: inArm(pts, 0, 0, 0), n: pts.length, pts };
}

// Flat webbing along a path (the strap). Width turns with the path; uv runs along it.
export function ribbon(T, points, width = 0.034, thickness = 0.005, steps = 72) {
  const curve = new T.CatmullRomCurve3(points, false, 'centripetal');
  const p = [], uv = [], ix = [];
  let axis = null;
  for (let j = 0; j <= steps; j++) {
    const u = j / steps, c = curve.getPointAt(u), t = curve.getTangentAt(u);
    // the strap's face lies on the body: its width runs across the tangent, flat to the surface normal (n ~ out of him)
    const out = new T.Vector3(c.x, 0, c.z); if (out.lengthSq() < 1e-6) out.set(0, 0, 1); out.normalize();
    let side = new T.Vector3().crossVectors(t, out);
    if (side.lengthSq() < 1e-6) side = axis ? axis.clone() : new T.Vector3(1, 0, 0);
    side.normalize(); if (axis && side.dot(axis) < 0) side.negate(); axis = side;
    const normal = new T.Vector3().crossVectors(side, t).normalize();
    const w = width * (0.55 + 0.45 * Math.min(1, Math.min(u, 1 - u) / 0.06));   // narrower where it runs through the rings (their 2.3 cm bore)
    for (const [s, h] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const v = c.clone().addScaledVector(side, s * w / 2).addScaledVector(normal, h * thickness / 2);
      p.push(v.x, v.y, v.z); uv.push((s + 1) / 2, u * 8);
    }
  }
  for (let j = 0; j < steps; j++) for (const [a, b] of [[0, 1], [1, 3], [3, 2], [2, 0]]) { const x = j * 4 + a, y = j * 4 + b; ix.push(x, x + 4, y, y, x + 4, y + 4); }
  const last = 4 * steps; ix.push(0, 1, 3, 0, 3, 2, last, last + 3, last + 1, last, last + 2, last + 3);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(ix); g.computeVertexNormals();
  return g;
}

// The path of a slung gun's sling over him (torso frame, y absolute), for the gun on `side`: from the rear stud round his
// opposite side at the belt, up across his chest to the shoulder on the gun's side, over its top and down its back to the
// front stud. `layer` lifts it off whatever band already crosses the chest the same way.
// how far round a chest point the strap is lifted over what stands proud there (a pouch, a buckle): its own half width and a
// little (tcc347: a wider look floated it 4-5 cm off the carrier's lower edge, under the pouches)
export const FRONT_NB = [-0.02, 0, 0.02];
// `band`: a bandolier crosses his chest the same way (its own diagonal, a few cm under this one): the strap runs above it,
// on the shirt or carrier (tcc347: on the 40 mm rounds it stood 4.2-4.9 cm off him), and lifts over it only where the two
// meet toward the shoulder; layer then is its lift over the other strap only.
export const BAND_LIFT = 0.012, BAND_ABOVE = 0.045;
export function slingPath(T, side, vest, layer = 0, band = false) {
  const S = vest ? SURFACE.vest : SURFACE.shirt, o = -side, slot = band ? Math.max(0, layer - BAND_LIFT) : layer;
  let off = 0.006 + layer;
  // the chest under the point, raised over a pouch, buckle or strap within 3 cm that stands up to 3 cm higher (a higher one is
  // something else in front of him, a radio or his chin: the strap goes under it, not over)
  const front = (x, y) => {
    const c = surfaceZ(S.front, x, y);
    let z = c === null ? -Infinity : c;
    for (const dx of FRONT_NB) for (const dy of FRONT_NB) { const q = surfaceZ(S.front, x + dx, y + dy); if (q !== null && (c === null || q - c < 0.03)) z = Math.max(z, q); }
    return new T.Vector3(x, y, (Number.isFinite(z) ? z : 0.15) + off);
  };
  const back = (x, y) => { let z = Infinity; for (const dx of [-0.03, 0, 0.03]) { const q = surfaceZ(S.back, x + dx, y); if (q !== null) z = Math.min(z, q); } return new T.Vector3(x, y, (Number.isFinite(z) ? z : -0.1) - off); };
  const sideX = (vest ? 0.185 : 0.19) + off;   // his side at the belt's top (shirt .184-.194 at z -.05/.05, y .9)
  const pts = [];
  // round the opposite side, just above the belt
  pts.push(back(o * 0.13, 0.9));
  pts.push(new T.Vector3(o * (sideX - 0.012), 0.9, -0.06));
  pts.push(new T.Vector3(o * sideX, 0.9, 0.02));
  const y0 = 0.92;
  // across the chest: from the opposite hip's front up to the gun-side shoulder's front
  for (const t of [0, 0.2, 0.4, 0.6, 0.8, 0.95]) {
    const k = band ? Math.min(1, Math.max(0, (t - 0.6) / 0.3)) : 1, lift = band ? BAND_ABOVE * (1 - k) : 0;   // above the band, then over it
    off = 0.006 + slot + (band ? BAND_LIFT * k : 0);
    pts.push(front(o * 0.135 + (side * 0.15 - o * 0.135) * t, y0 + lift + (1.19 - y0 - lift) * t));
  }
  off = 0.006 + layer;
  // over the shoulder (its top, then its back), as CC-347 measured it
  // (the layer lifts it over the other strap and the bandolier where they cross the chest; neither goes over this shoulder, so
  // here it lies on him: tcc347 measured a launcher's strap 4.2 cm off the shoulder's top with the chest's lift carried over)
  const sh = 0.006;
  pts.push(new T.Vector3(side * 0.17, 1.247 + sh * 0.6, 0.0));
  pts.push(new T.Vector3(side * 0.174, 1.21, -0.066 - sh));
  return pts;
}

// A ring turned on its stud (about the stud's normal, radians) where the gun has a raised detail beside the stud, per side the
// gun shows him ([its -x side, its +x side]) and per stud ([rear, front]); found by the weapon seating audit (tgt20076's).
export const SLING_RING_TURN = { launcher: [[0.52, 0.79], [-0.52, 0.79]], flamer: [[0.52, 0], [0, 0]] };

// Sling a gun: the strap from its rear stud over him to its front stud, a metal ring on each stud (GP-156's seat: the ring on the
// stud's face, the webbing through it), on the gun's side that faces him. The strap mesh lives in the spot's frame (it moves with
// the gun and the torso); `strap` is the spot's sling mesh.
export function fitBackSling(T, spot, side, tp, vest, clipMaterial, layer = 0, band = layer > BAND_LIFT - 0.0015) {
  const strap = spot.sling, model = spot.gun && spot.gun.children[0], spec = SLING_STUDS[spot.kind];
  strap.visible = !!(model && spec);
  if (!strap.visible) { strap.userData.signature = null; return null; }
  spot.g.updateMatrix(); spot.gun.updateMatrix(); model.updateMatrix();
  const modelToSpot = new T.Matrix4().multiplyMatrices(spot.gun.matrix, model.matrix);
  const toTorso = new T.Matrix4().multiplyMatrices(spot.g.matrix, modelToSpot);
  const sig = spot.kind + ':' + vest + ':' + layer + ':' + band + ':' + toTorso.elements.map((e) => e.toFixed(4)).join(',');
  if (strap.userData.signature === sig) return strap.userData.fit;
  // the gun's flat side toward him: for the gun on his +x half that is its -x side, on the other its +x side (backBasis)
  const toward = new T.Vector3(1, 0, 0).transformDirection(toTorso).z > 0 ? 1 : -1, only = SLING_STUD_SIDE[spot.kind] || [0, 0];
  const sgn = spec.map((p, i) => only[i] || toward);   // the side each ring sits on
  const faces = spec.map((p, i) => (only[i] ? p : toward > 0 ? (SLING_POSITIVE[spot.kind] && SLING_POSITIVE[spot.kind][i]) || p : (SLING_NEGATIVE[spot.kind] && SLING_NEGATIVE[spot.kind][i]) || p));
  const seats = faces.map((p, i) => new T.Vector3(sgn[i] * Math.abs(p[0]), p[1], p[2]));
  const inv = new T.Matrix4().copy(spot.g.matrix).invert();
  const body = slingPath(T, side, vest, layer, band).map((p) => p.setY(p.y - tp));
  const major = 0.015, minor = 0.0035;
  const frames = seats.map((seat, i) => {
    const s = faces[i];
    const out = new T.Vector3(sgn[i] * (s[3] !== undefined ? Math.abs(s[3]) : 1), s[4] || 0, s[5] || 0).transformDirection(modelToSpot);
    const at = seat.clone().applyMatrix4(modelToSpot);   // spot frame
    // the ring lies along the gun (its long axis, off the stud's face), the way the strap pulls: toward the stock for the rear
    // stud, the muzzle for the front one (rings turned toward the body's path swung into the stock and the furniture beside them)
    const tangent = new T.Vector3(0, 0, i === 0 ? -1 : 1).transformDirection(modelToSpot);
    tangent.addScaledVector(out, -out.dot(tangent));
    if (tangent.lengthSq() < 1e-8) tangent.set(0, 1, 0).addScaledVector(out, -out.y);
    tangent.normalize();
    const turn = SLING_RING_TURN[spot.kind] && SLING_RING_TURN[spot.kind][toward > 0 ? 1 : 0];
    if (turn && turn[i]) tangent.applyAxisAngle(out, turn[i]);
    const normal = new T.Vector3().crossVectors(out, tangent).normalize();
    return { out, tangent, normal, center: at.clone().addScaledVector(out, major + minor), web: at.clone().addScaledVector(out, 2 * (major + minor) - 0.0002) };
  });
  const web = frames.map((f) => f.web.clone().applyMatrix4(spot.g.matrix));
  // from each ring toward him: straight off the stud's face, or (a stud on the far side) over the gun's top and down its near side
  const leads = frames.map((f, i) => {
    if (sgn[i] === toward) return [f.web.clone().addScaledVector(f.out, (toward > 0 && SLING_LEAD[spot.kind] || [0.045, 0.045])[i]).applyMatrix4(spot.g.matrix)];
    const w = (SLING_WRAP[spot.kind] && SLING_WRAP[spot.kind][i]) || { top: 0.05, half: 0.05 }, s = sgn[i], p = faces[i], c = 0.012;
    return [[s * (Math.abs(p[0]) + 2 * (major + minor) + 0.006), p[1] + 0.012, p[2]], [s * (w.half + 0.008), w.top + c, p[2]], [-s * (w.half + 0.008), w.top + c, p[2]],
      [-s * (w.half + c), p[1], p[2]], [-s * (w.half + 0.05), p[1] - 0.01, p[2]]].map((q) => new T.Vector3(...q).applyMatrix4(modelToSpot).applyMatrix4(spot.g.matrix));
  });
  const pts = [web[0], ...leads[0], ...body, ...leads[1].slice().reverse(), web[1]];
  const geo = ribbon(T, pts); geo.applyMatrix4(inv);
  if (strap.geometry) strap.geometry.dispose();
  strap.geometry = geo;
  if (!strap.userData.clips) {
    strap.userData.clips = [0, 1].map(() => { const c = new T.Mesh(new T.TorusGeometry(major, minor, 4, 10), clipMaterial); c.castShadow = true; strap.add(c); return c; });
  }
  frames.forEach((f, i) => {
    const c = strap.userData.clips[i];
    c.position.copy(f.center);
    c.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(f.out, f.tangent, f.normal));
  });
  strap.userData.signature = sig;
  // body: the path over him in the strap's frame (tcc347 measures the strap there against his body, kit and arm)
  strap.userData.fit = { ends: frames.map((f) => f.center.toArray()), path: pts.map((p) => p.toArray()), body: body.slice(0, -1).map((p) => p.clone().applyMatrix4(inv).toArray()) };   // (round his side, across the chest, to the shoulder's top)
  return strap.userData.fit;
}
