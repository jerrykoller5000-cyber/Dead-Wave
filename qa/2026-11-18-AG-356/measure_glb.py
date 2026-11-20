"""Orthographic silhouette and landmark measurement from GLB files (no trimesh dependency).
Matches review/J168/proportions/measure.py conventions (front from +Z, side from +X looking -X).
"""
import json
import math
import struct
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

PX = 900


def _read_accessor(gltf, bin_data, acc_idx):
    acc = gltf["accessors"][acc_idx]
    bv = gltf["bufferViews"][acc["bufferView"]]
    offset = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    count = acc["count"]
    ctype = acc["componentType"]
    atype = acc["type"]
    ncomp = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[atype]
    dtype_map = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
    dt = np.dtype(dtype_map[ctype])
    stride = bv.get("byteStride")
    if not stride or stride == ncomp * dt.itemsize:
        arr = np.frombuffer(bin_data, dtype=dt, count=count * ncomp, offset=offset).reshape(count, ncomp)
    else:
        arr = np.empty((count, ncomp), dtype=dt)
        for i in range(count):
            arr[i] = np.frombuffer(bin_data, dtype=dt, count=ncomp, offset=offset + i * stride)
    return arr.astype(np.float64 if ncomp > 1 else np.int64)


def _node_matrix(node):
    if "matrix" in node:
        return np.array(node["matrix"], dtype=np.float64).reshape(4, 4).T
    M = np.eye(4, dtype=np.float64)
    if "scale" in node:
        sx, sy, sz = node["scale"]
        M = M @ np.diag([sx, sy, sz, 1.0])
    if "rotation" in node:
        x, y, z, w = node["rotation"]
        R = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
            [0, 0, 0, 1],
        ], dtype=np.float64)
        M = R @ M
    if "translation" in node:
        tx, ty, tz = node["translation"]
        T = np.eye(4, dtype=np.float64)
        T[:3, 3] = [tx, ty, tz]
        M = T @ M
    return M


def load_glb(path):
    raw = Path(path).read_bytes()
    magic, version, total_len = struct.unpack_from("<III", raw, 0)
    assert magic == 0x46546C67, f"Not a GLB: {path}"
    jlen, jtype = struct.unpack_from("<II", raw, 12)
    gltf = json.loads(raw[20:20 + jlen].decode("utf-8"))
    blen, btype = struct.unpack_from("<II", raw, 20 + jlen)
    bin_data = raw[28 + jlen:28 + jlen + blen]

    nodes = gltf.get("nodes", [])
    parents = {}
    for idx, nd in enumerate(nodes):
        for ch in nd.get("children", []):
            parents[ch] = idx

    world_mats = {}

    def get_mat(idx):
        if idx in world_mats:
            return world_mats[idx]
        m = _node_matrix(nodes[idx])
        if idx in parents:
            m = get_mat(parents[idx]) @ m
        world_mats[idx] = m
        return m

    all_v = []
    all_f = []
    v_off = 0
    for idx, nd in enumerate(nodes):
        if "mesh" not in nd:
            continue
        M = get_mat(idx)
        mesh = gltf["meshes"][nd["mesh"]]
        for pr in mesh.get("primitives", []):
            pos = _read_accessor(gltf, bin_data, pr["attributes"]["POSITION"])
            hom = np.hstack([pos, np.ones((len(pos), 1))])
            wpos = (M @ hom.T).T[:, :3]
            if "indices" in pr and pr["indices"] is not None:
                ind = _read_accessor(gltf, bin_data, pr["indices"]).reshape(-1)
            else:
                ind = np.arange(len(wpos), dtype=np.int64)
            faces = ind.reshape(-1, 3) + v_off
            all_v.append(wpos)
            all_f.append(faces)
            v_off += len(wpos)

    if not all_v:
        # fallback: iterate meshes directly if scene nodes didn't attach them
        for mesh in gltf.get("meshes", []):
            for pr in mesh.get("primitives", []):
                pos = _read_accessor(gltf, bin_data, pr["attributes"]["POSITION"])
                ind = _read_accessor(gltf, bin_data, pr["indices"]).reshape(-1) if "indices" in pr else np.arange(len(pos))
                all_v.append(pos)
                all_f.append(ind.reshape(-1, 3) + v_off)
                v_off += len(pos)
    return np.vstack(all_v), np.vstack(all_f)


def normalise(v, target_h=None):
    v = v.copy()
    v[:, 1] -= v[:, 1].min()
    h = v[:, 1].max()
    if target_h:
        v *= target_h / h
        h = v[:, 1].max()
    feet = v[v[:, 1] < 0.08 * h]
    if len(feet):
        v[:, 0] -= (feet[:, 0].min() + feet[:, 0].max()) / 2
        v[:, 2] -= (feet[:, 2].min() + feet[:, 2].max()) / 2
    return v


