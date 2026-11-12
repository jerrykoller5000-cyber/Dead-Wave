# tpcheck.py <export> <fits.json for this gun>: each 3P hand as drawn against its fit (place mm real, turn deg), and the wrist (ARM_LIMITS)
import json, sys, numpy as np
D = json.load(open(sys.argv[1])); F = json.load(open(sys.argv[2]))
W = np.array(D['info']['gunMw']).reshape(4, 4).T; sg = abs(np.linalg.det(W[:3, :3])) ** (1 / 3)
for sd in 'rl':
    H = D['hands'][sd]; MW = np.array(H['mw']).reshape(4, 4).T; A = np.linalg.inv(W) @ MW
    R = A[:3, :3] / np.linalg.norm(A[:3, 0]); f = F[sd]
    bx = np.array(f['basis']['x'], float); by = np.array(f['basis']['y'], float); bx /= np.linalg.norm(bx); by -= bx * (by @ bx); by /= np.linalg.norm(by)
    Rf = np.c_[bx, by, np.cross(bx, by)]; ang = np.degrees(np.arccos(np.clip((np.trace(Rf.T @ R) - 1) / 2, -1, 1)))
    p = (A @ np.array([H['ox'], -0.271, H['gz'] + 0.008, 1]))[:3]
    L = D['info']['limits'][sd]
    print(sd, f"drawn vs fit: place {np.linalg.norm(p - np.array(f['p'])) * sg * 1000:.1f} mm, turn {ang:.1f} deg; wrist flex {np.degrees(L['flex']):.1f} dev {np.degrees(L['dev']):.1f} twist {np.degrees(L['twist']):.1f} roll {np.degrees(L['roll']):.1f} ok {L['ok']} ellipse {L['over']:.2f}")
