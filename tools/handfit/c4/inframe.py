# CD-1: how much of each glove the eye sees at the hip (the export's camera: fov, aspect), and the hand's spot on screen
import sys, json, base64, numpy as np
for f in sys.argv[1:]:
    D = json.load(open(f)); c = D['info']['cam']; M = np.array(c['mw']).reshape(4, 4).T; Mi = np.linalg.inv(M)
    t = np.tan(np.radians(c['fov']) / 2); out = []
    for sd in 'rl':
        H = D['hands'].get(sd)
        if not H or 'wor' not in H: continue
        W = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(float)
        P = (np.c_[W, np.ones(len(W))] @ Mi.T)[:, :3]; z = -P[:, 2]
        x = P[:, 0] / (z * t * c['aspect']); y = P[:, 1] / (z * t)
        ins = (z > 0.01) & (abs(x) < 1) & (abs(y) < 1)
        out.append(f"{sd}: {ins.mean()*100:.0f}% in frame, centre ndc ({x.mean():+.2f},{y.mean():+.2f}), depth {z.mean()*1000:.0f} mm")
    print(D['info']['key'], ' | '.join(out))
