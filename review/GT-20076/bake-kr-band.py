"""Rebuild fitted cosmetic surfaces from the original unbatched game captures."""
import json
import sys
from pathlib import Path

import numpy as np
from subtract_artwork import oriented_cutter, subtract


def transform(part):
    x, y, z, w = part["q"]
    rotation = np.array([
        [1 - 2*(y*y + z*z), 2*(x*y - z*w), 2*(x*z + y*w)],
        [2*(x*y + z*w), 1 - 2*(x*x + z*z), 2*(y*z - x*w)],
        [2*(x*z - y*w), 2*(y*z + x*w), 1 - 2*(x*x + y*y)],
    ])
    matrix = np.eye(4)
    matrix[:3, :3] = rotation @ np.diag(part["scale"])
    matrix[:3, 3] = part["p"]
    return matrix


def triangles(part, to_band):
    mesh = part["g"]["data"]
    attributes = mesh["attributes"]
    local = to_band @ transform(part)
    positions = np.array(attributes["position"]["array"]).reshape(-1, 3)
    normals = np.array(attributes["normal"]["array"]).reshape(-1, 3)
    uv = np.array(attributes["uv"]["array"]).reshape(-1, 2)
    positions = positions @ local[:3, :3].T + local[:3, 3]
    normals = normals @ np.linalg.inv(local[:3, :3])
    vertices = np.c_[positions, normals, uv]
    if "index" in mesh:
        vertices = vertices[mesh["index"]["array"]]
    return vertices.reshape(-1, 3, 8)


variants = {
    "--kr-band": ("ak", "kr-band", "band", "lower"),
    "--minigun-panel": ("minigun", "minigun-panel", "plate", "drum"),
    "--pump-grip-web": ("shotgun", "pump-grip-web", "grip", "stock"),
}
mode = next((name for name in variants if name in sys.argv[1:]), "--kr-band")
model, variant, subject, default_cutter = variants[mode]
minigun = mode == "--minigun-panel"
subject_flag = next((arg for arg in sys.argv if arg.startswith("--source=")), None)
if subject_flag:
    subject = subject_flag.split("=", 1)[1]
    assert minigun and subject in ("trim5", "trim6")
folder = Path(__file__).parent / "visible-repairs" / model
reference = folder / f"clear-{variant}-before" / "reference.json"
parts = {part["name"]: part for part in json.loads(reference.read_text(encoding="utf8"))["parts"]}
raw = '--raw' in sys.argv[1:]
cutters = [name for name in sys.argv[1:] if name not in variants and name not in ('--raw',subject_flag)] or [default_cutter]
if minigun and any(name.startswith("extended-") for name in cutters):
    extension = folder / "minigun-panel-detail" / "extension-reference.json"
    parts.update((part["name"],part) for part in json.loads(extension.read_text(encoding="utf8")))
assert len(set(cutters)) == len(cutters) and all(name in parts and name != subject for name in cutters)

to_target = np.linalg.inv(transform(parts[subject]))
boundaries = [triangles(parts[name], to_target) for name in cutters]
if mode == '--pump-grip-web':
    boundaries = [oriented_cutter(boundary) for boundary in boundaries]
mesh = subtract(triangles(parts[subject], to_target), boundaries, reduce_faces=not raw,
                stitch_tolerance=1e-7 if mode=='--pump-grip-web' else 0)
assert np.isfinite(mesh).all()
vertices = []
indices = []
vertex_ids = {}
for vertex in mesh.astype(np.float32).reshape(-1, 8):
    vertex[np.abs(vertex) < 1e-13] = 0
    key = vertex.tobytes()
    if key not in vertex_ids:
        vertex_ids[key] = len(vertices)
        vertices.append(vertex.tolist())
    indices.append(vertex_ids[key])

prefix = subject if subject_flag else "trim"
target = folder / f"clear-{variant}-after" / (prefix + "-" + "-".join(cutters) + ("-raw" if raw else "") + ".json")
target.parent.mkdir(parents=True, exist_ok=True)
output = json.dumps({"vertices": vertices, "indices": indices}, separators=(",", ":"), allow_nan=False) + "\n"
target.write_bytes(output.encode("utf8"))
print(f"{len(mesh)} triangles, {len(vertices)} unique vertices -> {target.name}")
