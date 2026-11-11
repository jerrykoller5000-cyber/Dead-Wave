# bodies.py <export> [parts]: each closed body: depth3 index, part, faces, gun-space box (mm)
import sys, json, base64, numpy as np
src = open('/home/claude/gs306/tools/handfit/c4/depth3.py').read(); src = src[:src.index('for p in D')]
sys.argv = ['x', sys.argv[1]] + sys.argv[2:]; g = {}; exec(src, g); D = g['D']
only = [int(x) for x in sys.argv[2].split(',')] if len(sys.argv) > 2 else None
Gi = np.linalg.inv(np.array(D['info']['gunMw']).reshape(4, 4).T); i = 0
for j, p in enumerate(D['parts']):
    T = np.frombuffer(base64.b64decode(p['b64']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
    for B in g['bodies'](T):
        if not g['closed'](B): continue
        if only is None or j in only:
            q = (np.c_[B, np.ones(len(B))] @ Gi.T)[:, :3]
            print(i, j, p['name'], len(B) // 3, np.round(q.min(0) * 1000, 1), np.round(q.max(0) * 1000, 1))
        i += 1
