# c2g.py <export> <r|l> '[[x,y,z],...]' : canonical hand points (m) -> gun space (mm)
import sys, json, numpy as np
D = json.load(open(sys.argv[1])); H = D['hands'][sys.argv[2]]; pts = json.loads(sys.argv[3])
MW = np.array(H['mw']).reshape(4, 4).T; Gi = np.linalg.inv(np.array(D['info']['gunMw']).reshape(4, 4).T)
for c in pts:
    L = np.array([H['side'] * c[0] + H['ox'], c[1], c[2] + H['gz'], 1.0]); g = Gi @ (MW @ L); print(np.round(g[:3] * 1000, 1))