def raster(v, f, view, scale, W, Hpx, ox):
    img = Image.new("L", (W, Hpx), 0)
    d = ImageDraw.Draw(img)
    X = v[:, 0] if view == "front" else -v[:, 2]
    px = ox + X * scale
    py = Hpx - 20 - v[:, 1] * scale
    for a, b, c in f:
        d.polygon([(px[a], py[a]), (px[b], py[b]), (px[c], py[c])], fill=255)
    return np.array(img) > 0


def runs(row):
    r = []
    i = 0
    n = len(row)
    while i < n:
        if row[i]:
            j = i
            while j < n and row[j]:
                j += 1
            r.append((i, j))
            i = j
        else:
            i += 1
    return r


def measure(F, S, H, scale, oxF, oxS, Hpx):
    m = {}
    y_of = lambda yy: (Hpx - 20 - yy) / scale
    row_at = lambda h: int(round(Hpx - 20 - h * scale))
    cx, cz = int(round(oxF)), int(round(oxS))

    def central(M, c, h):
        r = row_at(h)
        if r < 0 or r >= M.shape[0]:
            return None
        for a, b in runs(M[r]):
            if a <= c < b:
                return (a, b)
        return None

    def cw(M, c, h):
        rr = central(M, c, h)
        return (rr[1] - rr[0]) / scale if rr else None

    hs = np.arange(0.0, H, 1 / scale)
    crotch = None
    for h in hs:
        if h > 0.15 * H and central(F, cx, h):
            crotch = float(h)
            break
    m["crotch height"] = crotch
    if crotch:
        r = row_at(crotch - 0.03 * H)
        gap = None
        for a, b in runs(~F[r]):
            if a <= cx < b:
                gap = (b - a) / scale
        m["thigh gap at the crotch"] = gap

    band = [h for h in hs if 0.68 * H < h < 0.97 * H and cw(F, cx, h)]
    if band:
        neck = min(band, key=lambda h: cw(F, cx, h))
        nw = cw(F, cx, neck)
        above = [h for h in hs if h > neck and cw(F, cx, h)]
        m["head width"] = max(cw(F, cx, h) for h in above) if above else None
        chin = next((h for h in hs if h > neck and (cw(F, cx, h) or 0) > 1.25 * nw), neck)
        collar = next((h for h in hs[::-1] if h < neck and (cw(F, cx, h) or 0) > 1.6 * nw), None)
        m["head height (chin to top)"] = float(H - chin)
        m["neck length (chin to collar)"] = float(chin - collar) if collar else None
        m["neck width"] = nw
        if collar:
            sb = [h for h in hs if collar - 0.12 * H < h <= collar]
            sw = max((cw(F, cx, h) or 0) for h in sb)
            m["shoulder width"] = sw
            ang = []
            for sgn in (1, -1):
                x0 = int(round(cx + sgn * nw / 2 * scale))
                x1 = int(round(cx + sgn * sw / 2 * 0.9 * scale))

                def top(x):
                    col = F[:, x] if 0 <= x < F.shape[1] else None
                    if col is None:
                        return None
                    rs = np.where(col[row_at(chin):])[0]
                    return y_of(row_at(chin) + rs[0]) if len(rs) else None

                t0, t1 = top(x0), top(x1)
                if t0 is not None and t1 is not None and x1 != x0:
                    ang.append(math.degrees(math.atan2(t0 - t1, abs(x1 - x0) / scale)))
            m["shoulder slope (deg)"] = sum(ang) / len(ang) if ang else None

            def arm(h):
                r = row_at(h)
                c = central(F, cx, h)
                out = []
                for a, b in runs(F[r]):
                    if c and a == c[0] and b == c[1]:
                        continue
                    out.append((b - a) / scale)
                return (sum(out) / len(out)) if out else None

            ua, fa = arm(collar - 0.10 * H), arm(collar - 0.25 * H)
            m["upper-arm thickness"] = ua if ua and ua >= 0.02 else None
            m["forearm thickness"] = fa if fa and fa >= 0.02 else None
            wr = [(arm(h), h) for h in hs if collar - 0.42 * H < h < collar - 0.27 * H and arm(h)]
            if wr:
                w, wh = min(wr)
                m["wrist thickness"] = w if w >= 0.02 else None
                low = [h for h in hs if h < wh and arm(h)]
                hl = (wh - min(low)) if low else None
                m["hand length"] = float(hl) if (hl and m["wrist thickness"] and hl <= 0.15 * H) else None
            m["chest depth (side)"] = cw(S, cz, collar - 0.08 * H)
            if crotch:
                wb = [h for h in hs if crotch + 0.05 * H < h < collar - 0.18 * H and cw(F, cx, h)]
                m["waist width"] = min(cw(F, cx, h) for h in wb) if wb else None
                hb = [h for h in hs if crotch <= h < crotch + 0.10 * H and cw(F, cx, h)]
                m["hip width"] = max(cw(F, cx, h) for h in hb) if hb else None

    leg = []
    for h in hs:
        if 0.22 * H < h < 0.36 * H:
            rs = [(b - a) / scale for a, b in runs(F[row_at(h)]) if a > cx]
            if rs:
                leg.append((min(rs), float(h)))
    m["knee height"] = min(leg)[1] if leg else None
    m["height"] = float(H)

    def bad(k, lo, hi):
        v = m.get(k)
        if v is not None and not (lo * H <= v <= hi * H):
            m[k] = None

    bad("head height (chin to top)", 0.07, 0.30)
    bad("neck length (chin to collar)", 0.005, 0.12)
    bad("neck width", 0.03, 0.35)
    bad("head width", 0.04, 0.40)
    bad("hand length", 0.04, 0.15)
    bad("chest depth (side)", 0.05, 0.45)
    bad("waist width", 0.08, 0.50)
    bad("hip width", 0.08, 0.60)
    bad("upper-arm thickness", 0.02, 0.25)
    bad("forearm thickness", 0.02, 0.25)
    bad("wrist thickness", 0.012, 0.15)
    if m.get("head width") and m.get("neck width") and m["neck width"] > m["head width"] * 1.05:
        m["neck width"] = None
        m["neck length (chin to collar)"] = None

    # Full-silhouette waist & shoulder & thigh widths (even when arms touch torso)
    prof = []
    for k in range(1, 10):
        h = k * H / 10
        r = row_at(h)
        full = lambda M: (lambda rs: (rs[-1][1] - rs[0][0]) / scale if rs else None)(runs(M[r]))
        # also measure widest leg run at 10..35%
        legs = [(b - a) / scale for a, b in runs(F[r])] if k <= 4 else []
        prof.append({
            "pct": k * 10,
            "h": float(h),
            "front_central": cw(F, cx, h),
            "front_full": full(F),
            "side_central": cw(S, cz, h),
            "side_full": full(S),
            "leg_runs": legs,
        })
    m["_profile"] = prof
    return m


