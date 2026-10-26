# studio/import-cmu.py — brings CMU motion capture clips (the FBX conversion, huggingface.co/datasets/gbionics/cmu-fbx)
# into the studio as reference motion, the way import-ual.mjs brings Quaternius' UAL (CL-261, D-89, rule 18: a
# reference first). It runs inside Blender's Python (headless: `pip install bpy`, the cloud box has it), reads each FBX,
# keeps the body's bones (no fingers or eyes), samples at 30 fps and writes one compact JSON in the studio's dw-ref/1
# format (assets/anim/reference/cmu.json), which the studio plays on a plain mannequin like ual.json.
#
#   python3 -I studio/import-cmu.py <folder with the .fbx files> [<out.json>]
#
# The CMU terms (mocap.cs.cmu.edu): free to use, modify and redistribute, also in a sold game, never selling the data
# itself; credit mocap.cs.cmu.edu (NOTICES.txt). The clips and what each is for are listed in WANT below.
import bpy, json, math, os, sys
from mathutils import Matrix

args = [a for a in sys.argv[sys.argv.index('--') + 1:]] if '--' in sys.argv else sys.argv[1:]
SRC = args[0]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = args[1] if len(args) > 1 else os.path.join(HERE, '..', 'assets', 'anim', 'reference', 'cmu.json')
FPS = 30

# The clips we keep, and what each is good for. Add a line to bring another in. A tuple keeps only that stretch of a long
# take: (what it's good for, from, to), seconds into the take.
WANT = {
    '09_01': 'a run: arm drive, torso lean, flight phase (the unarmed run, N6)',
    '09_02': 'a run, another stride',
    '02_03': 'a jog',
    '02_07': 'swordplay: cuts with the body behind them (the machete and katana, N25)',
    '02_08': 'swordplay, more cuts',
    '13_33': 'climbing a ladder: hand over hand, foot on each rung (N20)',
    '13_34': 'climbing a ladder, another climb',
    '02_05': ('punches and strikes from the back hand: the shoulders turn through, the trunk leans in (the knife stab, N25)', 6.0, 14.0),
    '144_20': ('a boxer\'s punches from a staggered stance, quick: the body turns behind each one (the knife stab)', 4.0, 12.2),
}
SKIP = ('Thumb', 'Index', 'Mid', 'Ring', 'Pinky', 'Eye')

def r4(x): return round(x, 4)

skeleton = None
clips = {}
for cid, want in WANT.items():
    good, cut = (want[0], want[1:]) if isinstance(want, tuple) else (want, None)
    f = os.path.join(SRC, cid + '.fbx')
    if not os.path.exists(f):
        print('missing', f); continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=f)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    act = arm.animation_data.action
    f0, f1 = act.frame_range
    scene = bpy.context.scene
    src_fps = scene.render.fps / scene.render.fps_base
    keep = [b for b in arm.data.bones if not any(s in b.name for s in SKIP)]
    names = [b.name for b in keep]
    # Blender is z-up; three.js is y-up: the root carries the turn, as UAL's does.
    to_y_up = Matrix.Rotation(-math.pi / 2, 4, 'X')
    W = to_y_up @ arm.matrix_world
    # The FBX keeps CMU's centimetres: a hip a metre or more up is centimetres; the studio works in metres.
    hip0 = keep[0].matrix_local.to_translation()
    scale = W.to_scale()[0] * (0.01 if abs(hip0.z) > 10 else 1.0)
    def local_rest(b):
        return (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local
    if skeleton is None:
        skeleton = [{'name': 'root', 'parent': -1, 't': [0, 0, 0], 'r': [r4(x) for x in (lambda q: (q.x, q.y, q.z, q.w))(W.to_quaternion())]}]
        for b in keep:
            L = local_rest(b)
            t, q = L.to_translation(), L.to_quaternion()
            if not b.parent: t = t.copy(); t.x = 0; t.y = 0   # the hip over the origin (its height kept); the clips carry where he goes
            parent = names.index(b.parent.name) + 1 if b.parent and b.parent.name in names else 0
            skeleton.append({'name': b.name, 'parent': parent, 't': [r4(v * scale) for v in t], 'r': [r4(q.x), r4(q.y), r4(q.z), r4(q.w)]})
    n = int(round((f1 - f0) / src_fps * FPS)) + 1
    k0, k1 = (int(round(cut[0] * FPS)), min(n - 1, int(round(cut[1] * FPS)))) if cut else (0, n - 1)
    n = k1 - k0 + 1
    rot = {nm: [] for nm in names}
    pos = []
    for k in range(k0, k1 + 1):
        scene.frame_set(int(round(f0 + k * src_fps / FPS)))
        for b in keep:
            pb = arm.pose.bones[b.name]
            L = local_rest(b) @ pb.matrix_basis
            q = L.to_quaternion()
            rot[b.name] += [r4(q.x), r4(q.y), r4(q.z), r4(q.w)]
        hip = arm.pose.bones[keep[0].name]
        L = local_rest(keep[0]) @ hip.matrix_basis
        tr = L.to_translation()
        if k == k0: start = tr.copy()
        pos += [r4((tr.x - start.x) * scale), r4((tr.y - start.y) * scale), r4(tr.z * scale)]   # from where he starts, his hip's height as is
    clips['cmu_' + cid] = {'pack': 'CMU', 'length': r4((n - 1) / FPS), 'loop': cid.startswith('09') or cid == '02_03', 'frames': n,
                           'goodFor': good + (f' ({cut[0]:g}-{cut[1]:g} s of the take)' if cut else ''), 'rot': rot, 'pos': {keep[0].name: pos}}
    print('clip', cid, n, 'frames')

data = {'format': 'dw-ref/1', 'source': 'CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), FBX conversion by gbionics/cmu-fbx; free to use, not to resell',
        'fps': FPS, 'skeleton': skeleton, 'clips': clips}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as fh: json.dump(data, fh, separators=(',', ':'))
print('wrote', OUT, len(clips), 'clips', len(skeleton), 'bones')
