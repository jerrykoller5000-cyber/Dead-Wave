# lm.py <export> [side]: hand landmarks in cam space (x right, y up, -z ahead; mm) and in the gun's space
import json, sys, subprocess, numpy as np, base64
f = sys.argv[1]; sd = sys.argv[2] if len(sys.argv) > 2 else 'l'
d = json.load(open(f)); W = json.loads(subprocess.check_output(['node', '/home/claude/work/lm.mjs', f, sd]))
C = np.array(d['info']['cam']['mw']).reshape(4, 4).T; G = np.array(d['info']['gunMw']).reshape(4, 4).T; Gi = np.linalg.inv(G)
cam = lambda p: (C[:3, :3].T @ (np.array(p) - C[:3, 3]))
gun = lambda p: (Gi @ np.r_[p, 1])[:3]
for k, p in W.items(): print(f'{k:10s} cam {np.round(cam(p)*1000):} gun {np.round(gun(p)*1000)}')
fore = d['arms'][sd]['fore']; P = np.frombuffer(base64.b64decode(fore['wor']), np.float32).reshape(-1, 3)
Q = (P - C[:3, 3]) @ C[:3, :3]
# the forearm's axis: principal direction, and its far end (toward the elbow)
c = Q.mean(0); u, s, vt = np.linalg.svd(Q - c); a = vt[0]; wr = cam(W['wrist']); a = a if (c - wr) @ a > 0 else -a
print('forearm dir (cam, wrist->elbow)', np.round(a, 3), ' far end', np.round((c + a * (Q - c) @ a).max() if False else (Q[np.argmax((Q - c) @ a)]) * 1000))
