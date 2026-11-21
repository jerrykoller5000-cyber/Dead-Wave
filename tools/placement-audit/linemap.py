# CG-1 (Claude 6): line map between two copies of the Training files, for scale.py (SCALE_LINEMAP).
# python3 -E tools/placement-audit/linemap.py <base-root> <new-root> [files...] > map.json
# Output: {file: {base line: new line}} for every line the new copy kept unchanged.
import sys, os, json, difflib
base, new = sys.argv[1], sys.argv[2]
files = sys.argv[3:] or ['world/training.js', 'world/training-firing-line.js', 'world/training-wear.js', 'world/training-props.js',
                         'game/training-perimeter.js', 'game/training-ceiling.js']
out = {}
for f in files:
    pa, pb = os.path.join(base, f), os.path.join(new, f)
    if not (os.path.exists(pa) and os.path.exists(pb)): continue
    a = open(pa, encoding='utf8').read().split('\n'); b = open(pb, encoding='utf8').read().split('\n')
    m = {}
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1): m[str(i1 + k + 1)] = j1 + k + 1
    out[f] = m
json.dump(out, sys.stdout)
