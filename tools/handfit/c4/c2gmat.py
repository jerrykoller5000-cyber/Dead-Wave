# c2gmat.py <export> <r|l>: the 3x4 matrix (row-major, 12 numbers) from the canonical hand frame (m) to gun space (mm) (CD-1 fixes 5)
import sys, json, numpy as np
D = json.load(open(sys.argv[1])); H = D['hands'][sys.argv[2]]
MW = np.array(H['mw']).reshape(4, 4).T; Gi = np.linalg.inv(np.array(D['info']['gunMw']).reshape(4, 4).T)
S = np.array([[H['side'], 0, 0, H['ox']], [0, 1, 0, 0], [0, 0, 1, H['gz']], [0, 0, 0, 1.0]])
A = (Gi @ MW @ S)[:3] * 1000; print(json.dumps([round(float(v), 6) for v in A.ravel()]))
