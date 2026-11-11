# tgt.py <export> <r|l> x y z : a point in the gun's space (local) in the hand's field space (canonical), metres
import sys, json, numpy as np
D = json.load(open(sys.argv[1])); H = D['hands'][sys.argv[2]]
W = np.array(D['info']['gunMw']).reshape(4, 4).T; MW = np.array(H['mw']).reshape(4, 4).T
p = W @ np.array([float(v) for v in sys.argv[3:6]] + [1.0]); q = np.linalg.inv(MW) @ p
print(json.dumps([round(H['side'] * (q[0] - H['ox']), 5), round(q[1], 5), round(q[2] - H['gz'], 5)]))
