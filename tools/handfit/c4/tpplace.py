# tpplace.py <export.json> <fits.json> <out.json>: the 3P export with each hand named in fits ({r|l: {basis, p, pose}}, gun space)
# re-posed (the canonical gloved hand) and placed on the gun by its fit at the 3P hand-to-gun scale; prints each hand's wrist
# turn against the exported forearm (ARM_LIMITS: flex 75 / ext 70 / radial 20 / ulnar 35 deg; twist with the forearm's roll 85).
import json, sys, subprocess, base64, numpy as np, os
D = json.load(open(sys.argv[1])); FITS = json.load(open(sys.argv[2])); out = sys.argv[3]
W = np.array(D['info']['gunMw']).reshape(4, 4).T; sgun = abs(np.linalg.det(W[:3, :3])) ** (1 / 3)
def frame(fit):
    bx = np.array(fit['basis']['x'], float); by = np.array(fit['basis']['y'], float)
    bx /= np.linalg.norm(bx); by -= bx * (by @ bx); by /= np.linalg.norm(by); return np.c_[bx, by, np.cross(bx, by)]
def b64(a): return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
DEG = 180 / np.pi
def wrist_angles(R, side):   # R: the hand's turn on the forearm (wrist local), as core/body-limits.js wristAngles
    q = quat(R); tw = 2 * np.arctan2(q[1], q[3]); d = R.T @ np.array([0, 1, 0])
    return np.arctan2(d[2], d[1]) * DEG, np.degrees(np.arcsin(np.clip(d[0] * side, -1, 1))), np.degrees(np.arctan2(np.sin(tw), np.cos(tw)))
def quat(R):
    t = np.trace(R)
    if t > 0: s = np.sqrt(t + 1) * 2; return np.array([(R[2, 1] - R[1, 2]) / s, (R[0, 2] - R[2, 0]) / s, (R[1, 0] - R[0, 1]) / s, 0.25 * s])
    i = np.argmax(np.diag(R)); j, k = (i + 1) % 3, (i + 2) % 3; s = np.sqrt(1 + R[i, i] - R[j, j] - R[k, k]) * 2
    q = np.zeros(4); q[i] = 0.25 * s; q[j] = (R[j, i] + R[i, j]) / s; q[k] = (R[k, i] + R[i, k]) / s; q[3] = (R[k, j] - R[j, k]) / s; return q
def over(fl, dv):
    lf = 75 if fl >= 0 else 70; ld = 20 if dv >= 0 else 35; return (fl / lf) ** 2 + (dv / ld) ** 2
for sd, fit in FITS.items():
    H = D['hands'][sd]; MW = np.array(H['mw']).reshape(4, 4).T; hs = abs(np.linalg.det(MW[:3, :3])) ** (1 / 3); s = H['side']
    k = hs / sgun; R = frame(fit); g = np.array([H['ox'], -0.271, H['gz'] + 0.008])
    A = np.eye(4); A[:3, :3] = k * R; A[:3, 3] = np.array(fit['p']) - k * R @ g
    MWn = W @ A
    tmp = f'/tmp/ph-{os.getpid()}.json'; subprocess.check_call(['node', '/home/claude/c9/posehand.mjs', json.dumps(fit['pose']), tmp])
    P = json.load(open(tmp)); C = np.array(P['p']).reshape(-1, 3)
    Lc = np.c_[s * C[:, 0] + H['ox'], C[:, 1], C[:, 2] + H['gz']]
    Wp = (np.c_[Lc, np.ones(len(Lc))] @ MWn.T)[:, :3]
    idx = np.array(P['idx'], dtype=np.uint32).reshape(-1, 3)
    if s < 0: idx = idx[:, ::-1]
    H.update({'mw': MWn.T.reshape(-1).tolist(), 'pose': fit['pose'], 'n': len(Wp), 'wor': b64(Wp.astype(np.float32)), 'loc': b64(Lc.astype(np.float32)), 'idx': b64(idx.reshape(-1).astype(np.uint32)), 'which': 'canon-glove'})
    # the wrist's turn: the hand's world frame against the forearm's (the elbow group; the hand mesh has no turn of its own in the wrist)
    E = np.array(D['info']['arms'][sd]['elbow']).reshape(4, 4).T; Re = E[:3, :3] / np.linalg.norm(E[:3, 0])
    Rw = (W[:3, :3] / sgun) @ R; Rl = Re.T @ Rw
    fl, dv, tw = wrist_angles(Rl, s)
    Rold = (MW[:3, :3] / hs); fo, do, to = wrist_angles(Re.T @ Rold, s)
    print(sd, f'wrist on the exported forearm: flex {fl:.1f} dev {dv:.1f} twist {tw:.1f} deg (ellipse {over(fl, dv):.2f}); as exported: flex {fo:.1f} dev {do:.1f} twist {to:.1f}; roll', D['info']['roll'])
json.dump(D, open(out, 'w'))
