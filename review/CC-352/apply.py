# apply.py <file> <hunks.json>: CC-352 exact-text patch (each old must occur exactly once; md5-free, CRLF kept)
import sys, json
p = sys.argv[1]; s = open(p, newline='').read()
for h in json.load(open(sys.argv[2])):
    c = s.count(h['old'])
    if c != 1: sys.exit('hunk not unique/missing (%d): %r' % (c, h['old'][:100]))
    s = s.replace(h['old'], h['new'])
open(p, 'w', newline='').write(s); print('applied', p)