def measure_pair(ours_path, tripo_path, target_h=None, overlay_out=None, label="spitter"):
    vo, fo = load_glb(ours_path)
    vo = normalise(vo)
    H = float(target_h or vo[:, 1].max())
    if target_h:
        vo = normalise(vo, H)
    vt, ft = load_glb(tripo_path)
    vt = normalise(vt, H)
    scale = PX / H
    W = int(max(np.ptp(np.r_[vo[:, 0], vt[:, 0]]), np.ptp(np.r_[vo[:, 2], vt[:, 2]])) * scale + 120)
    Hpx = PX + 40
    oxF = W / 2 - (min(vo[:, 0].min(), vt[:, 0].min()) + max(vo[:, 0].max(), vt[:, 0].max())) / 2 * scale
    oxS = W / 2 - (min(-vo[:, 2].max(), -vt[:, 2].max()) + max(-vo[:, 2].min(), -vt[:, 2].min())) / 2 * scale

    masks = {}
    for who, v, f in (("ours", vo, fo), ("tripo", vt, ft)):
        masks[who] = {"front": raster(v, f, "front", scale, W, Hpx, oxF), "side": raster(v, f, "side", scale, W, Hpx, oxS)}
    res = {who: measure(masks[who]["front"], masks[who]["side"], H, scale, oxF, oxS, Hpx) for who in masks}

    if overlay_out:
        panels = []
        for view in ("front", "side"):
            a, b = masks["ours"][view], masks["tripo"][view]
            im = np.zeros((Hpx, W, 3), np.uint8)
            im[:] = (24, 27, 33)
            im[a & ~b] = (70, 150, 255)
            im[b & ~a] = (255, 150, 50)
            im[a & b] = (200, 170, 230)
            p = Image.fromarray(im)
            d = ImageDraw.Draw(p)
            d.line([(0, Hpx - 20), (W, Hpx - 20)], fill=(230, 230, 230), width=1)
            for frac in (0.25, 0.5, 0.75):
                y = Hpx - 20 - frac * H * scale
                d.line([(0, y), (W, y)], fill=(80, 84, 92), width=1)
            panels.append(p)
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 18)
        except Exception:
            font = None
        out = Image.new("RGB", (2 * W + 10, Hpx + 60), (24, 27, 33))
        d = ImageDraw.Draw(out)
        out.paste(panels[0], (0, 60))
        out.paste(panels[1], (W + 10, 60))
        d.text((8, 6), f"{label}: OURS (blue) vs TRIPO (orange), overlap purple. Height {H:.3f} m.", fill=(232, 228, 212), font=font)
        d.text((8, 32), "front (+Z)                                      side (its left; front to left)", fill=(154, 163, 173), font=font)
        out.save(overlay_out, quality=92)
    return {"H": H, "res": res}


if __name__ == "__main__":
    ours_p, tripo_p = sys.argv[1], sys.argv[2]
    out_json = sys.argv[3] if len(sys.argv) > 3 else None
    out_img = sys.argv[4] if len(sys.argv) > 4 else None
    target_h = float(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5] != "-" else None
    data = measure_pair(ours_p, tripo_p, target_h=target_h, overlay_out=out_img)
    if out_json:
        Path(out_json).write_text(json.dumps(data, indent=2), encoding="utf-8")
    else:
        print(json.dumps(data, indent=2))
