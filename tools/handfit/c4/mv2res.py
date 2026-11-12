# mv2res.py '<placement {a1,b2,c3,move}>' '<pose json>' [index f0 json] (CD-1 fixes 5): idxmove3's placement (the hand turned about
# the grip channel, then moved: field = R (p - C) + C + d) as a gungrip3/applyoff RES (field = R (p - m - C) + C: m = -R^T d)
import sys, json, numpy as np
P = json.loads(sys.argv[1]); pose = json.loads(sys.argv[2])
if len(sys.argv) > 3: pose['f'][0] = json.loads(sys.argv[3])
a, b, c = P.get('a1', 0), P.get('b2', 0), P.get('c3', 0); d = np.array(P['move'], float)
R1 = np.array([[np.cos(a), 0, np.sin(a)], [0, 1, 0], [-np.sin(a), 0, np.cos(a)]]); R2 = np.array([[np.cos(b), np.sin(b), 0], [-np.sin(b), np.cos(b), 0], [0, 0, 1]]); R3 = np.array([[1, 0, 0], [0, np.cos(c), np.sin(c)], [0, -np.sin(c), np.cos(c)]])
m = -(R3 @ R2 @ R1).T @ d
print(json.dumps({'move': [round(float(v), 4) for v in m], 'turn': [a, b, c], 'pose': pose}))
