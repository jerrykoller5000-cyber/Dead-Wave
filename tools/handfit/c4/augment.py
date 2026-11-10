# the gun's export with the other hand added as a closed part (its glove, the wrist's opening capped): for a support hand
# fitted round the firing hand (D-140: neither hand through the other)
import sys, json, base64, numpy as np, trimesh
src, other, out = sys.argv[1:4]
D = json.load(open(src)); h = D['hands'][other]
W = np.frombuffer(base64.b64decode(h['wor']), dtype=np.float32).reshape(-1, 3).astype(float)
I = np.frombuffer(base64.b64decode(h['idx']), dtype=np.uint32).reshape(-1, 3)
m = trimesh.Trimesh(W, I, process=True)
E = m.edges[trimesh.grouping.group_rows(m.edges_sorted, require_count=1)]   # boundary edges, as the faces run
nxt = {int(a): int(b) for a, b in E}; faces = [f for f in m.faces]; V = list(m.vertices); seen = set()
for s in list(nxt):
    if s in seen: continue
    loop = [s]; seen.add(s)
    while nxt.get(loop[-1]) is not None and nxt[loop[-1]] not in seen: loop.append(nxt[loop[-1]]); seen.add(loop[-1])
    c = len(V); V.append(np.mean([m.vertices[i] for i in loop], 0))
    for i in range(len(loop)): faces.append([loop[(i + 1) % len(loop)], loop[i], c])   # reversed: the cap faces out
m = trimesh.Trimesh(np.array(V), np.array(faces), process=True)
print('capped watertight', m.is_watertight, len(m.faces))
T = m.vertices[m.faces].reshape(-1, 3).astype(np.float32)
D['parts'].append({'name': 'hand-' + other, 'tris': len(m.faces), 'b64': base64.b64encode(T.tobytes()).decode()})
json.dump(D, open(out, 'w'))
