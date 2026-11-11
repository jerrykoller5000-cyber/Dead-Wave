# CD-1 fixes (11 Nov, cloud): loops.py
# loops.py <export> : the glove's open edges (vertices merged by position), grouped into loops: size, centroid (hand local)
import sys, json, base64, numpy as np
from collections import Counter, defaultdict
D = json.load(open(sys.argv[1]))
for sd, H in D['hands'].items():
    W = np.frombuffer(base64.b64decode(H['loc']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
    I = np.frombuffer(base64.b64decode(H['idx']), dtype=np.uint32).reshape(-1, 3)
    key = np.round(W * 1e6).astype(np.int64); _, rep = np.unique(key, axis=0, return_inverse=True); rep = rep.ravel()
    E = Counter()
    for t in I:
        a, b, c = rep[t]
        for u, v in ((a, b), (b, c), (c, a)): E[(min(u, v), max(u, v))] += 1
    bnd = [e for e, n in E.items() if n == 1]
    adj = defaultdict(list)
    for u, v in bnd: adj[u].append(v); adj[v].append(u)
    seen = set(); loops = []
    for s in adj:
        if s in seen: continue
        st = [s]; comp = []
        while st:
            x = st.pop()
            if x in seen: continue
            seen.add(x); comp.append(x); st += adj[x]
        loops.append(comp)
    pos = {}
    for i, r in enumerate(rep): pos[r] = W[i]
    print(sd, 'open edges', len(bnd), 'loops', len(loops))
    for c in sorted(loops, key=len, reverse=True)[:8]:
        P = np.array([pos[x] for x in c]); print('  ', len(c), P.mean(0).round(4), 'size', (P.max(0) - P.min(0)).round(4))
