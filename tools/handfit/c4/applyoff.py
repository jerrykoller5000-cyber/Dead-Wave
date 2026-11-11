# CD-1 pass 2: apply7's move without the page (the page runs out of memory iterating): a solve's RES {move, turn, pose}
# applied to VM_FIT's hand {basis, p} in the gun's space, and the check that a hand is drawn where VM_FIT puts it.
# The gun's scale: the two hands' grip points, world (export) over gun space (VM_FIT); the hand's: |det mw|^(1/3).
# applyoff.py <export.json> <gun> <r|l> '<RES json>'   -> prints the new {basis, p, pose}
# applyoff.py <export.json> <gun> check                 -> each hand: drawn vs VM_FIT (mm, rad)
import json, sys, subprocess, base64, numpy as np
import os
F = os.environ.get('FIT', '/home/claude/gs306/game/viewmodel-fit.js')
FIT = json.loads(subprocess.check_output(['node', '-e', f"import('{F}').then(m=>console.log(JSON.stringify(m.VM_FIT)))"]))
D = json.load(open(sys.argv[1])); gun = sys.argv[2]
def hand(sd):
    H = D['hands'][sd]; MW = np.array(H['mw']).reshape(4, 4).T
    g = np.array([H['ox'], -0.271, H['gz'] + 0.008, 1.0]); return H, MW, g
def frame(fit):
    bx = np.array(fit['basis']['x'], float); by = np.array(fit['basis']['y'], float)
    bx /= np.linalg.norm(bx); by -= bx * (by @ bx); by /= np.linalg.norm(by); return np.c_[bx, by, np.cross(bx, by)]
hs = {sd: abs(np.linalg.det(hand(sd)[1][:3, :3])) ** (1 / 3) for sd in 'rl'}
wg = {sd: (hand(sd)[1] @ hand(sd)[2])[:3] for sd in 'rl'}
pg = {sd: np.array(FIT[gun][sd]['p']) for sd in 'rl'}
sg = np.linalg.norm(wg['r'] - wg['l']) / np.linalg.norm(pg['r'] - pg['l'])
def Aof(fit, sd):
    k = hs[sd] / sg; R = frame(fit); g = hand(sd)[2][:3]; A = np.eye(4); A[:3, :3] = k * R; A[:3, 3] = np.array(fit['p']) - k * R @ g; return A
if sys.argv[3] == 'check':
    # the gun's world matrix from each hand (its fit as drawn); they agree when both hands are drawn where VM_FIT puts them
    Wg = {sd: hand(sd)[1] @ np.linalg.inv(Aof(FIT[gun][sd], sd)) for sd in 'rl'}
    print('gun scale', round(sg, 4), 'hand scale', {k: round(v, 4) for k, v in hs.items()})
    for sd in 'rl':
        o = 'l' if sd == 'r' else 'r'; A = np.linalg.inv(Wg[o]) @ hand(sd)[1]   # this hand as drawn, in the gun's space by the other hand's fit
        R = A[:3, :3] / np.linalg.norm(A[:3, 0]); Rf = frame(FIT[gun][sd]); p = (A @ hand(sd)[2])[:3]
        ang = np.degrees(np.arccos(np.clip((np.trace(Rf.T @ R) - 1) / 2, -1, 1)))
        print(sd, 'drawn vs fit: place', round(np.linalg.norm(p - pg[sd]) * sg * 1000, 2), 'mm (real), turn', round(float(ang), 2), 'deg')
    sys.exit()
sd = sys.argv[3]; RES = json.loads(sys.argv[4]); fit = FIT[gun][sd]; H = hand(sd)[0]; s = H['side']
a, b, c = (RES['turn'] + [0, 0, 0])[:3]; Dm = np.array(RES['move']) / 1000; C = np.array([0, -0.271, 0.008])
R1 = np.array([[np.cos(a), 0, np.sin(a)], [0, 1, 0], [-np.sin(a), 0, np.cos(a)]]); R2 = np.array([[np.cos(b), np.sin(b), 0], [-np.sin(b), np.cos(b), 0], [0, 0, 1]]); R3 = np.array([[1, 0, 0], [0, np.cos(c), np.sin(c)], [0, -np.sin(c), np.cos(c)]])
Rr = R3 @ R2 @ R1; Ms = np.diag([s, 1, 1]); Lin = Ms @ Rr @ Ms; O = np.array([H['ox'], 0, H['gz']])
tr = -Lin @ O - Ms @ Rr @ (C + Dm) + Ms @ C + O
N = np.eye(4); N[:3, :3] = Lin; N[:3, 3] = tr
g = hand(sd)[2]
if 'gunMw' in D['info']:   # the hand as drawn (the game's twist rolls it round its grip from the fit's basis): the solve was made on it
    A = np.linalg.inv(np.array(D['info']['gunMw']).reshape(4, 4).T) @ hand(sd)[1]
else: A = Aof(fit, sd)
At = A @ N; nx = At[:3, 0] / np.linalg.norm(At[:3, 0]); ny = At[:3, 1] / np.linalg.norm(At[:3, 1])
if 'gunMw' in D['info']:
    # the game's twist (twistToward) turns the fit's basis round x toward the elbow, at most 0.6 rad: where the export shows
    # it at its limit, the fit is the drawn hand turned back by that same angle, so the new fit carries the same turn
    dx = A[:3, 0] / np.linalg.norm(A[:3, 0]); dy = A[:3, 1] / np.linalg.norm(A[:3, 1])
    fy = np.array(fit['basis']['y'], float); fy -= dx * (fy @ dx); fy /= np.linalg.norm(fy)
    al = float(np.arctan2(np.cross(dy, fy) @ dx, dy @ fy))
    if abs(al) > 0.55:
        ny = ny - nx * (ny @ nx); ny /= np.linalg.norm(ny)
        ny = ny * np.cos(al) + np.cross(nx, ny) * np.sin(al)
    elif os.environ.get('ROLL'):
        # the twist free at the export: the drawn y is the elbow's own line; a roll the solve wants away from it is held by
        # putting the fit 0.6 rad (the twist's limit) further round, so the twist stops at its limit on the wanted roll
        hy = dy - nx * (dy @ nx); hy /= np.linalg.norm(hy); ny = ny - nx * (ny @ nx); ny /= np.linalg.norm(ny)
        de = float(np.arctan2(np.cross(hy, ny) @ nx, hy @ ny))
        if abs(de) > 0.03: ny = ny * np.cos(0.6 * np.sign(de)) + np.cross(nx, ny) * np.sin(0.6 * np.sign(de))
        sys.stderr.write(f'roll wanted off the elbow line: {de:.3f} rad\n')
    sys.stderr.write(f'twist at the export: {al:.3f} rad ({"at its limit: carried" if abs(al) > 0.55 else "free: the elbow sets the roll"})\n')
p = (At @ g)[:3]
r5 = lambda v: [round(float(x), 5) for x in v]
print(json.dumps({'basis': {'x': r5(nx), 'y': r5(ny)}, 'p': r5(p), 'pose': RES['pose']}))
