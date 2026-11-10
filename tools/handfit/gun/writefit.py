# game/viewmodel-fit.js from the apply runs' logs (STEP a-<gun>-<r|l> {..., apply: {final: {basis, p, pose}, iters}}): the
# last run of each gun-hand wins; only those that converged (the drawn hand within 0.5 mm and 0.01 rad of the solve)
import json, sys, re
fit, notes = {}, []
import os
ALL = os.environ.get('ALL') == '1'
for log in sys.argv[2:]:
    for line in open(log, errors='replace'):
        m = re.match(r'^STEP a-(\w+)-([rl]) (\{.*\})\s*$', line)
        if not m: continue
        try: J = json.loads(m.group(3))
        except Exception: continue
        A = J.get('apply'); 
        if not A: continue
        it = A['iters'][-1] if A.get('iters') else [9, 9]
        ok = it[0] <= 0.5 and it[1] <= 0.01
        notes.append(f"{m.group(1)}-{m.group(2)} iters {A['iters']} {'ok' if ok else 'NOT CONVERGED'}")
        if ok or ALL: fit.setdefault(m.group(1), {})[m.group(2)] = A['final']
src = open(sys.argv[1]).read()
head = src[:src.index('export const VM_FIT')]
body = 'export const VM_FIT = Object.freeze({\n' + ',\n'.join(f"  {k}: {{ " + ', '.join(f"{sd}: {json.dumps(v, separators=(', ', ': '))}" for sd, v in sorted(fit[k].items())) + ' }' for k in sorted(fit)) + '\n});\n'
open(sys.argv[1], 'w').write(head + body)
print('\n'.join(notes)); print('wrote', sum(len(v) for v in fit.values()), 'hands for', len(fit), 'guns')
