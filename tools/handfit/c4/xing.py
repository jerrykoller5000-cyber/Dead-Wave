# CD-1 fixes (11 Nov, cloud): xing.py
# xing.py <export> : gun surface through the glove surface between vertices: gun triangle edges crossing glove triangles, per hand,
# and the glove's edges crossing gun triangles (either means the surfaces intersect: drawn, the gun shows through the glove)
import sys, json, base64, numpy as np
D = json.load(open(sys.argv[1]))
def segtri(P0, P1, T):   # segments (m,2,3) x triangles (k,3,3) -> count of crossings per segment, and per triangle
    a = T[:, 0]; e1 = T[:, 1] - a; e2 = T[:, 2] - a
    hitS = np.zeros(len(P0), int); hitT = np.zeros(len(T), int)
    for c in range(0, len(P0), 256):
        o = P0[c:c+256][:, None]; d = (P1 - P0)[c:c+256][:, None]
        h = np.cross(d, e2[None]); det = np.einsum('ijk,jk->ij', h, e1); ok = np.abs(det) > 1e-18; f = np.where(ok, 1 / np.where(ok, det, 1), 0)
        s = o - a[None]; u = f * np.einsum('ijk,ijk->ij', s, h); q = np.cross(s, e1[None]); w = f * np.einsum('ijk,ijk->ij', d, q); t = f * np.einsum('jk,ijk->ij', e2, q)
        x = ok & (u >= 0) & (u <= 1) & (w >= 0) & (u + w <= 1) & (t >= 0) & (t <= 1)
        hitS[c:c+256] = x.sum(1); hitT += x.sum(0)
    return hitS, hitT
for sd, H in D['hands'].items():
    W = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
    I = np.frombuffer(base64.b64decode(H['idx']), dtype=np.uint32).reshape(-1, 3)
    G = W[I]; lo = W.min(0) - 0.002; hi = W.max(0) + 0.002
    tot = 0; rep = []
    for pi, p in enumerate(D['parts']):
        T = np.frombuffer(base64.b64decode(p['b64']), dtype=np.float32).reshape(-1, 3, 3).astype(np.float64)
        sel = np.any(np.all((T >= lo) & (T <= hi), 2), 1)
        if not sel.any(): continue
        T = T[sel]
        E = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
        # only glove triangles near this part
        plo = T.reshape(-1, 3).min(0) - 0.001; phi = T.reshape(-1, 3).max(0) + 0.001
        gs = np.where(np.any(np.all((G >= plo) & (G <= phi), 2), 1))[0]
        if not len(gs): continue
        hs, ht = segtri(E[:, 0], E[:, 1], G[gs])
        n = int((hs > 0).sum())
        if n:
            bad = gs[ht > 0]; cen = G[bad].mean(1)
            # the triangles' local place (hand frame)
            tot += n; rep.append((p['name'], pi, n, len(bad)))
            np.save(f'/home/claude/fpshot/xing-{sd}-{pi}.npy', bad)
    print(sd, 'gun edges through the glove', tot, rep)
