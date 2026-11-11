# pretwist.py <export> <gun> <side> <fit json in> <fit json out>: the fit turned about its x against the twist the game added (so the drawn hand = this fit)
import json, sys, numpy as np
d = json.load(open(sys.argv[1])); W = np.array(d['info']['gunMw']).reshape(4, 4).T
H = d['hands'][sys.argv[3]]; A = np.linalg.inv(W) @ np.array(H['mw']).reshape(4, 4).T
n = lambda v: np.array(v, float) / np.linalg.norm(v)
dy = n(A[:3, 1]); f = json.load(open(sys.argv[4])); x = n(f['basis']['x']); y = n(f['basis']['y']); y = n(y - x * (x @ y))
dy = n(dy - x * (x @ dy)); ang = np.arctan2(np.cross(y, dy) @ x, y @ dy)
c, s = np.cos(-ang), np.sin(-ang); R = lambda v: v * c + np.cross(x, v) * s + x * (x @ v) * (1 - c)
f['basis']['y'] = [round(float(t), 5) for t in R(y)]
print('twist seen', round(float(np.degrees(ang)), 1), 'deg; fit turned back by it', file=sys.stderr)
json.dump(f, open(sys.argv[5], 'w'))
