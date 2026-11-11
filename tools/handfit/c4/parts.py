# CD-1 fixes (11 Nov, cloud): parts.py
# parts.py <export> [ids]: each part: closed (as clip-check), triangles, its box in the gun's own space (mm)
import sys, json, base64, numpy as np
from collections import Counter
D = json.load(open(sys.argv[1])); ids = [int(x) for x in sys.argv[2].split(',')] if len(sys.argv) > 2 else None
Wi = np.linalg.inv(np.array(D['info']['gunMw']).reshape(4, 4).T)
def closed(P):
    k = np.round(P * 1e5).astype(np.int64); E = Counter()
    for t in range(0, len(k), 3):
        a, b, c = map(tuple, k[t:t + 3])
        for u, v in ((a, b), (b, c), (c, a)): E[(u, v) if u < v else (v, u)] += 1
    bad = sum(1 for c in E.values() if c != 2); return bad
for i, p in enumerate(D['parts']):
    if ids and i not in ids: continue
    T = np.frombuffer(base64.b64decode(p['b64']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
    L = (Wi @ np.c_[T, np.ones(len(T))].T).T[:, :3]
    print(i, p['name'], p['tris'], 'open edges', closed(T), 'box mm', (L.min(0) * 1000).round(1), (L.max(0) * 1000).round(1))
