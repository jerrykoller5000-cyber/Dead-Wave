# sdf_c6.py (CD-13, Claude 1, 13 Nov) = sdf_c5.py with OPENSIGN=1: an open body signed by its nearest face's normal (behind it
# reads inside, within the band), so a solve can't pass a thumb through an open frame shell (the pistol's frame, J151 note 3).
# sdf_c5.py = sdf_c4.py (CD-1, 12 Nov) with: the open bodies lumped together ('/open') never closed (they closed inverted round
# the AK's guard and read -16 mm across its opening); a closed body wound inside out inverted first; the deep inside by a vote.
# trimesh's merge still closes shells the test calls open (the AK receiver's underside): kept, they are solid to the eye.
# The gun's signed distance field in one hand's canonical space (the right hand at 0, 0; the left mirrored back), on a
# grid over the hand's reach, in a band about each part (beyond it: 'far', +BAND). Each part on its own (trimesh: the
# distance exact, the sign by containment for a closed part; an open part has no inside), the union the min over parts.
# Writes <out>.bin (float32, z fastest) and <out>.json (origin, step, dims, the parts).
import sys, json, base64, numpy as np, trimesh
from scipy import ndimage
gun_json, side_key, out = sys.argv[1], sys.argv[2], sys.argv[3]
STEP = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0008
import os
BAND = float(os.environ.get("BAND", "0.0055"))
D = json.load(open(gun_json))
H = D['hands'][side_key]
MW = np.array(H['mw'], dtype=np.float64).reshape(4, 4).T
Mi = np.linalg.inv(MW)
s, ox, gz = H['side'], H['ox'], H['gz']
def to_canon(P):
    P4 = np.c_[P, np.ones(len(P))] @ Mi.T
    return np.c_[s * (P4[:, 0] - ox), P4[:, 1], P4[:, 2] - gz]
