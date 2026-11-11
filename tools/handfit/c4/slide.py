# slide.py <export> <r|l> '<gun-space dir>' [body,...] : how far a hand must slide (rigidly, along a gun-space direction: a grip's
# axis) to come out of the given closed bodies (depth3's numbering; default all), and how deep it then is in every body.
# Prints RESULT_GUN_DP (the shift in gun space) for VM_FIT's p. CD-1 (Claude 1): the flamer's hands up in its body.
import sys, json, numpy as np, os
f, sd, dv = sys.argv[1], sys.argv[2], np.array(json.loads(sys.argv[3]), float); only = [int(x) for x in sys.argv[4].split(',')] if len(sys.argv) > 4 else None
src = open('/home/claude/gs306/tools/handfit/c4/shift3.py').read(); src = src[:src.index('t = np.zeros(3)')]
sys.argv = ['x', f, sd]; g = {}; exec(src, g)
parts, deep, W0, Gm = g['parts'], g['deep'], g['W0'], g['Gm']
if only is not None:
    allp = list(parts); g['parts'][:] = [parts[i] for i in only]; g['meshes'][:] = [g['meshes'][i] for i in only]
dw = Gm[:3, :3] @ (dv / np.linalg.norm(dv)); dw /= np.linalg.norm(dw)   # world direction
lo, hi = 0.0, 0.12
if deep(W0)[0] <= 0.0004: print('already clear'); hi = 0
else:
    while hi - lo > 0.0005:
        mid = (lo + hi) / 2
        if deep(W0 + dw * mid)[0] <= 0.0004: hi = mid
        else: lo = mid
t = dw * hi; Gi = np.linalg.inv(Gm)
print('slide world mm', round(hi * 1000, 1))
print('RESULT_GUN_DP', json.dumps(list(np.round(Gi[:3, :3] @ t, 6))))
