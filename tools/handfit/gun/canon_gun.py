# the gun's triangles in one hand's canonical space, optionally the solver's move applied (the gun the other way), as b64
import sys, json, base64, numpy as np
gun_json, side_key, out = sys.argv[1], sys.argv[2], sys.argv[3]
mv = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None   # {"move":[mm x3], "turn":[a, b2]}
D = json.load(open(gun_json)); H = D['hands'][side_key]
MW = np.array(H['mw'], dtype=np.float64).reshape(4, 4).T; Mi = np.linalg.inv(MW); s, ox, gz = H['side'], H['ox'], H['gz']
allp = []
for part in D['parts']:
    T = np.frombuffer(base64.b64decode(part['b64']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
    P4 = np.c_[T, np.ones(len(T))] @ Mi.T
    C = np.c_[s * (P4[:, 0] - ox), P4[:, 1], P4[:, 2] - gz]
    if s < 0: C = C.reshape(-1, 3, 3)[:, ::-1].reshape(-1, 3)
    allp.append(C)
P = np.concatenate(allp)
if mv:
    c = np.array([0, -0.271, 0.008]); d = np.array(mv['move']) / 1000; a, b2 = mv['turn']
    # the gun the other way: p_gun' = Rinv applied... the solver tests the hand point h at gun(R(h - d - c) + c); so the gun's
    # points g are drawn at h = R^-1 (g - c) + c + d
    ca, sa, cb, sb = np.cos(a), np.sin(a), np.cos(b2), np.sin(b2)
    Ra = np.array([[ca, 0, sa], [0, 1, 0], [-sa, 0, ca]]); Rb = np.array([[cb, sb, 0], [-sb, cb, 0], [0, 0, 1]])
    R = Rb @ Ra
    P = (P - c) @ np.linalg.inv(R).T + c + d
json.dump({ 'tris': base64.b64encode(P.astype(np.float32).tobytes()).decode() }, open(out, 'w'))
print(len(P) // 3, 'triangles')
