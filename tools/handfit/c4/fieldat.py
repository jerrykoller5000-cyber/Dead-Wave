# the old grid's value at a re-export's hand vertices (mapped into the grid's canonical frame through the gun): checks the apply
import sys, json, base64, numpy as np
from scipy.ndimage import map_coordinates
grid, old, new, sd = sys.argv[1:5]
G = json.load(open(grid + '.json')); F = np.fromfile(grid + '.bin', dtype=np.float32).reshape(G['dims'])
def frame(D):
    H = D['hands'][sd]; return np.array(H['mw']).reshape(4, 4).T, H['side'], H['ox'], H['gz']
O = json.load(open(old)); N = json.load(open(new))
# gun frame: the first part's triangles, to carry the gun's move between the exports (both world)
def gunM(D):
    P = np.frombuffer(base64.b64decode(D['parts'][0]['b64']), dtype=np.float32).reshape(-1, 3).astype(float)[:3]
    return P
Pa, Pb = gunM(O), gunM(N)
print('gun shift between exports mm', (np.abs(Pa - Pb).max() * 1000).round(2))
MWo, s, ox, gz = frame(O)
W = np.frombuffer(base64.b64decode(N['hands'][sd]['wor']), dtype=np.float32).reshape(-1, 3).astype(float)
W = W - Pb[0] + Pa[0]   # assume a pure translation of the whole view between the two
P4 = np.c_[W, np.ones(len(W))] @ np.linalg.inv(MWo).T
C = np.c_[s * (P4[:, 0] - ox), P4[:, 1], P4[:, 2] - gz]
idx = ((C - np.array(G['origin'])) / G['step']).T
v = map_coordinates(F, idx, order=1, mode='nearest')
print('field min mm', round(v.min() * 1000, 2), 'verts < -0.3 mm:', int((v < -0.0003).sum()))
