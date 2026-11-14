# CG-6 (J153 notes 26, 29): the launcher's cylinder and the minigun's barrel clamps take the gun's camo.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8', newline='').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, ('anchor', a[:80]); s = s.replace(a, b)
# 26: the drum's outer wall its own geometry ('shell'), painted; the end faces and the six bores ('core') stay bare.
rep("function launcherDrum(T) {\n  return geometry(T, 'launcher-six-chambers', (quad) => {",
    "// CG-6 (J153 note 26, Jerry: \"cylinder needs camo for launcher\"): which = 'core' (the two end faces and the six bores,\n"
    "// bare steel) or 'shell' (the outer wall, painted with the gun); the two together are the whole drum as before.\n"
    "function launcherDrum(T, which = 'all') {\n  return geometry(T, 'launcher-six-chambers' + (which === 'all' ? '' : ':' + which), (quad) => {\n"
    "    const core = which !== 'shell', shell = which !== 'core';")
rep("        for (const z of [-halfLength, halfLength]) quad(at(a.inner, z), at(a.outer, z), at(b.outer, z), at(b.inner, z), [0, 0, Math.sign(z)]);\n        quad(at(a.inner, -halfLength),",
    "        if (core) for (const z of [-halfLength, halfLength]) quad(at(a.inner, z), at(a.outer, z), at(b.outer, z), at(b.inner, z), [0, 0, Math.sign(z)]);\n        if (core) quad(at(a.inner, -halfLength),")
rep("        quad(at(a.outer, -halfLength), at(a.outer, halfLength), at(b.outer, halfLength), at(b.outer, -halfLength), faceN);",
    "        if (shell) quad(at(a.outer, -halfLength), at(a.outer, halfLength), at(b.outer, halfLength), at(b.outer, -halfLength), faceN);")
rep("  part(THREE, launcherDrum(THREE), gunMid, drum);",
    "  part(THREE, launcherDrum(THREE, 'core'), gunMid, drum);\n"
    "  markPaintSurface(part(THREE, launcherDrum(THREE, 'shell'), gunMid, drum), 'cylinder');   // CG-6 (J153 26): the painted outer wall")
# 29: the three barrel clamp plates painted; their rims, bolts, the barrels and muzzles stay bare.
a = "  for (const [rz, radius] of [[0.04, 0.118], [0.39, 0.112], [0.80, 0.108]]) {\n    K.lathe("
assert s.count(a) == 1
i = s.index(a) + len(a) - len("K.lathe(")
j = s.index("\n", i)
line = s[i:j]
assert line.endswith(";") and "gunMid, { parent: barrelAssembly, seg: 28 })" in line, line
s = s[:i] + "// CG-6 (J153 note 29, Jerry: \"Rings around minigun barrels could use camo\"): the clamp plate takes the gun's paint\n    markPaintSurface(" + line[:-1] + ", 'clamp');" + s[j:]
open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok')
