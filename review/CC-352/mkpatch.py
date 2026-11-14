# mkpatch.py <before> <after> <out.json>: exact-text replacement hunks (old -> new, each old unique in <before>), CRLF kept
import sys, difflib, json
a = open(sys.argv[1], newline='').read(); b = open(sys.argv[2], newline='').read()
A = a.splitlines(keepends=True); B = b.splitlines(keepends=True)
hunks = []
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
    if tag == 'equal': continue
    lo, hi = i1, i2
    while True:   # widen with context until the old text is unique
        old = ''.join(A[lo:hi]); new = ''.join(A[lo:i1]) + ''.join(B[j1:j2]) + ''.join(A[i2:hi])
        if old and a.count(old) == 1: break
        lo = max(0, lo - 1); hi = min(len(A), hi + 1)
    hunks.append({'old': old, 'new': new})
json.dump(hunks, open(sys.argv[3], 'w'))
print(len(hunks), 'hunks')
