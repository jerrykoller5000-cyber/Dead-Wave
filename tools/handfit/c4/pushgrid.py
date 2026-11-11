# pushgrid.py <export> <r|l> [step mm] [range mm] : the smallest rigid move (gun space) that brings a hand out of every closed
# body (as depth3 measures), from a grid of moves; for a hand wedged where two bodies meet (shift3.py oscillates there). CD-1.
import sys, json, numpy as np, itertools, time
f, sd = sys.argv[1], sys.argv[2]; st = float(sys.argv[3]) / 1000 if len(sys.argv) > 3 else 0.003; rg = float(sys.argv[4]) / 1000 if len(sys.argv) > 4 else 0.009
src = open('/home/claude/gs306/tools/handfit/c4/shift3.py').read(); src = src[:src.index('t = np.zeros(3)')]
sys.argv = ['x', f, sd]; g = {}; exec(src, g)
deep, W0, Gm = g['deep'], g['W0'], g['Gm']; Gi = np.linalg.inv(Gm)
ks = np.arange(-rg, rg + 1e-9, st); best = []
for a, b, c in itertools.product(ks, ks, ks):
    dg = np.array([a, b, c]); t = Gm[:3, :3] @ dg; w = deep(W0 + t)[0]
    best.append((w, float(np.linalg.norm(dg)), dg))
best.sort(key=lambda x: (round(x[0] * 1000 * 2) / 2, x[1]))
for w, n, dg in best[:5]: print('worst mm', round(w * 1000, 2), 'move gun mm', np.round(dg * 1000, 1))
print('RESULT_GUN_DP', json.dumps([round(float(x), 6) for x in best[0][2]]))