wor = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
canon_hand = to_canon(wor)
PAD = float(os.environ.get('PAD', '0.010'))   # CD-1 fixes 4: a wider box when a finger moves far (an index straightened out of it read 10 mm clean)
lo = canon_hand.min(0) - PAD; hi = canon_hand.max(0) + PAD
dims = np.ceil((hi - lo) / STEP).astype(int) + 1
field = np.full(tuple(dims), BAND, dtype=np.float32)
facts = []
nb = int(np.ceil(BAND / STEP))
# CD-1: a part made of several closed bodies (a grip and a shroud in one mesh) is split into its bodies: trimesh's sign
# went wrong on such a part (the fingers read outside where tools/tests/clip-check.js, by the ray's parity, reads inside)
def bodies(part):
    T = np.frombuffer(base64.b64decode(part['b64']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
    if len(T) < 3: return []
    T = np.round(T * 1e5) / 1e5   # as clip-check.js keys the corners (10 um), so a part it calls closed is closed here
    m = trimesh.Trimesh(vertices=T, faces=np.arange(len(T)).reshape(-1, 3), process=True)
    if not len(m.faces): return [(part['name'], T)]
    bs = m.split(only_watertight=False)   # CD-1 fixes: split even when some bodies are open (the revolver's grip + its checkering)
    if len(bs) <= 1: return [(part['name'], T)]
    shut = [b for b in bs if b.is_watertight]; ope = [b for b in bs if not b.is_watertight]
    out = [(part['name'] + '/' + str(i), b.vertices[b.faces].reshape(-1, 3)) for i, b in enumerate(shut)]
    OM = int(os.environ.get('OPENMIN', '200'))   # sdf_c6: a big open shell (a grip's side panel) on its own, signed by its normals; the small ones lumped, unsigned
    big = [b for b in ope if len(b.faces) >= OM] if os.environ.get('OPENSIGN') else []; small = [b for b in ope if not any(b is c for c in big)]
    for i, b in enumerate(big): out.append((part['name'] + '/openS' + str(i), b.vertices[b.faces].reshape(-1, 3)))
    if small: out.append((part['name'] + '/open', np.concatenate([b.vertices[b.faces].reshape(-1, 3) for b in small])))   # the open ones together
    return out
ALLB = [b for part in D['parts'] for b in bodies(part)]
for bname, T in ALLB:
    part = {'name': bname}
    C = to_canon(T)
    pmin = C.min(0) - BAND; pmax = C.max(0) + BAND
    if np.any(pmax < lo) or np.any(pmin > hi): continue
    faces = np.arange(len(C)).reshape(-1, 3)
    if s < 0: faces = faces[:, ::-1]
    m = trimesh.Trimesh(vertices=C, faces=faces, process=True)   # merges the soup's shared corners
    m.remove_degenerate_faces() if hasattr(m, 'remove_degenerate_faces') else None
    if len(m.faces) == 0: continue
    closed = bool(m.is_watertight and not bname.endswith('/open')) or bname.startswith('hand-')   # sdf_c5: the open bodies lumped together can close (inverted: read -16 mm all round the AK's guard): never closed
    if closed and m.is_watertight and m.volume < 0: m.invert()   # sdf_c5: a body wound inside out (the parity test doesn't care; trimesh's sign does)
    # the band: the part's surface voxelised, grown by the band
    i0 = np.maximum(0, np.floor((pmin - lo) / STEP).astype(int)); i1 = np.minimum(dims, np.ceil((pmax - lo) / STEP).astype(int) + 1)
    if np.any(i1 <= i0): continue
    sub = tuple(i1 - i0)
    occ = np.zeros(sub, dtype=bool)
    pts, _ = trimesh.sample.sample_surface(m, max(2000, int(m.area / (STEP * STEP) * 4)))
    pts = np.r_[pts, m.vertices]
    ij = np.floor((pts - lo) / STEP).astype(int) - i0
    okm = np.all((ij >= 0) & (ij < np.array(sub)), axis=1); ij = ij[okm]
    occ[ij[:, 0], ij[:, 1], ij[:, 2]] = True
    if closed:   # and its inside, wherever the hand could be
        occ = ndimage.binary_fill_holes(occ) | occ
    band = ndimage.binary_dilation(occ, iterations=nb) if occ.any() else occ
    idx = np.argwhere(band)
    if len(idx) == 0: continue
    Q = lo + (idx + i0) * STEP
    sd = np.empty(len(Q))
    for c0 in range(0, len(Q), 3000):
        q = Q[c0:c0 + 3000]
        if closed: sd[c0:c0 + 3000] = -trimesh.proximity.signed_distance(m, q)   # trimesh: inside positive; here inside negative
        elif '/openS' in bname:
            cp, dd, ti = trimesh.proximity.closest_point(m, q)
            sg = np.sign(np.einsum('ij,ij->i', q - cp, m.face_normals[ti])); sg[sg == 0] = 1
            sd[c0:c0 + 3000] = dd * sg
        else: sd[c0:c0 + 3000] = trimesh.proximity.closest_point(m, q)[1]
    sd = np.clip(sd, -0.05, BAND).astype(np.float32)
    g = idx + i0
    cur = field[g[:, 0], g[:, 1], g[:, 2]]
    field[g[:, 0], g[:, 1], g[:, 2]] = np.minimum(cur, sd)
    if closed:   # the deep inside, past the band (the part may run out of the box, so its shell is not closed in it): each
        # piece of the box outside the band is all in or all out; one cell of each asked
        lab, nl = ndimage.label(~band)
        for c in range(1, nl + 1):
            cells = np.argwhere(lab == c)   # sdf_c5 (CD-1, 12 Nov): one cell's contains() was wrong for the AK blade's box corner (a
            # slab of false 'inside' across the guard's opening): vote over up to 9 cells spread through the piece
            pick = cells[np.linspace(0, len(cells) - 1, min(9, len(cells))).astype(int)]
            q = lo + (pick + i0) * STEP
            if m.contains(q).sum() * 2 > len(q):
                sub = field[i0[0]:i1[0], i0[1]:i1[1], i0[2]:i1[2]]
                sub[lab == c] = np.minimum(sub[lab == c], -BAND)
    facts.append({ 'name': part['name'], 'tris': int(len(m.faces)), 'closed': closed, 'cells': int(len(idx)) })
field.tofile(out + '.bin')
json.dump({ 'origin': lo.tolist(), 'step': STEP, 'dims': dims.tolist(), 'band': BAND, 'parts': facts, 'hand': { 'n': H['n'], 'which': H['which'], 'pose': H['pose'] } }, open(out + '.json', 'w'))
np.save(out + '-hand.npy', canon_hand.astype(np.float32))
print(json.dumps({ 'dims': dims.tolist(), 'parts': len(facts), 'closed': sum(f['closed'] for f in facts), 'cells': sum(f['cells'] for f in facts), 'open': [f['name'] for f in facts if not f['closed']][:12] }))
