# fptune2 steps: each solved gun-hand applied live (info.tune: the pose, the hand's basis and grip point), iterated until the
# drawn hand sits where the solve put it; the final values and the residuals returned (and the hands and gun re-exported)
import json, sys, glob, os
RES = {}
for f in sorted(glob.glob('/home/claude/handfit-work/gun/res6/*.txt')):
    n = os.path.basename(f)[:-4]
    for line in open(f):
        if line.startswith('RESULT '): RES[n] = json.loads(line[7:])
only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
SETUP = open('/home/claude/handfit-work/gun/setup6.js').read()
BODY = open('/home/claude/handfit-work/gun/apply6.js').read()
steps = [{"name": "setup", "js": SETUP, "wait": 200}]
for n, r in RES.items():
    if only and n not in only: continue
    key, sd = n.rsplit('-', 1)
    steps.append({"name": "a-" + n, "js": BODY.replace('%KEY%', key).replace('%SD%', sd).replace('%RES%', json.dumps(r)), "wait": 200})
json.dump(steps, open(sys.argv[1], 'w'))
print(len(steps) - 1, 'gun-hands:', ', '.join(s['name'] for s in steps[1:]))
